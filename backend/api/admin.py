from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from db.database import get_db
from models.user import User
from models.product import Product
from models.order import Order
from models.payment import Payment
from models.site_settings import SiteSetting
from models.support import SupportTicket
from api.deps import get_current_admin_user

router = APIRouter()

@router.get("/dashboard-stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    # Total Users
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar_one()

    # Total Products
    products_result = await db.execute(select(func.count(Product.id)))
    total_products = products_result.scalar_one()

    # Total Revenue (sum of successful payments)
    revenue_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.status == "SUCCESS")
    )
    total_revenue = revenue_result.scalar_one() or 0.0

    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_revenue": float(total_revenue)
    }

@router.get("/settings")
async def get_site_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(SiteSetting))
    settings = result.scalars().all()
    return settings

@router.post("/settings")
async def update_site_setting(
    key: str,
    value: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
    setting = result.scalar_one_or_none()
    
    if setting:
        setting.value = value
    else:
        setting = SiteSetting(key=key, value=value)
        db.add(setting)
        
    await db.commit()
    return {"status": "success", "key": key, "value": value}

@router.get("/tickets")
async def get_all_tickets(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(SupportTicket))
    return result.scalars().all()
