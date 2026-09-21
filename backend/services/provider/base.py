from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

class ProviderError(Exception):
    """Base exception for provider failures."""
    def __init__(self, message: str, is_retryable: bool = False, original_exception: Optional[Exception] = None):
        super().__init__(message)
        self.is_retryable = is_retryable
        self.original_exception = original_exception


class ProviderAdapter(ABC):
    """
    Base Provider Adapter for the Host Marketplace.
    All external provider integrations must implement this interface.
    """

    @abstractmethod
    async def place_order(self, order_id: int, variant_external_id: str, quantity: int, extra_params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Submits an order to the external provider.
        Should return a dictionary containing the provider's external order ID and status.
        Raises ProviderError on failure.
        """
        pass

    @abstractmethod
    async def check_order_status(self, provider_order_id: str) -> Dict[str, Any]:
        """
        Checks the status of an existing order with the provider.
        """
        pass

    @abstractmethod
    async def check_health(self) -> bool:
        """
        Checks if the provider API is reachable and healthy.
        """
        pass
