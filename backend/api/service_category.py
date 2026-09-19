from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from api.deps import get_current_admin_user
from schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryToggle,
    ServiceCategoryResponse,
)
from crud.service_category import (
    create_service_category,
    get_all_service_categories,
    get_active_service_categories,
    get_service_category_by_id,
    update_service_category,
    toggle_service_category,
    delete_service_category,
)

router = APIRouter()


# ─── Public User Endpoint ───────────────────────────────────────────────────────

@router.get(
    "/services/active",
    response_model=List[ServiceCategoryResponse],
    tags=["Services"],
    summary="List active services",
)
async def list_active_services(db: AsyncSession = Depends(get_db)):
    """
    Returns only service categories where is_active == True.
    No authentication required — this is a public catalog endpoint.
    """
    return await get_active_service_categories(db)


# ─── Admin CRUD Endpoints ───────────────────────────────────────────────────────

@router.post(
    "/admin/services/",
    response_model=ServiceCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Admin - Services"],
    summary="Create a new service category",
)
async def admin_create_service(
    data: ServiceCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """Create a new service category. Admin only."""
    try:
        return await create_service_category(db, data)
    except Exception as e:
        # Handle unique constraint violation on name
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create service category: {e}",
        )


@router.get(
    "/admin/services/",
    response_model=List[ServiceCategoryResponse],
    tags=["Admin - Services"],
    summary="List all service categories (including inactive)",
)
async def admin_list_all_services(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """Admin: Retrieve all service categories regardless of active status."""
    return await get_all_service_categories(db)


@router.get(
    "/admin/services/{category_id}",
    response_model=ServiceCategoryResponse,
    tags=["Admin - Services"],
    summary="Get a single service category",
)
async def admin_get_service(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """Admin: Retrieve a specific service category by ID."""
    category = await get_service_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service category with id {category_id} not found.",
        )
    return category


@router.put(
    "/admin/services/{category_id}",
    response_model=ServiceCategoryResponse,
    tags=["Admin - Services"],
    summary="Update a service category",
)
async def admin_update_service(
    category_id: int,
    data: ServiceCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """Admin: Partially update a service category's fields."""
    updated = await update_service_category(db, category_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service category with id {category_id} not found.",
        )
    return updated


@router.patch(
    "/admin/services/{category_id}/toggle",
    response_model=ServiceCategoryResponse,
    tags=["Admin - Services"],
    summary="Toggle service active status",
)
async def admin_toggle_service(
    category_id: int,
    data: ServiceCategoryToggle,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """Admin: Toggle the is_active flag on a service category."""
    toggled = await toggle_service_category(db, category_id, data.is_active)
    if not toggled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service category with id {category_id} not found.",
        )
    return toggled


@router.delete(
    "/admin/services/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Admin - Services"],
    summary="Delete a service category",
)
async def admin_delete_service(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """Admin: Permanently delete a service category."""
    deleted = await delete_service_category(db, category_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service category with id {category_id} not found.",
        )
    return None
