from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select

from api.deps import get_db, get_current_user
from schemas.wallet import RechargeRequest, PaymentResponse
from models.wallet import Wallet
from models.payment import Payment

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.post("/recharge", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_recharge_payment(
    request: RechargeRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Initiate a wallet recharge safely.
    Creates a PENDING payment record. 
    Does not credit the wallet until the payment is verified.
    """
    # 1. Optimistic Idempotency Check
    if idempotency_key:
        stmt_existing_payment = select(Payment).where(Payment.idempotency_key == idempotency_key)
        existing_payment = (await db.execute(stmt_existing_payment)).scalars().first()
        if existing_payment:
            if existing_payment.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency key is already in use by a different user"
                )
            return existing_payment

    # 2. Get or Create Wallet (Concurrency Safe)
    stmt_wallet = select(Wallet).where(Wallet.user_id == current_user.id)
    user_wallet = (await db.execute(stmt_wallet)).scalars().first()

    if not user_wallet:
        try:
            # Use a savepoint to safely catch unique constraint violations
            async with db.begin_nested():
                user_wallet = Wallet(user_id=current_user.id)
                db.add(user_wallet)
                await db.flush()
        except IntegrityError:
            # A concurrent request created the wallet. Re-fetch it safely.
            user_wallet = (await db.execute(stmt_wallet)).scalars().first()
            if not user_wallet:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve wallet after concurrent creation"
                )

    # 3. Create the PENDING Payment (Concurrency Safe)
    try:
        async with db.begin_nested():
            new_payment = Payment(
                user_id=current_user.id,
                wallet_id=user_wallet.id,
                amount=request.amount,
                status="PENDING",
                idempotency_key=idempotency_key
            )
            db.add(new_payment)
            await db.flush()
    except IntegrityError:
        # A concurrent request used the same idempotency key.
        if idempotency_key:
            stmt_existing_payment = select(Payment).where(Payment.idempotency_key == idempotency_key)
            existing_payment = (await db.execute(stmt_existing_payment)).scalars().first()
            if existing_payment:
                if existing_payment.user_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Idempotency key is already in use by a different user"
                    )
                # Commit any preceding changes (like wallet creation) before returning early
                await db.commit()
                return existing_payment
                
        # If IntegrityError was caused by something else (e.g. data type/constraint violation)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database constraint violation while creating payment"
        )

    # 4. Commit the outer transaction
    await db.commit()
    await db.refresh(new_payment)

    return new_payment
