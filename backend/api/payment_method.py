from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from api.deps import get_db, get_current_admin_user
from schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodUpdate,
    PaymentMethodResponse
)
from crud import payment_method as crud_payment_method

router = APIRouter(prefix="/payment-methods", tags=["Payment Methods"])

class PaymentMethodStatusUpdate(BaseModel):
    is_active: bool

@router.get("/", response_model=List[PaymentMethodResponse])
async def read_payment_methods_admin(
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    """
    Admin only: Get all payment methods, including inactive/hidden ones.
    """
    return await crud_payment_method.get_payment_methods(db, include_inactive=True)

@router.get("/public", response_model=List[PaymentMethodResponse])
async def read_payment_methods_public(
    db: AsyncSession = Depends(get_db)
):
    """
    Public: Get only active payment methods available for checkout/recharge.
    """
    return await crud_payment_method.get_payment_methods(db, include_inactive=False)

@router.post("/", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_method(
    payment_method_in: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    """
    Admin only: Create a new payment method.
    """
    return await crud_payment_method.create_payment_method(db, payment_method_in)

@router.put("/{payment_method_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    payment_method_id: int,
    payment_method_in: PaymentMethodUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    """
    Admin only: Update an existing payment method details.
    """
    db_payment_method = await crud_payment_method.get_payment_method_by_id(db, payment_method_id)
    if not db_payment_method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found")
    
    return await crud_payment_method.update_payment_method(db, db_payment_method, payment_method_in)

@router.patch("/{payment_method_id}/status", response_model=PaymentMethodResponse)
async def update_payment_method_status(
    payment_method_id: int,
    status_update: PaymentMethodStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    """
    Admin only: Explicitly hide or unhide a payment method.
    """
    db_payment_method = await crud_payment_method.get_payment_method_by_id(db, payment_method_id)
    if not db_payment_method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found")
    
    payment_method_in = PaymentMethodUpdate(is_active=status_update.is_active)
    return await crud_payment_method.update_payment_method(db, db_payment_method, payment_method_in)

@router.delete("/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_method(
    payment_method_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    """
    Admin only: Soft delete a payment method by setting it to inactive.
    """
    db_payment_method = await crud_payment_method.get_payment_method_by_id(db, payment_method_id)
    if not db_payment_method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found")
    
    await crud_payment_method.soft_delete_payment_method(db, db_payment_method)
    return None
