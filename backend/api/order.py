from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, get_current_user
from schemas.order import CreateOrderRequest, OrderResponse
from crud.order import (
    create_wallet_purchase,
    get_user_orders,
    get_order_by_id
)

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Creates a new atomic order funded directly from the user's wallet.
    Requires an authenticated user.
    """
    # Defensive validation (Schema already enforces ge=1, but adding for extra safety)
    if payload.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be at least 1."
        )
        
    order = await create_wallet_purchase(
        db=db,
        user_id=current_user.id,
        variant_id=payload.variant_id,
        quantity=payload.quantity
    )
    
    return order


@router.get("/", response_model=List[OrderResponse])
async def read_user_orders(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve all orders placed by the currently authenticated user.
    """
    orders = await get_user_orders(db=db, user_id=current_user.id)
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def read_order_by_id(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve a specific order by its ID.
    Enforces authorization to ensure users can only view their own orders.
    """
    order = await get_order_by_id(db=db, order_id=order_id)
    
    if not order or order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
        
    return order
