from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any, Dict
from pydantic import BaseModel, Field

class NormalizedWebhookEvent(BaseModel):
    """
    A unified, gateway-agnostic representation of a verified payment webhook event.
    Every specific payment provider must map their chaotic, proprietary JSON 
    payloads into this strict schema before internal business logic is executed.
    """
    internal_payment_id: int = Field(
        ..., 
        description="Our system's primary key for the Payment record."
    )
    gateway_payment_id: str = Field(
        ..., 
        description="The unique transaction identifier provided by the external gateway."
    )
    amount_paid: Decimal = Field(
        ..., 
        description="The exact monetary amount successfully charged by the gateway."
    )
    currency: str = Field(
        ..., 
        description="The ISO 4217 currency code (e.g., 'USD', 'INR')."
    )
    event_status: str = Field(
        ..., 
        description="Normalized status of the payment (e.g., 'SUCCESS', 'FAILED', 'PENDING')."
    )
    raw_data: Dict[str, Any] | None = Field(
        default=None, 
        description="The raw payload parsed into a dict, useful for debugging or extended logging."
    )


class BasePaymentProvider(ABC):
    """
    Abstract Base Class defining the contract for all external payment gateways.
    Implementations of this interface must handle gateway-specific cryptography 
    and payload mapping securely.
    """

    @abstractmethod
    def verify_signature(self, raw_body: bytes, headers: Dict[str, str], secret: str) -> bool:
        """
        Cryptographically verifies that the webhook payload genuinely originated 
        from the payment gateway and has not been tampered with.

        Args:
            raw_body: The exact raw bytes of the HTTP request body. 
                      Must not be parsed or reformatted before verification.
            headers: The HTTP headers containing the gateway's cryptographic signature.
            secret: The private webhook signing secret shared between our server and the gateway.

        Returns:
            bool: True if the signature is perfectly valid, False otherwise.
        """
        pass

    @abstractmethod
    def parse_event(self, raw_body: bytes) -> NormalizedWebhookEvent:
        """
        Parses the raw webhook body into a strictly typed NormalizedWebhookEvent.
        This method assumes the payload's authenticity has already been verified 
        via verify_signature().

        Args:
            raw_body: The exact raw bytes of the HTTP request body.

        Returns:
            NormalizedWebhookEvent: The unified representation of the payment event.
            
        Raises:
            ValueError/ValidationError: If the payload cannot be mapped or lacks required fields.
        """
        pass
