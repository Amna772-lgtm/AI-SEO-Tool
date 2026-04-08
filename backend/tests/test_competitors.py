"""Wave 0 test scaffolding for Phase 07 — Competitor Tracking feature.

Tests that cannot pass yet (Plan 02 enforcement layer) are marked
@pytest.mark.xfail(reason="implemented in Plan 02") so Plan 01's wave run
stays green after Task 2 implements the store helpers.
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
# Plan 02 scaffolds — marked xfail until enforcement API routes are built
# ---------------------------------------------------------------------------

@pytest.mark.xfail(reason="implemented in Plan 02")
def test_competitor_cap_pro(client, signup_and_subscribe):
    """Pro user can add at most 3 competitor sites; 4th site returns 403."""
    u = signup_and_subscribe(plan="pro")
    _insert_analysis("cap-pro-analysis", "https://cappedpro.com", u["user_id"])
    group = get_or_create_competitor_group(
        user_id=u["user_id"],
        primary_analysis_id="cap-pro-analysis",
    )
    for i in range(3):
        client.post(
            f"/competitors/groups/{group['id']}/sites",
            json={"url": f"https://comp{i}.com"},
            cookies={"access_token": u.get("token", "")},
        )
    res = client.post(
        f"/competitors/groups/{group['id']}/sites",
        json={"url": "https://over-cap.com"},
        cookies={"access_token": u.get("token", "")},
    )
    assert res.status_code == 403


@pytest.mark.xfail(reason="implemented in Plan 02")
def test_competitor_cap_agency(client, signup_and_subscribe):
    """Agency user can add at most 10 competitor sites; 11th returns 403."""
    u = signup_and_subscribe(plan="agency")
    _insert_analysis("cap-agency-analysis", "https://cappedagency.com", u["user_id"])
    group = get_or_create_competitor_group(
        user_id=u["user_id"],
        primary_analysis_id="cap-agency-analysis",
    )
    for i in range(10):
        client.post(
            f"/competitors/groups/{group['id']}/sites",
            json={"url": f"https://comp-agency{i}.com"},
            cookies={"access_token": u.get("token", "")},
        )
    res = client.post(
        f"/competitors/groups/{group['id']}/sites",
        json={"url": "https://over-cap-agency.com"},
        cookies={"access_token": u.get("token", "")},
    )
    assert res.status_code == 403


@pytest.mark.xfail(reason="implemented in Plan 02")
def test_competitor_free_plan_gate(client, signup_and_subscribe):
    """Free plan user cannot access competitor tracking; POST returns 403."""
    u = signup_and_subscribe(plan="free")
    _insert_analysis("free-gate-analysis", "https://freeuser.com", u["user_id"])
    group = get_or_create_competitor_group(
        user_id=u["user_id"],
        primary_analysis_id="free-gate-analysis",
    )
    res = client.post(
        f"/competitors/groups/{group['id']}/sites",
        json={"url": "https://rival-free.com"},
        cookies={"access_token": u.get("token", "")},
    )
    assert res.status_code == 403
