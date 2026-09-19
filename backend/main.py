import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.future import select

from core.config import settings
from db.database import AsyncSessionLocal
from db.seed_services import seed_default_services, seed_default_site_settings
from models.site_settings import SiteSetting

# Exact existing module paths
from api.auth import router as auth_router
from api.product import router as product_router
from api import order
from api.payment_method import router as payment_method_router
from api.wallet_recharge import router as wallet_recharge_router
from api.webhooks import router as webhooks_router
from api.admin import router as admin_router
from api.payment_verify import router as payment_verify_router
from api.service_category import router as service_category_router
from api.vendor_webhook import router as vendor_webhook_router

logger = logging.getLogger(__name__)


# ─── Lifespan (startup / shutdown) ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — runs seed tasks on startup."""
    logger.info("Starting Host Market Place API...")
    await seed_default_services()
    await seed_default_site_settings()
    logger.info("Startup tasks completed. All systems operational.")
    yield
    logger.info("Host Market Place API shutdown.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Host Market Place — Admin-controlled digital services marketplace",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)


# ─── Maintenance Mode Middleware ─────────────────────────────────────────────────

# Routes that are ALWAYS allowed, even during maintenance
MAINTENANCE_EXEMPT_PREFIXES = (
    f"{settings.API_V1_STR}/admin",      # All Admin endpoints
    f"{settings.API_V1_STR}/auth/login",  # Admin needs to log in
    f"{settings.API_V1_STR}/webhooks",    # Payment webhooks must not be blocked
    f"{settings.API_V1_STR}/webhook",     # Vendor webhook callbacks
)


@app.middleware("http")
async def maintenance_mode_middleware(request: Request, call_next):
    """
    If maintenance_mode is 'true' in SiteSetting, block all public traffic
    with a 503 Service Unavailable response. Admin routes, auth/login,
    and inbound webhooks are always exempt.
    """
    request_path = request.url.path

    # Always allow: root health check, OpenAPI docs, and exempt prefixes
    if (
        request_path == "/"
        or request_path.startswith("/docs")
        or request_path.startswith("/redoc")
        or request_path.startswith("/openapi")
        or any(request_path.startswith(prefix) for prefix in MAINTENANCE_EXEMPT_PREFIXES)
    ):
        return await call_next(request)

    # Check maintenance_mode from the database
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SiteSetting.value).where(
                    SiteSetting.key == "maintenance_mode"
                )
            )
            value = result.scalar_one_or_none()

            if value and value.strip().lower() in ("true", "1", "yes", "on"):
                return JSONResponse(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    content={
                        "detail": "Host Market Place is currently under maintenance. Please try again later.",
                        "status": "maintenance",
                    },
                )
    except Exception as e:
        # If we can't reach the DB, fail open (don't block the request)
        logger.error(f"Maintenance mode check failed: {e}")

    return await call_next(request)


# ─── CORS Configuration ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Register Routers ───────────────────────────────────────────────────────────

app.include_router(
    auth_router,
    prefix=f"{settings.API_V1_STR}/auth",
    tags=["Authentication"]
)
app.include_router(product_router, prefix=settings.API_V1_STR)
app.include_router(order.router, prefix=settings.API_V1_STR)
app.include_router(payment_method_router, prefix=settings.API_V1_STR)
app.include_router(wallet_recharge_router, prefix=settings.API_V1_STR)
app.include_router(payment_verify_router, prefix=f"{settings.API_V1_STR}/payment")
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])

# Payment gateway webhooks (signature-verified internally, no auth dependency)
app.include_router(
    webhooks_router,
    prefix=settings.API_V1_STR
)

# Service Category routes (public + admin, under /api/v1)
app.include_router(
    service_category_router,
    prefix=settings.API_V1_STR,
)

# Vendor Webhook route (external vendor API callbacks, under /api/v1)
app.include_router(
    vendor_webhook_router,
    prefix=settings.API_V1_STR,
)


# ─── Root & Health Endpoints ─────────────────────────────────────────────────────

@app.get("/", tags=["Root"], summary="API Health Check")
async def root():
    """Branded welcome endpoint — always accessible, even during maintenance."""
    return {
        "message": "Welcome to Host Market Place API",
        "status": "Active",
        "version": settings.VERSION,
    }


@app.get(f"{settings.API_V1_STR}/reseller/status", tags=["Reseller"])
async def get_reseller_status():
    return {"status": "ok", "message": "Multi-reseller gateway foundation ready."}
