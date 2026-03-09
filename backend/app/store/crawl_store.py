"""
In-memory (Redis) crawl store. No database persistence.
Keys: crawl:meta:{task_id}, crawl:pages:{task_id}
TTL: 2 hours so data expires after session.
"""
import json
import os
from typing import Any

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
    page_data.setdefault("type", "internal")
    serialized = json.dumps(page_data, default=str)
    _pages_buffer.setdefault(task_id, [])
    _pages_buffer[task_id].append(serialized)
    if len(_pages_buffer[task_id]) >= _PAGES_BUFFER_SIZE:
        _flush_pages_buffer(task_id)


def flush_pages_buffer(task_id: str) -> None:
    """Call after crawl completes so last buffered pages are written."""
    _flush_pages_buffer(task_id)


def get_all_pages(task_id: str) -> list[dict[str, Any]]:
    r = get_redis()
    key = _pages_key(task_id)
    raw_list = r.lrange(key, 0, -1)
    if not raw_list:
        return []
    return [json.loads(s) for s in raw_list]
