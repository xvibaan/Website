from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True) # Admin or system user who performed the action
    
    action = Column(String, index=True, nullable=False) # e.g., 'UPDATE_PRICE', 'ENABLE_PROVIDER'
    entity_type = Column(String, index=True, nullable=False) # e.g., 'ProductVariant', 'Provider'
    entity_id = Column(Integer, index=True, nullable=True)
    
    # Store old and new states. Ensure NO SECRETS are stored here.
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User")
