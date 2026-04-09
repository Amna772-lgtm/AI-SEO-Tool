"""Admin system tests — DB schema migrations, store helpers, and auth dependency.

Tests are ordered to match implementation in history_store.py and auth.py.
Run: cd backend && python -m pytest tests/test_admin.py -x -q
"""
from __future__ import annotations
import uuid
import pytest

# ---------------------------------------------------------------------------
# DB schema migration tests (Task 1)
# ---------------------------------------------------------------------------

def test_is_admin_column_exists_on_users():
    """is_admin column must exist after init_db (idempotent migration)."""
    from app.store.history_store import _connect
    conn = _connect()
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
        assert "is_admin" in cols
    finally:
        conn.close()


def test_is_disabled_column_exists_on_users():
    """is_disabled column must exist after init_db."""
    from app.store.history_store import _connect
    conn = _connect()
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
        assert "is_disabled" in cols
    finally:
        conn.close()


def test_audit_quota_override_column_exists_on_subscriptions():
    """audit_quota_override column must exist on subscriptions after init_db."""
    from app.store.history_store import _connect
    conn = _connect()
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(subscriptions)")}
        assert "audit_quota_override" in cols
    finally:
        conn.close()


def test_admin_settings_table_exists():
    """admin_settings table must be created by init_db."""
    from app.store.history_store import _connect
    conn = _connect()
    try:
        result = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_settings'"
        ).fetchone()
        assert result is not None
    finally:
        conn.close()


def test_banned_domains_table_exists():
    """banned_domains table must be created by init_db."""
    from app.store.history_store import _connect
    conn = _connect()
    try:
        result = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='banned_domains'"
        ).fetchone()
        assert result is not None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# get_user_by_email / get_user_by_id include new fields
# ---------------------------------------------------------------------------

def test_get_user_by_email_returns_is_admin_and_is_disabled(client):
    """get_user_by_email must return is_admin and is_disabled in result dict."""
    from app.store.history_store import get_user_by_email
    email = f"user-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Test User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    assert user is not None
    assert "is_admin" in user
    assert "is_disabled" in user
    assert user["is_admin"] == 0
    assert user["is_disabled"] == 0


def test_get_user_by_id_returns_is_admin_and_is_disabled(client):
    """get_user_by_id must return is_admin and is_disabled in result dict."""
    from app.store.history_store import get_user_by_email, get_user_by_id
    email = f"user-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Test User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    user_by_id = get_user_by_id(user["id"])
    assert user_by_id is not None
    assert "is_admin" in user_by_id
    assert "is_disabled" in user_by_id


# ---------------------------------------------------------------------------
# admin_settings CRUD
# ---------------------------------------------------------------------------

def test_get_admin_setting_returns_default_for_nonexistent_key():
    from app.store.history_store import get_admin_setting
    result = get_admin_setting("nonexistent-key-xyz", default="fallback")
    assert result == "fallback"


def test_set_and_get_admin_setting_roundtrip():
    from app.store.history_store import get_admin_setting, set_admin_setting
    key = f"test-key-{uuid.uuid4().hex[:8]}"
    set_admin_setting(key, "hello-world")
    assert get_admin_setting(key) == "hello-world"


def test_get_all_admin_settings_returns_dict():
    from app.store.history_store import get_all_admin_settings, set_admin_setting
    key = f"all-test-{uuid.uuid4().hex[:8]}"
    set_admin_setting(key, "some-value")
    result = get_all_admin_settings()
    assert isinstance(result, dict)
    assert result[key] == "some-value"


# ---------------------------------------------------------------------------
# banned_domains CRUD
# ---------------------------------------------------------------------------

def test_add_and_check_banned_domain():
    from app.store.history_store import add_banned_domain, is_domain_banned
    domain = f"evil-{uuid.uuid4().hex[:8]}.com"
    add_banned_domain(domain, reason="spam")
    assert is_domain_banned(domain) is True


def test_is_domain_banned_returns_false_for_unknown():
    from app.store.history_store import is_domain_banned
    assert is_domain_banned("totally-fine-site-xyz123.com") is False


def test_remove_banned_domain():
    from app.store.history_store import add_banned_domain, is_domain_banned, remove_banned_domain
    domain = f"remove-test-{uuid.uuid4().hex[:8]}.com"
    add_banned_domain(domain)
    assert is_domain_banned(domain) is True
    remove_banned_domain(domain)
    assert is_domain_banned(domain) is False


def test_list_banned_domains_returns_list_of_dicts():
    from app.store.history_store import add_banned_domain, list_banned_domains
    domain = f"list-test-{uuid.uuid4().hex[:8]}.com"
    add_banned_domain(domain, reason="test reason")
    result = list_banned_domains()
    assert isinstance(result, list)
    domains = [r["domain"] for r in result]
    assert domain in domains
    # Check dict keys
    matching = next(r for r in result if r["domain"] == domain)
    assert "domain" in matching
    assert "reason" in matching
    assert "banned_at" in matching


# ---------------------------------------------------------------------------
# Admin user management
# ---------------------------------------------------------------------------

def test_list_all_users_returns_paginated_results(client):
    from app.store.history_store import list_all_users
    email = f"list-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "List Test", "password": "correct-horse-battery-staple"})
    result = list_all_users()
    assert "total" in result
    assert "users" in result
    assert result["total"] >= 1
    assert isinstance(result["users"], list)
    # Check audit_count field is present
    user_row = next((u for u in result["users"] if u["email"] == email), None)
    assert user_row is not None
    assert "audit_count" in user_row


def test_list_all_users_search_filter(client):
    from app.store.history_store import list_all_users
    unique = uuid.uuid4().hex[:8]
    email = f"searchable-{unique}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Search Target", "password": "correct-horse-battery-staple"})
    result = list_all_users(search=f"searchable-{unique}")
    assert result["total"] >= 1
    assert any(u["email"] == email for u in result["users"])


def test_list_all_users_plan_filter(client):
    from app.store.history_store import create_subscription, get_user_by_email, list_all_users
    email = f"plan-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Plan User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    create_subscription(user_id=user["id"], plan="pro")
    result = list_all_users(plan_filter="pro")
    assert result["total"] >= 1
    assert any(u["email"] == email for u in result["users"])


def test_list_all_users_status_filter_disabled(client):
    from app.store.history_store import admin_update_user_status, get_user_by_email, list_all_users
    email = f"disabled-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Disabled User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    admin_update_user_status(user["id"], is_disabled=1)
    result = list_all_users(status_filter="disabled")
    assert result["total"] >= 1
    assert any(u["email"] == email for u in result["users"])


def test_admin_update_user_status(client):
    from app.store.history_store import admin_update_user_status, get_user_by_email, get_user_by_id
    email = f"status-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Status User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    admin_update_user_status(user["id"], is_disabled=1)
    updated = get_user_by_id(user["id"])
    assert updated["is_disabled"] == 1


def test_admin_update_user_plan(client):
    from app.store.history_store import admin_update_user_plan, create_subscription, get_subscription_by_user, get_user_by_email
    email = f"planup-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Plan Up User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    create_subscription(user_id=user["id"], plan="free")
    admin_update_user_plan(user["id"], "agency")
    sub = get_subscription_by_user(user["id"])
    assert sub["plan"] == "agency"


def test_delete_user_cascade(client):
    """delete_user_cascade must remove user + all related records."""
    from app.store.history_store import (
        create_subscription, delete_user_cascade, get_user_by_email,
        get_user_by_id, save_analysis, _connect,
    )
    email = f"cascade-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Cascade User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    user_id = user["id"]
    create_subscription(user_id=user_id, plan="free")
    analysis_id = f"cascade-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id, url="https://cascade-test.com", pages_count=1, geo_data={}, audit_result=None, user_id=user_id)
    # Delete cascade
    delete_user_cascade(user_id)
    # User should be gone
    assert get_user_by_id(user_id) is None
    # Analyses should be gone
    conn = _connect()
    try:
        row = conn.execute("SELECT id FROM analyses WHERE user_id = ?", (user_id,)).fetchone()
        assert row is None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# list_all_analyses with D-25 filters
# ---------------------------------------------------------------------------

def test_list_all_analyses_returns_analyses(client):
    from app.store.history_store import get_user_by_email, list_all_analyses, save_analysis
    email = f"anl-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Analysis User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    analysis_id = f"anl-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id, url="https://anl-test.com", pages_count=5, geo_data={}, audit_result=None, user_id=user["id"])
    result = list_all_analyses()
    assert "total" in result
    assert "analyses" in result
    assert result["total"] >= 1


def test_list_all_analyses_date_from_filter(client):
    from app.store.history_store import get_user_by_email, list_all_analyses, save_analysis
    email = f"date-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Date User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    analysis_id = f"date-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id, url="https://date-test.com", pages_count=1, geo_data={}, audit_result=None, user_id=user["id"])
    # Filter for today and beyond — should include the just-inserted record
    result = list_all_analyses(date_from="2026-01-01")
    assert result["total"] >= 1


def test_list_all_analyses_date_to_filter(client):
    from app.store.history_store import get_user_by_email, list_all_analyses, save_analysis
    email = f"dateto-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "DateTo User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    analysis_id = f"dateto-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id, url="https://dateto-test.com", pages_count=1, geo_data={}, audit_result=None, user_id=user["id"])
    result = list_all_analyses(date_to="2026-06-01")
    assert result["total"] >= 1


def test_list_all_analyses_score_min_filter(client):
    from app.store.history_store import get_user_by_email, list_all_analyses, save_analysis
    email = f"smin-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Score Min User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    analysis_id = f"smin-{uuid.uuid4().hex[:8]}"
    # Score 75 — above minimum 50
    save_analysis(task_id=analysis_id, url="https://smin-test.com", pages_count=1,
                  geo_data={"score": {"overall_score": 75, "grade": "B"}}, audit_result=None, user_id=user["id"])
    result = list_all_analyses(score_min=50)
    assert result["total"] >= 1
    # Score 20 — should be filtered out with score_min=50
    analysis_id2 = f"smin2-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id2, url="https://smin2-test.com", pages_count=1,
                  geo_data={"score": {"overall_score": 20, "grade": "F"}}, audit_result=None, user_id=user["id"])
    result2 = list_all_analyses(score_min=50)
    # Only the 75-score analysis should match
    matching = [a for a in result2["analyses"] if a["id"] == analysis_id2]
    assert len(matching) == 0


def test_list_all_analyses_score_max_filter(client):
    from app.store.history_store import get_user_by_email, list_all_analyses, save_analysis
    email = f"smax-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Score Max User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    # Score 90 — above max 80, should be excluded
    analysis_id_high = f"smax-hi-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id_high, url="https://smax-hi.com", pages_count=1,
                  geo_data={"score": {"overall_score": 90, "grade": "A"}}, audit_result=None, user_id=user["id"])
    result = list_all_analyses(score_max=80)
    matching_high = [a for a in result["analyses"] if a["id"] == analysis_id_high]
    assert len(matching_high) == 0


def test_list_all_analyses_combined_date_and_score_filter(client):
    from app.store.history_store import get_user_by_email, list_all_analyses, save_analysis
    email = f"combo-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Combo User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    analysis_id = f"combo-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id, url="https://combo-test.com", pages_count=1,
                  geo_data={"score": {"overall_score": 65, "grade": "C"}}, audit_result=None, user_id=user["id"])
    result = list_all_analyses(date_from="2026-01-01", score_min=50)
    assert result["total"] >= 1


def test_delete_analysis_admin(client):
    from app.store.history_store import delete_analysis_admin, get_user_by_email, list_all_analyses, save_analysis
    email = f"delanl-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Del Analysis User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    analysis_id = f"delanl-{uuid.uuid4().hex[:8]}"
    save_analysis(task_id=analysis_id, url="https://delanl-test.com", pages_count=1, geo_data={}, audit_result=None, user_id=user["id"])
    delete_analysis_admin(analysis_id)
    result = list_all_analyses()
    assert not any(a["id"] == analysis_id for a in result["analyses"])


# ---------------------------------------------------------------------------
# Admin analytics
# ---------------------------------------------------------------------------

def test_get_admin_user_metrics(client):
    from app.store.history_store import get_admin_user_metrics
    result = get_admin_user_metrics()
    assert "total" in result
    assert "active" in result
    assert "disabled" in result
    assert "plan_distribution" in result
    assert isinstance(result["plan_distribution"], dict)


def test_get_signup_trend():
    from app.store.history_store import get_signup_trend
    result = get_signup_trend(days=30)
    assert isinstance(result, list)


def test_get_audit_metrics(client):
    from app.store.history_store import get_audit_metrics
    result = get_audit_metrics()
    assert "total_audits" in result
    assert "avg_score" in result
    assert "most_audited_domains" in result


def test_get_revenue_metrics():
    from app.store.history_store import get_revenue_metrics
    result = get_revenue_metrics()
    assert "mrr" in result
    assert "active_paid" in result
    assert "plan_distribution" in result


# ---------------------------------------------------------------------------
# Quota override helpers
# ---------------------------------------------------------------------------

def test_set_and_get_user_quota_override(client):
    from app.store.history_store import (
        create_subscription, get_user_by_email, get_user_quota_overrides,
        set_user_quota_override,
    )
    email = f"quota-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "Quota User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    create_subscription(user_id=user["id"], plan="pro")
    set_user_quota_override(user["id"], 100)
    overrides = get_user_quota_overrides()
    assert any(o["user_id"] == user["id"] and o["audit_quota_override"] == 100 for o in overrides)


def test_remove_user_quota_override(client):
    from app.store.history_store import (
        create_subscription, get_user_by_email, get_user_quota_overrides,
        remove_user_quota_override, set_user_quota_override,
    )
    email = f"remquota-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/signup", json={"email": email, "name": "RemQuota User", "password": "correct-horse-battery-staple"})
    user = get_user_by_email(email)
    create_subscription(user_id=user["id"], plan="pro")
    set_user_quota_override(user["id"], 200)
    remove_user_quota_override(user["id"])
    overrides = get_user_quota_overrides()
    assert not any(o["user_id"] == user["id"] for o in overrides)


# ---------------------------------------------------------------------------
# Celery job management helpers (D-21)
# ---------------------------------------------------------------------------

def test_celery_get_active_jobs_returns_list():
    """celery_get_active_jobs returns empty list when worker offline (no error raised)."""
    from app.store.history_store import celery_get_active_jobs
    result = celery_get_active_jobs()
    assert isinstance(result, list)


def test_celery_retry_job_returns_bool():
    """celery_retry_job returns a bool (False when worker offline)."""
    from app.store.history_store import celery_retry_job
    result = celery_retry_job(f"fake-task-{uuid.uuid4().hex}")
    assert isinstance(result, bool)


def test_celery_cancel_job_returns_bool():
    """celery_cancel_job returns a bool (False when worker offline)."""
    from app.store.history_store import celery_cancel_job
    result = celery_cancel_job(f"fake-task-{uuid.uuid4().hex}")
    assert isinstance(result, bool)


# ---------------------------------------------------------------------------
# Task 2: get_admin_user dependency tests
# ---------------------------------------------------------------------------

def test_admin_dependency_rejects_non_admin(client, signup_user):
    """Non-admin user hitting admin route must get 403."""
    # Sign in as normal user
    signin_res = client.post("/auth/signin", json={
        "email": signup_user["email"],
        "password": signup_user["password"],
    })
    assert signin_res.status_code == 200
    cookies = dict(signin_res.cookies)
    res = client.get("/admin/ping", cookies=cookies)
    assert res.status_code == 403


def test_admin_dependency_rejects_unauthenticated(client):
    """Unauthenticated request to admin route must get 401."""
    res = client.get("/admin/ping")
    assert res.status_code == 401


def test_admin_dependency_allows_admin(client, admin_user):
    """Admin user hitting admin route must get 200."""
    res = client.get("/admin/ping", cookies=admin_user["cookies"])
    assert res.status_code == 200


def test_auth_me_includes_is_admin(client, admin_user):
    """Admin user hitting /auth/me must see is_admin: true in response."""
    res = client.get("/auth/me", cookies=admin_user["cookies"])
    assert res.status_code == 200
    data = res.json()
    assert data.get("is_admin") is True
