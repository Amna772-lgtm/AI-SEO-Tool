from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.site import Site
from app.schemas.analysis import AnalyzeRequest
from app.worker.tasks import process_site
from app.analyzers.robots import check_robots

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def analyze_site(request: AnalyzeRequest, db: Session = Depends(get_db)):
    # Step 1: robots.txt check (URL already validated and normalized by schema)
    robots_result = check_robots(request.url)
    if not robots_result["crawl_allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Crawling is disallowed by this site's robots.txt for the AI SEO crawler.",
                "robots_fetched": robots_result["robots_fetched"],
            },
        )

    # Check if URL already exists
    existing_site = db.query(Site).filter(Site.url == request.url).first()

    if existing_site:
        existing_site.status = "queued"
        existing_site.robots_allowed = robots_result["crawl_allowed"]
        existing_site.ai_crawler_access = robots_result["ai_crawler_access"]
        db.commit()
        db.refresh(existing_site)

        process_site.delay(existing_site.id)

        return {
            "message": "Existing site re-queued for analysis",
            "site_id": existing_site.id,
            "status": existing_site.status,
            "robots_allowed": existing_site.robots_allowed,
            "ai_crawler_access": existing_site.ai_crawler_access,
        }
    else:
        new_site = Site(
            url=request.url,
            status="queued",
            robots_allowed=robots_result["crawl_allowed"],
            ai_crawler_access=robots_result["ai_crawler_access"],
        )
        db.add(new_site)
        db.commit()
        db.refresh(new_site)

        process_site.delay(new_site.id)

        return {
            "message": "New site added for analysis",
            "site_id": new_site.id,
            "status": new_site.status,
            "robots_allowed": new_site.robots_allowed,
            "ai_crawler_access": new_site.ai_crawler_access,
        }