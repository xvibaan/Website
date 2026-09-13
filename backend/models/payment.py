from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), index=True, nullable=False)
    
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String, index=True, nullable=False, default="PENDING")
    
    gateway = Column(String, nullable=True)
    gateway_order_id = Column(String, index=True, nullable=True)
    gateway_payment_id = Column(String, index=True, nullable=True)
    
    idempotency_key = Column(String, unique=True, index=True, nullable=True)
    failure_reason = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    user = relationship("User", backref="payments")
    wallet = relationship("Wallet", backref="payments")
