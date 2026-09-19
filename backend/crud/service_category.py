from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.service_category import ServiceCategory
from schemas.service_category import ServiceCategoryCreate, ServiceCategoryUpdate


async def create_service_category(
    db: AsyncSession, data: ServiceCategoryCreate
) -> ServiceCategory:
    """Create a new service category."""
    db_category = ServiceCategory(
        name=data.name,
        description=data.description,
    )
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category


async def get_all_service_categories(db: AsyncSession) -> List[ServiceCategory]:
    """Admin: Retrieve all service categories (active and inactive)."""
    stmt = select(ServiceCategory).order_by(ServiceCategory.id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_active_service_categories(db: AsyncSession) -> List[ServiceCategory]:
    """User: Retrieve only active service categories."""
    stmt = (
        select(ServiceCategory)
        .filter(ServiceCategory.is_active == True)
        .order_by(ServiceCategory.id)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_service_category_by_id(
    db: AsyncSession, category_id: int
) -> Optional[ServiceCategory]:
    """Retrieve a single service category by ID."""
    stmt = select(ServiceCategory).filter(ServiceCategory.id == category_id)
    result = await db.execute(stmt)
    return result.scalars().first()


async def update_service_category(
    db: AsyncSession, category_id: int, data: ServiceCategoryUpdate
) -> Optional[ServiceCategory]:
    """Partially update a service category. Only provided fields are changed."""
    db_category = await get_service_category_by_id(db, category_id)
    if not db_category:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)

    await db.commit()
    await db.refresh(db_category)
    return db_category


async def toggle_service_category(
    db: AsyncSession, category_id: int, is_active: bool
) -> Optional[ServiceCategory]:
    """Dedicated toggle for the is_active flag."""
    db_category = await get_service_category_by_id(db, category_id)
    if not db_category:
        return None

    db_category.is_active = is_active
    await db.commit()
    await db.refresh(db_category)
    return db_category


async def delete_service_category(
    db: AsyncSession, category_id: int
) -> bool:
    """Hard-delete a service category. Returns True if deleted, False if not found."""
    db_category = await get_service_category_by_id(db, category_id)
    if not db_category:
        return False

    await db.delete(db_category)
    await db.commit()
    return True
