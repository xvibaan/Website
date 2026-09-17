from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from api.deps import get_db, get_current_user
from core.config import settings
from models.payment import Payment
from models.wallet import Wallet
from schemas.wallet import RechargeRequest, PaymentResponse

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.post("/recharge", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def initiate_recharge(
    payload: RechargeRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates a wallet recharge by creating a PENDING payment record.
    Requires a configured system currency to proceed safely.
    """
    
    # 1. Early Idempotency Check (for standard repeated requests)
    if idempotency_key:
        stmt = select(Payment).where(Payment.idempotency_key == idempotency_key)
        result = await db.execute(stmt)
        existing_payment = result.scalar_one_or_none()
        
        if existing_payment:
            # Prevent cross-user hijacking of idempotency keys
            if existing_payment.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency key conflict."
                )
            
            # Verify the existing payment has a currency
            existing_currency = getattr(existing_payment, "currency", None)
            if not existing_currency:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="Existing payment has no configured currency and cannot be safely processed."
                )

            return existing_payment

    # 2. Extract and Validate System Currency Configuration
    # Fail closed if the system is not yet configured for multi-currency operations.
    raw_currency = getattr(settings, "PAYMENT_CURRENCY", None)
    if not raw_currency:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Payment currency configuration is not yet implemented."
        )
        
    normalized_currency = str(raw_currency).strip().upper()
    if len(normalized_currency) != 3:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configured payment currency is invalid. Must be a 3-letter ISO code."
        )

    # 3. Process Database Transaction Atomically
    try:
        async with db.begin_nested():
            # Fetch and lock existing wallet, or prepare to create a new one
            stmt_wallet = select(Wallet).where(Wallet.user_id == current_user.id).with_for_update()
            result_wallet = await db.execute(stmt_wallet)
            wallet = result_wallet.scalar_one_or_none()

            if not wallet:
                wallet = Wallet(user_id=current_user.id, balance=0.0)
                db.add(wallet)
                await db.flush()

            if not getattr(wallet, "is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Wallet is inactive and cannot be recharged."
                )

            # Create the PENDING payment linked to this wallet
            payment = Payment(
                user_id=current_user.id,
                wallet_id=wallet.id,
                amount=payload.amount,
                currency=normalized_currency,
                status="PENDING",
                idempotency_key=idempotency_key
            )
            db.add(payment)
            await db.flush()

    except IntegrityError:
        # Gracefully handle database constraint races (e.g., concurrent wallet creation
        # or overlapping idempotency keys arriving at the exact same millisecond).
        if idempotency_key:
            stmt = select(Payment).where(Payment.idempotency_key == idempotency_key)
            result = await db.execute(stmt)
            concurrent_payment = result.scalar_one_or_none()
            
            if concurrent_payment:
                if concurrent_payment.user_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Idempotency key conflict."
                    )
                
                concurrent_currency = getattr(concurrent_payment, "currency", None)
                if not concurrent_currency:
                    raise HTTPException(
                        status_code=status.HTTP_501_NOT_IMPLEMENTED,
                        detail="Existing payment has no configured currency and cannot be safely processed."
                    )
                return concurrent_payment

        # If it wasn't an idempotency collision, surface the conflict safely
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A conflict occurred during payment initiation. Please try again."
        )

    # 4. Commit the outer transaction
    await db.commit()
    await db.refresh(payment)

    return payment
