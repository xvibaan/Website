from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from models.payment import Payment
from models.wallet import Wallet
from models.wallet_transaction import WalletTransaction

async def credit_wallet_after_verified_payment(
    db: AsyncSession,
    payment_id: int,
    gateway_payment_id: str | None = None
) -> Payment:
    try:
        # 1. Fetch and Lock the Payment row
        stmt_payment = select(Payment).where(Payment.id == payment_id).with_for_update()
        result_payment = await db.execute(stmt_payment)
        payment = result_payment.scalar_one_or_none()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        # Idempotency check: if already completed, return as-is
        if payment.status == "COMPLETED":
            await db.rollback()
            return payment

        # Only a PENDING payment may be credited
        if payment.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot process payment with status: {payment.status}"
            )

        # 2. Fetch and Lock the Wallet row
        stmt_wallet = select(Wallet).where(Wallet.id == payment.wallet_id).with_for_update()
        result_wallet = await db.execute(stmt_wallet)
        wallet = result_wallet.scalar_one_or_none()

        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated wallet not found"
            )

        # Verify the wallet is active
        if not wallet.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Wallet is inactive and cannot be recharged"
            )

        # 3. Capture balances and apply credit
        balance_before = wallet.balance
        balance_after = balance_before + payment.amount
        wallet.balance = balance_after

        # 4. Create the append-only WalletTransaction record in the same db transaction
        wallet_tx = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type="CREDIT",
            amount=payment.amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reference_type="PAYMENT",
            reference_id=payment.id,
            description=f"Wallet recharge via verified payment ID: {payment.id}"
        )
        db.add(wallet_tx)

        # 5. Update Payment record
        payment.status = "COMPLETED"
        if gateway_payment_id:
            payment.gateway_payment_id = gateway_payment_id

        # 6. Commit everything atomically
        await db.commit()
        await db.refresh(payment)

        return payment

    except Exception as e:
        # On any exception, rollback the transaction and re-raise
        await db.rollback()
        raise e
