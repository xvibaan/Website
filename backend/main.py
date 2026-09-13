from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api.auth import router as auth_router
from api.product import router as product_router
from api import order
from api.payment_method import router as payment_method_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth_router,
    prefix=f"{settings.API_V1_STR}/auth",
    tags=["Authentication"]
)

app.include_router(
    product_router,
    prefix=settings.API_V1_STR,
    tags=["Products"]
)

app.include_router(
    order.router,
    prefix=settings.API_V1_STR
)

app.include_router(
    payment_method_router,
    prefix=settings.API_V1_STR
)

@app.get("/")
async def root():
    return {"message": "Welcome to Digital Marketplace API.", "status": "active"}

@app.get(f"{settings.API_V1_STR}/reseller/status")
async def reseller_api_status():
    return {"status": "ok", "message": "Multi-reseller gateway foundation ready."}
