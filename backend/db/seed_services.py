import logging

from sqlalchemy.future import select
from sqlalchemy import func

from db.database import AsyncSessionLocal
from models.service_category import ServiceCategory
from models.site_settings import SiteSetting

logger = logging.getLogger(__name__)

# ─── Default Service Categories ─────────────────────────────────────────────────

DEFAULT_SERVICES = [
    {
        "name": "Panel",
        "description": "Server panel hosting and management service",
    },
    {
        "name": "Guild Glory Board",
        "description": "Guild glory leaderboard and ranking service",
    },
    {
        "name": "Redeem Code",
        "description": "Digital redeem code generation and distribution service",
    },
    {
        "name": "Telegram Panel",
        "description": "Telegram-based panel automation and integration service",
    },
]

# ─── Default Master Toggles (Admin Switchboard) ─────────────────────────────────

DEFAULT_SITE_SETTINGS = [
    {
        "key": "telegram_features_enabled",
        "value": "false",
        "description": "Master toggle for all Telegram-based features and integrations",
    },
    {
        "key": "vendor_api_enabled",
        "value": "true",
        "description": "Master toggle for the Vendor API auto-delivery bridge",
    },
    {
        "key": "maintenance_mode",
        "value": "false",
        "description": "When enabled, the platform enters read-only maintenance mode for all non-admin users",
    },
]


async def seed_default_services() -> None:
    """
    Seeds the service_categories table with default entries if it is empty.
    Safe to call on every startup — no-ops when data already exists.
    """
    async with AsyncSessionLocal() as db:
        try:
            count_result = await db.execute(
                select(func.count(ServiceCategory.id))
            )
            existing_count = count_result.scalar_one()

            if existing_count > 0:
                logger.info(
                    f"Service categories table already has {existing_count} entries. "
                    "Skipping seed."
                )
            else:
                for service_data in DEFAULT_SERVICES:
                    db.add(ServiceCategory(**service_data))
                await db.commit()
                logger.info(
                    f"Successfully seeded {len(DEFAULT_SERVICES)} default service categories."
                )

        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to seed default services: {e}", exc_info=True)
            raise


async def seed_default_site_settings() -> None:
    """
    Seeds the site_settings table with default master toggles if they don't exist.
    Uses upsert-by-key logic — only inserts settings whose key is not already present,
    so Admin-modified values are never overwritten on restart.
    """
    async with AsyncSessionLocal() as db:
        try:
            inserted_count = 0
            for setting_data in DEFAULT_SITE_SETTINGS:
                # Check if this key already exists
                result = await db.execute(
                    select(SiteSetting).where(
                        SiteSetting.key == setting_data["key"]
                    )
                )
                existing = result.scalars().first()

                if not existing:
                    db.add(SiteSetting(**setting_data))
                    inserted_count += 1

            if inserted_count > 0:
                await db.commit()
                logger.info(
                    f"Seeded {inserted_count} new default site settings."
                )
            else:
                logger.info("All default site settings already exist. Skipping seed.")

        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to seed default site settings: {e}", exc_info=True)
            raise
