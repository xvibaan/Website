import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from main import app
from api.deps import get_db, get_current_user
from db.database import Base

# Import all models so they are registered with Base.metadata before create_all()
import models.user
import models.product
import models.order
import models.wallet
import models.wallet_transaction
import models.payment
import models.vendor
import models.vendor_transaction
import models.payout
import models.payment_method

# SECURITY: The test database URL must be explicitly set via environment variables.
# This prevents accidental connections to the development or production databases.
# No fallback or localhost default is provided.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL environment variable is missing. "
        "Explicitly set this variable (e.g., postgresql+asyncpg://user:pass@localhost:5432/test_db) "
        "to run tests safely. Test execution is halted to prevent data loss."
    )

# Create the test async engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """
    Creates fresh database tables before the test session begins
    and tears them down after all tests complete.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await test_engine.dispose()

@pytest_asyncio.fixture
async def db_session():
    """
    Yields an isolated database session for a single test.
    
    By binding the session to a connection and using `join_transaction_mode="create_savepoint"`,
    any `await db.commit()` inside the application code will merely release a savepoint 
    instead of committing the outer transaction. This guarantees that when the test finishes,
    the outer transaction is rolled back, wiping all data to maintain test isolation.
    """
    async with test_engine.connect() as conn:
        # Start an outer transaction
        trans = await conn.begin()
        
        # Bind the session to the connection and use savepoints for nested commits
        SessionLocal = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint"
        )
        
        async with SessionLocal() as session:
            yield session
            
        # Rollback the outer transaction, reverting everything (even if the app committed)
        await trans.rollback()

@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """
    Yields an async HTTP client configured to route requests to the FastAPI app.
    Overrides the database dependency to use our isolated test session.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
        
    app.dependency_overrides.pop(get_db, None)

class MockUser:
    """A minimal mock user to satisfy endpoints requesting current_user.id"""
    def __init__(self, id: int):
        self.id = id

@pytest_asyncio.fixture
async def authorized_client(client: AsyncClient):
    """
    Yields a test client with get_current_user overridden, simulating an authenticated user.
    """
    async def override_get_current_user():
        return MockUser(id=1)

    app.dependency_overrides[get_current_user] = override_get_current_user
    
    yield client
    
    app.dependency_overrides.pop(get_current_user, None)
