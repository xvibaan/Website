from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class VendorProfileResponse(BaseModel):
    id: int
    user_id: int
    business_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VendorTransactionResponse(BaseModel):
    id: int
    vendor_id: int
    transaction_type: str
    amount: Decimal
    balance_before: Decimal
    balance_after: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PayoutResponse(BaseModel):
    id: int
    vendor_id: int
    amount: Decimal
    status: str
    payout_method: Optional[str] = None
    external_reference: Optional[str] = None
    idempotency_key: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
