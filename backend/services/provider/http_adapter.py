import httpx
import logging
from typing import Any, Dict, Optional

from .base import ProviderAdapter, ProviderError

logger = logging.getLogger(__name__)

class HttpProviderAdapter(ProviderAdapter):
    """
    Generic HTTP Adapter for external providers.
    Uses configuration to determine the endpoint and authentication.
    """
    def __init__(self, base_url: str, headers: Optional[Dict[str, str]] = None, timeout: float = 10.0):
        self.base_url = base_url.rstrip('/')
        self.headers = headers or {}
        self.timeout = timeout

    async def place_order(self, order_id: int, variant_external_id: str, quantity: int, extra_params: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = {
            "marketplace_order_id": order_id,
            "product_id": variant_external_id,
            "quantity": quantity
        }
        if extra_params:
            payload.update(extra_params)
            
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/order",
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "provider_order_id": data.get("id") or data.get("order_id") or str(order_id),
                    "status": data.get("status", "PROCESSING")
                }
                
        except httpx.HTTPStatusError as e:
            # e.g., 4xx or 5xx
            is_retryable = e.response.status_code >= 500 or e.response.status_code == 429
            raise ProviderError(f"HTTP Error {e.response.status_code}: {e.response.text}", is_retryable=is_retryable, original_exception=e)
            
        except httpx.RequestError as e:
            # Network errors
            raise ProviderError(f"Network Error: {str(e)}", is_retryable=True, original_exception=e)

    async def check_order_status(self, provider_order_id: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/order/{provider_order_id}",
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "provider_order_id": provider_order_id,
                    "status": data.get("status", "UNKNOWN"),
                    "extra_data": data
                }
        except Exception as e:
            raise ProviderError(f"Failed to check status: {str(e)}", is_retryable=True, original_exception=e)

    async def check_health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/health", headers=self.headers)
                return response.status_code == 200
        except Exception:
            return False
