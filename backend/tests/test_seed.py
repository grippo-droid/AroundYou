"""
Regression test: seed.py must never generate duplicate (business_id, user_id)
review pairs. The reviews collection has a unique index on that pair
(database.ensure_indexes), so duplicates in seed data make app startup fail
against any freshly seeded database. Pure data check -- no DB access.
"""

from collections import Counter

import seed


def test_seed_reviews_have_no_duplicate_business_user_pairs():
    businesses = seed.build_businesses()
    reviews = seed.build_reviews(businesses)

    pairs = Counter((r["business_id"], r["user_id"]) for r in reviews)
    duplicates = {pair: n for pair, n in pairs.items() if n > 1}
    assert duplicates == {}


def test_seed_reviewers_exist_as_users():
    user_ids = {str(u["_id"]) for u in seed.build_users()}
    reviews = seed.build_reviews(seed.build_businesses())
    assert {r["user_id"] for r in reviews} <= user_ids


def test_seed_user_phones_are_unique():
    phones = [u["phone"] for u in seed.build_users()]
    assert len(phones) == len(set(phones))
