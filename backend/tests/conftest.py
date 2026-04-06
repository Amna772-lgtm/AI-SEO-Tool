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
