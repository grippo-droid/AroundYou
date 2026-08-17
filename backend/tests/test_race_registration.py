"""
Regression test for the duplicate phone registration race condition
(unique index on users.phone + DuplicateKeyError -> 409).

Mirrors backend/scripts/test_registration_concurrency.py, now automated.
"""

import asyncio
from collections import Counter

from app.config.database import get_database

N = 50


async def test_concurrent_registrations_same_phone_only_one_succeeds(client):
    phone = "+913333300001"

    async def register_once(i: int):
        r = await client.post("/auth/register", json={
            "name": f"ConcurrencyUser{i}", "phone": phone, "password": "testpass123", "role": "user",
        })
        return r.status_code

    results = await asyncio.gather(*(register_once(i) for i in range(N)))
    codes = Counter(results)

    success = sum(v for k, v in codes.items() if 200 <= k < 300)
    conflicts = codes.get(409, 0)
    server_errors = sum(v for k, v in codes.items() if k >= 500)

    assert server_errors == 0, f"unexpected server errors: {codes}"
    assert success == 1, f"expected exactly 1 success, got: {codes}"
    assert conflicts == N - 1, f"expected {N - 1} conflicts, got: {codes}"

    database = get_database()
    count = await database.users.count_documents({"phone": phone})
    assert count == 1
