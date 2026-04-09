import os
import tempfile
import pytest

# Point the history DB at a tmp file BEFORE importing the app
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["HISTORY_DB_PATH"] = _tmp.name
os.environ["JWT_SECRET_KEY"] = "test-secret-key-do-not-use-in-prod"

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def signup_user(client):
    """Helper that creates a fresh user via /auth/signup and returns the response."""
    import uuid
    email = f"user-{uuid.uuid4().hex[:8]}@example.com"
    res = client.post("/auth/signup", json={
        "email": email,
        "name": "Test User",
        "password": "correct-horse-battery-staple",
    })
    return {"email": email, "password": "correct-horse-battery-staple", "response": res}


@pytest.fixture
def signup_and_subscribe(client):
    """Create a fresh user and directly insert a subscription row.

    Bypasses the /subscriptions/select HTTP route so tests in plan 03
    (enforcement) do not depend on plan 02 (routes) being complete.
    """
    import uuid
    from app.store.history_store import create_subscription, get_user_by_email

    def _make(plan: str = "free"):
        email = f"user-{uuid.uuid4().hex[:8]}@example.com"
        password = "correct-horse-battery-staple"
        client.post("/auth/signup", json={
            "email": email,
            "name": "Test User",
            "password": password,
        })
        # Sign in to get auth cookie on the client
        client.post("/auth/signin", json={"email": email, "password": password})
        user = get_user_by_email(email)
        create_subscription(user_id=user["id"], plan=plan)
        return {"email": email, "password": password, "user_id": user["id"], "plan": plan}
    return _make


@pytest.fixture
def pro_user_with_group(client):
    """Signs up a Pro user, creates a primary analysis, returns (user_id, primary_analysis_id, group_id, cookies).

    Reuses signup_and_subscribe logic inline to avoid fixture-of-fixture composition complexity.
    """
    import uuid
    from app.store.history_store import (
        create_subscription,
        get_user_by_email,
        save_analysis,
        get_or_create_competitor_group,
    )

    email = f"pro-{uuid.uuid4().hex[:8]}@example.com"
    password = "correct-horse-battery-staple"
    client.post("/auth/signup", json={
        "email": email,
        "name": "Pro User",
        "password": password,
    })
    signin_res = client.post("/auth/signin", json={"email": email, "password": password})
    user = get_user_by_email(email)
    create_subscription(user_id=user["id"], plan="pro")

    primary_analysis_id = f"primary-{uuid.uuid4().hex[:8]}"
    save_analysis(
        task_id=primary_analysis_id,
        url="https://primary-site.com",
        pages_count=5,
        geo_data={},
        audit_result=None,
        user_id=user["id"],
    )

    group = get_or_create_competitor_group(
        user_id=user["id"],
        primary_analysis_id=primary_analysis_id,
    )

    cookies = dict(signin_res.cookies)
    yield user["id"], primary_analysis_id, group["id"], cookies
