from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from db.database import Base


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<ServiceCategory(id={self.id}, name='{self.name}', active={self.is_active})>"
