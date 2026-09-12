from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any

from api.deps import get_db, get_current_user
from schemas.product import ProductCreate, ProductResponse, ProductKeyCreate, ProductUpdate
from crud import product as crud_product

router = APIRouter(prefix="/products", tags=["Products"])

# --- EXISTING ENDPOINTS PRESERVED EXACTLY ---

@router.get("/", response_model=List[ProductResponse])
async def list_products(db: AsyncSession = Depends(get_db)):
    return await crud_product.get_products(db, include_inactive=False)

# Keep /keys above /{product_id} to prevent path shadowing
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

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await crud_product.get_product_by_id(db, product_id)
    if not product:
        # Fails silently for soft-deleted (inactive) items due to CRUD filtering
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# --- NEW ENDPOINTS ---

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Use admin fetcher so they can update/reactivate soft-deleted products
    db_product = await crud_product.get_product_by_id_for_admin(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    updated_product = await crud_product.update_product(db, db_product, product_in)
    return updated_product

@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Use admin fetcher so they can target products regardless of current active status
    db_product = await crud_product.get_product_by_id_for_admin(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    await crud_product.soft_delete_product(db, db_product)
    return {"message": "Product deleted successfully."}
