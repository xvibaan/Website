import logging
from fastapi import APIRouter, Request, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from services.webhook_processor import process_gateway_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/{gateway_name}", status_code=status.HTTP_200_OK)
async def receive_webhook(
    gateway_name: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Unified webhook reception endpoint.
    Gateway authentication is handled safely via signature verification 
    inside the processor layer, NOT via global authentication dependencies.
    """
    raw_body = await request.body()
    headers = dict(request.headers)

    await process_gateway_webhook(
        db=db,
        gateway_name=gateway_name,
        raw_body=raw_body,
        headers=headers
    )

    return {"status": "success", "message": "Webhook processed successfully"}
