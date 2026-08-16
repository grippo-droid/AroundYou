"""
Concurrency test for POST /auth/register.

Fires N simultaneous registration requests with the SAME phone number and
tallies outcomes. PASS = exactly one 2xx (one registration wins, the rest
are rejected with 409).

Usage:
    venv/Scripts/python.exe scripts/test_registration_concurrency.py [--n 50]

Requires:
    - Local backend running on http://localhost:8000 (NOT the deployed Render instance)
    - Local MongoDB reachable at MONGO_URI below
"""

import argparse
import asyncio
from collections import Counter

import httpx
from pymongo import MongoClient

BASE_URL = "http://localhost:8000"
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "around_you_db"

TEST_PHONE = "+919111111111"
TEST_PASSWORD = "testpass123"


def reset_user(phone: str) -> None:
    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    result = db.users.delete_many({"phone": phone})
    print(f"[reset] deleted {result.deleted_count} existing user(s) with phone {phone}")
    mongo.close()


async def register_once(client: httpx.AsyncClient, i: int) -> tuple:
    body = {
        "name": f"ConcurrencyUser{i}",
        "phone": TEST_PHONE,
        "password": TEST_PASSWORD,
        "role": "user",
    }
    try:
        r = await client.post("/auth/register", json=body)
        return r.status_code, r.text[:200]
    except httpx.RequestError as e:
        return -1, f"{type(e).__name__}: {e}"


async def run(n: int) -> None:
    reset_user(TEST_PHONE)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        results = await asyncio.gather(
            *[register_once(client, i) for i in range(n)]
        )

    codes = Counter(code for code, _ in results)
    success = sum(v for k, v in codes.items() if 200 <= k < 300)
    conflict_409 = codes.get(409, 0)
    server_5xx = sum(v for k, v in codes.items() if k >= 500)
    network_err = codes.get(-1, 0)

    print(f"\n--- Concurrency test: {n} simultaneous POSTs to /auth/register, phone={TEST_PHONE} ---")
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

    # Verify at the DB level too, independent of what the API reported.
    mongo = MongoClient(MONGO_URI)
    db_count = mongo[DB_NAME].users.count_documents({"phone": TEST_PHONE})
    mongo.close()
    print(f"\nUsers persisted in DB with phone {TEST_PHONE}: {db_count}")

    verdict = "PASS" if success == 1 and db_count == 1 else "FAIL"
    print(f"\nVerdict: {verdict} (expected exactly one 2xx and one DB row, got {success} / {db_count})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=50)
    args = parser.parse_args()
    asyncio.run(run(args.n))
