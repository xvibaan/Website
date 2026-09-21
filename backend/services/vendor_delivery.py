import logging
from typing import Optional
import httpx

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.config import settings
from models.order import Order
from models.site_settings import SiteSetting
from models.provider import ProviderProductMapping
from services.provider.factory import get_provider_adapter
from services.provider.base import ProviderError

logger = logging.getLogger(__name__)

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
    Triggers fulfillment of an order through dynamic Provider Adapters.
    Refactored to use multi-provider architecture.
    """
    if not await _is_vendor_api_enabled(db):
        logger.info(f"Vendor API is disabled by Admin. Skipping delivery for order {order_id}.")
        return None

    try:
        # Load the order with items
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .filter(Order.id == order_id)
        )
        result = await db.execute(stmt)
        db_order = result.scalars().first()

        if not db_order or not db_order.items:
            logger.error(f"Order {order_id} not found or empty.")
            return None

        # Determine Provider from the first item's mapping (assuming single-provider per order for MVP)
        first_item = db_order.items[0]
        mapping_stmt = select(ProviderProductMapping).filter(
            ProviderProductMapping.variant_id == first_item.variant_id,
            ProviderProductMapping.is_active == True
        )
        mapping_result = await db.execute(mapping_stmt)
        mapping = mapping_result.scalars().first()

        if not mapping:
            logger.warning(f"No active provider mapping found for order {order_id}, variant {first_item.variant_id}. Falling back to legacy vendor API.")
            return await _legacy_trigger_vendor_api(db_order, db)

        adapter = await get_provider_adapter(db, mapping.provider_id)
        if not adapter:
            logger.warning(f"Provider {mapping.provider_id} is disabled or misconfigured. Order {order_id} failed.")
            await _mark_delivery_failed(db, order_id, "Provider unavailable")
            return None

        # Transition to SENT_TO_PROVIDER
        db_order.delivery_status = "SENT_TO_PROVIDER"
        await db.commit()
        await db.refresh(db_order)

        # Place the order via adapter
        quantity = 1 # Assuming 1 for MVP variant logic
        extra_params = {
            "target_id": db_order.target_id,
            "user_id": db_order.user_id
        }
        
        provider_response = await adapter.place_order(
            order_id=db_order.id,
            variant_external_id=mapping.external_product_id,
            quantity=quantity,
            extra_params=extra_params
        )

        db_order.delivery_status = provider_response.get("status", "PROCESSING")
        db_order.extra_data = {"provider_order_id": provider_response.get("provider_order_id")}
        
        await db.commit()
        await db.refresh(db_order)
        
        logger.info(f"Provider delivery triggered successfully for order {order_id}.")
        return db_order

    except ProviderError as e:
        logger.error(f"Provider API Error for order {order_id}: {str(e)}", exc_info=True)
        # Note: In a production system we'd enqueue for retry if e.is_retryable
        await _mark_delivery_failed(db, order_id, str(e))
        return None

    except Exception as e:
        logger.error(f"Unexpected error during vendor delivery for order {order_id}: {e}", exc_info=True)
        await _mark_delivery_failed(db, order_id, "Internal error")
        return None


async def _legacy_trigger_vendor_api(db_order: Order, db: AsyncSession) -> Optional[Order]:
    """
    Fallback method to process orders using the legacy global vendor API configuration.
    Ensures backwards compatibility for products without explicit ProviderProductMapping.
    """
    if not settings.VENDOR_API_URL:
        logger.warning(f"VENDOR_API_URL is not configured. Skipping legacy vendor delivery for order {db_order.id}.")
        await _mark_delivery_failed(db, db_order.id, "VENDOR_API_URL not configured")
        return None

    # Transition to PROCESSING
    db_order.delivery_status = "PROCESSING"
    await db.commit()
    await db.refresh(db_order)

    # Build the exact legacy outbound payload
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

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.VENDOR_API_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": settings.VENDOR_WEBHOOK_SECRET,
                },
            )
            response.raise_for_status()

        logger.info(f"Legacy vendor delivery triggered successfully for order {db_order.id}.")
        return db_order

    except httpx.HTTPStatusError as e:
        logger.error(f"Legacy Vendor API returned HTTP {e.response.status_code} for order {db_order.id}: {e.response.text}")
        await _mark_delivery_failed(db, db_order.id, f"Legacy HTTP {e.response.status_code}")
        return None

    except httpx.RequestError as e:
        logger.error(f"Network error while contacting legacy vendor API for order {db_order.id}: {e}")
        await _mark_delivery_failed(db, db_order.id, "Legacy Network Error")
        return None

    except Exception as e:
        logger.error(f"Unexpected error during legacy vendor delivery for order {db_order.id}: {e}", exc_info=True)
        await _mark_delivery_failed(db, db_order.id, "Legacy Internal Error")
        return None


async def _mark_delivery_failed(db: AsyncSession, order_id: int, reason: str = "FAILED") -> None:
    try:
        stmt = select(Order).filter(Order.id == order_id)
        result = await db.execute(stmt)
        db_order = result.scalars().first()
        if db_order:
            db_order.delivery_status = "FAILED"
            existing_extra = db_order.extra_data or {}
            existing_extra["failure_reason"] = reason
            db_order.extra_data = existing_extra
            await db.commit()
    except Exception as inner_err:
        logger.error(f"Failed to mark delivery as FAILED for order {order_id}: {inner_err}")
        await db.rollback()
