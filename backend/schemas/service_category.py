from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ServiceCategoryCreate(BaseModel):
    """Schema for creating a new service category."""
    name: str = Field(..., min_length=1, max_length=255, description="Unique service name")
    description: Optional[str] = Field(None, max_length=1000, description="Service description")


class ServiceCategoryUpdate(BaseModel):
    """Schema for partially updating a service category."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class ServiceCategoryToggle(BaseModel):
    """Schema for toggling the is_active status."""
    is_active: bool


class ServiceCategoryResponse(BaseModel):
    """Full read-only response schema for a service category."""
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
