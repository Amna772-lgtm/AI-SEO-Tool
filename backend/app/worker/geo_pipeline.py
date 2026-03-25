"""
GEO Pipeline Orchestrator
Runs all GEO agents after the main crawl completes.
Uses ThreadPoolExecutor to run heuristic agents in parallel,
then Claude/API agents after heuristics are done.
"""
from __future__ import annotations

import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse

import httpx

from app.analyzers.geo_site_type import detect_site_type
from app.analyzers.geo_schema import analyze_schemas
from app.analyzers.geo_content import analyze_content
from app.analyzers.geo_eeat import analyze_eeat
from app.analyzers.geo_nlp import analyze_nlp
from app.analyzers.geo_probe import analyze_probe
from app.analyzers.geo_page_scores import score_pages
from app.analyzers.geo_score import compute_score
from app.analyzers.geo_suggestions import generate_suggestions
from app.store.crawl_store import set_geo

# Max pages to fetch for deep analysis (keeps analysis time bounded)
_MAX_PAGES_TO_FETCH = 15


def _geo_page_limit(inventory_total: int | None) -> int:
    """Scale GEO analysis page limit based on how many pages the site has."""
    if not inventory_total or inventory_total <= 200:
        return 15
    if inventory_total <= 1000:
        return 25
    return 40
_FETCH_TIMEOUT = 10.0

# Pages that give the most signal for E-E-A-T / content analysis
_PRIORITY_PATH_KEYWORDS = [
    "about", "team", "contact", "privacy", "blog", "article",
    "product", "service", "faq", "pricing",
]


_FETCH_HEADERS = {
    "User-Agent": "AI-SEO-Bot/1.0 (+https://ai-seo-tool.com/bot)",
    "Accept": "text/html,application/xhtml+xml",
}


def _fetch_html(url: str, client: httpx.Client | None = None) -> tuple[str, str]:
    """Fetch a single URL and return (url, html). Returns empty string on error."""
    try:
        if client is not None:
            resp = client.get(url, headers=_FETCH_HEADERS)
        else:
            with httpx.Client(timeout=_FETCH_TIMEOUT, follow_redirects=True) as c:
                resp = c.get(url, headers=_FETCH_HEADERS)
        ct = resp.headers.get("content-type", "")
        if "text/html" not in ct.lower():
            return url, ""
        return url, resp.text
    except Exception:
        return url, ""


def _select_pages_to_fetch(
    homepage_url: str,
    page_list: list[dict],
    max_count: int = _MAX_PAGES_TO_FETCH,
) -> list[str]:
    """
    Select the most valuable pages to fetch for GEO analysis.
    Prioritizes: homepage, about, contact, blog, product, faq pages.
    """
    homepage_url = homepage_url.rstrip("/")
    selected: list[str] = [homepage_url]
    seen = {homepage_url}

    # First pass: priority paths
    for page in page_list:
        addr = (page.get("address") or "").rstrip("/")
        if addr in seen:
            continue
        ct = (page.get("content_type") or "").lower()
        if "text/html" not in ct:
            continue
        path = urlparse(addr).path.lower()
        if any(kw in path for kw in _PRIORITY_PATH_KEYWORDS):
            selected.append(addr)
            seen.add(addr)
        if len(selected) >= max_count:
            break

    # Second pass: fill remaining slots with any HTML pages
    for page in page_list:
        if len(selected) >= max_count:
            break
        addr = (page.get("address") or "").rstrip("/")
        if addr in seen:
            continue
        ct = (page.get("content_type") or "").lower()
        if "text/html" in ct:
            selected.append(addr)
            seen.add(addr)

    return selected


def _find_about_html(fetched_pages: list[tuple[str, str]]) -> str:
    """Return HTML of the about/team page from fetched pages, or empty string."""
    for url, html in fetched_pages:
        path = urlparse(url).path.lower()
        if any(kw in path for kw in ["about", "team", "staff", "people", "who-we-are"]):
            return html
    return ""


def run_geo_pipeline(
    url: str,
    task_id: str,
    pages: list[dict],
    audit_result: dict | None,
    inventory_total: int | None = None,
) -> None:
    """
    Run all GEO agents and persist results to Redis.
    Called by the Celery task after the main crawl + audit complete.
    """
    try:
        # --- Step 1: Select and fetch pages using a shared httpx client ---
        page_limit = _geo_page_limit(inventory_total)
        urls_to_fetch = _select_pages_to_fetch(url, pages, max_count=page_limit)
        fetched: list[tuple[str, str]] = []

        with httpx.Client(timeout=_FETCH_TIMEOUT, follow_redirects=True) as http_client:
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = {executor.submit(_fetch_html, u, http_client): u for u in urls_to_fetch}
                for future in as_completed(futures):
                    page_url, html = future.result()
                    if html:
                        fetched.append((page_url, html))

        homepage_html = next((html for u, html in fetched if u.rstrip("/") == url.rstrip("/")), "")
        about_html = _find_about_html(fetched)
        all_page_urls = [p.get("address", "") for p in pages if p.get("address")]
        html_pages = [(u, h) for u, h in fetched if h]

        # --- Step 2: Site type detection first (pure heuristic, <50ms) ---
        # Run before wave 1 so analyze_schemas gets site_type immediately,
        # avoiding a second full schema pass.
        try:
            site_type_result = detect_site_type(all_page_urls, homepage_html)
        except Exception:
            site_type_result = {}
            print(f"GEO agent 'site_type' failed: {traceback.format_exc()}")
        site_type = site_type_result.get("site_type", "informational")
        set_geo(task_id, "site_type", site_type_result)

        # --- Step 3: Wave 1 — Heuristic agents in parallel (4 workers) ---
        # schema now receives site_type directly — no second schema run needed.
        def _run_schema():
            return analyze_schemas(html_pages, site_type=site_type)

        def _run_content():
            return analyze_content(html_pages)

        def _run_eeat():
            return analyze_eeat(all_page_urls, homepage_html, about_html)

        def _run_page_scores():
            return score_pages(html_pages)

        heuristic_tasks = {
            "schema":      _run_schema,
            "content":     _run_content,
            "eeat":        _run_eeat,
            "page_scores": _run_page_scores,
        }

        with ThreadPoolExecutor(max_workers=4) as executor:
            future_map = {executor.submit(fn): name for name, fn in heuristic_tasks.items()}
            results = {}
            for future in as_completed(future_map):
                name = future_map[future]
                try:
                    results[name] = future.result()
                except Exception:
                    results[name] = {} if name != "page_scores" else []
                    print(f"GEO agent '{name}' failed: {traceback.format_exc()}")

        schema_result      = results.get("schema", {})
        content_result     = results.get("content", {})
        eeat_result        = results.get("eeat", {})
        page_scores_result = results.get("page_scores", [])

        # Persist heuristic results
        set_geo(task_id, "schema",      schema_result)
        set_geo(task_id, "content",     content_result)
        set_geo(task_id, "eeat",        eeat_result)
        set_geo(task_id, "page_scores", page_scores_result)

        # --- Step 4: Wave 2 — NLP + Probe in parallel; Suggestions starts as soon as NLP is done ---
        # Layout: [nlp] ──► compute_score ──► [suggestions] ─┐
        #         [probe  ─────────────────────────────────────┤
        #                                                      └► persist all
        nlp_result      = None
        probe_result    = None
        suggestions_result = None

        with ThreadPoolExecutor(max_workers=3) as executor:
            nlp_future = executor.submit(analyze_nlp, html_pages, url)
            prb_future = executor.submit(analyze_probe, url, None, content_result, site_type)

            # Wait for NLP first — it unblocks score + suggestions
            try:
                nlp_result = nlp_future.result(timeout=60)
            except Exception:
                nlp_result = {"ai_snippet_readiness": "Unknown", "source": "error"}
                print(f"GEO NLP agent failed: {traceback.format_exc()}")

            # Compute final score as soon as NLP is available
            final_score = compute_score(
                schema=schema_result,
                eeat=eeat_result,
                content=content_result,
                nlp=nlp_result,
                audit=audit_result,
                site_type=site_type,
            )

            # Launch suggestions immediately — runs in parallel with remaining probe time
            sug_future = executor.submit(
                generate_suggestions,
                final_score, schema_result, eeat_result,
                content_result, nlp_result, audit_result, site_type,
            )

            # Collect probe and suggestions results
            try:
                probe_result = prb_future.result(timeout=120)
            except Exception:
                probe_result = {
                    "engines": {},
                    "overall_mention_rate": 0.0,
                    "visibility_label": "Unknown",
                    "engines_tested": 0,
                    "source": "error",
                }
                print(f"GEO probe agent failed: {traceback.format_exc()}")

            try:
                suggestions_result = sug_future.result(timeout=60)
            except Exception:
                suggestions_result = {"critical": [], "important": [], "optional": []}
                print(f"GEO suggestions agent failed: {traceback.format_exc()}")

        # Persist Wave 2 + score results
        set_geo(task_id, "nlp",         nlp_result)
        set_geo(task_id, "suggestions", suggestions_result)
        set_geo(task_id, "probe",       probe_result)
        set_geo(task_id, "score",       final_score)

    except Exception:
        print(f"GEO pipeline failed for {task_id}: {traceback.format_exc()}")
        set_geo(task_id, "score", {
            "overall_score": 0,
            "grade": "F",
            "breakdown": {},
            "error": "Pipeline failed",
        })
