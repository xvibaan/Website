import logging
from typing import Optional, Literal, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from db.database import get_db
from models.order import Order

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["Vendor Webhook"])


# ─── Schemas ────────────────────────────────────────────────────────────────────

class VendorWebhookPayload(BaseModel):
    """Incoming payload from an external Vendor API."""
    order_id: int = Field(..., description="The order to update")
    delivery_status: Literal["PROCESSING", "COMPLETED", "FAILED"] = Field(
        ..., description="New delivery status"
    )
    extra_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Arbitrary vendor data (e.g. product_key, account_details, license_code)"
    )


class VendorWebhookResponse(BaseModel):
    status: str = "success"
    message: str = "Delivery status updated"
    order_id: int


# ─── Dependencies ───────────────────────────────────────────────────────────────

async def verify_vendor_secret(
    x_webhook_secret: str = Header(..., alias="X-Webhook-Secret"),
) -> str:
    """
    Validates the shared secret sent by the Vendor API.
    Rejects requests with missing or invalid secrets.
    """
    if not settings.VENDOR_WEBHOOK_SECRET:
        logger.error("VENDOR_WEBHOOK_SECRET is not configured on this server.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook secret not configured.",
        )

    if x_webhook_secret != settings.VENDOR_WEBHOOK_SECRET:
        logger.warning("Vendor webhook received with invalid secret.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret.",
        )

    return x_webhook_secret


# ─── Endpoint ───────────────────────────────────────────────────────────────────

@router.post(
    "/vendor-status",
    response_model=VendorWebhookResponse,
    status_code=status.HTTP_200_OK,
)
async def receive_vendor_status(
    payload: VendorWebhookPayload,
    db: AsyncSession = Depends(get_db),
    _secret: str = Depends(verify_vendor_secret),
):
    """
    Webhook endpoint for external Vendor APIs to report delivery outcomes.
    
    Updates the order's `delivery_status` and optionally merges `extra_data`
    (e.g., delivered product keys, account credentials, license codes).
    """
    stmt = select(Order).filter(Order.id == payload.order_id)
    result = await db.execute(stmt)
    db_order = result.scalars().first()

    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {payload.order_id} not found.",
        )

    # Update delivery status
    db_order.delivery_status = payload.delivery_status

    # Merge extra_data (preserve existing data, overlay new keys)
    if payload.extra_data is not None:
        existing = db_order.extra_data or {}
        existing.update(payload.extra_data)
        db_order.extra_data = existing

    await db.commit()
    await db.refresh(db_order)

    logger.info(
        f"Vendor webhook updated order {payload.order_id}: "
        f"delivery_status={payload.delivery_status}, "
        f"extra_data={payload.extra_data}"
    )

    return VendorWebhookResponse(
        order_id=db_order.id,
        message=f"Order {db_order.id} delivery status updated to {payload.delivery_status}",
    )
