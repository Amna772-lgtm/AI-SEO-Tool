import traceback
import threading
import uuid

from app.worker.celery_app import celery
from app.analyzers.crawler import crawl_site, crawl_sampled
from app.analyzers.audit import run_url_checks, run_page_checks
from app.analyzers.page_inventory import build_inventory, smart_sample
from app.store.crawl_store import (
    set_meta, append_page, flush_pages_buffer, get_meta, get_all_pages,
    update_pages_alt_text, get_geo, set_inventory,
)
from app.store.history_store import save_analysis, get_due_schedules, mark_schedule_ran
from app.worker.geo_pipeline import run_geo_pipeline


@celery.task(
    name="app.worker.tasks.process_site",
    time_limit=3600,        # 1-hour hard kill
    soft_time_limit=3300,   # 55-min soft kill (raises SoftTimeLimitExceeded)
)
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

        # ── Phase 1: Build URL inventory from sitemap (fast, ~2-5s) ──────────
        inventory = build_inventory(url)

        # Persist inventory metadata so the frontend can display it
        set_inventory(task_id, {
            "total": inventory.total,
            "strategy": inventory.strategy,
            "sample_size": inventory.sample_size,
            "has_sitemap": inventory.has_sitemap,
            "sections": inventory.sections,
        })

        # Expose inventory totals in meta so GET /sites/{id} can return them
        meta_with_inv = get_meta(task_id) or {}
        meta_with_inv["inventory_total"] = inventory.total
        meta_with_inv["inventory_sections"] = inventory.sections
        meta_with_inv["inventory_strategy"] = inventory.strategy
        set_meta(task_id, meta_with_inv)

        # Start URL-only audit checks (HTTPS, sitemap, PSI) in parallel with the crawl.
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

        # ── Phase 2: Crawl — adaptive strategy ───────────────────────────────
        if inventory.has_sitemap and inventory.total >= 100:
            # Large site with a good sitemap → sample + direct fetch (no BFS)
            sample_urls = smart_sample(inventory)

            # Update inventory with finalized sample size
            set_inventory(task_id, {
                "total": inventory.total,
                "strategy": inventory.strategy,
                "sample_size": inventory.sample_size,
                "has_sitemap": inventory.has_sitemap,
                "sections": inventory.sections,
            })
            meta_with_inv = get_meta(task_id) or {}
            meta_with_inv["inventory_sample_size"] = inventory.sample_size
            set_meta(task_id, meta_with_inv)

            crawl_sampled(sample_urls, on_page_crawled=on_page_crawled, img_alt_out=img_alt_map)
        else:
            # Small site or no sitemap → traditional BFS
            crawl_site(url, on_page_crawled=on_page_crawled, img_alt_out=img_alt_map)

        flush_pages_buffer(task_id)

        # Write alt text for image URLs into Redis (annotation happens after all HTML is parsed)
        update_pages_alt_text(task_id, img_alt_map)

        images_total = len(img_alt_map)
        images_missing_alt = sum(
            1 for attrs in img_alt_map.values()
            if not (attrs["alt"] if isinstance(attrs, dict) else attrs)
        )
        # Optimized = has alt text AND at least one of: modern format (WebP/AVIF),
        # lazy loading enabled, or explicit width+height dimensions set
        images_optimized = sum(
            1 for attrs in img_alt_map.values()
            if isinstance(attrs, dict)
            and attrs.get("alt")
            and (attrs.get("modern") or attrs.get("lazy") or attrs.get("has_dims"))
        )

        # Crawl done — mark as completed
        meta = get_meta(task_id) or {}
        meta.update({
            "id": task_id,
            "url": url,
            "status": "completed",
            "robots_allowed": robots_allowed,
            "ai_crawler_access": ai_crawler_access,
            "audit_status": "running",
            "audit": None,
            "images_total": images_total,
            "images_missing_alt": images_missing_alt,
            "images_optimized": images_optimized,
        })
        set_meta(task_id, meta)

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
        run_geo_pipeline(url, task_id, pages, audit_result, inventory_total=inventory.total)

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


@celery.task(name="app.worker.tasks.check_due_schedules")
def check_due_schedules():
    """
    Celery Beat fires this every 60 seconds.
    For each due + enabled schedule, dispatch process_site.
    mark_schedule_ran() is called BEFORE dispatch so a crash mid-dispatch
    does not cause the same schedule to fire again on the next Beat tick.
    """
    from app.analyzers.robots import check_robots

    due = get_due_schedules()
    for schedule in due:
        try:
            mark_schedule_ran(schedule["id"])

            robots = check_robots(schedule["url"])
            if not robots["crawl_allowed"]:
                print(f"[schedules] Skipping {schedule['url']} — robots disallowed")
                continue

            task_id = str(uuid.uuid4())
            set_meta(task_id, {
                "id": task_id,
                "url": schedule["url"],
                "status": "queued",
                "robots_allowed": True,
                "ai_crawler_access": robots.get("ai_crawler_access"),
                "disallowed_paths": robots.get("disallowed_paths", []),
                "triggered_by_schedule": schedule["id"],
            })
            process_site.delay(
                schedule["url"],
                task_id,
                robots_allowed=True,
                ai_crawler_access=robots.get("ai_crawler_access"),
            )
            print(f"[schedules] Dispatched {schedule['url']} → task {task_id}")

        except Exception:
            print(f"[schedules] Error processing schedule {schedule['id']}:\n"
                  + traceback.format_exc())
