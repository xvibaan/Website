from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PaymentMethodBase(BaseModel):
    name: str
    method_type: str
    details: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    display_order: int = 0


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    method_type: Optional[str] = None
    details: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class PaymentMethodResponse(PaymentMethodBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
