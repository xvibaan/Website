from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from api.deps import get_current_user
import crud.order as crud
import schemas.order as schemas

router = APIRouter(prefix="/orders", tags=["Orders"])

# ---------------------------------------------------------
# USER ENDPOINTS
# ---------------------------------------------------------

@router.post("/", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    request: schemas.CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """
    Create a new order for a specific product variant.
    Safely reserves a product key.
    """
    try:
        order = await crud.create_order(
            db=db, 
            user_id=current_user.id, 
            variant_id=request.variant_id
        )
        return order
    except ValueError as e:
        # Catch business logic errors (e.g., out of stock, inactive variant)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )


@router.get("/me", response_model=List[schemas.OrderResponse])
async def get_my_orders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """
    Retrieve a paginated list of orders belonging to the currently authenticated user.
    """
    orders = await crud.get_user_orders(
        db=db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=limit
    )
    return orders


@router.get("/{order_id}", response_model=schemas.OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Any:
    """
    Retrieve a specific order by ID.
    Users can only access their own orders.
    """
    order = await crud.get_order_by_id(db=db, order_id=order_id)
    
    # Return 404 if not found OR if it belongs to another user (to prevent IDOR/enumeration)
    if not order or order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Order not found"
        )
        
    return order
