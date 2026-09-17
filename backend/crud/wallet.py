from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from models.wallet import Wallet

async def get_wallet_by_user_id(db: AsyncSession, user_id: int) -> Optional[Wallet]:
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalars().first()

async def get_wallet_by_id(db: AsyncSession, wallet_id: int) -> Optional[Wallet]:
    stmt = select(Wallet).where(Wallet.id == wallet_id)
    result = await db.execute(stmt)
    return result.scalars().first()

async def create_wallet(db: AsyncSession, user_id: int) -> Wallet:
    db_wallet = Wallet(user_id=user_id)
    db.add(db_wallet)
    await db.commit()
    await db.refresh(db_wallet)
    return db_wallet
