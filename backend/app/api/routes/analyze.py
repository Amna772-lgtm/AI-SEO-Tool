import uuid
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.auth import get_current_user
from app.schemas.analysis import AnalyzeRequest
from app.worker.tasks import process_site
from app.analyzers.robots import check_robots
from app.store.crawl_store import set_meta
from app.store.history_store import (
    get_subscription_by_user,
    maybe_reset_pro_audit_count,
    increment_audit_count,
    get_admin_setting,
    is_domain_banned,
)

router = APIRouter()


@router.post("/")
def analyze_site(
    request: AnalyzeRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    # --- Maintenance mode check (D-22) ----------------------------------------
    if get_admin_setting("feature_maintenance_mode") == "true":
        raise HTTPException(
            status_code=503,
            detail="System is in maintenance mode. Please try again later.",
        )

    # --- Domain blocklist check (D-27) ----------------------------------------
    parsed = urlparse(request.url)
    domain = parsed.netloc.lower().removeprefix("www.")
    if is_domain_banned(domain):
        raise HTTPException(
            status_code=403,
            detail="This domain is not permitted for analysis.",
        )

    # --- Plan enforcement (Phase 05, D-02/03/04/05/14) -----------------------
    sub = get_subscription_by_user(current_user["id"])
    if not sub:
        raise HTTPException(
            status_code=402,
            detail={"code": "no_subscription",
                    "message": "Plan selection required."},
        )
    plan = sub["plan"]
    if plan == "free":
        if sub["audit_count"] >= 1:
            raise HTTPException(
                status_code=402,
                detail={"code": "quota_exceeded", "plan": "free", "limit": 1,
                        "message": "You've used your 1 free audit. Upgrade to Pro for 10 audits per month."},
            )
    elif plan == "pro":
        sub = maybe_reset_pro_audit_count(current_user["id"]) or sub
        if sub["audit_count"] >= 10:
            raise HTTPException(
                status_code=402,
                detail={"code": "quota_exceeded", "plan": "pro", "limit": 10,
                        "message": "You've used all 10 audits for this billing period. Upgrade to Agency for unlimited audits."},
            )
    # plan == "agency": no cap
    # -------------------------------------------------------------------------

    robots_result = check_robots(request.url)
    if not robots_result["crawl_allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Crawling is disallowed by this site's robots.txt for the AI SEO crawler.",
                "robots_fetched": robots_result["robots_fetched"],
            },
        )

    task_id = str(uuid.uuid4())
    set_meta(
        task_id,
        {
            "id": task_id,
            "url": request.url,
            "status": "queued",
            "robots_allowed": robots_result["crawl_allowed"],
            "ai_crawler_access": robots_result.get("ai_crawler_access"),
            "disallowed_paths": robots_result.get("disallowed_paths", []),
            "user_id": current_user["id"],
        },
    )

    process_site.delay(
        request.url,
        task_id,
        robots_allowed=robots_result["crawl_allowed"],
        ai_crawler_access=robots_result.get("ai_crawler_access"),
    )

    increment_audit_count(current_user["id"])

    return {
        "message": "Crawl started",
        "site_id": task_id,
        "status": "queued",
        "robots_allowed": robots_result["crawl_allowed"],
        "ai_crawler_access": robots_result.get("ai_crawler_access"),
        "disallowed_paths": robots_result.get("disallowed_paths", []),
    }
