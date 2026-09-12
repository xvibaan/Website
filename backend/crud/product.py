from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List, Dict, Sequence

from models.product import Product, ProductVariant, ProductKey
from schemas.product import (
    ProductCreate, 
    ProductUpdate, 
    ProductKeyCreate,
    ProductVariantCreate,
    ProductVariantUpdate
)

# --- INVENTORY AND STOCK LOGIC (PRESERVED EXACTLY) ---

async def get_available_stock_map(db: AsyncSession, variant_ids: List[int]) -> Dict[int, int]:
    if not variant_ids:
        return {}
    query = select(ProductKey.variant_id, func.count(ProductKey.id)).where(
        ProductKey.variant_id.in_(variant_ids),
        ProductKey.is_sold == False,
        ProductKey.order_id.is_(None)
    ).group_by(ProductKey.variant_id)
    result = await db.execute(query)
    return dict(result.all())


# --- PRODUCT CRUD LOGIC ---

async def get_products(db: AsyncSession, include_inactive: bool = False) -> Sequence[Product]:
    query = select(Product).options(selectinload(Product.variants))
    if not include_inactive:
        query = query.where(Product.is_active == True)
    result = await db.execute(query)
    products = result.scalars().all()
    
    variant_ids = [v.id for p in products for v in p.variants]
    stock_map = await get_available_stock_map(db, variant_ids)
    
    for p in products:
        for v in p.variants:
            v.available_stock = stock_map.get(v.id, 0)
            
    return products

async def get_product_by_id(db: AsyncSession, product_id: int) -> Product | None:
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
            # model_dump() seamlessly handles passing selling_price and vendor_cost to the DB model
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

async def get_product_by_id_for_admin(db: AsyncSession, product_id: int) -> Product | None:
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
    update_data = product_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_product, field, value)
        
    await db.commit()
    await db.refresh(db_product)
    
    variant_ids = [v.id for v in db_product.variants]
    stock_map = await get_available_stock_map(db, variant_ids)
    for v in db_product.variants:
        v.available_stock = stock_map.get(v.id, 0)
        
    return db_product

async def soft_delete_product(db: AsyncSession, db_product: Product) -> Product:
    db_product.is_active = False
    await db.commit()
    await db.refresh(db_product)
    return db_product


# --- VARIANT CRUD LOGIC ---

async def get_variant_by_id(db: AsyncSession, variant_id: int) -> ProductVariant | None:
    """Fetch a variant by ID regardless of is_active status."""
    query = select(ProductVariant).where(ProductVariant.id == variant_id)
    result = await db.execute(query)
    variant = result.scalar_one_or_none()
    
    if variant:
        stock_map = await get_available_stock_map(db, [variant.id])
        variant.available_stock = stock_map.get(variant.id, 0)
        
    return variant

async def create_variant(db: AsyncSession, product_id: int, variant_in: ProductVariantCreate) -> ProductVariant:
    """Create a new variant safely tied to an existing product."""
    db_variant = ProductVariant(**variant_in.model_dump(), product_id=product_id)
    db.add(db_variant)
    await db.commit()
    await db.refresh(db_variant)
    db_variant.available_stock = 0
    return db_variant

async def update_variant(db: AsyncSession, db_variant: ProductVariant, variant_in: ProductVariantUpdate) -> ProductVariant:
    """Update variant allowing only whitelisted fields to change."""
    update_data = variant_in.model_dump(exclude_unset=True)
    
    # Explicit whitelist enforcing exact fields allowed to be updated by admin, including new pricing structure
    allowed_fields = {"config_name", "duration", "selling_price", "vendor_cost", "is_active"}
    
    for field, value in update_data.items():
        if field in allowed_fields:
            setattr(db_variant, field, value)
        
    await db.commit()
    await db.refresh(db_variant)
    
    # Maintain dynamic stock relationship
    stock_map = await get_available_stock_map(db, [db_variant.id])
    db_variant.available_stock = stock_map.get(db_variant.id, 0)
    
    return db_variant

async def soft_delete_variant(db: AsyncSession, db_variant: ProductVariant) -> ProductVariant:
    """Soft delete variant preserving historical keys and purchase data."""
    db_variant.is_active = False
    await db.commit()
    await db.refresh(db_variant)
    return db_variant
