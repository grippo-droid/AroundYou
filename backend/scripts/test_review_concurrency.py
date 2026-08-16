"""
Concurrency test for POST /reviews/business/{business_id}.

Fires N simultaneous review-creation requests from the SAME user on the
SAME business and tallies outcomes. PASS = exactly one 2xx (one review
wins, the rest are rejected with 409).

Usage:
    venv/Scripts/python.exe scripts/test_review_concurrency.py [--n 50]

Requires:
    - Local backend running on http://localhost:8000 (NOT the deployed Render instance)
    - Local MongoDB reachable at MONGO_URI below
    - Seeded demo user: +919876543210 / password123
    - Auth is HTTP-only cookie based; this script logs in once with a
      single httpx.AsyncClient so the cookie jar is shared across all
      concurrent requests.

NOTE: uses a throwaway BUSINESS_ID that does not correspond to any real
seeded business (the create-review route doesn't validate business
existence). This is deliberate -- reset_review() deletes any existing
review for the (business_id, user_id) pair before each run, and pointing
that at a real business previously caused this script to delete and lose
a legitimate seed review. Never point BUSINESS_ID at real data.
"""

import argparse
import asyncio
from collections import Counter

import httpx
from pymongo import MongoClient

BASE_URL = "http://localhost:8000"
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "around_you_db"

USER_PHONE = "+919876543210"
USER_PASSWORD = "password123"

BUSINESS_ID = "000000000000000000009999"  # throwaway id, no real business -- see note above


def get_user_id(phone: str) -> str:
    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    user = db.users.find_one({"phone": phone})
    mongo.close()
    if not user:
        raise RuntimeError(f"seeded user with phone {phone} not found")
    return str(user["_id"])


def reset_review(user_id: str) -> None:
    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    result = db.reviews.delete_many({"business_id": BUSINESS_ID, "user_id": user_id})
    print(f"[reset] deleted {result.deleted_count} existing review(s) for business={BUSINESS_ID} user={user_id}")
    mongo.close()


async def review_once(client: httpx.AsyncClient, i: int) -> tuple:
    body = {"rating": 5, "text": f"Concurrency test review #{i} - great experience overall!"}
    try:
        r = await client.post(f"/reviews/business/{BUSINESS_ID}", json=body)
        return r.status_code, r.text[:200]
    except httpx.RequestError as e:
        return -1, f"{type(e).__name__}: {e}"


async def run(n: int) -> None:
    user_id = get_user_id(USER_PHONE)
    reset_review(user_id)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        login_r = await client.post("/auth/login", json={"phone": USER_PHONE, "password": USER_PASSWORD})
        login_r.raise_for_status()

        results = await asyncio.gather(
            *[review_once(client, i) for i in range(n)]
        )

    codes = Counter(code for code, _ in results)
    success = sum(v for k, v in codes.items() if 200 <= k < 300)
    conflict_409 = codes.get(409, 0)
    server_5xx = sum(v for k, v in codes.items() if k >= 500)
    network_err = codes.get(-1, 0)

    print(f"\n--- Concurrency test: {n} simultaneous POSTs to /reviews/business/{BUSINESS_ID}, user_id={user_id} ---")
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
    db_count = mongo[DB_NAME].reviews.count_documents({"business_id": BUSINESS_ID, "user_id": user_id})
    mongo.close()
    print(f"\nReviews persisted in DB for business={BUSINESS_ID} user={user_id}: {db_count}")

    verdict = "PASS" if success == 1 and db_count == 1 else "FAIL"
    print(f"\nVerdict: {verdict} (expected exactly one 2xx and one DB row, got {success} / {db_count})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=50)
    args = parser.parse_args()
    asyncio.run(run(args.n))
