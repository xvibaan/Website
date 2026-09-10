from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.product import Product
from schemas.product import ProductCreate

async def get_products(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Retrieve all active products."""
    result = await db.execute(
        select(Product).filter(Product.is_active == True).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def get_product_by_id(db: AsyncSession, product_id: int):
    """Retrieve a single active product by its ID."""
    result = await db.execute(
        select(Product).filter(Product.id == product_id, Product.is_active == True)
    )
    return result.scalars().first()

async def create_product(db: AsyncSession, product: ProductCreate, vendor_id: int):
    """Create a new product linked to a specific vendor."""
    db_product = Product(**product.model_dump(), vendor_id=vendor_id)
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product
