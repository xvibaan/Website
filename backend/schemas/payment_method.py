from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PaymentMethodBase(BaseModel):
    name: str = Field(..., min_length=1)
    method_type: str = Field(..., min_length=1)
    details: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    display_order: int = Field(default=0, ge=0)

    @field_validator("name", "method_type")
    @classmethod
    def check_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field must not be empty or only whitespace")
        return v


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    method_type: Optional[str] = Field(default=None, min_length=1)
    details: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = Field(default=None, ge=0)

    @field_validator("name", "method_type")
    @classmethod
    def check_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Field must not be empty or only whitespace")
        return v


class PaymentMethodResponse(PaymentMethodBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
