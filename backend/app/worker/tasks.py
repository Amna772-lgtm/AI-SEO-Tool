import traceback
import threading

from app.worker.celery_app import celery
from app.analyzers.crawler import crawl_site
from app.analyzers.audit import run_url_checks, run_page_checks
from app.store.crawl_store import set_meta, append_page, flush_pages_buffer, get_meta, get_all_pages, update_pages_alt_text, get_geo
from app.store.history_store import save_analysis
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

        images_total = len(img_alt_map)
        images_missing_alt = sum(1 for alt in img_alt_map.values() if not alt)

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
                "images_total": images_total,
                "images_missing_alt": images_missing_alt,
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

        # Persist completed analysis to history (non-fatal — never breaks the main flow)
        try:
            geo_snapshot = {
                "site_id":     task_id,
                "geo_status":  "completed",
                "site_type":   get_geo(task_id, "site_type"),
                "schema":      get_geo(task_id, "schema"),
                "content":     get_geo(task_id, "content"),
                "eeat":        get_geo(task_id, "eeat"),
                "nlp":         get_geo(task_id, "nlp"),
                "score":       get_geo(task_id, "score"),
                "suggestions": get_geo(task_id, "suggestions"),
                "probe":       get_geo(task_id, "probe"),
                "page_scores": get_geo(task_id, "page_scores"),
            }
            save_analysis(task_id, url, len(pages), geo_snapshot, audit_result)
        except Exception:
            print("History save failed (non-fatal):\n" + traceback.format_exc())

        meta = get_meta(task_id) or {}
        meta["geo_status"] = "completed"
        set_meta(task_id, meta)

    except Exception:
        meta = get_meta(task_id) or {}
        meta["status"] = "failed"
        set_meta(task_id, meta)
        print(traceback.format_exc())
