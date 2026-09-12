from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List, Dict, Sequence

from models.product import Product, ProductVariant, ProductKey
from schemas.product import ProductCreate, ProductUpdate, ProductKeyCreate

# --- EXISTING LOGIC PRESERVED EXACTLY ---

async def get_available_stock_map(db: AsyncSession, variant_ids: List[int]) -> Dict[int, int]:
    if not variant_ids:
        return {}
    query = select(ProductKey.variant_id, func.count(ProductKey.id)).where(
        ProductKey.variant_id.in_(variant_ids),
        ProductKey.is_sold == False
    ).group_by(ProductKey.variant_id)
    result = await db.execute(query)
    return dict(result.all())

async def get_products(db: AsyncSession, include_inactive: bool = False) -> Sequence[Product]:
    query = select(Product).options(selectinload(Product.variants))
    if not include_inactive:
        query = query.where(Product.is_active == True)
    result = await db.execute(query)
    products = result.scalars().all()
    
    # Calculate available stock dynamically
    variant_ids = [v.id for p in products for v in p.variants]
    stock_map = await get_available_stock_map(db, variant_ids)
    
    for p in products:
        for v in p.variants:
            v.available_stock = stock_map.get(v.id, 0)
            
    return products

async def get_product_by_id(db: AsyncSession, product_id: int) -> Product | None:
    # Public read filters for active products only
    query = select(Product).options(selectinload(Product.variants)).where(
        Product.id == product_id,
        Product.is_active == True
    )
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    
    if product:
        variant_ids = [v.id for v in product.variants]
        stock_map = await get_available_stock_map(db, variant_ids)
        for v in product.variants:
            v.available_stock = stock_map.get(v.id, 0)
            
    return product

async def create_product(db: AsyncSession, product_in: ProductCreate, vendor_id: int) -> Product:
    product_data = product_in.model_dump(exclude={"variants"})
    db_product = Product(**product_data, vendor_id=vendor_id)
    db.add(db_product)
    await db.flush()
    
    if product_in.variants:
        for variant_in in product_in.variants:
            db_variant = ProductVariant(**variant_in.model_dump(), product_id=db_product.id)
            db.add(db_variant)
            
    await db.commit()
    await db.refresh(db_product)
    
    for v in db_product.variants:
        v.available_stock = 0
        
    return db_product

async def bulk_create_product_keys(db: AsyncSession, keys_data: ProductKeyCreate) -> int:
    db_keys = [
        ProductKey(
            variant_id=keys_data.variant_id,
            key_value=kv
        ) for kv in keys_data.key_values
    ]
    db.add_all(db_keys)
    await db.commit()
    return len(db_keys)

# --- NEW LOGIC FOR UPDATE AND DELETE ---

async def get_product_by_id_for_admin(db: AsyncSession, product_id: int) -> Product | None:
    """Fetch a product by ID regardless of is_active status, for admin operations."""
    query = select(Product).options(selectinload(Product.variants)).where(
        Product.id == product_id
    )
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    
    if product:
        variant_ids = [v.id for v in product.variants]
        stock_map = await get_available_stock_map(db, variant_ids)
        for v in product.variants:
            v.available_stock = stock_map.get(v.id, 0)
            
    return product

async def update_product(db: AsyncSession, db_product: Product, product_in: ProductUpdate) -> Product:
    """Update allowed fields securely."""
    update_data = product_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        # Schema strictly limits what can be passed here, protecting id/vendor_id/created_at
        setattr(db_product, field, value)
        
    await db.commit()
    await db.refresh(db_product)
    
    # Maintain dynamic stock attribute for the returned Response model
    variant_ids = [v.id for v in db_product.variants]
    stock_map = await get_available_stock_map(db, variant_ids)
    for v in db_product.variants:
        v.available_stock = stock_map.get(v.id, 0)
        
    return db_product

async def soft_delete_product(db: AsyncSession, db_product: Product) -> Product:
    """Soft delete a product by marking it inactive."""
    db_product.is_active = False
    await db.commit()
    await db.refresh(db_product)
    return db_product
