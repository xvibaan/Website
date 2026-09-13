from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WalletTransactionResponse(BaseModel):
    id: int
    wallet_id: int
    transaction_type: str
    amount: Decimal
    balance_before: Decimal
    balance_after: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RechargeRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)


class PaymentResponse(BaseModel):
    id: int
    user_id: int
    wallet_id: int
    amount: Decimal
    status: str
    gateway: Optional[str] = None
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
