from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, cast, Date

from db.database import get_db
from models.user import User
from models.order import Order, OrderItem
from models.provider import Provider, ProviderProductMapping
from models.wallet_transaction import WalletTransaction
from api.deps import get_current_admin_user

router = APIRouter(prefix="/analytics", tags=["Admin Analytics"])

@router.get("/provider")
async def get_provider_analytics(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None)
):
    """
    Dynamically fetches analytics grouped by Provider.
    Includes sales, provider cost, margin, and order counts.
    """
    # Base query for joined order items and mappings
    stmt = (
        select(
            Provider.id,
            Provider.name,
            func.count(Order.id).label("order_count"),
            func.sum(OrderItem.price_at_purchase).label("sales_revenue"),
            func.sum(OrderItem.vendor_cost_snapshot).label("provider_cost"),
            func.sum(OrderItem.platform_profit_snapshot).label("margin")
        )
        .select_from(Order)
        .join(OrderItem, Order.id == OrderItem.order_id)
        .join(ProviderProductMapping, OrderItem.variant_id == ProviderProductMapping.variant_id)
        .join(Provider, ProviderProductMapping.provider_id == Provider.id)
        .where(Order.payment_status == "PAID")
    )
    
    if start_date:
        stmt = stmt.where(Order.created_at >= start_date)
    if end_date:
        stmt = stmt.where(Order.created_at <= end_date)
        
    stmt = stmt.group_by(Provider.id, Provider.name)
    
    result = await db.execute(stmt)
    records = result.all()
    
    return [
        {
            "provider_id": r.id,
            "provider_name": r.name,
            "order_count": r.order_count,
            "sales_revenue": float(r.sales_revenue or 0),
            "provider_cost": float(r.provider_cost or 0),
            "margin": float(r.margin or 0)
        }
        for r in records
    ]

@router.get("/wallet")
async def get_wallet_analytics(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None)
):
    """
    Fetches analytics for wallet deposits vs spending.
    Ensures wallet deposits (credits) are separated from product sales (debits).
    """
    stmt = select(
        WalletTransaction.transaction_type,
        func.sum(WalletTransaction.amount).label("total_amount"),
        func.count(WalletTransaction.id).label("tx_count")
    )
    
    if start_date:
        stmt = stmt.where(WalletTransaction.created_at >= start_date)
    if end_date:
        stmt = stmt.where(WalletTransaction.created_at <= end_date)
        
    stmt = stmt.group_by(WalletTransaction.transaction_type)
    
    result = await db.execute(stmt)
    records = result.all()
    
    deposits = 0
    spending = 0
    deposit_count = 0
    spending_count = 0
    
    for r in records:
        if r.transaction_type == "CREDIT":
            deposits = float(r.total_amount or 0)
            deposit_count = r.tx_count
        elif r.transaction_type == "DEBIT":
            spending = float(abs(r.total_amount or 0))
            spending_count = r.tx_count
            
    return {
        "deposits": {"amount": deposits, "count": deposit_count},
        "spending": {"amount": spending, "count": spending_count}
    }
