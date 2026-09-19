import logging
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.config import settings
from models.order import Order
from models.site_settings import SiteSetting

logger = logging.getLogger(__name__)

# Timeout for the outbound POST to the vendor API (seconds)
VENDOR_REQUEST_TIMEOUT = 10.0


async def _is_vendor_api_enabled(db: AsyncSession) -> bool:
    """Check the Admin-controlled master switch for vendor API delivery."""
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key == "vendor_api_enabled")
    )
    setting = result.scalars().first()
    if not setting or not setting.value:
        return True  # Default to enabled if setting is missing
    return setting.value.strip().lower() in ("true", "1", "yes", "on")


async def trigger_vendor_api(order_id: int, db: AsyncSession) -> Optional[Order]:
    """
    Sends a POST request to an external Vendor API with order delivery details.
    
    Respects the Admin-controlled 'vendor_api_enabled' master switch.
    If the switch is OFF, the delivery is silently skipped.
    
    Flow:
    1. Check vendor_api_enabled master switch
    2. Load the order and set delivery_status = "PROCESSING"
    3. POST order payload to VENDOR_API_URL
    4. On transport/HTTP error → set delivery_status = "FAILED" and log
    """
    # ── Master Switch Gate ──────────────────────────────────────────────────
    if not await _is_vendor_api_enabled(db):
        logger.info(
            f"Vendor API is disabled by Admin. Skipping delivery for order {order_id}."
        )
        return None

    if not settings.VENDOR_API_URL:
        logger.warning(
            f"VENDOR_API_URL is not configured. Skipping vendor delivery for order {order_id}."
        )
        return None

    try:
        # 1. Load the order with related items
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .filter(Order.id == order_id)
        )
        result = await db.execute(stmt)
        db_order = result.scalars().first()

        if not db_order:
            logger.error(f"Order {order_id} not found for vendor delivery.")
            return None

        # 2. Transition to PROCESSING
        db_order.delivery_status = "PROCESSING"
        await db.commit()
        await db.refresh(db_order)

        # 3. Build the outbound payload
        payload = {
            "order_id": db_order.id,
            "user_id": db_order.user_id,
            "target_id": db_order.target_id,
            "total_amount": str(db_order.total_amount),
            "items": [
                {
                    "product_name": item.product_name_snapshot,
                    "variant_name": item.variant_name_snapshot,
                    "price": str(item.price_at_purchase),
                }
                for item in db_order.items
            ],
        }

        # 4. Send the POST request to the vendor API
        async with httpx.AsyncClient(timeout=VENDOR_REQUEST_TIMEOUT) as client:
            response = await client.post(
                settings.VENDOR_API_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": settings.VENDOR_WEBHOOK_SECRET,
                },
            )
            response.raise_for_status()

        logger.info(
            f"Vendor delivery triggered successfully for order {order_id}. "
            f"Vendor API responded with status {response.status_code}."
        )
        return db_order

    except httpx.HTTPStatusError as e:
        logger.error(
            f"Vendor API returned HTTP {e.response.status_code} for order {order_id}: "
            f"{e.response.text}"
        )
        await _mark_delivery_failed(db, order_id)
        return None

    except httpx.RequestError as e:
        logger.error(
            f"Network error while contacting vendor API for order {order_id}: {e}"
        )
        await _mark_delivery_failed(db, order_id)
        return None

    except Exception as e:
        logger.error(
            f"Unexpected error during vendor delivery for order {order_id}: {e}",
            exc_info=True,
        )
        await _mark_delivery_failed(db, order_id)
        return None


async def _mark_delivery_failed(db: AsyncSession, order_id: int) -> None:
    """Helper to safely set delivery_status = FAILED on error."""
    try:
        stmt = select(Order).filter(Order.id == order_id)
        result = await db.execute(stmt)
        db_order = result.scalars().first()
        if db_order:
            db_order.delivery_status = "FAILED"
            await db.commit()
    except Exception as inner_err:
        logger.error(
            f"Failed to mark delivery as FAILED for order {order_id}: {inner_err}"
        )
        await db.rollback()
