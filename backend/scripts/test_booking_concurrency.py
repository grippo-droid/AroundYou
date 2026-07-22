"""
Concurrency test for POST /bookings/business/{business_id}/book.

Fires N simultaneous booking requests at the SAME slot and tallies outcomes.
PASS = exactly one 2xx (one booking wins, the rest are rejected).

Usage:
    venv/Scripts/python.exe scripts/test_booking_concurrency.py [--n 50]

Requires:
    - Local backend running on http://localhost:8000 (NOT the deployed Render instance)
    - Local MongoDB reachable at MONGO_URI below
    - Seeded demo users (see backend/seed.py / README):
        business owner: +919654321098 / business123 (owns "Cafe Aroha")
        regular user:   +919876543210 / password123

NOTE ON AUTH: POST /auth/login mutates a FastAPI-injected `Response` object
via response.set_cookie(...), but the route handler returns a *different*
JSONResponse instance (ResponseModel.success), so the Set-Cookie header
never reaches the client (verified with curl: zero Set-Cookie header on
/auth/login). The real frontend (src/lib/api_client.ts) doesn't rely on
the cookie either -- it stores `access_token` from the JSON body and sends
it as `Authorization: Bearer <token>`. This script does the same.
"""

import argparse
import asyncio
from collections import Counter
from datetime import datetime, timedelta

import httpx
from pymongo import MongoClient

BASE_URL = "http://localhost:8000"
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "around_you_db"

OWNER_PHONE = "+919654321098"
OWNER_PASSWORD = "business123"
USER_PHONE = "+919876543210"
USER_PASSWORD = "password123"

BUSINESS_ID = "6a42e9f0376d846e06e692a8"  # Cafe Aroha, owner_id 000000000000000000000010
TIME_SLOT = "09:00"
SLOT_DURATION = 30


def next_weekday(target_weekday: int) -> str:
    """Next occurrence of target_weekday (0=Mon) that is at least 1 day out."""
    today = datetime.utcnow().date()
    days_ahead = (target_weekday - today.weekday()) % 7
    days_ahead = days_ahead or 7
    return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


async def login(client: httpx.AsyncClient, phone: str, password: str) -> str:
    r = await client.post("/auth/login", json={"phone": phone, "password": password})
    r.raise_for_status()
    return r.json()["data"]["access_token"]


async def ensure_availability(client: httpx.AsyncClient, owner_token: str) -> None:
    schedules = [
        {"day": d, "start_time": "09:00", "end_time": "18:00", "is_active": True}
        for d in range(7)
    ]
    r = await client.post(
        f"/bookings/business/{BUSINESS_ID}/availability",
        json={"schedules": schedules, "slot_duration": SLOT_DURATION, "is_active": True},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    r.raise_for_status()


def reset_slot(date_str: str) -> None:
    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    result = db.bookings.delete_many(
        {"business_id": BUSINESS_ID, "date": date_str, "time_slot": TIME_SLOT}
    )
    print(f"[reset] deleted {result.deleted_count} existing booking(s) for {date_str} {TIME_SLOT}")
    mongo.close()


async def fire_one(client: httpx.AsyncClient, user_token: str, date_str: str) -> tuple:
    try:
        r = await client.post(
            f"/bookings/business/{BUSINESS_ID}/book",
            json={"date": date_str, "time_slot": TIME_SLOT, "service": "concurrency-test"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        return r.status_code, r.text[:200]
    except httpx.RequestError as e:
        return -1, f"{type(e).__name__}: {e}"


async def run(n: int) -> None:
    date_str = next_weekday(0)  # a future Monday, always inside the seeded schedule

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as setup_client:
        owner_token = await login(setup_client, OWNER_PHONE, OWNER_PASSWORD)
        await ensure_availability(setup_client, owner_token)
        user_token = await login(setup_client, USER_PHONE, USER_PASSWORD)

    reset_slot(date_str)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        results = await asyncio.gather(
            *[fire_one(client, user_token, date_str) for _ in range(n)]
        )

    codes = Counter(code for code, _ in results)
    success = sum(v for k, v in codes.items() if 200 <= k < 300)
    conflict_409 = codes.get(409, 0)
    server_5xx = sum(v for k, v in codes.items() if k >= 500)
    network_err = codes.get(-1, 0)

    print(f"\n--- Concurrency test: {n} simultaneous POSTs at {date_str} {TIME_SLOT} ---")
    print("Status code breakdown:", dict(codes))
    print(f"  2xx (success):        {success}")
    print(f"  409 (conflict):       {conflict_409}")
    print(f"  5xx (server error):   {server_5xx}")
    print(f"  network errors:       {network_err}")

    if server_5xx > 0:
        print("\n5xx responses (first 3 bodies):")
        shown = 0
        for code, body in results:
            if code >= 500 and shown < 3:
                print(f"  [{code}] {body}")
                shown += 1

    verdict = "PASS" if success == 1 else "FAIL"
    print(f"\nVerdict: {verdict} (expected exactly one 2xx, got {success})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=50)
    args = parser.parse_args()
    asyncio.run(run(args.n))
