"""
Semantic search: relevance cutoff, response shape, keyword fallback, the
"vector search returned nothing" safety check, and the regression that
business responses never expose embedding fields.

No model or Atlas needed -- BusinessService.semantic_search (or just its
embedding call and $vectorSearch stage) is stubbed where the route is
exercised; the keyword fallback path runs against the local test DB.
"""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from app.config.database import get_database
from app.models.business import BusinessModel
from app.services import ai_service
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


# ── Empty $vectorSearch (no index / no embeddings) vs genuinely no matches ────
# These run the real semantic_search() and route; only the query embedding and
# the $vectorSearch aggregation result are faked (local MongoDB has no Atlas
# Search). The keyword fallback runs for real against the test DB.

class _FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=None):
        return self.docs


def _vector_search_returns(monkeypatch, docs):
    async def fake_embed(text, **kwargs):
        return [0.1] * 384

    monkeypatch.setattr(ai_service, "embed_text", fake_embed)
    monkeypatch.setattr(AsyncIOMotorCollection, "aggregate", lambda self, pipeline, *a, **k: _FakeCursor(docs))


def _candidate(name: str, score: float) -> dict:
    return {
        "_id": ObjectId(), "owner_id": "owner", "name": name, "category": "Cafe",
        "description": "d", "address": "a", "city": "c", "contact_number": "+911111111111",
        "similarity_score": score,
    }


async def test_service_treats_empty_vector_search_as_unavailable(monkeypatch):
    _vector_search_returns(monkeypatch, [])
    assert await BusinessService.semantic_search("quiet cafe") is None


async def test_service_returns_empty_list_when_candidates_are_all_irrelevant(monkeypatch):
    _vector_search_returns(monkeypatch, [_candidate("Far Off", 0.58), _candidate("Further", 0.55)])
    assert await BusinessService.semantic_search("plumber") == []


async def test_route_empty_vector_search_falls_back_with_degraded_notice(client, monkeypatch, test_business):
    # e.g. production before the index/backfill: Atlas returns no candidates at all
    _vector_search_returns(monkeypatch, [])
    r = await client.get("/businesses/search/semantic", params={"q": "Test Business"})

    data = r.json()["data"]
    assert r.status_code == 200
    assert data["degraded_to_keyword_search"] is True
    assert [b["name"] for b in data["businesses"]] == ["Test Business"]  # real keyword fallback


async def test_route_no_good_matches_is_a_real_empty_result_not_degraded(client, monkeypatch, test_business):
    # Working index, candidates exist, but none clears the relevance cutoff
    _vector_search_returns(monkeypatch, [_candidate("Far Off", 0.58), _candidate("Further", 0.55)])
    r = await client.get("/businesses/search/semantic", params={"q": "plumber for a leaking pipe"})

    data = r.json()["data"]
    assert r.status_code == 200
    assert data["degraded_to_keyword_search"] is False
    assert data["businesses"] == []


async def test_route_normal_matches_unaffected(client, monkeypatch):
    _vector_search_returns(monkeypatch, [_candidate("Best Cafe", 0.75), _candidate("Good Cafe", 0.71),
                                         _candidate("Unrelated", 0.60)])
    r = await client.get("/businesses/search/semantic", params={"q": "quiet cafe"})

    data = r.json()["data"]
    assert data["degraded_to_keyword_search"] is False
    assert [b["name"] for b in data["businesses"]] == ["Best Cafe", "Good Cafe"]
