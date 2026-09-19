from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from db.database import Base

class SiteSetting(Base):
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<SiteSetting(key='{self.key}', value='{self.value}')>"

