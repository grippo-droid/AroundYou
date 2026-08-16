"""
Concurrency test for POST /businesses/{business_id}/follow (toggle_follow).

Fires N simultaneous follow-toggle requests from the SAME user, all
starting from a known "not following" state, and confirms the business's
stored follower counter matches (baseline +1 if the user ends up
following, baseline +0 if not) -- i.e. exactly one real state transition
was counted, regardless of how many requests raced for it.

Usage:
    venv/Scripts/python.exe scripts/test_follow_concurrency.py [--n 50]

Requires:
    - Local backend running on http://localhost:8000 (NOT the deployed Render instance)
    - Local MongoDB reachable at MONGO_URI below
    - Seeded demo user: +919876543210 / password123
    - Auth is HTTP-only cookie based

SAFETY NOTE: this script targets a REAL seeded business (the follow route
404s on a nonexistent business_id, so a throwaway id isn't an option like
it was for reviews). It captures the business's current `followers` value
as a baseline before running and restores it exactly afterward, and
force-removes the test user from the business's followers on both setup
and cleanup. It does not touch any other user's follow state or any
other field on the business document.
"""

import argparse
import asyncio
from collections import Counter

import httpx
from bson import ObjectId
from pymongo import MongoClient

BASE_URL = "http://localhost:8000"
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "around_you_db"

USER_PHONE = "+919876543210"
USER_PASSWORD = "password123"

BUSINESS_ID = "6a42e9f0376d846e06e692a8"  # Cafe Aroha


def get_user_id(phone: str) -> str:
    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    user = db.users.find_one({"phone": phone})
    mongo.close()
    if not user:
        raise RuntimeError(f"seeded user with phone {phone} not found")
    return str(user["_id"])


def reset_not_following(user_id: str) -> int:
    """Force the test user into 'not following' and return the business's
    current follower count, to use as the baseline for this run."""
    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"followed_businesses": BUSINESS_ID}},
    )
    biz = db.businesses.find_one({"_id": ObjectId(BUSINESS_ID)}, {"followers": 1})
    mongo.close()
    return biz.get("followers", 0) if biz else 0


def restore_baseline(user_id: str, baseline_count: int) -> None:
    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"followed_businesses": BUSINESS_ID}},
    )
    db.businesses.update_one(
        {"_id": ObjectId(BUSINESS_ID)},
        {"$set": {"followers": baseline_count}},
    )
    mongo.close()


async def follow_once(client: httpx.AsyncClient, i: int) -> tuple:
    try:
        r = await client.post(f"/businesses/{BUSINESS_ID}/follow")
        return r.status_code, r.text[:200]
    except httpx.RequestError as e:
        return -1, f"{type(e).__name__}: {e}"


async def run(n: int) -> None:
    user_id = get_user_id(USER_PHONE)
    baseline_count = reset_not_following(user_id)
    print(f"[reset] user forced to 'not following'; baseline follower count = {baseline_count}")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        login_r = await client.post("/auth/login", json={"phone": USER_PHONE, "password": USER_PASSWORD})
        login_r.raise_for_status()

        results = await asyncio.gather(*[follow_once(client, i) for i in range(n)])

    codes = Counter(code for code, _ in results)
    print(f"\n--- Concurrency test: {n} simultaneous follow-toggle POSTs, business={BUSINESS_ID} ---")
    print("Status code breakdown:", dict(codes))

    mongo = MongoClient(MONGO_URI)
    db = mongo[DB_NAME]
    user_doc = db.users.find_one({"_id": ObjectId(user_id)}, {"followed_businesses": 1})
    biz_doc = db.businesses.find_one({"_id": ObjectId(BUSINESS_ID)}, {"followers": 1})
    mongo.close()

    actual_following = BUSINESS_ID in (user_doc.get("followed_businesses") or [])
    stored_count = biz_doc.get("followers", 0) if biz_doc else 0
    expected_count = baseline_count + (1 if actual_following else 0)

    print(f"\nActual final follow state (array membership): {actual_following}")
    print(f"Baseline follower count:  {baseline_count}")
    print(f"Expected follower count:  {expected_count}  (baseline {'+1' if actual_following else '+0'})")
    print(f"Stored follower count:    {stored_count}")

    verdict = "PASS" if stored_count == expected_count else "FAIL"
    print(f"\nVerdict: {verdict} (expected {expected_count}, got {stored_count})")

    restore_baseline(user_id, baseline_count)
    print(f"\n[cleanup] restored user to not-following and follower count to baseline ({baseline_count})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=50)
    args = parser.parse_args()
    asyncio.run(run(args.n))
