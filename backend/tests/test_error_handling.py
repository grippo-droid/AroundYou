"""
Test for the global exception handler added in app/main.py.

Every unguarded-ObjectId crash path we found (see test_object_id_validation.py)
has already been fixed, so there's no remaining genuine gap left to hit
naturally. To prove the safety net also catches truly unexpected errors --
not just the specific bugs we already knew about -- this deliberately
injects a failure via monkeypatching a service function for the duration
of one test, rather than leaving (or hunting for) a real bug just to have
a test case.
"""

from app.services.user_service import UserService


async def test_unhandled_exception_returns_generic_500(client, monkeypatch):
    async def boom(*args, **kwargs):
        raise RuntimeError("simulated unexpected failure")

    monkeypatch.setattr(UserService, "search_users", boom)

    r = await client.get("/users/search", params={"query": "anything"})

    assert r.status_code == 500
    assert r.json() == {"detail": "Internal server error"}

    # nothing internal should leak into the response body
    assert "RuntimeError" not in r.text
    assert "Traceback" not in r.text
    assert "site-packages" not in r.text
