import os
import sqlite3


def test_user_table_exists():
    db_path = os.environ["HISTORY_DB_PATH"]
    conn = sqlite3.connect(db_path)
    cols = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
    conn.close()
    assert {"id", "email", "name", "password_hash", "created_at"}.issubset(cols)


def test_signup(client):
    res = client.post("/auth/signup", json={
        "email": "alice@example.com",
        "name": "Alice",
        "password": "hunter22hunter22",
    })
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "alice@example.com"
    assert body["name"] == "Alice"
    assert "id" in body
    assert "password" not in body and "password_hash" not in body
    assert "access_token" in res.cookies


def test_signup_duplicate_email_returns_409(client, signup_user):
    res = client.post("/auth/signup", json={
        "email": signup_user["email"],
        "name": "Other",
        "password": "another-password",
    })
    assert res.status_code == 409


def test_signin_sets_cookie(client, signup_user):
    res = client.post("/auth/signin", json={
        "email": signup_user["email"],
        "password": signup_user["password"],
    })
    assert res.status_code == 200
    assert "access_token" in res.cookies


def test_signin_invalid_password_returns_401(client, signup_user):
    res = client.post("/auth/signin", json={
        "email": signup_user["email"],
        "password": "wrong-password",
    })
    assert res.status_code == 401


def test_logout_clears_cookie(client, signup_user):
    client.post("/auth/signin", json={
        "email": signup_user["email"],
        "password": signup_user["password"],
    })
    res = client.post("/auth/logout")
    assert res.status_code == 200
    set_cookie = res.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    assert "max-age=0" in set_cookie.lower()


def test_me_endpoint(client, signup_user):
    client.post("/auth/signin", json={
        "email": signup_user["email"],
        "password": signup_user["password"],
    })
    res = client.get("/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == signup_user["email"]


def test_me_without_cookie_returns_401():
    from fastapi.testclient import TestClient
    from app.main import app
    fresh = TestClient(app)
    res = fresh.get("/auth/me")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Plan 02 — Route protection + per-user isolation tests
# ---------------------------------------------------------------------------

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def fresh_client():
    """A TestClient with no persisted cookies."""
    return TestClient(app)


@pytest.mark.parametrize("method,path", [
    ("POST",   "/analyze/"),
    ("GET",    "/sites/some-id"),
    ("GET",    "/sites/some-id/pages"),
    ("GET",    "/sites/some-id/audit"),
    ("GET",    "/sites/some-id/overview"),
    ("GET",    "/sites/some-id/geo"),
    ("GET",    "/sites/some-id/geo/score"),
    ("GET",    "/history/"),
    ("GET",    "/history/some-id"),
    ("DELETE", "/history/some-id"),
    ("POST",   "/schedules/"),
    ("GET",    "/schedules/"),
    ("GET",    "/schedules/some-id"),
    ("PATCH",  "/schedules/some-id"),
    ("DELETE", "/schedules/some-id"),
])
def test_protected_routes_401(fresh_client, method, path):
    res = fresh_client.request(method, path, json={})
    assert res.status_code == 401, f"{method} {path} returned {res.status_code}, expected 401"


def test_health_is_public():
    c = TestClient(app)
    res = c.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_auth_signup_is_public():
    """POST /auth/signup must be reachable without auth (otherwise nobody can sign up)."""
    c = TestClient(app)
    res = c.post("/auth/signup", json={})
    # 422 for validation error (empty body), NOT 401
    assert res.status_code == 422


def _make_user(client, email_suffix: str) -> dict:
    import uuid
    email = f"{email_suffix}-{uuid.uuid4().hex[:6]}@example.com"
    client.post("/auth/signup", json={
        "email": email, "name": "User", "password": "password1234",
    })
    return {"client": client, "email": email}


def test_user_isolation_schedules():
    # Two completely independent clients (separate cookie jars)
    client_a = TestClient(app)
    client_b = TestClient(app)

    _make_user(client_a, "alice")
    _make_user(client_b, "bob")

    # Give User A a Pro subscription so schedule creation is allowed (D-21)
    from app.store.history_store import create_subscription, get_user_by_email
    res_me = client_a.get("/auth/me")
    user_a_id = res_me.json()["id"]
    create_subscription(user_id=user_a_id, plan="pro")

    # User A creates a schedule
    res = client_a.post("/schedules/", json={
        "url": "https://example.com",
        "frequency": "daily",
        "hour": 9,
    })
    assert res.status_code == 201, res.text
    schedule_id = res.json()["id"]

    # User A sees their schedule
    res = client_a.get("/schedules/")
    assert res.status_code == 200
    assert any(s["id"] == schedule_id for s in res.json()["schedules"])

    # User B sees nothing
    res = client_b.get("/schedules/")
    assert res.status_code == 200
    assert res.json()["schedules"] == []

    # User B cannot fetch User A's schedule by id (404)
    res = client_b.get(f"/schedules/{schedule_id}")
    assert res.status_code == 404

    # User B cannot delete User A's schedule
    res = client_b.delete(f"/schedules/{schedule_id}")
    assert res.status_code == 404

    # The schedule still exists for User A
    res = client_a.get(f"/schedules/{schedule_id}")
    assert res.status_code == 200


def test_user_isolation_history():
    """Two users have independent history lists. Uses save_analysis directly because
    the full crawl pipeline is out of scope for this unit test."""
    from app.store.history_store import save_analysis

    client_a = TestClient(app)
    client_b = TestClient(app)

    _make_user(client_a, "alice-hist")
    _make_user(client_b, "bob-hist")

    # Look up user IDs via /auth/me
    a_id = client_a.get("/auth/me").json()["id"]
    b_id = client_b.get("/auth/me").json()["id"]

    # Insert one analysis for each user directly
    save_analysis("task-a", "https://a.example.com", 5, {"score": {"overall_score": 80, "grade": "B"}}, None, user_id=a_id)
    save_analysis("task-b", "https://b.example.com", 3, {"score": {"overall_score": 70, "grade": "C"}}, None, user_id=b_id)

    # User A sees only their record
    res = client_a.get("/history/")
    assert res.status_code == 200
    ids = [item["id"] for item in res.json()["items"]]
    assert "task-a" in ids
    assert "task-b" not in ids

    # User B sees only theirs
    res = client_b.get("/history/")
    ids = [item["id"] for item in res.json()["items"]]
    assert "task-b" in ids
    assert "task-a" not in ids

    # Cross-user fetch by id returns 404
    assert client_a.get("/history/task-b").status_code == 404
    assert client_b.get("/history/task-a").status_code == 404
