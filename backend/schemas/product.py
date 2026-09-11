from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# -------------------------
# Product Variant Schemas
# -------------------------
class ProductVariantBase(BaseModel):
    config_name: Optional[str] = None
    duration: str
    price: Decimal = Field(..., max_digits=12, decimal_places=2)
    is_active: bool = True

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int
    available_stock: int = 0  # Calculated dynamically by CRUD, never hardcoded

    model_config = ConfigDict(from_attributes=True)

# -------------------------
# Product Schemas
# -------------------------
class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    tg_update_url: Optional[str] = None
    tg_video_url: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    variants: List[ProductVariantCreate] = Field(default_factory=list)

class ProductResponse(ProductBase):
    id: int
    vendor_id: int
    created_at: datetime
    variants: List[ProductVariantResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

# -------------------------
# Product Key Schemas
# -------------------------
class ProductKeyCreate(BaseModel):
    variant_id: int
    key_values: List[str]  # Array to allow Admin to bulk-upload stock

class ProductKeyResponse(BaseModel):
    id: int
    variant_id: int
    is_sold: bool
    sold_to_user_id: Optional[int] = None
    created_at: datetime
    
    # CRITICAL: key_value is intentionally excluded from the standard response 
    # to prevent exposing unused keys in public/admin API calls.
    # It will only be returned via a specialized secure schema upon successful purchase.

    model_config = ConfigDict(from_attributes=True)
