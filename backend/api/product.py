from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any

from api.deps import get_db, get_current_user
from schemas.product import (
    ProductCreate, 
    ProductResponse, 
    ProductKeyCreate, 
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate
)
from crud import product as crud_product

router = APIRouter(prefix="/products", tags=["Products"])

# --- EXISTING ENDPOINTS ---

@router.get("/", response_model=List[ProductResponse])
async def list_products(db: AsyncSession = Depends(get_db)):
    return await crud_product.get_products(db, include_inactive=False)

@router.post("/keys")
async def insert_product_keys(
    keys_data: ProductKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    count = await crud_product.bulk_create_product_keys(db, keys_data)
    return {"message": f"Successfully inserted {count} keys."}

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return await crud_product.create_product(db, product_in, vendor_id=current_user.id)


# --- NEW: VARIANT ENDPOINTS ---
# NOTE: Declared ABOVE the `/{product_id}` routes to prevent path shadowing.

@router.put("/variants/{variant_id}", response_model=ProductVariantResponse)
async def update_variant(
    variant_id: int,
    variant_in: ProductVariantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_variant = await crud_product.get_variant_by_id(db, variant_id)
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")
        
    return await crud_product.update_variant(db, db_variant, variant_in)

@router.delete("/variants/{variant_id}")
async def delete_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_variant = await crud_product.get_variant_by_id(db, variant_id)
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")
        
    await crud_product.soft_delete_variant(db, db_variant)
    return {"message": "Variant deleted successfully."}


# --- EXISTING + NEW DYNAMIC PRODUCT ID ENDPOINTS ---

@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
async def create_product_variant(
    product_id: int,
    variant_in: ProductVariantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Verify the parent product exists before allowing a variant to attach
    db_product = await crud_product.get_product_by_id_for_admin(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Parent product not found")
        
    return await crud_product.create_variant(db, product_id, variant_in)

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await crud_product.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_product = await crud_product.get_product_by_id_for_admin(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return await crud_product.update_product(db, db_product, product_in)

@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_product = await crud_product.get_product_by_id_for_admin(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    await crud_product.soft_delete_product(db, db_product)
    return {"message": "Product deleted successfully."}
