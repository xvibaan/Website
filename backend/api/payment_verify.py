from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.database import get_db
from models.user import User
from models.payment import Payment
from api.deps import get_current_user

router = APIRouter()

@router.post("/verify")
async def verify_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hybrid Verification Layer 2 (Manual Fallback).
    The user clicked "Verify Payment". We immediately check the DB, 
    and in a real environment, we would also call the Gateway Status API here.
    """
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.user_id == current_user.id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # TODO: In production, insert actual gateway status API call here.
    # e.g., status_response = await upi_gateway.check_status(payment.gateway_order_id)
    
    if payment.status == "SUCCESS":
        return {"status": "SUCCESS", "message": "Payment verified and credited"}
    elif payment.status == "PENDING":
        return {"status": "PENDING", "message": "Payment is still pending. Try again later or wait for auto-checker."}
    else:
        return {"status": "FAILED", "message": "Payment failed."}
