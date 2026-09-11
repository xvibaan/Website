from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from models.product import Product, ProductVariant, ProductKey
from schemas.product import ProductCreate, ProductKeyCreate

async def get_available_stock_map(db: AsyncSession, variant_ids: list[int]) -> dict[int, int]:
    """Helper function to calculate dynamic available stock for given variant IDs."""
    if not variant_ids:
        return {}
    
    stmt = select(
        ProductKey.variant_id, 
        func.count(ProductKey.id)
    ).filter(
        ProductKey.variant_id.in_(variant_ids),
        ProductKey.is_sold == False
    ).group_by(ProductKey.variant_id)
    
    result = await db.execute(stmt)
    return {row[0]: row[1] for row in result.all()}

async def get_products(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Retrieve all active products with their variants and dynamic stock."""
    stmt = select(Product).options(
        selectinload(Product.variants)
    ).filter(Product.is_active == True).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    products = result.scalars().all()
    
    # Dynamically calculate and assign stock without exposing raw keys
    variant_ids = [v.id for p in products for v in p.variants]
    stock_map = await get_available_stock_map(db, variant_ids)
    
    for p in products:
        for v in p.variants:
            v.available_stock = stock_map.get(v.id, 0)
            
    return products

async def get_product_by_id(db: AsyncSession, product_id: int):
    """Retrieve a single active product by its ID with variants and stock."""
    stmt = select(Product).options(
        selectinload(Product.variants)
    ).filter(Product.id == product_id, Product.is_active == True)
    
    result = await db.execute(stmt)
    product = result.scalars().first()
    
    if product:
        variant_ids = [v.id for v in product.variants]
        stock_map = await get_available_stock_map(db, variant_ids)
        for v in product.variants:
            v.available_stock = stock_map.get(v.id, 0)
            
    return product

async def create_product(db: AsyncSession, product: ProductCreate, vendor_id: int):
    """Create a new product with multiple dynamic variants."""
    # Separate base product data from variants to insert cleanly
    product_data = product.model_dump(exclude={"variants"})
    db_product = Product(**product_data, vendor_id=vendor_id)
    
    # Append dynamic variants
    for variant_data in product.variants:
        db_variant = ProductVariant(**variant_data.model_dump())
        db_product.variants.append(db_variant)
        
    db.add(db_product)
    await db.commit()
    
    # Refresh the product with its relationships safely for async Pydantic parsing
    stmt = select(Product).options(
        selectinload(Product.variants)
    ).filter(Product.id == db_product.id)
    
    result = await db.execute(stmt)
    refreshed_product = result.scalars().first()
    
    # Initialize available_stock to 0 for the immediate response
    for v in refreshed_product.variants:
        v.available_stock = 0
        
    return refreshed_product

async def bulk_create_product_keys(db: AsyncSession, keys_data: ProductKeyCreate):
    """Securely bulk insert keys for a specific variant without exposing raw data."""
    db_keys = [
        ProductKey(
            variant_id=keys_data.variant_id, 
            key_value=kv
        ) for kv in keys_data.key_values
    ]
    db.add_all(db_keys)
    await db.commit()
    
    return len(db_keys) # Return only the count of inserted keys for security
