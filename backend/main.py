from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings

# Exact existing module paths
from api.auth import router as auth_router
from api.product import router as product_router
from api import order
from api.payment_method import router as payment_method_router
from api.wallet_recharge import router as wallet_recharge_router
from api.webhooks import router as webhooks_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.admin import router as admin_router
from api.payment_verify import router as payment_verify_router

# Register routers
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

# Register the webhook router (No authentication dependencies added here)
app.include_router(
    webhooks_router,
    prefix=settings.API_V1_STR
)

# Preserve existing reseller status endpoint
@app.get(f"{settings.API_V1_STR}/reseller/status", tags=["Reseller"])
async def get_reseller_status():
    return {"status": "ok", "message": "Multi-reseller gateway foundation ready."}

# Preserve existing root endpoint
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to Digital Marketplace API.", "status": "active"}
