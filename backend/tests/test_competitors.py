"""Wave 0 test scaffolding for Phase 07 — Competitor Tracking feature.

Plan 02 enforcement tests are now GREEN (xfail markers removed).
"""
import pytest
from app.store.history_store import (
    get_or_create_competitor_group,
    add_competitor_site,
    link_competitor_analysis,
    get_competitor_group,
    list_competitor_groups,
    count_competitor_sites,
    save_analysis,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _insert_analysis(task_id: str, url: str, user_id: str) -> None:
    """Insert a fake primary analysis row scoped to user_id."""
    save_analysis(
        task_id=task_id,
        url=url,
        pages_count=1,
        geo_data={},
        audit_result=None,
        user_id=user_id,
    )


# ---------------------------------------------------------------------------
# COMP-01: get_or_create_competitor_group is idempotent
# ---------------------------------------------------------------------------

def test_get_or_create_group():
    """Calling get_or_create_competitor_group twice with same (user_id, primary_analysis_id)
    returns the same group id (D-09)."""
    _insert_analysis("a1-unique-grp", "https://example.com", "u-test-idempotent")
    g1 = get_or_create_competitor_group(
        user_id="u-test-idempotent",
        primary_analysis_id="a1-unique-grp",
    )
    g2 = get_or_create_competitor_group(
        user_id="u-test-idempotent",
        primary_analysis_id="a1-unique-grp",
    )
    assert g1["id"] == g2["id"]


def test_get_or_create_group_user_scoped():
    """Two different users with the same primary_analysis_id get separate groups."""
    _insert_analysis("shared-analysis-id", "https://example.com", "user-alpha")
    _insert_analysis("shared-analysis-id", "https://example.com", "user-beta")
    g_alpha = get_or_create_competitor_group(
        user_id="user-alpha",
        primary_analysis_id="shared-analysis-id",
    )
    g_beta = get_or_create_competitor_group(
        user_id="user-beta",
        primary_analysis_id="shared-analysis-id",
    )
    assert g_alpha["id"] != g_beta["id"]
    assert g_alpha["user_id"] == "user-alpha"
    assert g_beta["user_id"] == "user-beta"


# ---------------------------------------------------------------------------
# COMP-05: add_competitor_site inserts with analysis_id=NULL
# ---------------------------------------------------------------------------

def test_add_competitor_site_inserts_null_analysis():
    """add_competitor_site returns a row with analysis_id is None."""
    _insert_analysis("a2-null-analysis", "https://primary.com", "u-null-analysis")
    group = get_or_create_competitor_group(
        user_id="u-null-analysis",
        primary_analysis_id="a2-null-analysis",
    )
    site = add_competitor_site(group_id=group["id"], url="https://rival.com")
    assert site["analysis_id"] is None
    assert site["url"] == "https://rival.com"
    assert site["group_id"] == group["id"]


# ---------------------------------------------------------------------------
# link_competitor_analysis populates analysis_id
# ---------------------------------------------------------------------------

def test_link_competitor_analysis():
    """After link_competitor_analysis(site_id, 'task-xyz'), get_competitor_group
    returns the site with analysis_id='task-xyz'."""
    _insert_analysis("a3-link-test", "https://primary2.com", "u-link-test")
    group = get_or_create_competitor_group(
        user_id="u-link-test",
        primary_analysis_id="a3-link-test",
    )
    site = add_competitor_site(group_id=group["id"], url="https://rival2.com")
    link_competitor_analysis(site["id"], "task-xyz")
    group_data = get_competitor_group(group_id=group["id"], user_id="u-link-test")
    assert group_data is not None
    linked_site = next(s for s in group_data["sites"] if s["id"] == site["id"])
    assert linked_site["analysis_id"] == "task-xyz"


# ---------------------------------------------------------------------------
# count_competitor_sites returns integer count
# ---------------------------------------------------------------------------

def test_count_competitor_sites():
    """count_competitor_sites(group_id) returns integer matching inserted rows."""
    _insert_analysis("a4-count-test", "https://primary3.com", "u-count-test")
    group = get_or_create_competitor_group(
        user_id="u-count-test",
        primary_analysis_id="a4-count-test",
    )
    assert count_competitor_sites(group["id"]) == 0
    add_competitor_site(group_id=group["id"], url="https://comp1.com")
    add_competitor_site(group_id=group["id"], url="https://comp2.com")
    assert count_competitor_sites(group["id"]) == 2


# ---------------------------------------------------------------------------
# Discovery analyzer unit tests (no HTTP, no routes)
# ---------------------------------------------------------------------------

def test_discovery_no_api_key(monkeypatch):
    """discover_competitors returns None when ANTHROPIC_API_KEY is empty."""
    from app.analyzers import competitor_discovery
    monkeypatch.setattr(competitor_discovery, "ANTHROPIC_API_KEY", "")
    result = competitor_discovery.discover_competitors(
        "example.com", "saas", ["seo", "audits"], ["q1"], ["faq1"]
    )
    assert result is None


def test_discovery_normalizes_domains(monkeypatch):
    """discover_competitors strips protocol and path, returns bare hostnames."""
    from app.analyzers import competitor_discovery

    class FakeContent:
        text = '[{"domain": "https://Rival.COM/pricing", "reason": "r1"}, {"domain": "www.other.io", "reason": "r2"}]'

    class FakeResponse:
        content = [FakeContent()]

    class FakeClient:
        def messages(self):
            pass

        class messages:
            @staticmethod
            def create(**kwargs):
                return FakeResponse()

    monkeypatch.setattr(competitor_discovery, "ANTHROPIC_API_KEY", "fake-key")
    monkeypatch.setattr(competitor_discovery, "anthropic", type("M", (), {
        "Anthropic": lambda api_key: FakeClient()
    })())

    result = competitor_discovery.discover_competitors(
        "example.com", "saas", ["seo"], ["q1"], ["faq1"]
    )
    assert result == [
        {"domain": "rival.com", "reason": "r1"},
        {"domain": "other.io", "reason": "r2"},
    ]


# ---------------------------------------------------------------------------
# Plan 02 API route tests (formerly xfail — now GREEN)
# ---------------------------------------------------------------------------

def test_competitor_free_plan_gate(client, signup_and_subscribe):
    """Free plan user cannot POST /competitors/groups; returns 403 feature_unavailable."""
    u = signup_and_subscribe(plan="free")
    _insert_analysis("free-gate-analysis-02", "https://freeuser.com", u["user_id"])
    # Try to create a group — free plan should be blocked
    res = client.post(
        "/competitors/groups",
        json={"primary_analysis_id": "free-gate-analysis-02"},
    )
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "feature_unavailable"


def test_competitor_cap_pro(pro_user_with_group, monkeypatch):
    """Pro user can add 3 competitor sites; 4th returns 403 competitor_cap_reached."""
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    user_id, primary_id, group_id, cookies = pro_user_with_group
    monkeypatch.setattr(
        "app.api.routes.competitors.process_site.delay",
        lambda *args, **kwargs: type("T", (), {"id": kwargs.get("task_id", "fake")})()
    )
    monkeypatch.setattr(
        "app.api.routes.competitors.increment_audit_count",
        lambda uid: None
    )
    monkeypatch.setattr(
        "app.api.routes.competitors._check_quota_or_raise",
        lambda user_id, plan: None
    )
    for i in range(3):
        r = client.post(
            f"/competitors/groups/{group_id}/sites",
            json={"url": f"https://rival{i}.com"},
            cookies=cookies,
        )
        assert r.status_code == 200, r.text
    r = client.post(
        f"/competitors/groups/{group_id}/sites",
        json={"url": "https://rival4.com"},
        cookies=cookies,
    )
    assert r.status_code == 403
    assert r.json()["detail"]["code"] == "competitor_cap_reached"
    assert r.json()["detail"]["cap"] == 3


def test_competitor_cap_agency(client, signup_and_subscribe, monkeypatch):
    """Agency user can add 10 competitor sites; 11th returns 403 competitor_cap_reached."""
    from fastapi.testclient import TestClient
    from app.main import app
    client2 = TestClient(app)

    u = signup_and_subscribe(plan="agency")
    _insert_analysis("cap-agency-analysis-02", "https://cappedagency.com", u["user_id"])
    group_res = client2.post(
        "/competitors/groups",
        json={"primary_analysis_id": "cap-agency-analysis-02"},
    )
    assert group_res.status_code == 200, group_res.text
    group_id = group_res.json()["id"]

    monkeypatch.setattr(
        "app.api.routes.competitors.process_site.delay",
        lambda *args, **kwargs: type("T", (), {"id": kwargs.get("task_id", "fake")})()
    )
    monkeypatch.setattr(
        "app.api.routes.competitors.increment_audit_count",
        lambda uid: None
    )
    monkeypatch.setattr(
        "app.api.routes.competitors._check_quota_or_raise",
        lambda user_id, plan: None
    )
    for i in range(10):
        r = client2.post(
            f"/competitors/groups/{group_id}/sites",
            json={"url": f"https://comp-agency{i}.com"},
        )
        assert r.status_code == 200, r.text
    r = client2.post(
        f"/competitors/groups/{group_id}/sites",
        json={"url": "https://over-cap-agency.com"},
    )
    assert r.status_code == 403
    assert r.json()["detail"]["code"] == "competitor_cap_reached"
    assert r.json()["detail"]["cap"] == 10


def test_cross_user_group_returns_404(client, signup_and_subscribe):
    """User A cannot GET /competitors/groups/{group_id} owned by User B; returns 404."""
    from fastapi.testclient import TestClient
    from app.main import app

    u_a = signup_and_subscribe(plan="pro")
    u_b = signup_and_subscribe(plan="pro")

    _insert_analysis("cross-user-analysis-a", "https://site-a.com", u_a["user_id"])

    # User A creates a group
    client_a = TestClient(app)
    client_a.post("/auth/signin", json={"email": u_a["email"], "password": u_a["password"]})
    group_res = client_a.post(
        "/competitors/groups",
        json={"primary_analysis_id": "cross-user-analysis-a"},
    )
    assert group_res.status_code == 200, group_res.text
    group_id = group_res.json()["id"]

    # User B tries to access User A's group — should get 404 per Phase 04 decision
    client_b = TestClient(app)
    client_b.post("/auth/signin", json={"email": u_b["email"], "password": u_b["password"]})
    res = client_b.get(f"/competitors/groups/{group_id}")
    assert res.status_code == 404


def test_add_site_dispatches_analyze_and_links(pro_user_with_group, monkeypatch):
    """POST /competitors/groups/{id}/sites dispatches delay and links task_id to analysis_id."""
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    user_id, primary_id, group_id, cookies = pro_user_with_group
    captured = {}

    def fake_delay(*args, **kwargs):
        captured["task_id"] = kwargs.get("task_id", args[1] if len(args) > 1 else "")
        return type("T", (), {"id": captured["task_id"]})()

    monkeypatch.setattr("app.api.routes.competitors.process_site.delay", fake_delay)
    monkeypatch.setattr("app.api.routes.competitors.increment_audit_count", lambda uid: None)
    monkeypatch.setattr("app.api.routes.competitors._check_quota_or_raise", lambda uid, plan: None)

    res = client.post(
        f"/competitors/groups/{group_id}/sites",
        json={"url": "https://dispatched-rival.com"},
        cookies=cookies,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["analysis_id"] is not None
    assert body["analysis_id"] == captured["task_id"]


def test_reaudit_dispatches_new_analyze(pro_user_with_group, monkeypatch):
    """POST /competitors/groups/{id}/sites/{site_id}/reaudit generates new task_id and updates analysis_id."""
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    user_id, primary_id, group_id, cookies = pro_user_with_group
    call_count = {"n": 0}

    def fake_delay(*args, **kwargs):
        call_count["n"] += 1
        return type("T", (), {"id": kwargs.get("task_id", "fake")})()

    monkeypatch.setattr("app.api.routes.competitors.process_site.delay", fake_delay)
    monkeypatch.setattr("app.api.routes.competitors.increment_audit_count", lambda uid: None)
    monkeypatch.setattr("app.api.routes.competitors._check_quota_or_raise", lambda uid, plan: None)

    # Add a site first
    add_res = client.post(
        f"/competitors/groups/{group_id}/sites",
        json={"url": "https://reaudit-rival.com"},
        cookies=cookies,
    )
    assert add_res.status_code == 200, add_res.text
    site_id = add_res.json()["id"]
    first_analysis_id = add_res.json()["analysis_id"]

    # Re-audit
    reaudit_res = client.post(
        f"/competitors/groups/{group_id}/sites/{site_id}/reaudit",
        cookies=cookies,
    )
    assert reaudit_res.status_code == 200, reaudit_res.text
    body = reaudit_res.json()
    assert body["id"] == site_id
    assert body["analysis_id"] != first_analysis_id
    assert call_count["n"] == 2  # once for add, once for reaudit
