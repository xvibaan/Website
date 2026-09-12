from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String, default="PENDING", index=True)          # e.g., PENDING, COMPLETED, CANCELLED
    payment_status = Column(String, default="PENDING", index=True)  # e.g., PENDING, PAID, FAILED, REFUNDED
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    
    # Cascade delete ensures if an order is deleted, its items are cleaned up
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=False)
    
    # Variant is NOT NULL; relies on soft-delete to keep historical records intact
    variant_id = Column(Integer, ForeignKey("product_variants.id"), index=True, nullable=False)
    
    # Links to the exact delivered digital key (Nullable and UNIQUE to prevent double-assignment)
    product_key_id = Column(Integer, ForeignKey("product_keys.id"), unique=True, nullable=True)

    # Historical Snapshots
    price_at_purchase = Column(Numeric(10, 2), nullable=False)
    product_name_snapshot = Column(String, nullable=False)
    variant_name_snapshot = Column(String, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant")
    product_key = relationship("ProductKey", backref="order_item")
