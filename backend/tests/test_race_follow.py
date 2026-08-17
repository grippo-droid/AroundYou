"""
Regression test for the follower counter drift fix (atomic $inc gated on
modified_count, instead of unconditional alongside an idempotent set op).

Mirrors backend/scripts/test_follow_concurrency.py, now automated.
"""

import asyncio
from collections import Counter

from bson import ObjectId

from app.config.database import get_database
from tests.conftest import register_and_login

N = 50


async def test_concurrent_follow_toggles_counter_matches_actual_state(client, test_business):
    business_id = str(test_business["_id"])
    await register_and_login(client, phone="+915555500001", name="Follower")

    async def follow_once():
        r = await client.post(f"/businesses/{business_id}/follow")
        return r.status_code

    results = await asyncio.gather(*(follow_once() for _ in range(N)))
    codes = Counter(results)
    assert all(200 <= k < 300 for k in codes), f"unexpected non-2xx responses: {codes}"

    database = get_database()
    business_doc = await database.businesses.find_one(
        {"_id": ObjectId(business_id)}, {"followers": 1}
    )
    # Independent ground truth: count users whose followed_businesses
    # actually contains this business, rather than inferring it from this
    # one test user's own state -- matches the technique used to detect
    # drift against production data.
    expected_count = await database.users.count_documents(
        {"followed_businesses": business_id}
    )

    assert business_doc["followers"] == expected_count, (
        f"counter drift: stored={business_doc['followers']} expected={expected_count} "
        f"({N} concurrent toggles fired)"
    )
