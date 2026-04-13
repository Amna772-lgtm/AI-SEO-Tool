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


def _add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, col_type: str) -> None:
    """Idempotent ALTER TABLE ADD COLUMN. SQLite has no IF NOT EXISTS for this."""
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        conn.commit()


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
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id                     TEXT PRIMARY KEY,
                    user_id                TEXT NOT NULL UNIQUE,
                    plan                   TEXT NOT NULL CHECK(plan IN ('free','pro','agency')),
                    status                 TEXT NOT NULL CHECK(status IN ('active','canceled','past_due')) DEFAULT 'active',
                    stripe_customer_id     TEXT,
                    stripe_subscription_id TEXT,
                    current_period_start   TEXT,
                    current_period_end     TEXT,
                    audit_count            INTEGER NOT NULL DEFAULT 0,
                    created_at             TEXT NOT NULL,
                    updated_at             TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
                CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
            """)
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS competitor_groups (
                    id                   TEXT PRIMARY KEY,
                    user_id              TEXT NOT NULL,
                    primary_analysis_id  TEXT NOT NULL,
                    created_at           TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_competitor_groups_user_id
                    ON competitor_groups(user_id);
                CREATE INDEX IF NOT EXISTS idx_competitor_groups_primary_analysis_id
                    ON competitor_groups(primary_analysis_id);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_competitor_groups_user_primary
                    ON competitor_groups(user_id, primary_analysis_id);

                CREATE TABLE IF NOT EXISTS competitor_sites (
                    id           TEXT PRIMARY KEY,
                    group_id     TEXT NOT NULL,
                    url          TEXT NOT NULL,
                    analysis_id  TEXT,
                    created_at   TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_competitor_sites_group_id
                    ON competitor_sites(group_id);
                CREATE INDEX IF NOT EXISTS idx_competitor_sites_analysis_id
                    ON competitor_sites(analysis_id);
            """)
            conn.commit()
            # Per-user isolation columns. Pre-existing rows will have NULL user_id (orphaned).
            # Use plain TEXT (no REFERENCES clause) to avoid SQLite ADD COLUMN FK restriction.
            _add_column_if_missing(conn, "analyses", "user_id", "TEXT")
            _add_column_if_missing(conn, "schedules", "user_id", "TEXT")
            # Indexes for user_id lookups (must run after column exists)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_analyses_user_id  ON analyses(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id)")
            conn.commit()
            # Admin columns on users table (Phase 08, Plan 01)
            _add_column_if_missing(conn, "users", "is_admin", "INTEGER NOT NULL DEFAULT 0")
            _add_column_if_missing(conn, "users", "is_disabled", "INTEGER NOT NULL DEFAULT 0")
            # Quota override column on subscriptions (D-28)
            _add_column_if_missing(conn, "subscriptions", "audit_quota_override", "INTEGER")
            # Admin-specific tables
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS admin_settings (
                    key        TEXT PRIMARY KEY,
                    value      TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS banned_domains (
                    domain     TEXT PRIMARY KEY,
                    reason     TEXT,
                    banned_at  TEXT NOT NULL
                );
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
    user_id: str | None = None,
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
                     site_type, pages_count, geo_data, audit_summary, score_breakdown, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    user_id,
                ),
            )
            conn.commit()
        finally:
            conn.close()


def list_analyses(
    user_id: str,
    domain: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    Return analyses ordered by analyzed_at DESC, scoped to the given user_id.
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
                f"{select} WHERE user_id = ? AND domain = ? ORDER BY analyzed_at DESC LIMIT ? OFFSET ?",
                (user_id, norm, limit, offset),
            ).fetchall()
        else:
            rows = conn.execute(
                f"{select} WHERE user_id = ? ORDER BY analyzed_at DESC LIMIT ? OFFSET ?",
                (user_id, limit, offset),
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


def get_analysis(analysis_id: str, user_id: str) -> dict[str, Any] | None:
    """Return a single analysis record including the full geo_data blob, scoped to user_id."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, user_id)
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


def delete_analysis(analysis_id: str, user_id: str) -> bool:
    """Delete a record owned by user_id. Returns True if deleted, False if not found or not owned."""
    with _lock:
        conn = _connect()
        try:
            cursor = conn.execute(
                "DELETE FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def count_analyses(user_id: str, domain: str | None = None) -> int:
    """Return total count of analyses for user_id, optionally filtered by domain."""
    conn = _connect()
    try:
        if domain:
            norm = _extract_domain(domain)
            return conn.execute(
                "SELECT COUNT(*) FROM analyses WHERE user_id = ? AND domain = ?", (user_id, norm)
            ).fetchone()[0]
        return conn.execute(
            "SELECT COUNT(*) FROM analyses WHERE user_id = ?", (user_id,)
        ).fetchone()[0]
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
    user_id: str,
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
                     enabled, created_at, next_run_at, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                """,
                (schedule_id, url, domain, frequency, hour,
                 day_of_week, day_of_month, now, next_run, user_id),
            )
            conn.commit()
        finally:
            conn.close()
    return get_schedule(schedule_id, user_id=user_id)  # type: ignore[return-value]


def get_schedule(schedule_id: str, user_id: str) -> dict[str, Any] | None:
    """Return a single schedule row owned by user_id, or None."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM schedules WHERE id = ? AND user_id = ?", (schedule_id, user_id)
        ).fetchone()
        return _row_to_schedule(row) if row else None
    finally:
        conn.close()


def list_schedules(user_id: str, domain: str | None = None) -> list[dict[str, Any]]:
    """Return schedules for user_id ordered by next_run_at ASC, optionally filtered by domain."""
    conn = _connect()
    try:
        if domain:
            norm = _extract_domain(domain)
            rows = conn.execute(
                "SELECT * FROM schedules WHERE user_id = ? AND domain = ? ORDER BY next_run_at ASC",
                (user_id, norm),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM schedules WHERE user_id = ? ORDER BY next_run_at ASC",
                (user_id,),
            ).fetchall()
        return [_row_to_schedule(r) for r in rows]
    finally:
        conn.close()


def update_schedule(
    schedule_id: str,
    user_id: str,
    *,
    frequency: str | None = None,
    hour: int | None = None,
    day_of_week: int | None = None,
    day_of_month: int | None = None,
    enabled: bool | None = None,
) -> dict[str, Any] | None:
    """
    Update mutable fields for a schedule owned by user_id.  Recomputes next_run_at
    whenever any scheduling field changes.  Returns updated row or None if not found
    or not owned by user_id.
    """
    current = get_schedule(schedule_id, user_id=user_id)
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
                WHERE id=? AND user_id=?
                """,
                (new_freq, new_hour, new_dow, new_dom,
                 int(new_enabled), new_next_run, schedule_id, user_id),
            )
            conn.commit()
        finally:
            conn.close()
    return get_schedule(schedule_id, user_id=user_id)


def delete_schedule(schedule_id: str, user_id: str) -> bool:
    """Delete a schedule owned by user_id. Returns True if deleted."""
    with _lock:
        conn = _connect()
        try:
            cursor = conn.execute(
                "DELETE FROM schedules WHERE id = ? AND user_id = ?", (schedule_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def _get_schedule_internal(schedule_id: str) -> dict[str, Any] | None:
    """Return a schedule row by id regardless of user ownership. Internal use only (Beat, mark_schedule_ran)."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM schedules WHERE id = ?", (schedule_id,)
        ).fetchone()
        return _row_to_schedule(row) if row else None
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
    current = _get_schedule_internal(schedule_id)
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
            "SELECT id, email, name, password_hash, created_at, is_admin, is_disabled FROM users WHERE email = ?",
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
            "SELECT id, email, name, password_hash, created_at, is_admin, is_disabled FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Subscription CRUD
# ---------------------------------------------------------------------------

def create_subscription(
    user_id: str,
    plan: str,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    current_period_start: str | None = None,
    current_period_end: str | None = None,
) -> dict[str, Any]:
    sub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO subscriptions
                    (id, user_id, plan, status, stripe_customer_id,
                     stripe_subscription_id, current_period_start,
                     current_period_end, audit_count, created_at, updated_at)
                VALUES (?, ?, ?, 'active', ?, ?, ?, ?, 0, ?, ?)
                """,
                (sub_id, user_id, plan, stripe_customer_id,
                 stripe_subscription_id, current_period_start,
                 current_period_end, now, now),
            )
            conn.commit()
        finally:
            conn.close()
    return get_subscription_by_user(user_id)


def get_subscription_by_user(user_id: str) -> dict[str, Any] | None:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM subscriptions WHERE user_id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_subscription(
    user_id: str,
    *,
    plan: str | None = None,
    status: str | None = None,
    stripe_subscription_id: str | None = None,
    stripe_customer_id: str | None = None,
    current_period_start: str | None = None,
    current_period_end: str | None = None,
    audit_count: int | None = None,
) -> dict[str, Any] | None:
    """Keyword-only partial update — follows generate_suggestions() pattern (PIPE-04 decision)."""
    current = get_subscription_by_user(user_id)
    if not current:
        return None
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """UPDATE subscriptions
                   SET plan=?, status=?, stripe_subscription_id=?,
                       stripe_customer_id=?, current_period_start=?,
                       current_period_end=?, audit_count=?, updated_at=?
                   WHERE user_id=?""",
                (
                    plan if plan is not None else current["plan"],
                    status if status is not None else current["status"],
                    stripe_subscription_id if stripe_subscription_id is not None else current["stripe_subscription_id"],
                    stripe_customer_id if stripe_customer_id is not None else current["stripe_customer_id"],
                    current_period_start if current_period_start is not None else current["current_period_start"],
                    current_period_end if current_period_end is not None else current["current_period_end"],
                    audit_count if audit_count is not None else current["audit_count"],
                    now, user_id,
                ),
            )
            conn.commit()
        finally:
            conn.close()
    return get_subscription_by_user(user_id)


def increment_audit_count(user_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE subscriptions SET audit_count = audit_count + 1, updated_at = ? WHERE user_id = ?",
                (now, user_id),
            )
            conn.commit()
        finally:
            conn.close()


def maybe_reset_pro_audit_count(user_id: str) -> dict[str, Any] | None:
    """Lazy reset of audit_count for Pro users when current_period_end has passed.
    Returns the (possibly updated) subscription row. Per RESEARCH Pitfall 5."""
    sub = get_subscription_by_user(user_id)
    if not sub or sub["plan"] != "pro":
        return sub
    end_iso = sub.get("current_period_end")
    if not end_iso:
        return sub
    try:
        end_dt = datetime.fromisoformat(end_iso)
    except (ValueError, TypeError):
        return sub
    if datetime.now(timezone.utc) >= end_dt:
        return update_subscription(user_id, audit_count=0)
    return sub


# ---------------------------------------------------------------------------
# Competitor tracking CRUD (Phase 07)
# ---------------------------------------------------------------------------

def get_or_create_competitor_group(user_id: str, primary_analysis_id: str) -> dict[str, Any]:
    """D-09: one group per primary_analysis_id per user. SELECT-before-INSERT."""
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            existing = conn.execute(
                "SELECT * FROM competitor_groups WHERE user_id=? AND primary_analysis_id=?",
                (user_id, primary_analysis_id),
            ).fetchone()
            if existing:
                return dict(existing)
            group_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO competitor_groups (id, user_id, primary_analysis_id, created_at) VALUES (?,?,?,?)",
                (group_id, user_id, primary_analysis_id, now),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM competitor_groups WHERE id=?", (group_id,)).fetchone()
            return dict(row)
        finally:
            conn.close()


def get_competitor_group(group_id: str, user_id: str) -> dict[str, Any] | None:
    """Returns group with embedded sites list. None if not found or not owned by user_id."""
    conn = _connect()
    try:
        grow = conn.execute(
            "SELECT * FROM competitor_groups WHERE id=? AND user_id=?",
            (group_id, user_id),
        ).fetchone()
        if not grow:
            return None
        group = dict(grow)
        sites = conn.execute(
            "SELECT * FROM competitor_sites WHERE group_id=? ORDER BY created_at ASC",
            (group_id,),
        ).fetchall()
        group["sites"] = [dict(s) for s in sites]
        return group
    finally:
        conn.close()


def list_competitor_groups(user_id: str) -> list[dict[str, Any]]:
    """All groups for a user, sites embedded. Used by GET /competitors/groups."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM competitor_groups WHERE user_id=? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        groups = []
        for r in rows:
            g = dict(r)
            sites = conn.execute(
                "SELECT * FROM competitor_sites WHERE group_id=? ORDER BY created_at ASC",
                (g["id"],),
            ).fetchall()
            g["sites"] = [dict(s) for s in sites]
            groups.append(g)
        return groups
    finally:
        conn.close()


def add_competitor_site(group_id: str, url: str) -> dict[str, Any]:
    """Insert with analysis_id=NULL; Plan 02 API route calls link_competitor_analysis immediately after process_site.delay()."""
    site_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO competitor_sites (id, group_id, url, analysis_id, created_at) VALUES (?,?,?,NULL,?)",
                (site_id, group_id, url, now),
            )
            conn.commit()
        finally:
            conn.close()
    return {"id": site_id, "group_id": group_id, "url": url, "analysis_id": None, "created_at": now}


def link_competitor_analysis(site_id: str, analysis_id: str) -> None:
    """Called by POST /competitors/groups/{id}/sites right after process_site.delay() returns task_id."""
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE competitor_sites SET analysis_id=? WHERE id=?",
                (analysis_id, site_id),
            )
            conn.commit()
        finally:
            conn.close()


def count_competitor_sites(group_id: str) -> int:
    """Used by POST /competitors/groups/{id}/sites to enforce D-13 cap (Pro=3, Agency=10)."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM competitor_sites WHERE group_id=?",
            (group_id,),
        ).fetchone()
        return int(row["n"])
    finally:
        conn.close()


def delete_competitor_site(site_id: str, group_id: str) -> bool:
    """Returns True if row was deleted, False if not found. Caller verifies group ownership first."""
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute(
                "DELETE FROM competitor_sites WHERE id=? AND group_id=?",
                (site_id, group_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Admin settings helpers (D-24)
# ---------------------------------------------------------------------------

def get_admin_setting(key: str, default: str | None = None) -> str | None:
    """Return the string value for an admin_settings key, or default if not set."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT value FROM admin_settings WHERE key = ?", (key,)
        ).fetchone()
        return row["value"] if row else default
    finally:
        conn.close()


def set_admin_setting(key: str, value: str) -> None:
    """Upsert a key-value pair in admin_settings."""
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO admin_settings (key, value, updated_at) VALUES (?, ?, ?)",
                (key, value, now),
            )
            conn.commit()
        finally:
            conn.close()


def get_all_admin_settings() -> dict[str, str]:
    """Return all admin_settings as a plain dict."""
    conn = _connect()
    try:
        rows = conn.execute("SELECT key, value FROM admin_settings").fetchall()
        return {row["key"]: row["value"] for row in rows}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Domain blocklist helpers (D-27)
# ---------------------------------------------------------------------------

def is_domain_banned(domain: str) -> bool:
    """Return True if the domain (already lowercased, www-stripped) is in the banned_domains table."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT 1 FROM banned_domains WHERE domain = ?", (domain.lower(),)
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def ban_domain(domain: str, reason: str | None = None) -> None:
    """Add a domain to the banned_domains table. Idempotent."""
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO banned_domains (domain, reason, banned_at) VALUES (?, ?, ?)",
                (domain.lower(), reason, now),
            )
            conn.commit()
        finally:
            conn.close()


def unban_domain(domain: str) -> bool:
    """Remove a domain from the banned_domains table. Returns True if removed."""
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute(
                "DELETE FROM banned_domains WHERE domain = ?", (domain.lower(),)
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


def list_banned_domains() -> list[dict[str, Any]]:
    """Return all banned domains ordered by banned_at DESC."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT domain, reason, banned_at FROM banned_domains ORDER BY banned_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


# Aliases matching the plan API naming convention
def add_banned_domain(domain: str, reason: str | None = None) -> None:
    """Alias for ban_domain — add a domain to the blocklist."""
    ban_domain(domain, reason)


def remove_banned_domain(domain: str) -> None:
    """Alias for unban_domain — remove a domain from the blocklist."""
    unban_domain(domain)


# ---------------------------------------------------------------------------
# Admin User Management
# ---------------------------------------------------------------------------

def list_all_users(
    *,
    search: str | None = None,
    plan_filter: str | None = None,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    """List all users with optional filters. Returns {total, users}."""
    conn = _connect()
    try:
        where_clauses: list[str] = []
        params: list[Any] = []
        if search:
            where_clauses.append("(u.email LIKE ? OR u.name LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])
        if status_filter == "active":
            where_clauses.append("u.is_disabled = 0")
        elif status_filter == "disabled":
            where_clauses.append("u.is_disabled = 1")
        if plan_filter:
            where_clauses.append("s.plan = ?")
            params.append(plan_filter)
        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        count_row = conn.execute(
            f"SELECT COUNT(*) FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id{where_sql}",
            params,
        ).fetchone()
        total = count_row[0]
        rows = conn.execute(
            f"SELECT u.id, u.email, u.name, u.created_at, u.is_admin, u.is_disabled, "
            f"s.plan, "
            f"(SELECT COUNT(*) FROM analyses a WHERE a.user_id = u.id) as audit_count "
            f"FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id"
            f"{where_sql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?",
            params + [limit, skip],
        ).fetchall()
        return {"total": total, "users": [dict(row) for row in rows]}
    finally:
        conn.close()


def admin_update_user_status(user_id: str, *, is_disabled: int) -> None:
    """Set is_disabled flag for a user (0=active, 1=disabled)."""
    with _lock:
        conn = _connect()
        try:
            conn.execute("UPDATE users SET is_disabled = ? WHERE id = ?", (is_disabled, user_id))
            conn.commit()
        finally:
            conn.close()


def admin_update_user_plan(user_id: str, plan: str) -> None:
    """Update subscription plan for a user (admin override)."""
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE subscriptions SET plan = ?, updated_at = ? WHERE user_id = ?",
                (plan, datetime.now(timezone.utc).isoformat(), user_id),
            )
            conn.commit()
        finally:
            conn.close()


def delete_user_cascade(user_id: str) -> None:
    """Hard delete user and ALL related records. Per D-14, manual cascade required
    because analyses/schedules user_id columns have no FK constraint."""
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "DELETE FROM competitor_sites WHERE group_id IN "
                "(SELECT id FROM competitor_groups WHERE user_id = ?)", (user_id,)
            )
            conn.execute("DELETE FROM competitor_groups WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM analyses WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM schedules WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM subscriptions WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Admin Analytics
# ---------------------------------------------------------------------------

PLAN_PRICES = {"free": 0, "pro": 29, "agency": 99}


def get_admin_user_metrics() -> dict[str, Any]:
    """Return total/active/disabled counts, admin count, and plan distribution."""
    conn = _connect()
    try:
        total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        active = conn.execute("SELECT COUNT(*) FROM users WHERE is_disabled = 0").fetchone()[0]
        disabled = conn.execute("SELECT COUNT(*) FROM users WHERE is_disabled = 1").fetchone()[0]
        admin_count = conn.execute("SELECT COUNT(*) FROM users WHERE is_admin = 1").fetchone()[0]
        plan_rows = conn.execute(
            "SELECT plan, COUNT(*) as count FROM subscriptions GROUP BY plan"
        ).fetchall()
        return {
            "total": total,
            "active": active,
            "disabled": disabled,
            "admin_count": admin_count,
            "plan_distribution": {row["plan"]: row["count"] for row in plan_rows},
        }
    finally:
        conn.close()


def get_signup_trend(days: int = 30) -> list[dict[str, Any]]:
    """Return per-day signup counts for the last N days."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT DATE(created_at) as date, COUNT(*) as count "
            "FROM users WHERE created_at >= DATE('now', ? || ' days') "
            "GROUP BY DATE(created_at) ORDER BY date ASC",
            (f"-{days}",),
        ).fetchall()
        return [{"date": row["date"], "count": row["count"]} for row in rows]
    finally:
        conn.close()


def get_audit_metrics() -> dict[str, Any]:
    """Return total audits, average score, top domains, and per-plan audit counts."""
    conn = _connect()
    try:
        total = conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
        avg_row = conn.execute(
            "SELECT AVG(overall_score) FROM analyses WHERE overall_score IS NOT NULL"
        ).fetchone()
        avg_score = round(avg_row[0], 1) if avg_row[0] is not None else None
        top_domains = conn.execute(
            "SELECT domain, COUNT(*) as count FROM analyses GROUP BY domain ORDER BY count DESC LIMIT 10"
        ).fetchall()
        plan_rows = conn.execute(
            "SELECT s.plan, COUNT(*) as count FROM analyses a "
            "JOIN users u ON a.user_id = u.id "
            "JOIN subscriptions s ON u.id = s.user_id "
            "WHERE a.user_id IS NOT NULL "
            "GROUP BY s.plan"
        ).fetchall()
        return {
            "total_audits": total,
            "avg_score": avg_score,
            "most_audited_domains": [{"domain": r["domain"], "count": r["count"]} for r in top_domains],
            "plan_distribution": {row["plan"]: row["count"] for row in plan_rows},
        }
    finally:
        conn.close()


def get_revenue_metrics() -> dict[str, Any]:
    """Return MRR, active paid count, and plan distribution."""
    conn = _connect()
    try:
        paid_rows = conn.execute(
            "SELECT plan, COUNT(*) as count FROM subscriptions "
            "WHERE status = 'active' AND plan != 'free' GROUP BY plan"
        ).fetchall()
        mrr = sum(PLAN_PRICES.get(r["plan"], 0) * r["count"] for r in paid_rows)
        active_paid = sum(r["count"] for r in paid_rows)
        return {
            "mrr": mrr,
            "active_paid": active_paid,
            "plan_distribution": {r["plan"]: r["count"] for r in paid_rows},
        }
    finally:
        conn.close()


def get_audit_trend(
    days: int = 30,
    group_by: str = "day",
    plan_filter: str | None = None,
    score_min: int | None = None,
    score_max: int | None = None,
) -> list[dict[str, Any]]:
    """Return per-day or per-week audit counts for the last N days with optional filters."""
    conn = _connect()
    try:
        date_expr = (
            "DATE(a.analyzed_at)"
            if group_by == "day"
            else "strftime('%Y-W%W', a.analyzed_at)"
        )
        params: list[Any] = [f"-{days}"]
        joins = ""
        where_extras = ""

        if plan_filter:
            joins = (
                " JOIN users u ON a.user_id = u.id"
                " JOIN subscriptions s ON u.id = s.user_id"
            )
            where_extras += " AND s.plan = ?"
            params.append(plan_filter)

        if score_min is not None:
            where_extras += " AND a.overall_score >= ?"
            params.append(score_min)

        if score_max is not None:
            where_extras += " AND a.overall_score <= ?"
            params.append(score_max)

        sql = (
            f"SELECT {date_expr} as date, COUNT(*) as count "
            f"FROM analyses a{joins} "
            f"WHERE a.analyzed_at >= DATE('now', ? || ' days'){where_extras} "
            f"GROUP BY {date_expr} ORDER BY date ASC"
        )
        rows = conn.execute(sql, params).fetchall()
        return [{"date": row["date"], "count": row["count"]} for row in rows]
    finally:
        conn.close()


def get_revenue_trend(days: int = 30) -> list[dict[str, Any]]:
    """Return per-day revenue for the last N days (only subscriptions created on each date)."""
    from datetime import date, timedelta

    conn = _connect()
    try:
        today = date.today()
        result = []
        for i in range(days - 1, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.isoformat()
            rows = conn.execute(
                "SELECT plan, COUNT(*) as count FROM subscriptions "
                "WHERE status = 'active' AND plan != 'free' "
                "AND DATE(created_at) = ? GROUP BY plan",
                (d_str,),
            ).fetchall()
            per_plan = {r["plan"]: PLAN_PRICES.get(r["plan"], 0) * r["count"] for r in rows}
            mrr = sum(per_plan.values())
            result.append({
                "date": d_str,
                "mrr": mrr,
                "pro": per_plan.get("pro", 0),
                "agency": per_plan.get("agency", 0),
            })
        return result
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Admin Moderation
# ---------------------------------------------------------------------------

def list_all_analyses(
    *,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    score_min: float | None = None,
    score_max: float | None = None,
    skip: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    """List all analyses with optional filters. Per D-25: searchable by domain,
    user email, date range, and score range."""
    conn = _connect()
    try:
        where_clauses: list[str] = []
        params: list[Any] = []
        if search:
            where_clauses.append("(a.domain LIKE ? OR u.email LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])
        if date_from:
            where_clauses.append("DATE(a.analyzed_at) >= ?")
            params.append(date_from)
        if date_to:
            where_clauses.append("DATE(a.analyzed_at) <= ?")
            params.append(date_to)
        if score_min is not None:
            where_clauses.append("a.overall_score >= ?")
            params.append(score_min)
        if score_max is not None:
            where_clauses.append("a.overall_score <= ?")
            params.append(score_max)
        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        count_row = conn.execute(
            f"SELECT COUNT(*) FROM analyses a LEFT JOIN users u ON a.user_id = u.id{where_sql}",
            params,
        ).fetchone()
        total = count_row[0]
        rows = conn.execute(
            f"SELECT a.id, a.url, a.domain, a.analyzed_at, a.overall_score, a.grade, "
            f"a.user_id, u.email as user_email "
            f"FROM analyses a LEFT JOIN users u ON a.user_id = u.id"
            f"{where_sql} ORDER BY a.analyzed_at DESC LIMIT ? OFFSET ?",
            params + [limit, skip],
        ).fetchall()
        return {"total": total, "analyses": [dict(row) for row in rows]}
    finally:
        conn.close()


def delete_analysis_admin(analysis_id: str) -> None:
    """Hard delete an analysis record by id (admin only, no user scope check)."""
    with _lock:
        conn = _connect()
        try:
            conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
            conn.commit()
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Celery Job Management (per D-21)
# ---------------------------------------------------------------------------

def celery_get_active_jobs() -> list[dict[str, Any]]:
    """Get list of active and pending Celery jobs. Returns empty list if worker offline."""
    try:
        from app.worker.celery_app import celery as celery_app  # type: ignore[import]
        inspector = celery_app.control.inspect(timeout=2.0)
        jobs: list[dict[str, Any]] = []
        active = inspector.active() or {}
        for worker, tasks in active.items():
            for task in tasks:
                jobs.append({
                    "task_id": task.get("id", ""),
                    "name": task.get("name", "unknown"),
                    "state": "active",
                    "worker": worker,
                    "started_at": task.get("time_start"),
                })
        reserved = inspector.reserved() or {}
        for worker, tasks in reserved.items():
            for task in tasks:
                jobs.append({
                    "task_id": task.get("id", ""),
                    "name": task.get("name", "unknown"),
                    "state": "pending",
                    "worker": worker,
                    "started_at": None,
                })
        return jobs
    except Exception:
        return []


def celery_retry_job(task_id: str) -> bool:
    """Retry a Celery task by task_id. Returns True if the retry was dispatched."""
    try:
        from app.worker.celery_app import celery as celery_app  # type: ignore[import]
        celery_app.send_task("app.worker.tasks.run_analysis", task_id=task_id)
        return True
    except Exception:
        return False


def celery_cancel_job(task_id: str) -> bool:
    """Cancel (revoke) a Celery task by task_id. Terminates if active. Returns True on success."""
    try:
        from app.worker.celery_app import celery as celery_app  # type: ignore[import]
        celery_app.control.revoke(task_id, terminate=True, signal="SIGTERM")
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Rate Limit Overrides (per D-28)
# ---------------------------------------------------------------------------

def get_user_quota_overrides() -> list[dict[str, Any]]:
    """Return all subscriptions that have a non-NULL audit_quota_override."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT s.user_id, u.email, s.plan, s.audit_quota_override "
            "FROM subscriptions s JOIN users u ON s.user_id = u.id "
            "WHERE s.audit_quota_override IS NOT NULL "
            "ORDER BY u.email ASC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def set_user_quota_override(user_id: str, quota: int) -> None:
    """Set a custom audit quota override for a user."""
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE subscriptions SET audit_quota_override = ? WHERE user_id = ?",
                (quota, user_id),
            )
            conn.commit()
        finally:
            conn.close()


def remove_user_quota_override(user_id: str) -> None:
    """Clear the audit_quota_override for a user (revert to plan default)."""
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE subscriptions SET audit_quota_override = NULL WHERE user_id = ?",
                (user_id,),
            )
            conn.commit()
        finally:
            conn.close()
