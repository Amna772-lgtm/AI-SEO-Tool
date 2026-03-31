"""
In-memory (Redis) crawl store. No database persistence.
Keys: crawl:meta:{task_id}, crawl:pages:{task_id}
TTL: 2 hours so data expires after session.
"""
import json
import os
from typing import Any
from urllib.parse import urlparse, urlunparse, quote, unquote

import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CRAWL_TTL_SECONDS = 7200  # 2 hours

_redis: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis


def _meta_key(task_id: str) -> str:
    return f"crawl:meta:{task_id}"


def _pages_key(task_id: str) -> str:
    return f"crawl:pages:{task_id}"


def set_meta(task_id: str, data: dict[str, Any]) -> None:
    r = get_redis()
    key = _meta_key(task_id)
    r.setex(key, CRAWL_TTL_SECONDS, json.dumps(data, default=str))


def get_meta(task_id: str) -> dict[str, Any] | None:
    r = get_redis()
    key = _meta_key(task_id)
    raw = r.get(key)
    if raw is None:
        return None
    return json.loads(raw)


# Buffer for batch RPUSH (reduces Redis round-trips). Keyed by task_id.
_pages_buffer: dict[str, list[str]] = {}
_PAGES_BUFFER_SIZE = 10


def _flush_pages_buffer(task_id: str) -> None:
    """Push buffered page JSON strings to Redis and clear buffer."""
    buf = _pages_buffer.get(task_id)
    if not buf:
        return
    r = get_redis()
    key = _pages_key(task_id)
    pipe = r.pipeline()
    pipe.rpush(key, *buf)
    pipe.expire(key, CRAWL_TTL_SECONDS)
    pipe.execute()
    _pages_buffer[task_id] = []


def append_page(task_id: str, page_data: dict[str, Any]) -> None:
    page_data = dict(page_data)
    page_data.pop("_html", None)  # strip HTML before Redis serialisation — stored separately
    page_data.setdefault("type", "internal")
    serialized = json.dumps(page_data, default=str)
    _pages_buffer.setdefault(task_id, [])
    _pages_buffer[task_id].append(serialized)
    if len(_pages_buffer[task_id]) >= _PAGES_BUFFER_SIZE:
        _flush_pages_buffer(task_id)


def flush_pages_buffer(task_id: str) -> None:
    """Call after crawl completes so last buffered pages are written."""
    _flush_pages_buffer(task_id)


def _norm_url(url: str | None) -> str | None:
    """Normalize URL for alt text lookup (same logic as crawler's _normalize_for_dedupe)."""
    try:
        p = urlparse((url or "").strip())
        if not p.netloc:
            return None
        path = (p.path or "/").rstrip("/") or "/"
        path = quote(unquote(path), safe="/:@!$&'()*+,;=.-_~")
        return urlunparse((p.scheme.lower(), p.netloc.lower(), path, p.params, p.query, ""))
    except Exception:
        return None


def update_pages_alt_text(task_id: str, img_alt_map: dict) -> None:
    """Annotate image pages in Redis with alt text. Called once after crawl completes."""
    if not img_alt_map:
        return
    r = get_redis()
    key = _pages_key(task_id)
    raw_list = r.lrange(key, 0, -1)
    if not raw_list:
        return
    updated = []
    changed = False
    for raw in raw_list:
        page = json.loads(raw)
        if "image" in (page.get("content_type") or "").lower():
            norm = _norm_url(page.get("address"))
            if norm and norm in img_alt_map:
                attrs = img_alt_map[norm]
                page["alt_text"] = attrs["alt"] if isinstance(attrs, dict) else attrs
                changed = True
        updated.append(json.dumps(page, default=str))
    if changed:
        pipe = r.pipeline()
        pipe.delete(key)
        pipe.rpush(key, *updated)
        pipe.expire(key, CRAWL_TTL_SECONDS)
        pipe.execute()


def get_all_pages(task_id: str) -> list[dict[str, Any]]:
    r = get_redis()
    key = _pages_key(task_id)
    raw_list = r.lrange(key, 0, -1)
    if not raw_list:
        return []
    return [json.loads(s) for s in raw_list]


def get_pages_paginated(
    task_id: str, skip: int = 0, limit: int = 100
) -> tuple[list[dict[str, Any]], int]:
    """
    Redis-level pagination — avoids loading all pages into Python.
    Returns (page_list, total_count).
    Does NOT support filtering; callers that need filter must use get_all_pages().
    """
    r = get_redis()
    key = _pages_key(task_id)
    total = r.llen(key)
    if total == 0:
        return [], 0
    raw = r.lrange(key, skip, skip + limit - 1)
    return [json.loads(s) for s in raw], total


# ── Inventory storage ──────────────────────────────────────────────────────────

def _inventory_key(task_id: str) -> str:
    return f"crawl:inventory:{task_id}"


def set_inventory(task_id: str, data: dict[str, Any]) -> None:
    r = get_redis()
    r.setex(_inventory_key(task_id), CRAWL_TTL_SECONDS, json.dumps(data, default=str))


def get_inventory(task_id: str) -> dict[str, Any] | None:
    r = get_redis()
    raw = r.get(_inventory_key(task_id))
    return json.loads(raw) if raw else None


# ── GEO agent storage ──────────────────────────────────────────────────────────
# Keys: geo:{agent}:{task_id}  (e.g. geo:schema:abc123)
# Same 2-hour TTL as crawl data.

def _geo_key(task_id: str, agent: str) -> str:
    return f"geo:{agent}:{task_id}"


def set_geo(task_id: str, agent: str, data: dict[str, Any]) -> None:
    r = get_redis()
    r.setex(_geo_key(task_id, agent), CRAWL_TTL_SECONDS, json.dumps(data, default=str))


def get_geo(task_id: str, agent: str) -> dict[str, Any] | None:
    r = get_redis()
    raw = r.get(_geo_key(task_id, agent))
    return json.loads(raw) if raw else None


# ── HTML cache (for GEO pipeline — avoids re-fetch) ──────────────────────────
# Key: crawl:html:{task_id}  (Redis hash: {url -> html_string})
# Same 2-hour TTL as crawl data.

def _html_key(task_id: str) -> str:
    return f"crawl:html:{task_id}"


def store_page_html(task_id: str, url: str, html: str) -> None:
    """Store raw HTML for a single URL under crawl:html:{task_id} hash."""
    r = get_redis()
    r.hset(_html_key(task_id), url, html)
    r.expire(_html_key(task_id), CRAWL_TTL_SECONDS)


def get_pages_html(task_id: str, urls: list[str]) -> dict[str, str]:
    """
    Bulk-fetch HTML for a list of URLs from Redis.
    Returns {url: html}. Missing URLs map to empty string.
    Uses pipeline for a single round-trip.
    """
    r = get_redis()
    key = _html_key(task_id)
    pipe = r.pipeline()
    for url in urls:
        pipe.hget(key, url)
    values = pipe.execute()
    return {u: (v or "") for u, v in zip(urls, values)}
