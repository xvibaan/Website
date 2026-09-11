from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.product import ProductCreate, ProductResponse, ProductKeyCreate
from crud.product import create_product, get_products, get_product_by_id, bulk_create_product_keys
from api.deps import get_current_user
from models.user import User

router = APIRouter()

@router.get("/", response_model=List[ProductResponse])
async def read_products(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Public endpoint to view the marketplace catalog, including dynamic variants and available stock."""
    return await get_products(db, skip=skip, limit=limit)

@router.get("/{product_id}", response_model=ProductResponse)
async def read_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Public endpoint to fetch a single active product by ID, along with its variants and stock."""
    product = await get_product_by_id(db, product_id=product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_new_product(
    product: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Protected endpoint to create a new digital product with dynamic variants (Admin Only)."""
    
    # Restrict product creation strictly to admins
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only administrators can create products."
        )
        
    return await create_product(db=db, product=product, vendor_id=current_user.id)

@router.post("/keys", status_code=status.HTTP_201_CREATED)
async def add_product_keys(
    keys_data: ProductKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Protected endpoint to bulk upload digital keys for a variant (Admin Only)."""
    
    # Restrict key management strictly to admins
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only administrators can manage keys."
        )
        
    inserted_count = await bulk_create_product_keys(db=db, keys_data=keys_data)
    
    # Intentionally returning only the count to ensure raw key_values are never leaked in API responses
    return {"message": f"Successfully added {inserted_count} keys to stock."}
