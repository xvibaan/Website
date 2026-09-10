from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    file_url: str

class ProductResponse(BaseModel):
    id: int
    vendor_id: int
    title: str
    description: Optional[str]
    price: float
    file_url: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
