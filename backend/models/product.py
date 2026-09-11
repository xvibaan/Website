from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    tg_update_url = Column(String, nullable=True)
    tg_video_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to dynamic configurations/durations
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    
    # e.g., "Root", "Non-Root", "Global", or Null if not needed
    config_name = Column(String, nullable=True) 
    
    # e.g., "2 Hours", "1 Day", "Lifetime"
    duration = Column(String, nullable=False) 
    
    # Using Numeric for exact monetary values
    price = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, default=True)

    product = relationship("Product", back_populates="variants")
    keys = relationship("ProductKey", back_populates="variant", cascade="all, delete-orphan")


class ProductKey(Base):
    __tablename__ = "product_keys"

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    
    # The actual digital key/token the user receives
    key_value = Column(String, nullable=False, unique=True)
    is_sold = Column(Boolean, default=False)
    
    # Tracks who bought the key
    sold_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    variant = relationship("ProductVariant", back_populates="keys")
