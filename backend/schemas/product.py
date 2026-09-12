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
    available_stock: int = 0

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
    key_values: List[str]

class ProductKeyResponse(BaseModel):
    id: int
    variant_id: int
    is_sold: bool
    sold_to_user_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# -------------------------
# Admin Product Update Schema
# -------------------------
class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    tg_update_url: Optional[str] = None
    tg_video_url: Optional[str] = None
    is_active: Optional[bool] = None

# -------------------------
# Admin Product Variant Update Schema
# -------------------------
class ProductVariantUpdate(BaseModel):
    config_name: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, max_digits=12, decimal_places=2)
    is_active: Optional[bool] = None
