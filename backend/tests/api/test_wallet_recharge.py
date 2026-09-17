import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from main import app
from api.deps import get_current_user
from models.user import User
from models.wallet import Wallet
from models.payment import Payment

# Define the endpoint URL based on the project settings and router prefix
RECHARGE_URL = f"{settings.API_V1_STR}/wallet/recharge"


@pytest_asyncio.fixture(autouse=True)
async def setup_test_users(db_session: AsyncSession):
    """
    Seeds the test database with User records to satisfy Foreign Key constraints
    for Wallet and Payment tables, matching the fields in the User model.
    """
    user1 = User(
        id=1,
        email="user1@example.com",
        hashed_password="fake_hashed_password_for_testing",
        role="user",
        is_active=True
    )
    user2 = User(
        id=2,
        email="user2@example.com",
        hashed_password="fake_hashed_password_for_testing",
        role="user",
        is_active=True
    )
    
    db_session.add_all([user1, user2])
    # Flush pushes the records to the DB within the current transaction/savepoint
    # so the foreign keys can reference them successfully.
    await db_session.flush()


@pytest.mark.asyncio
async def test_recharge_unauthenticated(client: AsyncClient):
    """
    Test that an unauthenticated user cannot initiate a recharge.
    Expected: 401 Unauthorized
    """
    response = await client.post(RECHARGE_URL, json={"amount": 100.00})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_first_time_valid_recharge(authorized_client: AsyncClient, db_session: AsyncSession):
    """
    Test initiating a recharge for the first time with a valid amount.
    Expected: 
    - 201 Created
    - Payment is PENDING
    - Wallet is created for the user
    - Wallet balance is NOT credited (remains 0)
    """
    recharge_amount = 500.00
    response = await authorized_client.post(RECHARGE_URL, json={"amount": recharge_amount})
    
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "PENDING"
    assert data["amount"] == recharge_amount
    assert "id" in data
    
    payment_id = data["id"]
    
    # Verify Payment database state
    stmt_payment = select(Payment).where(Payment.id == payment_id)
    payment = (await db_session.execute(stmt_payment)).scalars().first()
    assert payment is not None
    assert payment.status == "PENDING"
    
    # Verify Wallet database state (MockUser in authorized_client has id=1)
    stmt_wallet = select(Wallet).where(Wallet.user_id == 1)
    wallet = (await db_session.execute(stmt_wallet)).scalars().first()
    assert wallet is not None
    assert wallet.id == payment.wallet_id
    # Ensure balance has not been credited yet
    assert float(wallet.balance) == 0.0


@pytest.mark.asyncio
async def test_same_user_idempotency(authorized_client: AsyncClient):
    """
    Test that submitting the same Idempotency-Key multiple times by the SAME user
    returns the exact same payment record safely.
    """
    headers = {"Idempotency-Key": "test-idemp-key-123"}
    payload = {"amount": 250.00}
    
    # First request
    response1 = await authorized_client.post(RECHARGE_URL, json=payload, headers=headers)
    assert response1.status_code == 201
    data1 = response1.json()
    
    # Second request with the identical key
    response2 = await authorized_client.post(RECHARGE_URL, json=payload, headers=headers)
    assert response2.status_code == 201
    data2 = response2.json()
    
    # Must return the exact same payment record
    assert data1["id"] == data2["id"]
    assert data1["idempotency_key"] == headers["Idempotency-Key"]


@pytest.mark.asyncio
async def test_different_user_idempotency(authorized_client: AsyncClient, client: AsyncClient):
    """
    Test that a different user cannot hijack or access an existing Idempotency-Key.
    Expected: 409 Conflict
    """
    headers = {"Idempotency-Key": "test-idemp-key-456"}
    payload = {"amount": 300.00}
    
    # 1. Create payment with User 1 (via authorized_client fixture)
    response1 = await authorized_client.post(RECHARGE_URL, json=payload, headers=headers)
    assert response1.status_code == 201
    
    # 2. Simulate User 2 securely
    class MockUser2:
        def __init__(self, id: int):
            self.id = id
            
    async def override_get_current_user_2():
        return MockUser2(id=2)
        
    app.dependency_overrides[get_current_user] = override_get_current_user_2
    
    try:
        # Try to use User 1's idempotency key with User 2
        response2 = await client.post(RECHARGE_URL, json=payload, headers=headers)
    finally:
        # Guarantee cleanup even if the test assertion fails or server errors out
        app.dependency_overrides.pop(get_current_user, None)
    
    # Should be rejected with a 409 Conflict to prevent exposing other user's payments
    assert response2.status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize("invalid_amount", [0, -50.0, -0.01])
async def test_invalid_amount(authorized_client: AsyncClient, invalid_amount: float):
    """
    Test that zero or negative recharge amounts are rejected by Pydantic validation.
    Expected: 422 Unprocessable Entity
    """
    response = await authorized_client.post(RECHARGE_URL, json={"amount": invalid_amount})
    assert response.status_code == 422
