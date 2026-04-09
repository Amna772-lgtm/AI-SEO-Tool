"""Admin API routes — protected by get_admin_user dependency.

All routes in this module require an authenticated user with is_admin=1.
The router is constructed with dependencies=[Depends(get_admin_user)] so
every endpoint automatically enforces admin auth without per-route annotation.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.dependencies.auth import get_admin_user

# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class UpdatePlanRequest(BaseModel):
    plan: str = Field(..., pattern="^(free|pro|agency)$")


class UpdateSettingRequest(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., max_length=1000)


class BanDomainRequest(BaseModel):
    domain: str = Field(..., min_length=3, max_length=253)
    reason: str | None = None


class SetQuotaRequest(BaseModel):
    quota: int = Field(..., ge=0, le=100000)


# ---------------------------------------------------------------------------
# Router — router-level dependency enforces admin auth on ALL routes
# ---------------------------------------------------------------------------

router = APIRouter(dependencies=[Depends(get_admin_user)])


# ---------------------------------------------------------------------------
# Health check (legacy — keep for backward compat with plan-01 tests)
# ---------------------------------------------------------------------------


@router.get("/ping")
def admin_ping(admin: dict[str, Any] = Depends(get_admin_user)) -> dict[str, str]:
    """Health check for the admin dependency. Returns 200 for admin users, 403 otherwise."""
    return {"status": "ok", "admin": admin["email"]}


# ---------------------------------------------------------------------------
# User Management Routes (D-11 through D-14)
# ---------------------------------------------------------------------------


@router.get("/users")
def list_users(
    search: str | None = Query(default=None),
    plan_filter: str | None = Query(default=None),
    status_filter: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    """Return paginated user list with optional search and filters."""
    from app.store.history_store import list_all_users
    return list_all_users(
        search=search,
        plan_filter=plan_filter,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@router.put("/users/{user_id}/plan")
def update_user_plan(user_id: str, body: UpdatePlanRequest) -> dict[str, str]:
    """Change a user's subscription plan."""
    from app.store.history_store import admin_update_user_plan
    admin_update_user_plan(user_id, body.plan)
    return {"status": "ok"}


@router.post("/users/{user_id}/disable")
def disable_user(user_id: str) -> dict[str, str]:
    """Disable a user account (blocks signin)."""
    from app.store.history_store import admin_update_user_status
    admin_update_user_status(user_id, is_disabled=1)
    return {"status": "ok"}


@router.post("/users/{user_id}/enable")
def enable_user(user_id: str) -> dict[str, str]:
    """Re-enable a previously disabled user account."""
    from app.store.history_store import admin_update_user_status
    admin_update_user_status(user_id, is_disabled=0)
    return {"status": "ok"}


@router.delete("/users/{user_id}")
def delete_user(user_id: str) -> dict[str, str]:
    """Cascade-delete a user and all associated data."""
    from app.store.history_store import delete_user_cascade
    delete_user_cascade(user_id)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Moderation Routes (D-25 through D-28)
# ---------------------------------------------------------------------------


@router.get("/moderation/audits")
def get_moderation_audits(
    search: str | None = Query(default=None),
    date_from: str | None = Query(default=None, description="YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="YYYY-MM-DD"),
    score_min: float | None = Query(default=None, ge=0, le=100),
    score_max: float | None = Query(default=None, ge=0, le=100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    """Return all analyses with optional date and score filters. Per D-25."""
    from app.store.history_store import list_all_analyses
    return list_all_analyses(
        search=search,
        date_from=date_from,
        date_to=date_to,
        score_min=score_min,
        score_max=score_max,
        skip=skip,
        limit=limit,
    )


@router.delete("/moderation/audits/{analysis_id}")
def delete_audit(analysis_id: str) -> dict[str, str]:
    """Delete an analysis record by ID."""
    from app.store.history_store import delete_analysis_admin
    delete_analysis_admin(analysis_id)
    return {"status": "ok"}


@router.get("/moderation/banned-domains")
def get_banned_domains() -> list[dict[str, Any]]:
    """List all banned domains."""
    from app.store.history_store import list_banned_domains
    return list_banned_domains()


@router.post("/moderation/banned-domains")
def ban_domain(body: BanDomainRequest) -> dict[str, str]:
    """Add a domain to the banned list."""
    from app.store.history_store import add_banned_domain
    add_banned_domain(body.domain, body.reason)
    return {"status": "ok"}


@router.delete("/moderation/banned-domains/{domain}")
def unban_domain(domain: str) -> dict[str, str]:
    """Remove a domain from the banned list."""
    from app.store.history_store import remove_banned_domain
    remove_banned_domain(domain)
    return {"status": "ok"}


@router.get("/moderation/quota-overrides")
def get_quota_overrides() -> list[dict[str, Any]]:
    """List all user quota overrides."""
    from app.store.history_store import get_user_quota_overrides
    return get_user_quota_overrides()


@router.put("/moderation/quota-overrides/{user_id}")
def set_quota_override(user_id: str, body: SetQuotaRequest) -> dict[str, str]:
    """Set a quota override for a specific user."""
    from app.store.history_store import set_user_quota_override
    set_user_quota_override(user_id, body.quota)
    return {"status": "ok"}


@router.delete("/moderation/quota-overrides/{user_id}")
def remove_quota_override(user_id: str) -> dict[str, str]:
    """Remove the quota override for a specific user."""
    from app.store.history_store import remove_user_quota_override
    remove_user_quota_override(user_id)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# System Health helper (shared by /dashboard and /system/health)
# ---------------------------------------------------------------------------


def _get_system_health() -> dict[str, Any]:
    """Get Celery queue status and Redis memory. Non-fatal on failure."""
    celery_stats: dict[str, Any] = {
        "active_tasks": 0,
        "pending_tasks": 0,
        "worker_online": False,
    }
    try:
        from app.worker.celery_app import celery as celery_app
        inspector = celery_app.control.inspect(timeout=2.0)
        active = inspector.active() or {}
        reserved = inspector.reserved() or {}
        celery_stats = {
            "active_tasks": sum(len(v) for v in active.values()),
            "pending_tasks": sum(len(v) for v in reserved.values()),
            "worker_online": bool(active or reserved),
        }
    except Exception:
        pass  # Worker offline or Redis unreachable — return defaults

    redis_memory_mb = 0.0
    try:
        from app.store.crawl_store import get_redis
        r = get_redis()
        info = r.info("memory")
        redis_memory_mb = round(info["used_memory"] / (1024 * 1024), 2)
    except Exception:
        pass

    # Count analyses with no score as "failed"
    failed_jobs = 0
    try:
        from app.store.history_store import _connect
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT COUNT(*) FROM analyses WHERE overall_score IS NULL"
            ).fetchone()
            failed_jobs = row[0] if row else 0
        finally:
            conn.close()
    except Exception:
        pass

    return {
        "celery": celery_stats,
        "redis_memory_mb": redis_memory_mb,
        "avg_audit_duration": None,
        "failed_jobs": failed_jobs,
    }


# ---------------------------------------------------------------------------
# Dashboard Route (D-16 through D-20)
# ---------------------------------------------------------------------------


@router.get("/dashboard")
def admin_dashboard() -> dict[str, Any]:
    """Return aggregated analytics: user metrics, audit metrics, revenue, system health, trends."""
    from app.store.history_store import (
        get_admin_user_metrics,
        get_audit_metrics,
        get_audit_trend,
        get_revenue_metrics,
        get_signup_trend,
    )

    users = get_admin_user_metrics()
    audits = get_audit_metrics()
    revenue = get_revenue_metrics()
    signup_trend = get_signup_trend(30)
    audit_trend = get_audit_trend(30)
    system = _get_system_health()

    return {
        "users": users,
        "audits": audits,
        "revenue": revenue,
        "system": system,
        "signup_trend": signup_trend,
        "audit_trend": audit_trend,
    }


# ---------------------------------------------------------------------------
# System Control Routes (D-21 through D-24)
# ---------------------------------------------------------------------------


@router.get("/system/health")
def system_health() -> dict[str, Any]:
    """Return Celery queue status and Redis memory usage."""
    return _get_system_health()


@router.get("/system/settings")
def get_settings() -> dict[str, str]:
    """Return all admin settings. API key values are masked (first 8 chars only)."""
    from app.store.history_store import get_all_admin_settings
    settings = get_all_admin_settings()
    # Mask API key values — show first 8 chars only (security: prevent key leakage)
    masked: dict[str, str] = {}
    for k, v in settings.items():
        if k.startswith("api_key_"):
            masked[k] = v[:8] + "..." if len(v) > 8 else v
        else:
            masked[k] = v
    return masked


@router.get("/system/settings/reveal/{key}")
def reveal_setting(key: str) -> dict[str, str]:
    """Return unmasked value for a specific setting. Admin-only explicit reveal."""
    from app.store.history_store import get_admin_setting
    value = get_admin_setting(key)
    if value is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
    return {"key": key, "value": value}


@router.put("/system/settings")
def update_setting(body: UpdateSettingRequest) -> dict[str, str]:
    """Set or update an admin setting key-value pair."""
    from app.store.history_store import set_admin_setting
    set_admin_setting(body.key, body.value)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Job Management Routes (D-21 — retry or cancel stuck Celery jobs)
# ---------------------------------------------------------------------------


@router.get("/system/jobs")
def list_jobs() -> dict[str, Any]:
    """List active and pending Celery jobs. Per D-21: view active/pending/failed jobs."""
    from app.store.history_store import celery_get_active_jobs
    jobs = celery_get_active_jobs()
    return {"jobs": jobs}


@router.post("/system/jobs/{task_id}/retry")
def retry_job(task_id: str) -> dict[str, str]:
    """Retry a stuck Celery job. Per D-21: retry stuck jobs."""
    from app.store.history_store import celery_retry_job
    success = celery_retry_job(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retry job. Worker may be offline.",
        )
    return {"status": "ok"}


@router.post("/system/jobs/{task_id}/cancel")
def cancel_job(task_id: str) -> dict[str, str]:
    """Cancel (revoke) a Celery job. Per D-21: cancel stuck jobs."""
    from app.store.history_store import celery_cancel_job
    success = celery_cancel_job(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel job. Worker may be offline.",
        )
    return {"status": "ok"}
