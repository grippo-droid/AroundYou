"""
Tests for the ObjectId.is_valid() guards added to get_user_profile,
follow_user, unfollow_user, and create_or_get_conversation -- malformed
IDs should return a clean 400, not an unhandled 500.
"""

from app.config.database import get_database
from tests.conftest import register, register_and_login

BAD_ID = "not-a-valid-object-id"


async def test_get_user_profile_invalid_id_returns_400(client):
    r = await client.get(f"/users/{BAD_ID}")
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid user ID"


async def test_follow_user_invalid_id_returns_400(client):
    await register_and_login(client, phone="+916666600001")
    r = await client.post(f"/users/{BAD_ID}/follow")
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid user ID"


async def test_unfollow_user_invalid_id_returns_400(client):
    await register_and_login(client, phone="+916666600002")
    r = await client.delete(f"/users/{BAD_ID}/follow")
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid user ID"


async def test_send_message_invalid_receiver_id_returns_400(client):
    await register_and_login(client, phone="+916666600003")
    r = await client.post("/messages/send", json={
        "receiver_id": BAD_ID, "receiver_type": "user", "content": "hello there",
    })
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid user ID"


async def test_follow_user_valid_id_still_works(client):
    """Sanity check: the guard must not break legitimate requests."""
    await register_and_login(client, phone="+916666600004", name="Follower")
    await register(client, phone="+916666600005", name="Target")

    database = get_database()
    target = await database.users.find_one({"phone": "+916666600005"})

    r = await client.post(f"/users/{target['_id']}/follow")
    assert r.status_code == 200
