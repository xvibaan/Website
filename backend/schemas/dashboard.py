from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Any, Dict

from pydantic import BaseModel, ConfigDict, Field


class DashboardTransactionItem(BaseModel):
    """Minimal order snapshot for the 'recent transactions' section."""
    id: int
    user_id: int
    total_amount: Decimal
    status: str
    payment_status: str
    delivery_status: Optional[str] = None
    target_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Master Switchboard Schemas ──────────────────────────────────────────────────

class MasterSwitchStatus(BaseModel):
    """Current state of all Admin-controlled master toggles."""
    telegram_features_enabled: bool = Field(
        False, description="Telegram features master toggle"
    )
    vendor_api_enabled: bool = Field(
        True, description="Vendor API auto-delivery master toggle"
    )
    maintenance_mode: bool = Field(
        False, description="Platform-wide maintenance mode toggle"
    )


class SiteSettingResponse(BaseModel):
    """Response schema for a single site setting."""
    id: int
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SiteSettingUpdate(BaseModel):
    """Schema for updating a site setting value."""
    key: str = Field(..., min_length=1, description="Setting key to update")
    value: str = Field(..., description="New value for the setting")


class SiteSettingBulkUpdate(BaseModel):
    """Schema for updating multiple settings at once."""
    settings: Dict[str, str] = Field(
        ..., description="Dictionary of key-value pairs to update"
    )


class DashboardStatsResponse(BaseModel):
    """Typed response for the admin dashboard analytics endpoint."""
    # Today's metrics
    revenue_today: float = Field(..., description="Total revenue from paid orders today (UTC)")
    active_orders: int = Field(..., description="Orders currently in PROCESSING delivery status")
    completed_orders: int = Field(..., description="Orders with COMPLETED delivery status")

    # All-time metrics
    total_users: int
    total_products: int
    total_revenue: float = Field(..., description="All-time revenue from paid orders")

    # Recent activity
    recent_transactions: List[DashboardTransactionItem] = Field(
        default_factory=list,
        description="Latest 5 orders"
    )

    # Admin Master Switchboard — live status at a glance
    master_switches: MasterSwitchStatus = Field(
        ..., description="Current state of all Admin-controlled master toggles"
    )
