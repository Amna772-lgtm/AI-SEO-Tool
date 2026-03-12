import uuid

from fastapi import APIRouter, HTTPException

from app.schemas.analysis import AnalyzeRequest
from app.worker.tasks import process_site
from app.analyzers.robots import check_robots
from app.store.crawl_store import set_meta

router = APIRouter()


@router.post("/")
def analyze_site(request: AnalyzeRequest):
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
        },
    )

    process_site.delay(
        request.url,
        task_id,
        robots_allowed=robots_result["crawl_allowed"],
        ai_crawler_access=robots_result.get("ai_crawler_access"),
    )

    return {
        "message": "Crawl started",
        "site_id": task_id,
        "status": "queued",
        "robots_allowed": robots_result["crawl_allowed"],
        "ai_crawler_access": robots_result.get("ai_crawler_access"),
        "disallowed_paths": robots_result.get("disallowed_paths", []),
    }
