from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base

class VendorTransaction(Base):
    __tablename__ = "vendor_transactions"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"), index=True, nullable=False)
    
    transaction_type = Column(String, index=True, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    balance_before = Column(Numeric(12, 2), nullable=False)
    balance_after = Column(Numeric(12, 2), nullable=False)
    
    reference_type = Column(String, index=True, nullable=True)
    reference_id = Column(Integer, index=True, nullable=True)
    description = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    vendor = relationship("VendorProfile", backref="transactions")
