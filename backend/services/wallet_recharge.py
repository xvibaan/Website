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
        # Wrap the core logic in a nested transaction (savepoint).
        # This makes the function composable. If an exception occurs, 
        # this specific unit of work rolls back without breaking an outer transaction.
        async with db.begin_nested():
            
            # 1. Fetch and Lock the Payment row
            stmt_payment = select(Payment).where(Payment.id == payment_id).with_for_update()
            result_payment = await db.execute(stmt_payment)
            payment = result_payment.scalar_one_or_none()

            if not payment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment not found"
                )

            # Idempotency check: if already completed, verify consistency and return as-is
            if payment.status == "COMPLETED":
                if gateway_payment_id and payment.gateway_payment_id and payment.gateway_payment_id != gateway_payment_id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Payment already completed with a different gateway payment ID"
                    )
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

            # Flush the changes into the savepoint to ensure DB constraints are validated
            await db.flush()

        # Return the payment, leaving the final db.commit() to the caller 
        # (e.g., the webhook API endpoint)
        return payment

    except Exception:
        # On any exception, the async context manager automatically rolls back the savepoint.
        # Use a bare raise to perfectly preserve the original exception and stack trace.
        raise
