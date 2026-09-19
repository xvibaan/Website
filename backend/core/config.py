from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Host Market Place"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Financial Configuration
    # Must be explicitly provided in the environment.
    # Required for the system to process payments safely.
    PAYMENT_CURRENCY: str

    # Vendor API Integration (Auto-Delivery Bridge)
    VENDOR_API_URL: str = ""          # e.g., "http://vendor-api:8080/api/deliver"
    VENDOR_WEBHOOK_SECRET: str = ""   # Shared secret for authenticating vendor webhook callbacks

    # Controlled, explicitly declared dictionary mapping gateway names to their webhook secrets.
    # Can be configured in the environment via a JSON string, e.g.:
    # PAYMENT_WEBHOOK_SECRETS='{"stripe": "whsec_...", "razorpay": "rzp_..."}'
    PAYMENT_WEBHOOK_SECRETS: dict[str, str] = Field(default_factory=dict)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Prevents arbitrary/uncontrolled environment variable ingestion
    )

    def get_webhook_secret(self, gateway_name: str) -> str | None:
        """
        Safely retrieves the webhook secret for a given provider from the 
        explicitly configured dictionary.
        """
        if not gateway_name:
            return None
            
        # Normalize to lowercase to match dictionary keys securely
        normalized_gateway = gateway_name.strip().lower()
        secret = self.PAYMENT_WEBHOOK_SECRETS.get(normalized_gateway)
        
        if secret and isinstance(secret, str) and secret.strip():
            return secret.strip()
        return None

settings = Settings()
