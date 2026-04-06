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
