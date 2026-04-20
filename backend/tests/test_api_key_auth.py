"""Tests for dual auth: Bearer API key vs JWT cookie on protected routes."""
from __future__ import annotations
import pytest


def _make_user_with_key(client, email_prefix="bearer"):
    import uuid
    email = f"{email_prefix}-{uuid.uuid4().hex[:8]}@example.com"
    password = "correct-horse-battery-staple"
    client.post("/auth/signup", json={"email": email, "name": "Test", "password": password})
    client.post("/auth/signin", json={"email": email, "password": password})
    key_res = client.post("/auth/api-key", json={"name": "Test Key"})
    raw_key = key_res.json()["key"]
    client.post("/auth/logout")
    return email, raw_key


def test_cookie_auth_still_works(client):
    """Existing cookie auth must not break after dual-auth change."""
    import uuid
    email = f"cookie-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Cookie User", "password": "correct-horse-battery-staple"})
    client.post("/auth/signin", json={"email": email, "password": "correct-horse-battery-staple"})
    res = client.get("/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == email


def test_bearer_auth_on_me(client):
    email, raw_key = _make_user_with_key(client)
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {raw_key}"})
    assert res.status_code == 200
    assert res.json()["email"] == email
