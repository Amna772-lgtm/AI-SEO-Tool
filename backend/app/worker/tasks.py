from app.worker.celery_app import celery
from app.db.session import SessionLocal
from app.models.site import Site
from app.models.page import Page
from app.analyzers.crawler import crawl_homepage
import json
import traceback


@celery.task(name="app.worker.tasks.process_site")
def process_site(site_id: int):

    db = SessionLocal()

    try:
        site = db.query(Site).filter(Site.id == site_id).first()

        if not site:
            return

        # Update status → processing
        site.status = "processing"
        db.commit()

        # Crawl homepage
        result = crawl_homepage(site.url)

        # If website failed (non-200)
        if result["status_code"] != 200:
            site.status = "failed"
            db.commit()
            return

        # Remove existing homepage record (re-analysis safe)
        existing_page = db.query(Page).filter(Page.site_id == site.id).first()
        if existing_page:
            db.delete(existing_page)
            db.commit()

        # Create new page record
        page = Page(
            site_id=site.id,
            url=result["url"],
            status_code=result["status_code"],
            title=result["title"],
            meta_description=result["meta_description"],
            h1=result["h1"],
            canonical=result["canonical"],
            internal_links=result["internal_links"],
            external_links=result["external_links"],
            json_ld=json.dumps(result["json_ld"]),
            raw_html=result["html"]
        )

        db.add(page)
        db.commit()

        # Mark site completed
        site.status = "completed"
        db.commit()

    except Exception:
        # Mark failed on any exception
        site = db.query(Site).filter(Site.id == site_id).first()
        if site:
            site.status = "failed"
            db.commit()

        print("ERROR IN process_site TASK")
        print(traceback.format_exc())

    finally:
        db.close()