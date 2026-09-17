from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CreateOrderRequest(BaseModel):
    variant_id: int
    quantity: int = Field(
        default=1,
        ge=1,
        description="Quantity of product keys to purchase. Must be at least 1."
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
    created_at: datetime
    items: List[OrderItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
