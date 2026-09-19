import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, cast, Date

from db.database import get_db
from models.user import User
from models.product import Product
from models.order import Order
from models.payment import Payment
from models.site_settings import SiteSetting
from models.support import SupportTicket
from api.deps import get_current_admin_user
from schemas.dashboard import (
    DashboardStatsResponse,
    DashboardTransactionItem,
    MasterSwitchStatus,
    SiteSettingResponse,
    SiteSettingUpdate,
    SiteSettingBulkUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Helpers ─────────────────────────────────────────────────────────────────────

def _parse_bool_setting(value: str | None) -> bool:
    """Safely parse a string setting value into a boolean."""
    if value is None:
        return False
    return value.strip().lower() in ("true", "1", "yes", "on")


async def _get_master_switches(db: AsyncSession) -> MasterSwitchStatus:
    """
    Loads the 3 master toggles from site_settings and returns them
    as a typed MasterSwitchStatus object. Defaults apply when keys are missing.
    """
    toggle_keys = [
        "telegram_features_enabled",
        "vendor_api_enabled",
        "maintenance_mode",
    ]
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key.in_(toggle_keys))
    )
    settings_map = {s.key: s.value for s in result.scalars().all()}

    return MasterSwitchStatus(
        telegram_features_enabled=_parse_bool_setting(
            settings_map.get("telegram_features_enabled")
        ),
        vendor_api_enabled=_parse_bool_setting(
            settings_map.get("vendor_api_enabled", "true")
        ),
        maintenance_mode=_parse_bool_setting(
            settings_map.get("maintenance_mode")
        ),
    )


# ─── Dashboard Stats ────────────────────────────────────────────────────────────

@router.get(
    "/dashboard-stats",
    response_model=DashboardStatsResponse,
    summary="Smart Admin Dashboard Analytics",
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Returns comprehensive dashboard analytics plus live master switch status:
    - Revenue today (UTC)
    - Active orders (delivery_status == PROCESSING)
    - Completed orders (delivery_status == COMPLETED)
    - All-time totals (users, products, revenue)
    - Recent 5 transactions
    - Master Switchboard status (Admin toggle overview)
    """
    today_utc = datetime.now(timezone.utc).date()

    # ── Revenue Today ───────────────────────────────────────────────────────
    revenue_today_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.payment_status == "PAID",
            cast(Order.created_at, Date) == today_utc,
        )
    )
    revenue_today = float(revenue_today_result.scalar_one())

    # ── Active Orders (PROCESSING) ──────────────────────────────────────────
    active_orders_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.delivery_status == "PROCESSING"
        )
    )
    active_orders = active_orders_result.scalar_one()

    # ── Completed Orders ────────────────────────────────────────────────────
    completed_orders_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.delivery_status == "COMPLETED"
        )
    )
    completed_orders = completed_orders_result.scalar_one()

    # ── All-Time: Total Users ───────────────────────────────────────────────
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar_one()

    # ── All-Time: Total Products ────────────────────────────────────────────
    total_products_result = await db.execute(select(func.count(Product.id)))
    total_products = total_products_result.scalar_one()

    # ── All-Time: Total Revenue ─────────────────────────────────────────────
    total_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.payment_status == "PAID"
        )
    )
    total_revenue = float(total_revenue_result.scalar_one())

    # ── Recent 5 Transactions ───────────────────────────────────────────────
    recent_stmt = (
        select(Order)
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    recent_result = await db.execute(recent_stmt)
    recent_orders = recent_result.scalars().all()

    recent_transactions = [
        DashboardTransactionItem.model_validate(order)
        for order in recent_orders
    ]

    # ── Master Switchboard ──────────────────────────────────────────────────
    master_switches = await _get_master_switches(db)

    return DashboardStatsResponse(
        revenue_today=revenue_today,
        active_orders=active_orders,
        completed_orders=completed_orders,
        total_users=total_users,
        total_products=total_products,
        total_revenue=total_revenue,
        recent_transactions=recent_transactions,
        master_switches=master_switches,
    )


# ─── Master Switchboard Settings ────────────────────────────────────────────────

@router.get(
    "/settings",
    response_model=List[SiteSettingResponse],
    summary="Get all site settings",
)
async def get_site_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Retrieve all site settings (master toggles and custom settings)."""
    result = await db.execute(
        select(SiteSetting).order_by(SiteSetting.key)
    )
    return result.scalars().all()


@router.get(
    "/settings/switches",
    response_model=MasterSwitchStatus,
    summary="Get master switch status",
)
async def get_master_switches(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Get the current state of all master toggles as a typed object."""
    return await _get_master_switches(db)


@router.get(
    "/settings/{setting_key}",
    response_model=SiteSettingResponse,
    summary="Get a single site setting",
)
async def get_site_setting_by_key(
    setting_key: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Retrieve a specific site setting by its key."""
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key == setting_key)
    )
    setting = result.scalars().first()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{setting_key}' not found.",
        )
    return setting


@router.put(
    "/settings",
    response_model=SiteSettingResponse,
    summary="Create or update a site setting",
)
async def update_site_setting(
    data: SiteSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Admin: Upsert a site setting. If the key exists, its value is updated.
    If it does not exist, a new setting is created.
    """
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key == data.key)
    )
    setting = result.scalars().first()

    if setting:
        setting.value = data.value
    else:
        setting = SiteSetting(key=data.key, value=data.value)
        db.add(setting)

    await db.commit()
    await db.refresh(setting)
    return setting


@router.put(
    "/settings/bulk",
    summary="Bulk update site settings",
)
async def bulk_update_site_settings(
    data: SiteSettingBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Admin: Update multiple site settings at once.
    Accepts a dictionary of key-value pairs. Creates missing keys.
    """
    updated_keys = []
    for key, value in data.settings.items():
        result = await db.execute(
            select(SiteSetting).where(SiteSetting.key == key)
        )
        setting = result.scalars().first()

        if setting:
            setting.value = value
        else:
            setting = SiteSetting(key=key, value=value)
            db.add(setting)
        updated_keys.append(key)

    await db.commit()
    return {
        "status": "success",
        "updated_keys": updated_keys,
        "count": len(updated_keys),
    }


@router.patch(
    "/settings/toggle/{setting_key}",
    response_model=SiteSettingResponse,
    summary="Toggle a boolean site setting",
)
async def toggle_site_setting(
    setting_key: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Admin: Flip a boolean site setting between 'true' and 'false'.
    Designed for the master switchboard toggles (e.g. maintenance_mode).
    """
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key == setting_key)
    )
    setting = result.scalars().first()

    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{setting_key}' not found.",
        )

    # Flip the boolean value
    current_val = _parse_bool_setting(setting.value)
    setting.value = str(not current_val).lower()

    await db.commit()
    await db.refresh(setting)

    logger.info(
        f"Admin '{current_admin.email}' toggled '{setting_key}': "
        f"{current_val} → {not current_val}"
    )
    return setting


# ─── Support Tickets ─────────────────────────────────────────────────────────────

@router.get("/tickets")
async def get_all_tickets(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(SupportTicket))
    return result.scalars().all()
