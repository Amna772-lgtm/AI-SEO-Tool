"""
History Store — SQLite persistence for completed GEO analyses and schedules.

Uses WAL journal mode for safe concurrent access between the FastAPI
backend process (reads/deletes) and the Celery worker process (writes).
A module-level threading.Lock guards within-process concurrent writes.
"""
from __future__ import annotations

import calendar
import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timedelta, timezone
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

                CREATE TABLE IF NOT EXISTS schedules (
                    id           TEXT PRIMARY KEY,
                    url          TEXT NOT NULL,
                    domain       TEXT NOT NULL,
                    frequency    TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
                    hour         INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
                    day_of_week  INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
                    day_of_month INTEGER CHECK(day_of_month BETWEEN 1 AND 31),
                    enabled      INTEGER NOT NULL DEFAULT 1,
                    created_at   TEXT NOT NULL,
                    last_run_at  TEXT,
                    next_run_at  TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run_at);
                CREATE INDEX IF NOT EXISTS idx_schedules_domain   ON schedules(domain);

                CREATE TABLE IF NOT EXISTS users (
                    id            TEXT PRIMARY KEY,
                    email         TEXT NOT NULL UNIQUE,
                    name          TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at    TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
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


# ---------------------------------------------------------------------------
# Schedule helpers
# ---------------------------------------------------------------------------

def _compute_next_run(
    frequency: str,
    hour: int,
    day_of_week: int | None,
    day_of_month: int | None,
    after: datetime | None = None,
) -> str:
    """
    Return the next ISO-8601 UTC datetime at which a schedule should fire.

    Always strictly after `after` (defaults to utcnow()), with a minimum
    1-minute forward offset to prevent same-minute re-fires.
    """
    now = after or datetime.now(timezone.utc)
    base = now + timedelta(minutes=1)

    if frequency == "daily":
        candidate = base.replace(hour=hour, minute=0, second=0, microsecond=0)
        if candidate <= base:
            candidate += timedelta(days=1)
        return candidate.isoformat()

    if frequency == "weekly":
        candidate = base.replace(hour=hour, minute=0, second=0, microsecond=0)
        days_ahead = (day_of_week - candidate.weekday()) % 7  # type: ignore[operator]
        candidate += timedelta(days=days_ahead)
        if candidate <= base:
            candidate += timedelta(weeks=1)
        return candidate.isoformat()

    if frequency == "monthly":
        year, month = base.year, base.month
        for _ in range(13):
            max_day = calendar.monthrange(year, month)[1]
            actual_dom = min(day_of_month, max_day)  # type: ignore[type-var]
            candidate = datetime(year, month, actual_dom, hour, 0, 0, tzinfo=timezone.utc)
            if candidate > base:
                return candidate.isoformat()
            month += 1
            if month > 12:
                month = 1
                year += 1
        raise ValueError("Could not compute next_run_at for monthly schedule")

    raise ValueError(f"Unknown frequency: {frequency!r}")


def _row_to_schedule(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    d["enabled"] = bool(d["enabled"])
    return d


# ---------------------------------------------------------------------------
# Schedule CRUD
# ---------------------------------------------------------------------------

def create_schedule(
    url: str,
    frequency: str,
    hour: int,
    day_of_week: int | None,
    day_of_month: int | None,
) -> dict[str, Any]:
    """Insert a new schedule and return it as a dict."""
    schedule_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    next_run = _compute_next_run(frequency, hour, day_of_week, day_of_month)
    domain = _extract_domain(url)
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO schedules
                    (id, url, domain, frequency, hour, day_of_week, day_of_month,
                     enabled, created_at, next_run_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (schedule_id, url, domain, frequency, hour,
                 day_of_week, day_of_month, now, next_run),
            )
            conn.commit()
        finally:
            conn.close()
    return get_schedule(schedule_id)  # type: ignore[return-value]


def get_schedule(schedule_id: str) -> dict[str, Any] | None:
    """Return a single schedule row or None."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM schedules WHERE id = ?", (schedule_id,)
        ).fetchone()
        return _row_to_schedule(row) if row else None
    finally:
        conn.close()


def list_schedules(domain: str | None = None) -> list[dict[str, Any]]:
    """Return all schedules ordered by next_run_at ASC, optionally filtered by domain."""
    conn = _connect()
    try:
        if domain:
            norm = _extract_domain(domain)
            rows = conn.execute(
                "SELECT * FROM schedules WHERE domain = ? ORDER BY next_run_at ASC",
                (norm,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM schedules ORDER BY next_run_at ASC"
            ).fetchall()
        return [_row_to_schedule(r) for r in rows]
    finally:
        conn.close()


def update_schedule(
    schedule_id: str,
    *,
    frequency: str | None = None,
    hour: int | None = None,
    day_of_week: int | None = None,
    day_of_month: int | None = None,
    enabled: bool | None = None,
) -> dict[str, Any] | None:
    """
    Update mutable fields.  Recomputes next_run_at whenever any scheduling
    field changes.  Returns updated row or None if not found.
    """
    current = get_schedule(schedule_id)
    if not current:
        return None

    new_freq = frequency if frequency is not None else current["frequency"]
    new_hour = hour if hour is not None else current["hour"]
    new_dow = day_of_week if day_of_week is not None else current["day_of_week"]
    new_dom = day_of_month if day_of_month is not None else current["day_of_month"]
    new_enabled = enabled if enabled is not None else current["enabled"]

    scheduling_changed = (
        new_freq != current["frequency"]
        or new_hour != current["hour"]
        or new_dow != current["day_of_week"]
        or new_dom != current["day_of_month"]
    )
    new_next_run = (
        _compute_next_run(new_freq, new_hour, new_dow, new_dom)
        if scheduling_changed
        else current["next_run_at"]
    )

    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """
                UPDATE schedules
                SET frequency=?, hour=?, day_of_week=?, day_of_month=?,
                    enabled=?, next_run_at=?
                WHERE id=?
                """,
                (new_freq, new_hour, new_dow, new_dom,
                 int(new_enabled), new_next_run, schedule_id),
            )
            conn.commit()
        finally:
            conn.close()
    return get_schedule(schedule_id)


def delete_schedule(schedule_id: str) -> bool:
    """Delete a schedule by id. Returns True if deleted."""
    with _lock:
        conn = _connect()
        try:
            cursor = conn.execute(
                "DELETE FROM schedules WHERE id = ?", (schedule_id,)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def get_due_schedules(as_of: datetime | None = None) -> list[dict[str, Any]]:
    """Return enabled schedules whose next_run_at <= as_of (default: utcnow())."""
    cutoff = (as_of or datetime.now(timezone.utc)).isoformat()
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM schedules WHERE enabled=1 AND next_run_at <= ?",
            (cutoff,),
        ).fetchall()
        return [_row_to_schedule(r) for r in rows]
    finally:
        conn.close()


def mark_schedule_ran(schedule_id: str) -> None:
    """Set last_run_at = now and advance next_run_at. Called before dispatching a task."""
    current = get_schedule(schedule_id)
    if not current:
        return
    now = datetime.now(timezone.utc)
    next_run = _compute_next_run(
        current["frequency"],
        current["hour"],
        current["day_of_week"],
        current["day_of_month"],
        after=now,
    )
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE schedules SET last_run_at=?, next_run_at=? WHERE id=?",
                (now.isoformat(), next_run, schedule_id),
            )
            conn.commit()
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

def create_user(user_id: str, email: str, name: str, password_hash: str) -> dict[str, Any]:
    """Insert a new user. Raises sqlite3.IntegrityError on duplicate email."""
    created_at = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO users (id, email, name, password_hash, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (user_id, email.lower(), name, password_hash, created_at),
            )
            conn.commit()
        finally:
            conn.close()
    return {
        "id": user_id,
        "email": email.lower(),
        "name": name,
        "password_hash": password_hash,
        "created_at": created_at,
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Return a user row by email (case-insensitive) or None."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?",
            (email.lower(),),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Return a user row by id or None."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, email, name, password_hash, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
