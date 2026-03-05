from datetime import datetime
import traceback

from sqlalchemy.orm import Session

from app.worker.celery_app import celery
from app.db.session import SessionLocal
from app.models.site import Site
from app.models.page import Page
from app.analyzers.crawler import crawl_site

# Page columns that are populated from page_data (for upsert update)
_PAGE_DATA_KEYS = (
    "address", "content_type", "status_code", "status", "indexability", "indexability_status",
    "title", "title_length", "meta_descp", "h1", "canonical", "readability", "crawl_depth",
    "response_time", "last_modified", "redirect_url", "redirect_type", "language",
    "http_version", "crawl_timestamp",
)


def _page_from_page_data(site_id: int, page_data: dict, link_type: str = "internal") -> Page:
    """Map crawler page_data dict to a Page model. Reusable for homepage or future per-URL crawl."""
    return Page(
        site_id=site_id,
        address=page_data.get("address"),
        type=link_type,
        content_type=page_data.get("content_type"),
        status_code=page_data.get("status_code"),
        status=page_data.get("status"),
        indexability=page_data.get("indexability"),
        indexability_status=page_data.get("indexability_status"),
        title=page_data.get("title"),
        title_length=page_data.get("title_length") or 0,
        meta_descp=page_data.get("meta_descp"),
        h1=page_data.get("h1"),
        canonical=page_data.get("canonical"),
        readability=page_data.get("readability"),
        crawl_depth=page_data.get("crawl_depth", 0),
        response_time=page_data.get("response_time"),
        last_modified=page_data.get("last_modified"),
        redirect_url=page_data.get("redirect_url"),
        redirect_type=page_data.get("redirect_type"),
        language=page_data.get("language"),
        http_version=page_data.get("http_version"),
        crawl_timestamp=page_data.get("crawl_timestamp") or datetime.utcnow(),
    )


def _update_page_from_page_data(page: Page, page_data: dict, link_type: str) -> None:
    """Update an existing Page with values from page_data (for re-crawl upsert)."""
    page.type = link_type
    for key in _PAGE_DATA_KEYS:
        if not hasattr(page, key):
            continue
        val = page_data.get(key)
        if key == "title_length" and val is None:
            val = 0
        if key == "crawl_timestamp" and val is None:
            val = datetime.utcnow()
        setattr(page, key, val)


def _upsert_page(db: Session, site_id: int, page_data: dict) -> None:
    """Insert or update a Page by (site_id, address). Persists immediately."""
    address = page_data.get("address")
    if not address:
        return
    link_type = page_data.get("type") or "internal"
    existing = db.query(Page).filter(Page.site_id == site_id, Page.address == address).first()
    if existing:
        _update_page_from_page_data(existing, page_data, link_type)
    else:
        db.add(_page_from_page_data(site_id, page_data, link_type=link_type))
    db.commit()


@celery.task(name="app.worker.tasks.process_site")
def process_site(site_id: int):
    db = SessionLocal()
    try:
        site = db.query(Site).filter(Site.id == site_id).first()
        if not site:
            return

        site.status = "processing"
        db.commit()

        crawl_start = datetime.utcnow()

        def on_page_crawled(page_data: dict) -> None:
            _upsert_page(db, site.id, page_data)

        crawl_site(site.url, on_page_crawled=on_page_crawled)

        # Remove pages not seen this crawl (stale from previous crawl)
        db.query(Page).filter(
            Page.site_id == site.id,
            Page.crawl_timestamp < crawl_start,
        ).delete(synchronize_session=False)
        db.commit()

        site.status = "completed"
        db.commit()
    except Exception:
        site.status = "failed"
        db.commit()
        print(traceback.format_exc())
    finally:
        db.close()