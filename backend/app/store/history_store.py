"""
History Store — SQLite persistence for completed GEO analyses.

Uses WAL journal mode for safe concurrent access between the FastAPI
backend process (reads/deletes) and the Celery worker process (writes).
A module-level threading.Lock guards within-process concurrent writes.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

DB_PATH = os.getenv("HISTORY_DB_PATH", "/app/data/history.db")
_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # safe concurrent reads + writes across processes
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create tables and indexes if they don't exist. Called at module import."""
    with _lock:
        conn = _connect()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS analyses (
                    id              TEXT PRIMARY KEY,
                    url             TEXT NOT NULL,
                    domain          TEXT NOT NULL,
                    analyzed_at     TEXT NOT NULL,
                    overall_score   INTEGER,
                    grade           TEXT,
                    site_type       TEXT,
                    pages_count     INTEGER,
                    geo_data        TEXT,
                    audit_summary   TEXT,
                    score_breakdown TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_domain      ON analyses(domain);
                CREATE INDEX IF NOT EXISTS idx_analyzed_at ON analyses(analyzed_at);
            """)
            conn.commit()
        finally:
            conn.close()


# Run once when module is first imported by either process
init_db()


def _extract_domain(url: str) -> str:
    """Return lowercase netloc without 'www.' prefix.

    Handles both full URLs (https://example.com) and bare hostnames (example.com).
    """
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if not netloc:
            # Bare hostname passed without a scheme — urlparse puts it in path
            netloc = parsed.path.lower().split("/")[0]
        return netloc.removeprefix("www.")
    except Exception:
        return url


def save_analysis(
    task_id: str,
    url: str,
    pages_count: int,
    geo_data: dict[str, Any],
    audit_result: dict[str, Any] | None,
) -> None:
    """
    Persist a completed GEO analysis to SQLite.
    Uses INSERT OR REPLACE so re-running the same task_id is idempotent.
    """
    score_obj = geo_data.get("score") or {}
    site_type_obj = geo_data.get("site_type") or {}

    audit_summary: str | None = None
    if audit_result:
        psi = audit_result.get("pagespeed") or {}
        audit_summary = json.dumps({
            "https_passed":               (audit_result.get("https") or {}).get("passed"),
            "sitemap_found":              (audit_result.get("sitemap") or {}).get("found"),
            "broken_links_count":         (audit_result.get("broken_links") or {}).get("count"),
            "missing_canonicals_count":   (audit_result.get("missing_canonicals") or {}).get("missing_count"),
            "psi_desktop_performance":    (psi.get("desktop") or {}).get("performance"),
            "psi_mobile_performance":     (psi.get("mobile") or {}).get("performance"),
        }, default=str)

    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT OR REPLACE INTO analyses
                    (id, url, domain, analyzed_at, overall_score, grade,
                     site_type, pages_count, geo_data, audit_summary, score_breakdown)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task_id,
                    url,
                    _extract_domain(url),
                    datetime.now(timezone.utc).isoformat(),
                    score_obj.get("overall_score"),
                    score_obj.get("grade"),
                    site_type_obj.get("site_type"),
                    pages_count,
                    json.dumps(geo_data, default=str),
                    audit_summary,
                    json.dumps(score_obj.get("breakdown", {}), default=str),
                ),
            )
            conn.commit()
        finally:
            conn.close()


def list_analyses(
    domain: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    Return analyses ordered by analyzed_at DESC.
    Excludes the large geo_data blob — use get_analysis() for full data.
    """
    conn = _connect()
    try:
        select = (
            "SELECT id, url, domain, analyzed_at, overall_score, grade, "
            "site_type, pages_count, score_breakdown, audit_summary "
            "FROM analyses"
        )
        if domain:
            norm = _extract_domain(domain)
            rows = conn.execute(
                f"{select} WHERE domain = ? ORDER BY analyzed_at DESC LIMIT ? OFFSET ?",
                (norm, limit, offset),
            ).fetchall()
        else:
            rows = conn.execute(
                f"{select} ORDER BY analyzed_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()

        results = []
        for row in rows:
            item = dict(row)
            # Deserialize JSON fields
            for field in ("score_breakdown", "audit_summary"):
                if item.get(field) and isinstance(item[field], str):
                    try:
                        item[field] = json.loads(item[field])
                    except Exception:
                        pass
            results.append(item)
        return results
    finally:
        conn.close()


def get_analysis(analysis_id: str) -> dict[str, Any] | None:
    """Return a single analysis record including the full geo_data blob."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM analyses WHERE id = ?", (analysis_id,)
        ).fetchone()
        if not row:
            return None
        result = dict(row)
        for field in ("geo_data", "audit_summary", "score_breakdown"):
            if result.get(field) and isinstance(result[field], str):
                try:
                    result[field] = json.loads(result[field])
                except Exception:
                    pass
        return result
    finally:
        conn.close()


def delete_analysis(analysis_id: str) -> bool:
    """Delete a record. Returns True if deleted, False if not found."""
    with _lock:
        conn = _connect()
        try:
            cursor = conn.execute(
                "DELETE FROM analyses WHERE id = ?", (analysis_id,)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def count_analyses(domain: str | None = None) -> int:
    """Return total count of analyses, optionally filtered by domain."""
    conn = _connect()
    try:
        if domain:
            norm = _extract_domain(domain)
            return conn.execute(
                "SELECT COUNT(*) FROM analyses WHERE domain = ?", (norm,)
            ).fetchone()[0]
        return conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
    finally:
        conn.close()
