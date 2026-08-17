"""
Regression test for the double-booking race condition
(unique partial index on bookings + DuplicateKeyError -> 409).

Mirrors backend/scripts/test_booking_concurrency.py, now automated:
N concurrent bookings for the same slot should yield exactly one 2xx
and N-1 409s, with exactly one row persisted in the DB.
"""

import asyncio
from collections import Counter

from app.config.database import get_database
from tests.conftest import register_and_login, tomorrow

N = 50


async def test_concurrent_bookings_same_slot_only_one_succeeds(client, business_with_availability):
    business_id = str(business_with_availability["_id"])
    await register_and_login(client, phone="+912222200001", name="Booker")

    date_str = tomorrow()
    time_slot = "09:00"

    async def book_once():
        r = await client.post(
            f"/bookings/business/{business_id}/book",
            json={"date": date_str, "time_slot": time_slot, "service": "race-test"},
        )
        return r.status_code

    results = await asyncio.gather(*(book_once() for _ in range(N)))
    codes = Counter(results)

    success = sum(v for k, v in codes.items() if 200 <= k < 300)
    conflicts = codes.get(409, 0)
    server_errors = sum(v for k, v in codes.items() if k >= 500)

    assert server_errors == 0, f"unexpected server errors: {codes}"
    assert success == 1, f"expected exactly 1 success, got: {codes}"
    assert conflicts == N - 1, f"expected {N - 1} conflicts, got: {codes}"

    database = get_database()
    count = await database.bookings.count_documents({
        "business_id": business_id, "date": date_str, "time_slot": time_slot,
    })
    assert count == 1
