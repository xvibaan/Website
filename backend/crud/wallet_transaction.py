from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from models.wallet_transaction import WalletTransaction

async def get_wallet_transactions(
    db: AsyncSession,
    wallet_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[WalletTransaction]:
    stmt = (
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet_id)
        .order_by(WalletTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_wallet_transaction(
    db: AsyncSession,
    wallet_id: int,
    transaction_type: str,
    amount,
    balance_before,
    balance_after,
    reference_type: str | None = None,
    reference_id: int | None = None,
    description: str | None = None
) -> WalletTransaction:
    db_transaction = WalletTransaction(
        wallet_id=wallet_id,
        transaction_type=transaction_type,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_type=reference_type,
        reference_id=reference_id,
        description=description
    )
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction
