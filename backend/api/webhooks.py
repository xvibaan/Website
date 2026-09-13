from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from api.deps import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/{gateway_name}", status_code=status.HTTP_200_OK)
async def handle_payment_webhook(
    gateway_name: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Generic webhook receiver for all payment gateways.
    - No `get_current_user` auth required (gateways call this directly).
    - Uses raw bytes for cryptographic signature verification.
    - Provider registration and validation are handled entirely by the processor layer.
    """
    # 1. Extract raw bytes and headers for signature verification.
    # Note: DO NOT parse as JSON here; Pydantic/JSON parsing alters byte order 
    # and destroys the ability to cryptographically verify the HMAC signature.
    raw_body = await request.body()
    headers = dict(request.headers)

    # 2. Safely defer to the webhook processing service, if it exists.
    # Gateway validation (checking if the provider is registered) is delegated to this service.
    try:
        from services.webhook_processor import process_gateway_webhook
    except (ImportError, AttributeError):
        # Fallback if the processor layer hasn't been implemented yet
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook processor layer is not yet implemented."
        )

    # 3. Pass control to the service layer.
    # The processor handles gateway allowlisting, signature validation, parsing, 
    # deduplication, and database commits.
    await process_gateway_webhook(
        db=db,
        gateway_name=gateway_name.lower(),
        raw_body=raw_body,
        headers=headers
    )

    # 4. Acknowledge receipt to the gateway to prevent retry spam.
    return {"status": "success", "message": "Webhook processed successfully"}
