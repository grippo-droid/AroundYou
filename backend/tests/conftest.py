"""
Pytest configuration for the AroundYou backend test suite.

Env vars are set before any `app.*` import, since app.config.settings.Settings()
reads them at import time. Tests run against a separate database
(around_you_test_db) on the same local MongoDB instance used for dev --
this suite never touches around_you_db or production data.
"""

import os

os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "around_you_test_db")
os.environ.setdefault("JWT_SECRET", "test-secret-for-pytest-only-do-not-use-elsewhere")
os.environ.setdefault("COOKIE_SECURE", "False")
os.environ.setdefault("SMS_PROVIDER", "console")
os.environ.setdefault("LOG_LEVEL", "WARNING")  # keep test output quiet

from datetime import datetime, timedelta

import pytest_asyncio
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.config.database import db, get_database
from app.config.settings import settings

assert settings.DB_NAME == "around_you_test_db", (
    "refusing to run tests against a non-test database "
    f"(DB_NAME={settings.DB_NAME!r}) -- check env var overrides"
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _db_session():
    db.connect()
    await db.ensure_indexes()
    yield
    db.close()


@pytest_asyncio.fixture(autouse=True)
async def _clean_db():
    database = get_database()
    for name in await database.list_collection_names():
        await database[name].delete_many({})
    yield


@pytest_asyncio.fixture
async def client():
    # raise_app_exceptions=False: match real deployed behavior, where an
    # unhandled exception converted to a 500 by our global exception handler
    # only ever reaches the HTTP client as that response -- Starlette's
    # re-raise after the handler runs is for the ASGI *server* to see, not
    # the client. Without this, ASGITransport re-raises into the test itself.
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


@pytest_asyncio.fixture
async def test_business():
    """Insert a minimal, valid business doc directly -- tests don't depend
    on seed.py demo data, so they stay hermetic and repeatable."""
    database = get_database()
    doc = {
        "_id": ObjectId(),
        "owner_id": str(ObjectId()),
        "name": "Test Business",
        "category": "cafe",
        "description": "A business used for testing",
        "address": "123 Test St",
        "city": "Test City",
        "contact_number": "+919999999999",
        "is_active": True,
        "is_verified": True,
        "rating": 0.0,
        "review_count": 0,
        "followers": 0,
        "views": 0,
        "created_at": datetime.utcnow(),
    }
    await database.businesses.insert_one(doc)
    return doc


@pytest_asyncio.fixture
async def business_with_availability(test_business):
    database = get_database()
    business_id = str(test_business["_id"])
    schedules = [
        {"day": d, "start_time": "09:00", "end_time": "18:00", "is_active": True}
        for d in range(7)
    ]
    await database.availability.insert_one({
        "business_id": business_id,
        "schedules": schedules,
        "slot_duration": 30,
        "is_active": True,
    })
    return test_business


def tomorrow() -> str:
    return (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")


async def register(client: AsyncClient, phone: str, password: str = "testpass123",
                    name: str = "Test User", role: str = "user"):
    return await client.post("/auth/register", json={
        "name": name, "phone": phone, "password": password, "role": role,
    })


async def login(client: AsyncClient, phone: str, password: str = "testpass123"):
    return await client.post("/auth/login", json={"phone": phone, "password": password})


async def register_and_login(client: AsyncClient, phone: str, password: str = "testpass123",
                              name: str = "Test User"):
    r = await register(client, phone, password, name)
    assert r.status_code == 200, f"registration failed: {r.status_code} {r.text}"
    r = await login(client, phone, password)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r
