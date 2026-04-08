"""Competitor Tracking API routes. Phase 07 decisions D-01..D-19."""
from __future__ import annotations
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user
from app.store.history_store import (
    get_or_create_competitor_group,
    get_competitor_group,
    list_competitor_groups,
    add_competitor_site,
    link_competitor_analysis,
    count_competitor_sites,
    delete_competitor_site,
    get_analysis,
    get_subscription_by_user,
    increment_audit_count,
    maybe_reset_pro_audit_count,
)
from app.analyzers.competitor_discovery import discover_competitors
from app.worker.tasks import process_site

router = APIRouter()

# D-13 cap per plan
PLAN_COMPETITOR_CAP = {"free": 0, "pro": 3, "agency": 10}
# D-17 monthly audit quota (same as analyze.py)
PLAN_QUOTA = {"free": 1, "pro": 10, "agency": None}  # None = unlimited


class CreateGroupRequest(BaseModel):
    primary_analysis_id: str


class AddSiteRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)


class DiscoverRequest(BaseModel):
    primary_analysis_id: str


def _require_paid_plan(current_user: dict[str, Any]) -> str:
    """D-02, D-19: Free plan blocked from competitor tracking entirely."""
    sub = get_subscription_by_user(current_user["id"])
    plan = (sub["plan"] if sub else "free").lower()
    if plan == "free":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "feature_unavailable",
                "plan": "free",
                "message": "Competitor Tracking requires Pro or Agency plan.",
            },
        )
    return plan


def _check_quota_or_raise(user_id: str, plan: str) -> None:
    """D-17: competitor audits count against monthly quota. Mirrors analyze.py logic."""
    if plan == "agency":
        return  # unlimited
    maybe_reset_pro_audit_count(user_id)
    sub = get_subscription_by_user(user_id) or {}
    used = int(sub.get("audit_count", 0) or 0)
    limit = PLAN_QUOTA.get(plan, 1) or 1
    if used >= limit:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "quota_exceeded",
                "plan": plan,
                "limit": limit,
                "used": used,
            },
        )


def _normalize_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


# ===== DISCOVERY =====

@router.post("/discover")
def discover(
    req: DiscoverRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _require_paid_plan(current_user)
    rec = get_analysis(req.primary_analysis_id, current_user["id"])
    if not rec:
        raise HTTPException(status_code=404, detail="Primary analysis not found")
    geo = rec.get("geo_data") or {}
    site_type = ((geo.get("site_type") or {}).get("site_type")) or "unknown"
    key_topics = ((geo.get("nlp") or {}).get("key_topics")) or []
    probe_questions = ((geo.get("probe") or {}).get("questions")) or []
    faq_questions = [
        (q.get("question") if isinstance(q, dict) else str(q))
        for q in ((geo.get("content") or {}).get("faq_questions") or [])
    ]
    suggestions = discover_competitors(
        primary_domain=rec.get("domain") or "",
        site_type=site_type,
        key_topics=list(key_topics),
        probe_questions=list(probe_questions),
        faq_questions=list(faq_questions),
    )
    if suggestions is None:
        return {"suggestions": [], "fallback": True,
                "message": "Couldn't find suggestions right now. Add competitors manually using the field below."}
    return {"suggestions": suggestions, "fallback": False}


# ===== GROUPS =====

@router.get("/groups")
def list_groups(current_user: dict[str, Any] = Depends(get_current_user)):
    _require_paid_plan(current_user)
    return {"groups": list_competitor_groups(current_user["id"])}


@router.post("/groups")
def create_group(
    req: CreateGroupRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _require_paid_plan(current_user)
    rec = get_analysis(req.primary_analysis_id, current_user["id"])
    if not rec:
        raise HTTPException(status_code=404, detail="Primary analysis not found")
    group = get_or_create_competitor_group(current_user["id"], req.primary_analysis_id)
    full = get_competitor_group(group["id"], current_user["id"])
    full["primary_domain"] = rec.get("domain") or ""
    return full


@router.get("/groups/{group_id}")
def get_group(
    group_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _require_paid_plan(current_user)
    group = get_competitor_group(group_id, current_user["id"])
    if not group:
        # Phase 04 decision: 404 not 403 on cross-user access
        raise HTTPException(status_code=404, detail="Group not found")
    rec = get_analysis(group["primary_analysis_id"], current_user["id"])
    group["primary_domain"] = (rec or {}).get("domain") or ""
    return group


# ===== SITES =====

@router.post("/groups/{group_id}/sites")
def add_site(
    group_id: str,
    req: AddSiteRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    plan = _require_paid_plan(current_user)
    group = get_competitor_group(group_id, current_user["id"])
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    # D-13 per-group competitor cap
    cap = PLAN_COMPETITOR_CAP.get(plan, 0)
    current_count = count_competitor_sites(group_id)
    if current_count >= cap:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "competitor_cap_reached",
                "plan": plan,
                "cap": cap,
                "message": f"{plan.capitalize()} plan supports up to {cap} competitors per group.",
            },
        )
    # D-17 monthly audit quota
    _check_quota_or_raise(current_user["id"], plan)
    url = _normalize_url(req.url)
    site = add_competitor_site(group_id, url)
    task_id = str(uuid.uuid4())
    process_site.delay(url, task_id)
    increment_audit_count(current_user["id"])
    link_competitor_analysis(site["id"], task_id)
    site["analysis_id"] = task_id
    return site


@router.delete("/groups/{group_id}/sites/{site_id}")
def remove_site(
    group_id: str,
    site_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _require_paid_plan(current_user)
    group = get_competitor_group(group_id, current_user["id"])
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    ok = delete_competitor_site(site_id, group_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Site not found")
    return {"deleted": True}


@router.post("/groups/{group_id}/sites/{site_id}/reaudit")
def reaudit_site(
    group_id: str,
    site_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    plan = _require_paid_plan(current_user)
    group = get_competitor_group(group_id, current_user["id"])
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    site = next((s for s in group.get("sites", []) if s["id"] == site_id), None)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    # D-18: re-audit burns a quota slot
    _check_quota_or_raise(current_user["id"], plan)
    url = _normalize_url(site["url"])
    task_id = str(uuid.uuid4())
    process_site.delay(url, task_id)
    increment_audit_count(current_user["id"])
    link_competitor_analysis(site_id, task_id)
    return {"id": site_id, "analysis_id": task_id, "url": url}
