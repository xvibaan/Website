from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from api.deps import get_current_admin_user
import crud.product as crud
import schemas.product as schemas

router = APIRouter(prefix="/products", tags=["Products"])

# ---------------------------------------------------------
# PUBLIC ENDPOINTS
# ---------------------------------------------------------

@router.get("/", response_model=List[schemas.ProductResponse])
async def read_products(
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Retrieve all products. Publicly accessible.
    """
    return await crud.get_products(db, include_inactive=False)


# ---------------------------------------------------------
# ADMIN ONLY: KEYS & VARIANTS 
# (Static sub-paths must be defined before dynamic /{product_id} paths)
# ---------------------------------------------------------

@router.post("/keys", status_code=status.HTTP_201_CREATED)
async def create_product_keys(
    keys_data: schemas.ProductKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Bulk insert product keys. Admin only.
    """
    return await crud.bulk_create_product_keys(db, keys_data=keys_data)


@router.put("/variants/{variant_id}", response_model=schemas.ProductVariantResponse)
async def update_variant(
    variant_id: int,
    variant_in: schemas.ProductVariantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Update a product variant. Admin only.
    """
    db_variant = await crud.get_variant_by_id(db, variant_id=variant_id)
    if not db_variant:
        raise HTTPException(status_code=404, detail="Product variant not found")
        
    return await crud.update_variant(db, db_variant=db_variant, variant_in=variant_in)


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Soft delete a product variant. Admin only.
    """
    db_variant = await crud.get_variant_by_id(db, variant_id=variant_id)
    if not db_variant:
        raise HTTPException(status_code=404, detail="Product variant not found")
        
    await crud.soft_delete_variant(db, db_variant=db_variant)
    return None


# ---------------------------------------------------------
# ADMIN ONLY: BASE PRODUCTS
# ---------------------------------------------------------

@router.post("/", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: schemas.ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Create a new product. Admin only.
    """
    return await crud.create_product(db, product_in=product_in, vendor_id=current_user.id)


# ---------------------------------------------------------
# MIXED ENDPOINTS: DYNAMIC /{product_id}
# ---------------------------------------------------------

@router.get("/{product_id}", response_model=schemas.ProductResponse)
async def read_product(
    product_id: int, 
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Retrieve a specific product by ID. Publicly accessible.
    """
    db_product = await crud.get_product_by_id(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product


@router.post("/{product_id}/variants", response_model=schemas.ProductVariantResponse, status_code=status.HTTP_201_CREATED)
async def create_variant(
    product_id: int,
    variant_in: schemas.ProductVariantCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Create a new variant for a specific product. Admin only.
    """
    # Verify the parent product exists before creating a variant
    db_product = await crud.get_product_by_id_for_admin(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Parent product not found")
        
    return await crud.create_variant(db, product_id=product_id, variant_in=variant_in)


@router.put("/{product_id}", response_model=schemas.ProductResponse)
async def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Update a product. Admin only.
    """
    db_product = await crud.get_product_by_id_for_admin(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return await crud.update_product(db, db_product=db_product, product_in=product_in)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Soft delete a product. Admin only.
    """
    db_product = await crud.get_product_by_id_for_admin(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    await crud.soft_delete_product(db, db_product=db_product)
    return None
