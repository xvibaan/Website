from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base

class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"), index=True, nullable=False)
    
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String, index=True, nullable=False, default="PENDING")
    
    payout_method = Column(String, nullable=True)
    external_reference = Column(String, index=True, nullable=True)
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
    vendor = relationship("VendorProfile", backref="payouts")
