"""
Crawl a URL and extract SEO + technical metadata.
- Single-URL crawl: use fetch_page + build_page_data (optionally follow_redirects=False to capture redirects).
- Full-site crawl: use crawl_site() to follow redirects and BFS internal links with deduplication.
"""
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable
from urllib.parse import urlparse, urljoin, urlunparse
import time
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from app.utils.url_validator import normalize_url

USER_AGENT = "AI-SEO-Bot/1.0"
REQUEST_TIMEOUT = 15.0  # total request; slightly lower for faster failure on slow hosts
DEFAULT_MAX_URLS = 500
CONCURRENT_REQUESTS = 20  # parallel fetches per batch for BFS and external URLs

# Status code -> status text (for consistent display)
STATUS_TEXT = {
    200: "OK",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
}


def _get_status_text(status_code: int) -> str:
    """Return standard status text for a status code."""
    return STATUS_TEXT.get(status_code) or f"Status {status_code}"


def _get_http_version(response: httpx.Response) -> str | None:
    """Extract HTTP version from response (e.g. '1.1')."""
    version = getattr(response, "http_version", None)
    if version is not None:
        return str(version) if isinstance(version, str) else None
    ext = getattr(response, "extensions", None) or {}
    raw = ext.get("http_version")
    if isinstance(raw, bytes):
        raw = raw.decode("ascii", errors="ignore")
    if isinstance(raw, str) and "HTTP/" in raw:
        return raw.strip().replace("HTTP/", "")
    return None


def _resolve_redirect_url(location: str | None, base_url: str) -> str | None:
    """Make redirect Location absolute against base_url."""
    if not location or not base_url:
        return location
    return urljoin(base_url, location)


def _normalize_for_dedupe(url: str) -> str | None:
    """
    Normalize URL for deduplication (lowercase scheme/host, strip trailing slash).
    Returns None if URL is invalid. Used so the same page is not crawled or stored twice.
    """
    try:
        parsed = urlparse((url or "").strip())
        if not parsed.netloc:
            return None
        scheme = parsed.scheme.lower() if parsed.scheme else "https"
        netloc = parsed.netloc.lower()
        path = (parsed.path or "/").rstrip("/") or "/"
        return urlunparse((scheme, netloc, path, parsed.params, parsed.query, ""))
    except Exception:
        return None


def extract_response_metadata(response: httpx.Response, request_url: str) -> dict:
    """
    Extract technical metadata from response headers and response object.
    Reusable for any httpx.Response.
    """
    headers = response.headers
    status_code = response.status_code
    return {
        "content_type": headers.get("content-type"),
        "last_modified": headers.get("last-modified"),
        "language": headers.get("content-language"),
        "status_code": status_code,
        "status": _get_status_text(status_code),
        "http_version": _get_http_version(response),
        "redirect_url": _resolve_redirect_url(
            headers.get("location"), request_url
        ) if status_code in (301, 302, 303, 307, 308) else None,
        "redirect_type": "HTTP Redirect" if status_code in (301, 302, 303, 307, 308) else None,
    }


def get_indexability(status_code: int, redirect_url: str | None) -> tuple[str, str | None]:
    """
    Return (indexability, indexability_status) for a given response.
    indexability_status is only set when non-indexable (None when indexable).
    """
    if status_code in (301, 302, 303, 307, 308):
        return "Non-Indexable", "Redirected"
    if status_code >= 400:
        return "Non-Indexable", "Error"
    if status_code == 200:
        return "Indexable", ""
    return "Non-Indexable", _get_status_text(status_code)


def parse_html_metadata(html: str, base_url: str) -> dict:
    """
    Parse title, title length, h1, meta description, canonical, language from HTML.
    Returns dict with keys: title, title_length, h1, meta_descp, canonical, language.
    language falls back to <html lang="..."> if not in headers.
    """
    soup = BeautifulSoup(html, "html.parser")
    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    title_length = len(title) if title else 0
    meta_tag = soup.find("meta", attrs={"name": "description"})
    meta_descp = meta_tag.get("content") if meta_tag and meta_tag.get("content") else None
    h1_tag = soup.find("h1")
    h1 = h1_tag.get_text(strip=True) if h1_tag else None
    canonical_tag = soup.find("link", rel="canonical")
    canonical = canonical_tag.get("href") if canonical_tag and canonical_tag.get("href") else None
    if canonical and base_url:
        canonical = urljoin(base_url, canonical)
    html_tag = soup.find("html", lang=True)
    language = html_tag.get("lang") if html_tag else None
    return {
        "title": title,
        "title_length": title_length,
        "meta_descp": meta_descp,
        "h1": h1,
        "canonical": canonical,
        "language": language,
    }


def _http_client_kwargs(follow_redirects: bool) -> dict:
    return {
        "timeout": REQUEST_TIMEOUT,
        "follow_redirects": follow_redirects,
        "headers": {"User-Agent": USER_AGENT},
    }


def fetch_page(url: str, *, follow_redirects: bool = False) -> tuple[httpx.Response, float]:
    """
    Fetch a single URL. Returns (response, response_time_seconds).
    Reusable for homepage or future per-URL crawl.
    """
    url = normalize_url(url)
    start = time.perf_counter()
    with httpx.Client(**_http_client_kwargs(follow_redirects)) as client:
        response = client.get(url)
    elapsed = round(time.perf_counter() - start, 3)
    return response, elapsed


def fetch_page_with_client(
    url: str, client: httpx.Client, *, follow_redirects: bool = False
) -> tuple[httpx.Response, float]:
    """Fetch with a shared client (connection reuse). Returns (response, response_time_seconds)."""
    url = normalize_url(url)
    start = time.perf_counter()
    response = client.get(url, follow_redirects=follow_redirects)
    elapsed = round(time.perf_counter() - start, 3)
    return response, elapsed


def build_page_data(
    request_url: str,
    response: httpx.Response,
    response_time: float,
    crawl_depth: int = 0,
    *,
    store_final_url: bool = False,
) -> dict:
    """
    Build a full page_data dict for storage. When store_final_url=True (e.g. after
    following redirects), address is the final response URL; otherwise the requested URL.
    """
    request_url = normalize_url(request_url)
    meta = extract_response_metadata(response, request_url)
    indexability, indexability_status = get_indexability(
        response.status_code, meta["redirect_url"]
    )
    if store_final_url:
        try:
            address = normalize_url(str(response.url))
        except Exception:
            address = str(response.url)
    else:
        address = request_url
    out = {
        "address": address,
        "content_type": meta["content_type"],
        "status_code": meta["status_code"],
        "status": meta["status"],
        "indexability": indexability,
        "indexability_status": indexability_status,
        "title": None,
        "title_length": 0,
        "readability": None,
        "crawl_depth": crawl_depth,
        "response_time": response_time,
        "last_modified": meta["last_modified"],
        "redirect_url": meta["redirect_url"],
        "redirect_type": meta["redirect_type"],
        "language": meta["language"],
        "http_version": meta["http_version"],
        "crawl_timestamp": datetime.utcnow(),
        "meta_descp": None,
        "h1": None,
        "canonical": None,
    }
    if response.status_code == 200 and response.text:
        html_meta = parse_html_metadata(response.text, str(response.url))
        out["title"] = html_meta["title"]
        out["title_length"] = html_meta["title_length"]
        out["meta_descp"] = html_meta["meta_descp"]
        out["h1"] = html_meta["h1"]
        out["canonical"] = html_meta["canonical"]
        if html_meta.get("language") and not out["language"]:
            out["language"] = html_meta["language"]
    return out


def build_error_page_data(
    request_url: str,
    error_message: str,
    crawl_depth: int,
    link_type: str = "internal",
) -> dict:
    """
    Build minimal page_data for a URL that failed to fetch (timeout, connection error, etc.).
    Stored so the crawl can continue and the user sees which URLs failed.
    """
    try:
        address = normalize_url(request_url)
    except Exception:
        address = request_url
    return {
        "address": address,
        "type": link_type,
        "content_type": None,
        "status_code": None,
        "status": error_message[:255] if error_message else "Fetch failed",
        "indexability": "Non-Indexable",
        "indexability_status": "Error",
        "title": None,
        "title_length": 0,
        "meta_descp": None,
        "h1": None,
        "canonical": None,
        "readability": None,
        "crawl_depth": crawl_depth,
        "response_time": None,
        "last_modified": None,
        "redirect_url": None,
        "redirect_type": None,
        "language": None,
        "http_version": None,
        "crawl_timestamp": datetime.utcnow(),
    }


def build_external_page_data(
    url: str,
    response: httpx.Response,
    response_time: float,
    crawl_depth: int = 2,
) -> dict:
    """
    Build minimal page_data for an external link: address, type, content_type,
    status_code, status, crawl_depth only. No title, h1, meta, etc.
    """
    try:
        address = normalize_url(str(response.url))
    except Exception:
        address = str(response.url)
    return {
        "address": address,
        "type": "external",
        "content_type": response.headers.get("content-type"),
        "status_code": response.status_code,
        "status": _get_status_text(response.status_code),
        "crawl_depth": crawl_depth,
        "crawl_timestamp": datetime.utcnow(),
        "indexability": None,
        "indexability_status": None,
        "title": None,
        "title_length": 0,
        "meta_descp": None,
        "h1": None,
        "canonical": None,
        "readability": None,
        "response_time": response_time,
        "last_modified": None,
        "redirect_url": None,
        "redirect_type": None,
        "language": None,
        "http_version": None,
    }


def _resolve_and_classify(url: str, base_url: str) -> dict | None:
    """Resolve URL to absolute and return {address, type} or None if invalid."""
    if not url or not (url := url.strip()) or url.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    if not url.startswith("http"):
        url = urljoin(base_url, url)
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return None
    except Exception:
        return None
    parsed_base = urlparse(base_url)
    link_type = "internal" if parsed.netloc.lower() == parsed_base.netloc.lower() else "external"
    return {"address": url, "type": link_type}


def extract_links(html: str, base_url: str) -> list[dict]:
    """
    Extract all link-like URLs: <a href>, <img src>, CSS <link href>, JS <script src>.
    Returns list of {address, type} (internal/external). Reusable for any page.
    """
    soup = BeautifulSoup(html, "html.parser")
    records = []
    seen = set()  # dedupe by normalized address within this page

    def add_record(rec):
        if not rec:
            return
        normal = _normalize_for_dedupe(rec["address"])
        if normal and normal not in seen:
            seen.add(normal)
            records.append(rec)

    for tag in soup.find_all("a", href=True):
        add_record(_resolve_and_classify(tag["href"], base_url))
    for tag in soup.find_all("img", src=True):
        add_record(_resolve_and_classify(tag["src"], base_url))
    for tag in soup.find_all("link", href=True):
        rel = tag.get("rel") or []
        if isinstance(rel, str):
            rel = [rel]
        rel_lower = [r.lower() for r in rel] if rel else []
        if "stylesheet" in rel_lower:
            add_record(_resolve_and_classify(tag["href"], base_url))
    for tag in soup.find_all("script", src=True):
        add_record(_resolve_and_classify(tag["src"], base_url))
    return records


def _extract_internal_urls_normalized(html: str, base_url: str) -> set[str]:
    """Return set of normalized internal URLs from page HTML for BFS queue deduplication."""
    links = extract_links(html, base_url)
    out = set()
    for rec in links:
        if rec.get("type") != "internal":
            continue
        addr = rec.get("address")
        normal = _normalize_for_dedupe(addr) if addr else None
        if normal:
            out.add(normal)
    return out


def _extract_external_urls_normalized(html: str, base_url: str) -> set[str]:
    """Return set of normalized external URLs from page HTML (for later minimal fetch)."""
    links = extract_links(html, base_url)
    out = set()
    for rec in links:
        if rec.get("type") != "external":
            continue
        addr = rec.get("address")
        normal = _normalize_for_dedupe(addr) if addr else None
        if normal:
            out.add(normal)
    return out


def _extract_external_urls_with_depth(html: str, base_url: str, page_depth: int) -> dict[str, int]:
    """
    Return dict of normalized external URL -> crawl depth (page_depth + 1).
    Used to assign dynamic depth when the same external link appears on multiple pages.
    """
    links = extract_links(html, base_url)
    out: dict[str, int] = {}
    ext_depth = page_depth + 1
    for rec in links:
        if rec.get("type") != "external":
            continue
        addr = rec.get("address")
        normal = _normalize_for_dedupe(addr) if addr else None
        if normal:
            out[normal] = min(out[normal], ext_depth) if normal in out else ext_depth
    return out


def _extract_links_ordered(
    html: str,
    base_url: str,
    page_depth: int,
    crawled_normalized: set[str],
    queued_normalized: set[str],
) -> list[tuple[str, int, str]]:
    """
    Return list of (normalized_url, depth, link_type) in document order.
    Only includes links not already in crawled_normalized or queued_normalized;
    callers should add returned normals to queued_normalized.
    """
    links = extract_links(html, base_url)
    depth = page_depth + 1
    out: list[tuple[str, int, str]] = []
    for rec in links:
        addr = rec.get("address")
        link_type = rec.get("type") or "internal"
        normal = _normalize_for_dedupe(addr) if addr else None
        if not normal or normal in crawled_normalized or normal in queued_normalized:
            continue
        queued_normalized.add(normal)
        out.append((normal, depth, link_type))
    return out


def _fetch_one_internal(args: tuple[str, int]) -> tuple[str, int, str | None, httpx.Response | None, float, Exception | None]:
    """Worker: fetch one internal URL. Returns (normal, depth, url, response, elapsed, error)."""
    current_normal, depth = args
    try:
        current_url = normalize_url(current_normal)
    except Exception as e:
        return (current_normal, depth, None, None, 0.0, e)
    try:
        response, elapsed = fetch_page(current_url, follow_redirects=True)
        return (current_normal, depth, current_url, response, elapsed, None)
    except Exception as e:
        return (current_normal, depth, current_url, None, 0.0, e)


def _fetch_one_external(args: tuple[str, int]) -> tuple[str, int, str | None, httpx.Response | None, float, Exception | None]:
    """Worker: fetch one external URL. Returns (normal, depth, url, response, elapsed, error)."""
    ext_normal, ext_depth = args
    try:
        ext_url = normalize_url(ext_normal)
    except Exception as e:
        return (ext_normal, ext_depth, None, None, 0.0, e)
    try:
        response, elapsed = fetch_page(ext_url, follow_redirects=True)
        return (ext_normal, ext_depth, ext_url, response, elapsed, None)
    except Exception as e:
        return (ext_normal, ext_depth, ext_url, None, 0.0, e)


def crawl_site(
    url: str,
    max_urls: int = DEFAULT_MAX_URLS,
    on_page_crawled: Callable[[dict], None] | None = None,
) -> list[dict]:
    """
    Follow redirects from the initial URL, then BFS-crawl all internal links on the
    final domain. Each URL is fetched at most once and stored at most once (by final
    URL after redirects). If on_page_crawled is provided, it is called with each
    page_data dict as soon as that page is crawled (streaming / parallel persistence).
    Returns list of page_data dicts (no duplicate addresses).
    """
    url = normalize_url(url)
    results: list[dict] = []
    crawled_normalized: set[str] = set()
    queued_normalized: set[str] = set()
    # Single queue: (normalized_url, depth, link_type) in discovery order
    to_fetch: deque[tuple[str, int, str]] = deque()

    def _emit(pd: dict) -> None:
        results.append(pd)
        if on_page_crawled:
            on_page_crawled(pd)

    # 1) First request without following redirects to capture redirect row (shared client)
    with httpx.Client(**_http_client_kwargs(False)) as client:
        response_no_follow, time_no_follow = fetch_page_with_client(url, client, follow_redirects=False)
    page_data_first = build_page_data(
        url, response_no_follow, time_no_follow, crawl_depth=0, store_final_url=False
    )
    _emit(page_data_first)
    request_normalized = _normalize_for_dedupe(url)
    if request_normalized:
        crawled_normalized.add(request_normalized)

    is_redirect = response_no_follow.status_code in (301, 302, 303, 307, 308)

    if is_redirect:
        # 2) Fetch again following redirects to get final page content and its links
        with httpx.Client(**_http_client_kwargs(True)) as client:
            response_follow, time_follow = fetch_page_with_client(url, client, follow_redirects=True)
        final_url = str(response_follow.url)
        final_normal = _normalize_for_dedupe(final_url)
        if final_normal and final_normal not in crawled_normalized:
            page_data_final = build_page_data(
                url, response_follow, time_follow, crawl_depth=0, store_final_url=True
            )
            _emit(page_data_final)
            crawled_normalized.add(final_normal)
        seed_html = response_follow.text if response_follow.status_code == 200 else ""
        seed_base = final_url
    else:
        # No redirect: use first response for content and link extraction
        seed_html = response_no_follow.text if response_no_follow.status_code == 200 else ""
        seed_base = str(response_no_follow.url)

    if not seed_html:
        return results

    # Seed links (internal + external) in discovery order into single queue
    for item in _extract_links_ordered(seed_html, seed_base, 0, crawled_normalized, queued_normalized):
        to_fetch.append(item)

    # Process queue in fetch order: pop batch, fetch in parallel, emit in batch order, extend queue with new links
    with ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as executor:
        while to_fetch and len(results) < max_urls:
            batch_with_index: list[tuple[int, str, int, str]] = []
            while (
                len(batch_with_index) < CONCURRENT_REQUESTS
                and to_fetch
                and len(results) + len(batch_with_index) < max_urls
            ):
                normal, depth, link_type = to_fetch.popleft()
                queued_normalized.discard(normal)
                if normal in crawled_normalized:
                    continue
                batch_with_index.append((len(batch_with_index), normal, depth, link_type))
            if not batch_with_index:
                break

            future_to_info: dict = {}
            for idx, norm, d, typ in batch_with_index:
                if typ == "internal":
                    f = executor.submit(_fetch_one_internal, (norm, d))
                else:
                    f = executor.submit(_fetch_one_external, (norm, d))
                future_to_info[f] = (idx, norm, d, typ)

            results_by_idx: dict[int, dict] = {}
            html_by_idx: dict[int, tuple[str, str, int]] = {}  # idx -> (html, base_url, depth)
            for future in as_completed(future_to_info):
                idx, norm, d, typ = future_to_info[future]
                current_normal, depth, current_url, response, resp_time, err = future.result()
                if current_normal in crawled_normalized:
                    continue
                if err is not None:
                    crawled_normalized.add(current_normal)
                    err_msg = type(err).__name__ + (f": {err!s}" if str(err) else "")
                    pd = build_error_page_data(
                        current_url or current_normal, err_msg, depth, typ
                    ) if (current_url or current_normal) else None
                    if pd:
                        results_by_idx[idx] = pd
                    continue
                resolved_normal = _normalize_for_dedupe(str(response.url))
                if resolved_normal in crawled_normalized:
                    continue
                crawled_normalized.add(resolved_normal)
                if typ == "internal":
                    pd = build_page_data(
                        current_url or current_normal,
                        response,
                        resp_time,
                        crawl_depth=depth,
                        store_final_url=True,
                    )
                    if response.status_code == 200 and response.text:
                        html_by_idx[idx] = (response.text, str(response.url), depth)
                else:
                    pd = build_external_page_data(
                        current_url or current_normal, response, resp_time, crawl_depth=depth
                    )
                results_by_idx[idx] = pd

            for idx in sorted(results_by_idx.keys()):
                _emit(results_by_idx[idx])

            for idx in sorted(html_by_idx.keys()):
                html, base_url, depth = html_by_idx[idx]
                for item in _extract_links_ordered(
                    html, base_url, depth, crawled_normalized, queued_normalized
                ):
                    to_fetch.append(item)
    return results
