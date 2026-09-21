from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base

class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    
    # Health tracking
    health_status = Column(String, default="UNKNOWN") # HEALTHY, UNHEALTHY, UNKNOWN
    last_successful_request = Column(DateTime(timezone=True), nullable=True)
    last_failed_request = Column(DateTime(timezone=True), nullable=True)
    failure_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    configuration = relationship("ProviderConfiguration", back_populates="provider", uselist=False, cascade="all, delete-orphan")
    product_mappings = relationship("ProviderProductMapping", back_populates="provider", cascade="all, delete-orphan")


class ProviderConfiguration(Base):
    __tablename__ = "provider_configurations"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    
    # Store API URLs, custom headers, etc. Secure credentials should ideally be in env vars or secure vaults,
    # but we'll store basic config here. Avoid putting plain text passwords in this JSON.
    config_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    provider = relationship("Provider", back_populates="configuration")


class ProviderProductMapping(Base):
    """
    Maps a core marketplace ProductVariant to an external Provider's product/service.
    """
    __tablename__ = "provider_product_mappings"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id", ondelete="CASCADE"), index=True, nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), index=True, nullable=False)
    
    external_product_id = Column(String, index=True, nullable=False)
    provider_cost = Column(Numeric(12, 2), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    provider = relationship("Provider", back_populates="product_mappings")
    variant = relationship("ProductVariant", backref="provider_mappings")
