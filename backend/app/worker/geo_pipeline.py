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
_FETCH_TIMEOUT = 10.0

# Pages that give the most signal for E-E-A-T / content analysis
_PRIORITY_PATH_KEYWORDS = [
    "about", "team", "contact", "privacy", "blog", "article",
    "product", "service", "faq", "pricing",
]


def _fetch_html(url: str) -> tuple[str, str]:
    """Fetch a single URL and return (url, html). Returns empty string on error."""
    try:
        headers = {
            "User-Agent": "AI-SEO-Bot/1.0 (+https://ai-seo-tool.com/bot)",
            "Accept": "text/html,application/xhtml+xml",
        }
        with httpx.Client(timeout=_FETCH_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
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
) -> None:
    """
    Run all GEO agents and persist results to Redis.
    Called by the Celery task after the main crawl + audit complete.
    """
    try:
        # --- Step 1: Select and fetch pages for analysis ---
        urls_to_fetch = _select_pages_to_fetch(url, pages)
        fetched: list[tuple[str, str]] = []

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(_fetch_html, u): u for u in urls_to_fetch}
            for future in as_completed(futures):
                page_url, html = future.result()
                if html:
                    fetched.append((page_url, html))

        homepage_html = next((html for u, html in fetched if u.rstrip("/") == url.rstrip("/")), "")
        about_html = _find_about_html(fetched)
        all_page_urls = [p.get("address", "") for p in pages if p.get("address")]
        html_pages = [(u, h) for u, h in fetched if h]

        # --- Step 2: Wave 1 — Heuristic agents in parallel (5 workers) ---
        schema_result = None
        content_result = None
        eeat_result = None
        site_type_result = None
        page_scores_result = None

        def _run_site_type():
            return detect_site_type(all_page_urls, homepage_html)

        def _run_schema():
            return analyze_schemas(html_pages)

        def _run_content():
            return analyze_content(html_pages)

        def _run_eeat():
            return analyze_eeat(all_page_urls, homepage_html, about_html)

        def _run_page_scores():
            return score_pages(html_pages)

        heuristic_tasks = {
            "site_type":   _run_site_type,
            "schema":      _run_schema,
            "content":     _run_content,
            "eeat":        _run_eeat,
            "page_scores": _run_page_scores,
        }

        with ThreadPoolExecutor(max_workers=5) as executor:
            future_map = {executor.submit(fn): name for name, fn in heuristic_tasks.items()}
            results = {}
            for future in as_completed(future_map):
                name = future_map[future]
                try:
                    results[name] = future.result()
                except Exception:
                    results[name] = {} if name != "page_scores" else []
                    print(f"GEO agent '{name}' failed: {traceback.format_exc()}")

        site_type_result   = results.get("site_type", {})
        schema_result      = results.get("schema", {})
        content_result     = results.get("content", {})
        eeat_result        = results.get("eeat", {})
        page_scores_result = results.get("page_scores", [])

        site_type = site_type_result.get("site_type", "informational")

        # Update schema with site-type-aware recommendations
        if schema_result:
            schema_result = analyze_schemas(html_pages, site_type=site_type)

        # Persist heuristic results
        set_geo(task_id, "site_type",   site_type_result)
        set_geo(task_id, "schema",      schema_result)
        set_geo(task_id, "content",     content_result)
        set_geo(task_id, "eeat",        eeat_result)
        set_geo(task_id, "page_scores", page_scores_result)

        # --- Step 3: Wave 2a — NLP and Probe in parallel (independent of each other) ---
        nlp_result   = None
        probe_result = None

        with ThreadPoolExecutor(max_workers=2) as executor:
            nlp_future = executor.submit(analyze_nlp, html_pages, url)
            prb_future = executor.submit(
                analyze_probe,
                url, None, content_result, site_type,
            )

            try:
                nlp_result = nlp_future.result(timeout=60)
            except Exception:
                nlp_result = {"ai_snippet_readiness": "Unknown", "source": "error"}
                print(f"GEO NLP agent failed: {traceback.format_exc()}")

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

        # --- Step 4: Final score with real NLP ---
        final_score = compute_score(
            schema=schema_result,
            eeat=eeat_result,
            content=content_result,
            nlp=nlp_result,
            audit=audit_result,
            site_type=site_type,
        )

        # --- Step 5: Suggestions using real NLP + final score ---
        # Must run after NLP so it sees the correct NLP score (not 0/100)
        try:
            suggestions_result = generate_suggestions(
                score_data=final_score,
                schema=schema_result,
                eeat=eeat_result,
                content=content_result,
                nlp=nlp_result,
                audit=audit_result,
                site_type=site_type,
            )
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
