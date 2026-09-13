import logging
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.payment import Payment
from services.wallet_recharge import credit_wallet_after_verified_payment
from services.payment_providers.base import BasePaymentProvider, NormalizedWebhookEvent

logger = logging.getLogger(__name__)

class ProviderRegistry:
    """
    Central registry for payment gateway providers.
    Ensures that no hard-coded providers are used and prevents arbitrary gateway processing.
    """
    _providers: dict[str, BasePaymentProvider] = {}

    @classmethod
    def register(cls, name: str, provider: BasePaymentProvider) -> None:
        cls._providers[name.strip().lower()] = provider

    @classmethod
    def get(cls, name: str) -> BasePaymentProvider:
        normalized_name = name.strip().lower()
        if normalized_name not in cls._providers:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Webhook provider '{name}' is not registered."
            )
        return cls._providers[normalized_name]


def _get_provider_secret(gateway_name: str) -> str:
    """
    Retrieves the webhook signature secret for the given gateway.
    Because secrets cannot be hardcoded and the configuration layer is not yet 
    defined, this safely fails closed to prevent unverified processing.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Webhook secret configuration for '{gateway_name}' is not yet implemented."
    )


async def process_gateway_webhook(
    db: AsyncSession,
    gateway_name: str,
    raw_body: bytes,
    headers: dict[str, str]
) -> dict[str, str]:
    """
    Orchestrates secure, provider-agnostic webhook processing.
    Validates cryptographic signatures, enforces currency/amount consistency,
    maintains idempotency, and manages the atomic transaction bounds.
    """
    
    # 1. Resolve Provider safely
    provider = ProviderRegistry.get(gateway_name)
    
    # 2. Retrieve Webhook Secret (Fails closed)
    secret = _get_provider_secret(gateway_name)
    
    # 3. Cryptographic Signature Verification
    # CRITICAL: Do NOT parse the JSON/raw_body before this step succeeds.
    if not provider.verify_signature(raw_body, headers, secret):
        logger.warning("Webhook signature verification failed.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature."
        )
        
    # 4. Parse Verified Payload
    try:
        event: NormalizedWebhookEvent = provider.parse_event(raw_body)
    except Exception:
        logger.error("Failed to parse verified webhook payload.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Malformed webhook payload."
        )
        
    # 5. Atomic Database Processing
    async with db.begin_nested():
        
        # Safely lock the internal Payment row against concurrent webhook deliveries
        stmt = select(Payment).where(Payment.id == event.internal_payment_id).with_for_update()
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            logger.error("Webhook referenced an unknown internal payment ID.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment record not found."
            )
            
        if event.event_status == "SUCCESS":
            if payment.status == "COMPLETED":
                # Idempotency check: Must have an exact gateway ID match
                if payment.gateway_payment_id is None or event.gateway_payment_id != payment.gateway_payment_id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Payment already completed with a missing or conflicting gateway ID."
                    )
                logger.info("Idempotent webhook delivery for completed payment.")
                
            elif payment.status == "PENDING":
                # Validate Amount exactly
                if event.amount_paid != payment.amount:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Webhook payment amount mismatch."
                    )
                    
                # Validate Currency (Fail Closed Constraint)
                # Because Payment model currently lacks a currency field, we abort securely.
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="System currency validation is not configured. Wallet credit safely aborted."
                )
                
                # Execute core Wallet Credit Service 
                # (Unreachable due to the 501 above, structurally placed for future activation)
                await credit_wallet_after_verified_payment(
                    db=db,
                    payment_id=payment.id,
                    gateway_payment_id=event.gateway_payment_id
                )
                
            else:
                logger.info(f"Ignored SUCCESS webhook for payment in {payment.status} state.")
                
        elif event.event_status == "FAILED":
            if payment.status == "PENDING":
                payment.status = "FAILED"
                if event.gateway_payment_id:
                    payment.gateway_payment_id = event.gateway_payment_id
                await db.flush()
            logger.info("Payment marked as FAILED via webhook.")
            
        else:
            # Handle PENDING, PROCESSING, or unknown webhook statuses gracefully without failure
            logger.info(f"Webhook event status '{event.event_status}' required no action.")
            
    # 6. Commit the Outer Transaction
    # Only reachable if no HTTPException was raised (success or safe idempotency)
    await db.commit()
    
    return {"status": "processed"}
