from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CreateOrderRequest(BaseModel):
    """
    Payload for creating a new order.
    """
    variant_id: int = Field(
        ..., 
        description="The ID of the product variant to purchase."
    )


class OrderItemResponse(BaseModel):
    """
    Schema representing an individual item within an order.
    Does not expose the raw product key value.
    """
    id: int
    variant_id: int
    product_key_id: Optional[int] = None
    price_at_purchase: Decimal
    product_name_snapshot: str
    variant_name_snapshot: str

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    """
    Schema representing a complete order, including its items.
    """
    id: int
    user_id: int
    total_amount: Decimal
    status: str
    payment_status: str
    created_at: datetime
    items: List[OrderItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
