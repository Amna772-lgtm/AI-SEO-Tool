import traceback
import threading

from app.worker.celery_app import celery
from app.analyzers.crawler import crawl_site
from app.analyzers.audit import run_url_checks, run_page_checks
from app.store.crawl_store import set_meta, append_page, flush_pages_buffer, get_meta, get_all_pages, update_pages_alt_text
from app.worker.geo_pipeline import run_geo_pipeline


@celery.task(name="app.worker.tasks.process_site")
def process_site(url: str, task_id: str, robots_allowed: bool = True, ai_crawler_access: dict | None = None):
    try:
        set_meta(
            task_id,
            {
                "id": task_id,
                "url": url,
                "status": "processing",
                "robots_allowed": robots_allowed,
                "ai_crawler_access": ai_crawler_access,
                "audit_status": "running",
                "audit": None,
            },
        )

        # Start URL-only audit checks (HTTPS, sitemap, PSI) in parallel with the crawl.
        # These only need the URL so they can run immediately — no need to wait for pages.
        url_checks: dict = {}
        url_checks_done = threading.Event()

        def _run_url_checks():
            try:
                url_checks.update(run_url_checks(url))
            except Exception:
                pass
            finally:
                url_checks_done.set()

        audit_thread = threading.Thread(target=_run_url_checks, daemon=True)
        audit_thread.start()

        img_alt_map: dict = {}

        def on_page_crawled(page_data: dict) -> None:
            append_page(task_id, page_data)

        crawl_site(url, on_page_crawled=on_page_crawled, img_alt_out=img_alt_map)
        flush_pages_buffer(task_id)

        # Write alt text for image URLs into Redis (annotation happens after all HTML is parsed)
        update_pages_alt_text(task_id, img_alt_map)

        # Crawl done — mark as completed
        set_meta(
            task_id,
            {
                "id": task_id,
                "url": url,
                "status": "completed",
                "robots_allowed": robots_allowed,
                "ai_crawler_access": ai_crawler_access,
                "audit_status": "running",
                "audit": None,
            },
        )

        # Run page-dependent checks (broken links, missing canonicals)
        pages = get_all_pages(task_id)
        page_checks = run_page_checks(pages)

        # Wait for URL checks thread to finish (usually already done by now)
        url_checks_done.wait(timeout=120)

        audit_result = {**url_checks, **page_checks}

        meta = get_meta(task_id) or {}
        meta["audit_status"] = "completed"
        meta["audit"] = audit_result
        meta["geo_status"] = "running"
        set_meta(task_id, meta)

        # Run GEO pipeline (schema, content, E-E-A-T, NLP, scoring, suggestions)
        run_geo_pipeline(url, task_id, pages, audit_result)

        meta = get_meta(task_id) or {}
        meta["geo_status"] = "completed"
        set_meta(task_id, meta)

    except Exception:
        meta = get_meta(task_id) or {}
        meta["status"] = "failed"
        set_meta(task_id, meta)
        print(traceback.format_exc())
