"""
Regression test for the duplicate review race condition
(unique index on reviews (business_id, user_id) + DuplicateKeyError -> 409).

Mirrors backend/scripts/test_review_concurrency.py, now automated.
"""

import asyncio
from collections import Counter

from app.config.database import get_database
from tests.conftest import register_and_login

N = 50


async def test_concurrent_reviews_same_user_business_only_one_succeeds(client, test_business):
    business_id = str(test_business["_id"])
    await register_and_login(client, phone="+914444400001", name="Reviewer")

    async def review_once(i: int):
        r = await client.post(
            f"/reviews/business/{business_id}",
            json={"rating": 5, "text": f"Concurrency test review #{i} - solid experience overall"},
        )
        return r.status_code

    results = await asyncio.gather(*(review_once(i) for i in range(N)))
    codes = Counter(results)

    success = sum(v for k, v in codes.items() if 200 <= k < 300)
    conflicts = codes.get(409, 0)
    server_errors = sum(v for k, v in codes.items() if k >= 500)

    assert server_errors == 0, f"unexpected server errors: {codes}"
    assert success == 1, f"expected exactly 1 success, got: {codes}"
    assert conflicts == N - 1, f"expected {N - 1} conflicts, got: {codes}"

    database = get_database()
    count = await database.reviews.count_documents({"business_id": business_id})
    assert count == 1
