from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from models.payment_method import PaymentMethod
from schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate

async def get_payment_method_by_id(
    db: AsyncSession, 
    payment_method_id: int
) -> Optional[PaymentMethod]:
    stmt = select(PaymentMethod).where(PaymentMethod.id == payment_method_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_payment_methods(
    db: AsyncSession, 
    include_inactive: bool = False
) -> List[PaymentMethod]:
    stmt = select(PaymentMethod).order_by(
        PaymentMethod.display_order.asc(), 
        PaymentMethod.id.asc()
    )
    
    if not include_inactive:
        stmt = stmt.where(PaymentMethod.is_active == True)
        
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_payment_method(
    db: AsyncSession, 
    payment_method_in: PaymentMethodCreate
) -> PaymentMethod:
    db_payment_method = PaymentMethod(**payment_method_in.model_dump())
    db.add(db_payment_method)
    await db.commit()
    await db.refresh(db_payment_method)
    return db_payment_method

async def update_payment_method(
    db: AsyncSession, 
    db_payment_method: PaymentMethod, 
    payment_method_in: PaymentMethodUpdate
) -> PaymentMethod:
    update_data = payment_method_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_payment_method, field, value)
        
    await db.commit()
    await db.refresh(db_payment_method)
    return db_payment_method

async def soft_delete_payment_method(
    db: AsyncSession, 
    db_payment_method: PaymentMethod
) -> PaymentMethod:
    db_payment_method.is_active = False
    await db.commit()
    await db.refresh(db_payment_method)
    return db_payment_method
