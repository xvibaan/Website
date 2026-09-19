from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Any, Dict, Literal

from pydantic import BaseModel, ConfigDict, Field


class CreateOrderRequest(BaseModel):
    variant_id: int
    quantity: int = Field(
        default=1,
        ge=1,
        description="Quantity of product keys to purchase. Must be at least 1."
    )
    target_id: Optional[str] = Field(
        None,
        description="Target Guild ID or Game User ID for auto-delivery."
    )


class OrderItemResponse(BaseModel):
    id: int
    variant_id: int
    product_key_id: Optional[int] = None
    price_at_purchase: Decimal
    product_name_snapshot: str
    variant_name_snapshot: str

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: Decimal
    status: str
    payment_status: str
    target_id: Optional[str] = None
    delivery_status: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    items: List[OrderItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
