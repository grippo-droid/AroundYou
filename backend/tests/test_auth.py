"""Core auth flow: registration, login/cookie, logout, protected-route access."""

from tests.conftest import register, login, register_and_login


async def test_register_success(client):
    r = await register(client, phone="+911111100001")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True


async def test_register_duplicate_phone_returns_400(client):
    # Sequential (non-racing) duplicate hits the pre-check in
    # auth_service.create_user, which raises 400 before ever reaching
    # insert_one. The 409-on-DuplicateKeyError path is race-only --
    # covered by test_race_registration.py.
    r1 = await register(client, phone="+911111100002")
    assert r1.status_code == 200
    r2 = await register(client, phone="+911111100002")
    assert r2.status_code == 400


async def test_login_wrong_password_returns_400(client):
    await register(client, phone="+911111100003", password="correctpass")
    r = await login(client, phone="+911111100003", password="wrongpass")
    assert r.status_code == 400


async def test_login_sets_httponly_cookie(client):
    await register(client, phone="+911111100004")
    r = await login(client, phone="+911111100004")
    assert r.status_code == 200

    set_cookie_headers = r.headers.get_list("set-cookie")
    cookie_header = next((h for h in set_cookie_headers if "access_token=" in h), None)
    assert cookie_header is not None, f"no access_token cookie in: {set_cookie_headers}"

    lowered = cookie_header.lower()
    assert "httponly" in lowered
    assert "secure" not in lowered  # COOKIE_SECURE=False in test config
    assert "samesite=lax" in lowered


async def test_protected_route_without_cookie_returns_401(client):
    r = await client.get("/auth/me")
    assert r.status_code == 401


async def test_protected_route_with_valid_cookie_returns_user(client):
    await register_and_login(client, phone="+911111100005", name="Cookie User")
    r = await client.get("/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["data"]["phone"] == "+911111100005"
    assert body["data"]["name"] == "Cookie User"


async def test_logout_clears_cookie(client):
    await register_and_login(client, phone="+911111100006")
    assert (await client.get("/auth/me")).status_code == 200

    logout_r = await client.post("/auth/logout")
    assert logout_r.status_code == 200

    set_cookie_headers = logout_r.headers.get_list("set-cookie")
    cookie_header = next((h for h in set_cookie_headers if "access_token=" in h), None)
    assert cookie_header is not None
    lowered = cookie_header.lower()
    assert "max-age=0" in lowered or "1970" in lowered

    # cookie jar should now be cleared for this client -> protected route fails
    r = await client.get("/auth/me")
    assert r.status_code == 401
