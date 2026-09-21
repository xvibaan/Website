from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.provider import Provider, ProviderConfiguration
from .base import ProviderAdapter
from .http_adapter import HttpProviderAdapter

async def get_provider_adapter(db: AsyncSession, provider_id: int) -> Optional[ProviderAdapter]:
    """
    Retrieves the configured adapter for a given provider.
    """
    stmt = select(Provider).filter(Provider.id == provider_id, Provider.is_enabled == True)
    result = await db.execute(stmt)
    provider = result.scalars().first()
    
    if not provider:
        return None
        
    stmt_config = select(ProviderConfiguration).filter(ProviderConfiguration.provider_id == provider_id)
    result_config = await db.execute(stmt_config)
    config = result_config.scalars().first()
    
    if not config or not config.config_data:
        return None
        
    config_data = config.config_data
    
    # We default to HttpProviderAdapter as the MVP external integration
    base_url = config_data.get("base_url")
    if not base_url:
        return None
        
    headers = config_data.get("headers", {})
    
    return HttpProviderAdapter(base_url=base_url, headers=headers)
