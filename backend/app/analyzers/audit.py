"""
Technical SEO audit checks (run after crawl completes):
- HTTPS
- Sitemap (robots.txt → /sitemap_index.xml → /sitemap.xml)
- Broken links (4xx/5xx internal pages)
- Missing canonicals (HTML pages without <link rel="canonical">)
- PageSpeed Insights — desktop & mobile (via Google PSI API)
"""
import os

import httpx
from urllib.parse import urlparse

GOOGLE_PSI_API_KEY = os.getenv("GOOGLE_PSI_API_KEY", "")
_PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
_PSI_TIMEOUT = 60.0  # PSI can take up to ~30-60 s


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------

def check_https(url: str) -> dict:
    """Check whether the site URL uses HTTPS."""
    is_https = urlparse(url).scheme == "https"
    return {
        "passed": is_https,
        "detail": "HTTPS" if is_https else "HTTP – connection is not encrypted",
    }


def check_sitemap(url: str) -> dict:
    """
    Locate sitemap by:
    1. Reading robots.txt for a Sitemap: directive
    2. Trying common paths: /sitemap_index.xml, /sitemap.xml
    Returns the first one found.
    """
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    candidates: list[str] = []

    # 1) Check robots.txt for Sitemap: directives
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True,
                          headers={"User-Agent": "AI-SEO-Bot/1.0"}) as client:
            robots_resp = client.get(f"{base}/robots.txt")
            if robots_resp.status_code < 400:
                for line in robots_resp.text.splitlines():
                    if line.lower().startswith("sitemap:"):
                        sitemap_ref = line.split(":", 1)[1].strip()
                        if sitemap_ref:
                            candidates.append(sitemap_ref)
    except Exception:
        pass

    # 2) Fallback common paths
    candidates += [
        f"{base}/sitemap_index.xml",
        f"{base}/sitemap.xml",
    ]

    # Try each candidate and return the first accessible one
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True,
                          headers={"User-Agent": "AI-SEO-Bot/1.0"}) as client:
            for candidate in candidates:
                try:
                    resp = client.head(candidate)
                    if resp.status_code >= 400:
                        resp = client.get(candidate)
                    if resp.status_code < 400:
                        return {"found": True, "url": candidate, "status_code": resp.status_code}
                except Exception:
                    continue
    except Exception:
        pass

    return {"found": False, "url": f"{base}/sitemap.xml", "error": "No sitemap found at common paths or in robots.txt"}


def check_broken_links(pages: list[dict]) -> dict:
    """Count internal pages that returned 4xx / 5xx or failed to fetch."""
    broken_urls = [
        p.get("address", "")
        for p in pages
        if p.get("type", "internal") == "internal"
        and (p.get("status_code") is None or (p.get("status_code") or 0) >= 400)
    ]
    return {"count": len(broken_urls), "urls": broken_urls[:50]}


def check_missing_canonicals(pages: list[dict]) -> dict:
    """Count indexable HTML pages that have no canonical tag."""
    html_pages = [
        p for p in pages
        if p.get("type", "internal") == "internal"
        and p.get("status_code") == 200
        and "text/html" in (p.get("content_type") or "").lower()
    ]
    missing_urls = [p.get("address", "") for p in html_pages if not p.get("canonical")]
    return {
        "total_html_pages": len(html_pages),
        "missing_count": len(missing_urls),
        "urls": missing_urls[:50],
    }


# ---------------------------------------------------------------------------
# PageSpeed Insights
# ---------------------------------------------------------------------------

def _parse_psi(data: dict) -> dict:
    lhr = data.get("lighthouseResult", {})
    cats = lhr.get("categories", {})
    audits = lhr.get("audits", {})

    def score(key: str) -> int | None:
        s = cats.get(key, {}).get("score")
        return round(s * 100) if s is not None else None

    def display(key: str) -> str | None:
        return audits.get(key, {}).get("displayValue")

    return {
        "performance": score("performance"),
        "accessibility": score("accessibility"),
        "best_practices": score("best-practices"),
        "seo": score("seo"),
        "fcp": display("first-contentful-paint"),
        "lcp": display("largest-contentful-paint"),
        "tbt": display("total-blocking-time"),
        "cls": display("cumulative-layout-shift"),
        "speed_index": display("speed-index"),
        "tti": display("interactive"),
    }


def fetch_pagespeed(url: str, strategy: str) -> dict:
    """Call Google PageSpeed Insights API. strategy: 'mobile' | 'desktop'."""
    params: dict = {"url": url, "strategy": strategy}
    if GOOGLE_PSI_API_KEY:
        params["key"] = GOOGLE_PSI_API_KEY
    try:
        with httpx.Client(timeout=_PSI_TIMEOUT) as client:
            resp = client.get(_PSI_ENDPOINT, params=params)
        if resp.status_code != 200:
            # Extract Google's error message for better diagnostics
            try:
                err_body = resp.json()
                err_msg = err_body.get("error", {}).get("message") or str(err_body)[:200]
            except Exception:
                err_msg = resp.text[:200]
            return {"strategy": strategy, "error": f"PSI {resp.status_code}: {err_msg}"}
        return {"strategy": strategy, **_parse_psi(resp.json())}
    except Exception as exc:
        return {"strategy": strategy, "error": str(exc)[:200]}


# ---------------------------------------------------------------------------
# Split entry points (for parallel execution with crawl)
# ---------------------------------------------------------------------------

def run_url_checks(url: str) -> dict:
    """
    Checks that only need the URL — safe to run in parallel with the crawl.
    Covers: HTTPS, sitemap, PageSpeed desktop + mobile.
    PSI desktop and mobile run concurrently via threads.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    https_result = check_https(url)
    sitemap_result = check_sitemap(url)

    # PSI desktop + mobile in parallel (both are independent HTTP calls)
    psi_results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=2) as ex:
        futures = {
            ex.submit(fetch_pagespeed, url, "desktop"): "desktop",
            ex.submit(fetch_pagespeed, url, "mobile"): "mobile",
        }
        for future in as_completed(futures):
            strategy = futures[future]
            psi_results[strategy] = future.result()

    return {
        "https": https_result,
        "sitemap": sitemap_result,
        "pagespeed": {
            "desktop": psi_results.get("desktop", {"strategy": "desktop", "error": "Not run"}),
            "mobile": psi_results.get("mobile", {"strategy": "mobile", "error": "Not run"}),
        },
    }


def run_page_checks(pages: list[dict]) -> dict:
    """Checks that require crawled page data — run after crawl completes."""
    return {
        "broken_links": check_broken_links(pages),
        "missing_canonicals": check_missing_canonicals(pages),
    }


# ---------------------------------------------------------------------------
# Combined entry point (kept for backwards compatibility)
# ---------------------------------------------------------------------------

def run_audit(url: str, pages: list[dict]) -> dict:
    """Run all audit checks sequentially and return a combined result dict."""
    url_checks = run_url_checks(url)
    page_checks = run_page_checks(pages)
    return {**url_checks, **page_checks}
