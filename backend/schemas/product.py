from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

# --- PRODUCT KEY SCHEMAS ---

class ProductKeyCreate(BaseModel):
    variant_id: int
    key_values: List[str]


class ProductKeyResponse(BaseModel):
    id: int
    variant_id: int
    is_sold: bool
    sold_to_user_id: Optional[int] = None
    order_id: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# --- PRODUCT VARIANT SCHEMAS ---

class ProductVariantBase(BaseModel):
    config_name: Optional[str] = None
    duration: str
    selling_price: Decimal
    vendor_cost: Optional[Decimal] = None
    is_active: bool = True


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    config_name: Optional[str] = None
    duration: Optional[str] = None
    selling_price: Optional[Decimal] = None
    vendor_cost: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int
    available_stock: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)


# --- PRODUCT SCHEMAS ---

class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    tg_update_url: Optional[str] = None
    tg_video_url: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = None


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    tg_update_url: Optional[str] = None
    tg_video_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    vendor_id: int
    created_at: datetime
    variants: List[ProductVariantResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)
