from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List

from models.payment import Payment

async def get_payment_by_id(
    db: AsyncSession,
    payment_id: int
) -> Optional[Payment]:
    stmt = select(Payment).where(Payment.id == payment_id)
    result = await db.execute(stmt)
    return result.scalars().first()

async def get_payment_by_idempotency_key(
    db: AsyncSession,
    idempotency_key: str
) -> Optional[Payment]:
    stmt = select(Payment).where(Payment.idempotency_key == idempotency_key)
    result = await db.execute(stmt)
    return result.scalars().first()

async def get_user_payments(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Payment]:
    stmt = (
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_payment(
    db: AsyncSession,
    user_id: int,
    wallet_id: int,
    amount,
    idempotency_key: str | None = None,
    gateway: str | None = None
) -> Payment:
    db_payment = Payment(
        user_id=user_id,
        wallet_id=wallet_id,
        amount=amount,
        idempotency_key=idempotency_key,
        gateway=gateway
    )
    db.add(db_payment)
    await db.commit()
    await db.refresh(db_payment)
    return db_payment
