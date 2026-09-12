from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    tg_update_url = Column(String, nullable=True)
    tg_video_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True, nullable=False)
    
    config_name = Column(String, nullable=True)
    duration = Column(String, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    product = relationship("Product", back_populates="variants")
    keys = relationship("ProductKey", back_populates="variant", cascade="all, delete-orphan")


class ProductKey(Base):
    __tablename__ = "product_keys"

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), index=True, nullable=False)
    
    key_value = Column(String, unique=True, index=True, nullable=False)
    is_sold = Column(Boolean, default=False, index=True)
    sold_to_user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    
    # NEW: Order integration
    order_id = Column(Integer, ForeignKey("orders.id"), index=True, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    variant = relationship("ProductVariant", back_populates="keys")
    order = relationship("Order", backref="assigned_keys")


# Composite index for ultra-fast available key lookups during checkout concurrency
Index("ix_product_keys_variant_sold", ProductKey.variant_id, ProductKey.is_sold)
