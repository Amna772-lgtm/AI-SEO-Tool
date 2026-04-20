"""Tests for API key CRUD endpoints."""
from __future__ import annotations
import pytest


@pytest.fixture
def auth_client(client, signup_user):
    """Signed-in test client."""
    data = signup_user
    client.post("/auth/signin", json={"email": data["email"], "password": data["password"]})
    return client, data


def test_generate_api_key(auth_client):
    client, _ = auth_client
    res = client.post("/auth/api-key", json={"name": "My WP Key"})
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "My WP Key"
    assert "key" in body
    assert body["key"].startswith("")  # non-empty string
    assert len(body["key"]) > 20
    assert "id" in body


def test_list_api_keys(auth_client):
    client, _ = auth_client
    client.post("/auth/api-key", json={"name": "Key One"})
    client.post("/auth/api-key", json={"name": "Key Two"})
    res = client.get("/auth/api-keys")
    assert res.status_code == 200
    keys = res.json()
    names = [k["name"] for k in keys]
    assert "Key One" in names
    assert "Key Two" in names
    # raw key never returned in list
    for k in keys:
        assert "key" not in k


def test_revoke_api_key(auth_client):
    client, _ = auth_client
    create_res = client.post("/auth/api-key", json={"name": "Temp Key"})
    key_id = create_res.json()["id"]

    del_res = client.delete(f"/auth/api-keys/{key_id}")
    assert del_res.status_code == 204

    keys = client.get("/auth/api-keys").json()
    assert not any(k["id"] == key_id for k in keys)


def test_revoke_nonexistent_key_returns_404(auth_client):
    client, _ = auth_client
    res = client.delete("/auth/api-keys/does-not-exist")
    assert res.status_code == 404


def test_key_not_shown_after_creation(auth_client):
    client, _ = auth_client
    client.post("/auth/api-key", json={"name": "Hidden Key"})
    keys = client.get("/auth/api-keys").json()
    for k in keys:
        assert "key" not in k


def test_bearer_auth_on_me(client, signup_user):
    data = signup_user
    client.post("/auth/signin", json={"email": data["email"], "password": data["password"]})
    key_res = client.post("/auth/api-key", json={"name": "Bearer Test"})
    raw_key = key_res.json()["key"]

    # Sign out to clear cookie
    client.post("/auth/logout")

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {raw_key}"})
    assert res.status_code == 200
    assert res.json()["email"] == data["email"]


def test_invalid_bearer_key_rejected(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer totally-invalid-key"})
    assert res.status_code == 401


def test_revoked_key_rejected(client, signup_user):
    data = signup_user
    client.post("/auth/signin", json={"email": data["email"], "password": data["password"]})
    key_res = client.post("/auth/api-key", json={"name": "To Revoke"})
    key_id = key_res.json()["id"]
    raw_key = key_res.json()["key"]

    client.delete(f"/auth/api-keys/{key_id}")
    client.post("/auth/logout")

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {raw_key}"})
    assert res.status_code == 401
