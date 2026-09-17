from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models.order import Order, OrderItem
from models.product import ProductVariant, ProductKey

async def create_order(db: AsyncSession, user_id: int, variant_id: int) -> Order:
    """
    Creates a new order for a specific variant and safely reserves an available 
    ProductKey without permanently marking it as sold.
    Everything is executed atomically within a single database transaction,
    with rollback on failure to prevent partial reservations.
    """
    try:
        # 1. Fetch the variant and parent product for pricing and historical snapshots
        stmt_variant = (
            select(ProductVariant)
            .options(selectinload(ProductVariant.product))
            .filter(ProductVariant.id == variant_id, ProductVariant.is_active == True)
        )
        result = await db.execute(stmt_variant)
        variant = result.scalars().first()
        
        if not variant or not variant.product:
            raise ValueError("Product variant not found or inactive.")
            
        # 2. Select and lock an available product key safely
        # Check that is_sold is False AND order_id is None to ensure it isn't already reserved
        stmt_key = (
            select(ProductKey)
            .filter(
                ProductKey.variant_id == variant_id, 
                ProductKey.is_sold == False,
                ProductKey.order_id.is_(None)
            )
            .with_for_update(skip_locked=True)
        )
        result_key = await db.execute(stmt_key)
        available_key = result_key.scalars().first()
        
        if not available_key:
            raise ValueError("Out of stock: No available keys for this variant.")

        # 3. Create the Order container (Status: PENDING)
        db_order = Order(
            user_id=user_id,
            total_amount=variant.price,
            status="PENDING",
            payment_status="PENDING"
        )
        db.add(db_order)
        await db.flush()  # Flush to safely generate db_order.id without committing
        
        # 4. Generate historical snapshot strings
        snapshot_variant_name = (
            f"{variant.config_name} - {variant.duration}" 
            if variant.config_name 
            else variant.duration
        )
        
        # 5. Create the OrderItem
        db_order_item = OrderItem(
            order_id=db_order.id,
            variant_id=variant.id,
            product_key_id=available_key.id,
            price_at_purchase=variant.price,
            product_name_snapshot=variant.product.title,
            variant_name_snapshot=snapshot_variant_name
        )
        db.add(db_order_item)
        
        # 6. Reserve the key (link it to the order, but do NOT mark as sold yet)
        available_key.order_id = db_order.id
        
        # 7. Commit the entire transaction atomically
        await db.commit()
        await db.refresh(db_order)
        
        return await get_order_by_id(db, db_order.id)
        
    except Exception as e:
        await db.rollback()
        raise e


async def finalize_order(db: AsyncSession, order_id: int) -> Optional[Order]:
    """
    Finalizes the order upon successful payment.
    Safely locks the order and permanently assigns the reserved ProductKey to the user.
    Ensures that an order without valid reserved keys cannot be marked as COMPLETED.
    """
    try:
        # Lock the order to prevent concurrent status updates
        stmt_order = (
            select(Order)
            .options(selectinload(Order.items))
            .filter(Order.id == order_id)
            .with_for_update()
        )
        result_order = await db.execute(stmt_order)
        db_order = result_order.scalars().first()

        if not db_order:
            return None

        # Idempotency check: Do not process if already completed
        if db_order.status == "COMPLETED" or db_order.payment_status == "PAID":
            return db_order
            
        # Ensure the order is strictly in a PENDING state
        if db_order.status != "PENDING" or db_order.payment_status != "PENDING":
            raise ValueError("Order must be in PENDING state to be finalized.")

        # Lock the reserved keys
        stmt_keys = (
            select(ProductKey)
            .filter(ProductKey.order_id == order_id, ProductKey.is_sold == False)
            .with_for_update()
        )
        result_keys = await db.execute(stmt_keys)
        reserved_keys = result_keys.scalars().all()
        
        # Guard: Abort if no valid unsold keys are found for this order
        if not reserved_keys:
            raise ValueError("Cannot finalize order: No valid reserved keys found.")

        # Permanently mark keys as sold and link to the user
        for key in reserved_keys:
            key.is_sold = True
            key.sold_to_user_id = db_order.user_id
            # Note: key.order_id remains unchanged to keep the link to the invoice

        db_order.status = "COMPLETED"
        db_order.payment_status = "PAID"

        await db.commit()
        await db.refresh(db_order)
        return db_order

    except Exception as e:
        await db.rollback()
        raise e


async def release_order(db: AsyncSession, order_id: int) -> Optional[Order]:
    """
    Releases reserved keys back into inventory if an order is cancelled or payment fails.
    Safely locks the records to ensure state consistency.
    """
    try:
        # Lock the order
        stmt_order = (
            select(Order)
            .options(selectinload(Order.items))
            .filter(Order.id == order_id)
            .with_for_update()
        )
        result_order = await db.execute(stmt_order)
        db_order = result_order.scalars().first()

        if not db_order:
            return None

        # Do not release keys if the order has already moved past PENDING
        if db_order.status in ["COMPLETED", "CANCELLED"] or db_order.payment_status in ["PAID", "FAILED"]:
            return db_order

        # Lock the reserved keys
        stmt_keys = (
            select(ProductKey)
            .filter(ProductKey.order_id == order_id, ProductKey.is_sold == False)
            .with_for_update()
        )
        result_keys = await db.execute(stmt_keys)
        reserved_keys = result_keys.scalars().all()

        # Free the keys by removing the order reservation
        for key in reserved_keys:
            key.order_id = None

        db_order.status = "CANCELLED"
        db_order.payment_status = "FAILED"

        await db.commit()
        await db.refresh(db_order)
        return db_order

    except Exception as e:
        await db.rollback()
        raise e


async def get_order_by_id(db: AsyncSession, order_id: int) -> Optional[Order]:
    """
    Retrieves a specific order by ID, including its associated items.
    """
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_user_orders(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100) -> List[Order]:
    """
    Retrieves a paginated list of orders for a specific user.
    """
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_order_status(
    db: AsyncSession, 
    order_id: int, 
    status: Optional[str] = None, 
    payment_status: Optional[str] = None
) -> Optional[Order]:
    """
    Updates safe non-final states of an order (e.g., PENDING/CANCELLED/FAILED).
    Strictly forbids direct transition to COMPLETED or PAID, which must go through finalize_order().
    """
    try:
        if status == "COMPLETED" or payment_status == "PAID":
            raise ValueError("Cannot directly set status to COMPLETED or PAID. Use finalize_order() instead.")

        # Lock the order
        stmt_order = (
            select(Order)
            .options(selectinload(Order.items))
            .filter(Order.id == order_id)
            .with_for_update()
        )
        result_order = await db.execute(stmt_order)
        db_order = result_order.scalars().first()
        
        if not db_order:
            return None
            
        if status is not None:
            db_order.status = status
            
        if payment_status is not None:
            db_order.payment_status = payment_status
            
        await db.commit()
        await db.refresh(db_order)
        
        return db_order
    except Exception as e:
        await db.rollback()
        raise e


async def expire_pending_orders(db: AsyncSession) -> int:
    """
    Releases ProductKeys reserved by orders that have remained in PENDING status 
    beyond a 15-minute reservation timeout. Sets those orders to CANCELLED/FAILED.
    Returns the number of orders expired.
    """
    try:
        expiration_threshold = datetime.now(timezone.utc) - timedelta(minutes=15)
        
        # 1. Fetch eligible orders that are stale
        # Use skip_locked=True to safely run concurrently without blocking other operations
        stmt_orders = (
            select(Order)
            .filter(
                Order.status == "PENDING",
                Order.payment_status == "PENDING",
                Order.created_at < expiration_threshold
            )
            .with_for_update(skip_locked=True)
        )
        result = await db.execute(stmt_orders)
        expired_orders = result.scalars().all()
        
        if not expired_orders:
            return 0
            
        expired_order_ids = [order.id for order in expired_orders]
        
        # 2. Fetch and lock the reserved keys for ALL these orders at once
        stmt_keys = (
            select(ProductKey)
            .filter(
                ProductKey.order_id.in_(expired_order_ids),
                ProductKey.is_sold == False
            )
            .with_for_update()
        )
        result_keys = await db.execute(stmt_keys)
        reserved_keys = result_keys.scalars().all()
        
        # 3. Release the keys
        for key in reserved_keys:
            key.order_id = None
            
        # 4. Update order statuses to reflect expiration
        for order in expired_orders:
            order.status = "CANCELLED"
            order.payment_status = "FAILED"
            
        await db.commit()
        return len(expired_orders)
        
    except Exception as e:
        await db.rollback()
        raise e
