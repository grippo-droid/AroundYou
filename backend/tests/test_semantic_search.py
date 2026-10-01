"""
Semantic search: relevance cutoff, response shape, keyword fallback, and the
regression that business responses never expose embedding fields.

No model or Atlas needed -- BusinessService.semantic_search is stubbed where
the route is exercised; the fallback path runs against the local test DB.
"""

from bson import ObjectId

from app.config.database import get_database
from app.models.business import BusinessModel
from app.services.business_service import BusinessService, apply_score_cutoff

EMBEDDING_KEYS = ("embedding", "embedding_updated_at")


def _biz(name: str, score: float) -> BusinessModel:
    return BusinessModel(
        _id=ObjectId(), owner_id="owner", name=name, category="Cafe", description="d",
        address="a", city="c", contact_number="+911111111111",
        embedding=[0.1, 0.2], similarity_score=score,
    )


# ── apply_score_cutoff ─────────────────────────────────────────────────────────

def test_cutoff_keeps_results_close_to_top_and_drops_the_tail():
    results = [_biz("a", 0.75), _biz("b", 0.72), _biz("c", 0.68), _biz("d", 0.66), _biz("e", 0.59)]
    kept = [b.name for b in apply_score_cutoff(results)]
    # floor = max(0.62, 0.75 - 0.08) = 0.67
    assert kept == ["a", "b", "c"]


def test_cutoff_absolute_floor_applies_when_top_is_weak():
    results = [_biz("a", 0.66), _biz("b", 0.63), _biz("c", 0.61)]
    assert [b.name for b in apply_score_cutoff(results)] == ["a", "b"]


def test_cutoff_returns_empty_when_nothing_is_relevant():
    assert apply_score_cutoff([_biz("a", 0.58), _biz("b", 0.55)]) == []


def test_cutoff_handles_empty_input():
    assert apply_score_cutoff([]) == []


# ── GET /businesses/search/semantic ────────────────────────────────────────────

async def test_semantic_response_includes_score_but_not_embedding(client, monkeypatch):
    async def fake_search(query, limit=12):
        return [_biz("Best Cafe", 0.75), _biz("Other Cafe", 0.71)]

    monkeypatch.setattr(BusinessService, "semantic_search", staticmethod(fake_search))
    r = await client.get("/businesses/search/semantic", params={"q": "quiet cafe"})

    assert r.status_code == 200
    data = r.json()["data"]
    assert data["degraded_to_keyword_search"] is False
    assert [b["name"] for b in data["businesses"]] == ["Best Cafe", "Other Cafe"]
    assert data["businesses"][0]["similarity_score"] == 0.75
    for b in data["businesses"]:
        assert isinstance(b["_id"], str)
        assert not any(k in b for k in EMBEDDING_KEYS)


async def test_semantic_falls_back_to_keyword_search_when_unavailable(client, monkeypatch, test_business):
    async def unavailable(query, limit=12):
        return None

    monkeypatch.setattr(BusinessService, "semantic_search", staticmethod(unavailable))
    r = await client.get("/businesses/search/semantic", params={"q": "Test Business"})

    assert r.status_code == 200
    data = r.json()["data"]
    assert data["degraded_to_keyword_search"] is True
    assert [b["name"] for b in data["businesses"]] == ["Test Business"]


async def test_semantic_rejects_empty_and_overlong_queries(client):
    assert (await client.get("/businesses/search/semantic", params={"q": "   "})).status_code == 400
    too_long = "x" * 301
    assert (await client.get("/businesses/search/semantic", params={"q": too_long})).status_code == 400


# ── Leak regression: no endpoint exposes embedding fields ──────────────────────

async def test_business_endpoints_never_expose_embedding_fields(client, test_business):
    await get_database().businesses.update_one(
        {"_id": test_business["_id"]}, {"$set": {"embedding": [0.1, 0.2], "embedding_updated_at": None}}
    )

    single = (await client.get(f"/businesses/{test_business['_id']}")).json()["data"]
    listed = (await client.get("/businesses/")).json()["data"]["businesses"]

    for b in [single, *listed]:
        assert not any(k in b for k in (*EMBEDDING_KEYS, "similarity_score"))
    # Fields the frontend relies on are still present (BusinessResponse would drop these).
    assert single["verification_status"] is not None
    assert "is_active" in single
