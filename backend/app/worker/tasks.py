import traceback
import uuid

from app.worker.celery_app import celery
from app.analyzers.crawler import crawl_site
from app.store.crawl_store import set_meta, append_page, flush_pages_buffer, get_meta

# Crawler emits page_data dicts; we store them in Redis (no DB).


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
            },
        )

        def on_page_crawled(page_data: dict) -> None:
            append_page(task_id, page_data)

        crawl_site(url, on_page_crawled=on_page_crawled)
        flush_pages_buffer(task_id)

        set_meta(
            task_id,
            {
                "id": task_id,
                "url": url,
                "status": "completed",
                "robots_allowed": robots_allowed,
                "ai_crawler_access": ai_crawler_access,
            },
        )
    except Exception:
        meta = get_meta(task_id) or {}
        meta["status"] = "failed"
        set_meta(task_id, meta)
        print(traceback.format_exc())
