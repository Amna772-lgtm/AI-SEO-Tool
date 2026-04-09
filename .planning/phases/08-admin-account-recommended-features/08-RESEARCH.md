# Phase 8: Admin Account — Recommended Features - Research

**Researched:** 2026-04-09
**Domain:** FastAPI role-based access control, Next.js App Router admin routing, SQLite schema migration, Celery inspect API, admin dashboard patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin Account Creation & Auth**
- D-01: Admin accounts are created manually through code/database — no admin registration through the frontend
- D-02: Add `is_admin` boolean column to the existing `users` table (default false)
- D-03: Admin uses the same `/auth/signin` login flow as regular users — backend checks `is_admin` flag on the user record after authentication
- D-04: If `is_admin` is true, the `/auth/me` response includes `is_admin: true`; frontend redirects to `/admin/dashboard` instead of the main app
- D-05: Admin accounts are admin-only — they cannot access the regular SEO tool (no audit running, no history, no schedules)
- D-06: All `/admin/*` API routes require both valid JWT AND `is_admin=true` — non-admin users hitting `/admin/*` get 403

**Admin UI Structure**
- D-07: Dedicated admin pages at `/admin/*` — separate from the main tool (not a tab in the sidebar)
- D-08: Admin routes: `/admin/dashboard` (analytics), `/admin/users` (user management), `/admin/system` (system controls), `/admin/moderation` (content moderation)
- D-09: Admin navigation link appears in the sidebar only for admin users; regular users never see it
- D-10: Admin panel has its own sidebar/nav layout with links to Dashboard, Users, System, Moderation

**User Management**
- D-11: Searchable/filterable table of all registered users showing: email, name, plan, signup date, audit count, status (active/disabled)
- D-12: Admin can change any user's plan (Free/Pro/Agency) — manual override without Stripe
- D-13: Admin can disable a user (soft deactivate) — user can't log in, data is preserved, admin can reactivate later
- D-14: Admin can delete a user (hard delete) — removes the user and cascade-deletes all their analyses, schedules, competitor groups, and subscription data permanently
- D-15: No impersonation in this phase

**Analytics Dashboard**
- D-16: User metrics: total users, new signups (daily/weekly/monthly trend), active vs disabled count, plan distribution
- D-17: Audit metrics: total audits run, audits per day/week trend, average score across all audits, most-audited domains
- D-18: Revenue metrics: active paid subscriptions count, MRR, plan upgrade/downgrade trends
- D-19: System health: Celery queue depth, failed jobs count, average audit duration, Redis memory usage
- D-20: Dashboard shows summary cards with current totals at top, plus line charts for trends over time. Recharts already available.

**System Controls**
- D-21: Celery queue monitor: view active/pending/failed jobs, retry or cancel stuck jobs, see worker status
- D-22: Feature toggles: enable/disable features site-wide (disable competitor tracking, pause new signups, maintenance mode)
- D-23: API key management: view/rotate Google PSI and Anthropic API keys from admin UI without editing .env files
- D-24: Feature toggles and API keys stored in a new `admin_settings` SQLite table — persists across restarts, editable from admin UI

**Content Moderation**
- D-25: Browse all audits across all users — searchable by domain, user, date, score
- D-26: Admin can delete any audit record permanently
- D-27: Domain blocklist: admin can ban specific domains from being audited
- D-28: Per-user rate limit overrides: admin can give a user extra quota or throttle an abusive user below normal limits

### Claude's Discretion
- Admin dashboard layout and visual design — follow existing TailwindCSS patterns
- `admin_settings` table schema (key-value or structured columns)
- Celery inspection approach (Celery `inspect` API or direct Redis queue reads)
- Domain blocklist enforcement point (URL validator or analyze route)
- Rate limit override storage and enforcement mechanism
- How to handle disabled user's active JWT sessions (invalidate immediately or let expire naturally)
- Admin sidebar component design and navigation patterns

### Deferred Ideas (OUT OF SCOPE)
- Admin audit logging (track who did what action and when) — future phase
- Multi-admin role hierarchy (super-admin, moderator, viewer) — future phase
- Admin access to run audits / use the regular tool — explicitly excluded
- Impersonation (admin switching into user's view) — excluded from this phase
- Error log viewer in admin UI — not selected for this phase
- Email notifications to users on account actions (disabled, plan changed) — future phase
</user_constraints>

---

## Summary

Phase 8 adds an admin role layer on top of the existing multi-user auth system built in Phase 4. The core pattern is a `get_admin_user` FastAPI dependency that wraps `get_current_user` and raises 403 if `is_admin` is false — identical to how `get_current_subscription` wraps `get_current_user`. All admin backend routes live in a new `admin.py` (or `admin/` directory) mounted at `/admin` in `main.py`. The frontend adds `frontend/app/admin/` pages with their own layout component, guarded in `middleware.ts`.

The four admin sections (dashboard analytics, user management, system controls, content moderation) each have distinct data requirements. User management and content moderation are pure CRUD on existing SQLite tables. Analytics requires aggregation queries against `analyses`, `users`, and `subscriptions`. System controls require two new capabilities: Celery queue inspection via the Celery `inspect` API, and a new `admin_settings` key-value table for feature toggles and API key overrides.

The main discretion questions are: (1) JWT session invalidation for disabled users — let existing tokens expire naturally (24h max) rather than maintaining a denylist, which would require Redis lookups on every request; (2) admin_settings table schema — key-value pairs (key TEXT PRIMARY KEY, value TEXT) is simpler and extensible; (3) Celery inspection — use `celery.control.inspect()` which is already available in the app's Celery instance; (4) domain blocklist enforcement — check at the `/analyze/` route entry point alongside the existing robots.txt check.

**Primary recommendation:** Build the `get_admin_user` dependency first, then the `admin_settings` table and `is_admin` column migration, then each admin route group, then the frontend admin shell and pages. Test each backend route group independently before wiring the frontend.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.100.0 | Admin API routes with `Depends(get_admin_user)` | Already the project's API framework |
| SQLite (via stdlib) | Python 3.11 stdlib | Admin settings, user CRUD, analytics queries | Already the persistence layer |
| Next.js App Router | 16.1.6 | Admin pages at `/admin/*` | Already the frontend framework |
| TailwindCSS | ^4 | Admin UI styling with existing CSS variables | Already the styling system |
| Recharts | (already installed) | Admin analytics line charts and bar charts | Already used in `ScoreTrendChart.tsx` |
| Celery Inspect API | >=5.3.0 | Queue depth, active/failed job inspection | Built into the existing Celery instance |
| Redis Python client | >=5.0.0 | Redis memory usage via `info()` command | Already the Redis client |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pydantic v2 | >=2.0 | Admin request/response schemas | All new admin route inputs |
| `threading.Lock` | stdlib | Protect SQLite writes in admin store functions | Same pattern as existing history_store.py |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Celery `inspect` API | Direct Redis queue reads (`LLEN celery`) | Direct Redis is simpler but misses active/reserved state; inspect() gives richer data |
| Key-value `admin_settings` table | Structured columns per setting | Key-value is more extensible; structured columns are type-safer but require schema migrations for new settings |
| Natural JWT expiry for disabled users | Redis JWT denylist | Denylist is immediate but adds per-request Redis roundtrip; natural expiry (24h max) is simpler and acceptable |

**Installation:** No new packages required — all libraries already present in `requirements.txt` and `package.json`.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/app/api/routes/
└── admin.py               # Single admin router (or admin/ subdirectory if large)

backend/app/store/
└── history_store.py       # Add: is_admin column, admin_settings table, list_all_users,
                           #       update_user_status, admin_update_plan, delete_user_cascade,
                           #       list_all_analyses, get_admin_settings, set_admin_setting

backend/app/dependencies/
└── auth.py                # Add: get_admin_user dependency

frontend/app/admin/
├── layout.tsx             # Admin shell: sidebar nav (Dashboard/Users/System/Moderation) + outlet
├── dashboard/
│   └── page.tsx           # Analytics: cards + line charts
├── users/
│   └── page.tsx           # User management table
├── system/
│   └── page.tsx           # Celery queue + feature toggles + API keys
└── moderation/
    └── page.tsx           # All audits table + domain blocklist

frontend/app/lib/
└── api.ts                 # Add: AdminUser type, admin fetcher functions
```

### Pattern 1: `get_admin_user` Dependency

**What:** Wraps `get_current_user` and adds an `is_admin` check. Returns the user dict if admin, raises 403 if not.
**When to use:** On every `/admin/*` route handler as the auth dependency.

```python
# backend/app/dependencies/auth.py (addition)
def get_admin_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Raises 403 if the authenticated user is not an admin."""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
```

This exactly mirrors the existing `get_current_subscription` dependency pattern — wrap the upstream dependency and add a check.

### Pattern 2: `is_admin` column migration via `_add_column_if_missing`

**What:** Use the existing idempotent migration helper in `init_db()`.
**When to use:** In `init_db()` after the existing column additions.

```python
# In init_db(), after existing _add_column_if_missing calls:
_add_column_if_missing(conn, "users", "is_admin", "INTEGER NOT NULL DEFAULT 0")
_add_column_if_missing(conn, "users", "is_disabled", "INTEGER NOT NULL DEFAULT 0")
```

The existing `get_user_by_email` and `get_user_by_id` SELECT queries use explicit column lists — they must be updated to include `is_admin` and `is_disabled`. The `/auth/me` response needs `is_admin: bool` added to `UserOut` schema and the route handler.

### Pattern 3: `admin_settings` Key-Value Table

**What:** A simple key-value store for feature flags and API key overrides.
**When to use:** For all feature toggles (D-22) and API key management (D-23).

```python
# In init_db() executescript:
CREATE TABLE IF NOT EXISTS admin_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

Helper functions:
```python
def get_admin_setting(key: str, default: str | None = None) -> str | None: ...
def set_admin_setting(key: str, value: str) -> None: ...
def get_all_admin_settings() -> dict[str, str]: ...
```

Known keys: `feature_competitor_tracking`, `feature_new_signups`, `feature_maintenance_mode`, `api_key_google_psi`, `api_key_anthropic`. All stored as strings; booleans stored as `"true"` / `"false"`.

**Security note:** API keys in the DB are readable by anyone with DB access. This is acceptable for a single-instance deployment where the DB is already on the server. Do not log key values.

### Pattern 4: Admin Router in `main.py`

**What:** Mount the admin router alongside existing routers.

```python
# backend/app/main.py (addition)
from app.api.routes import admin
app.include_router(admin.router, prefix="/admin", tags=["admin"])
```

The admin router uses `Depends(get_admin_user)` on every endpoint, either per-route or via `APIRouter(dependencies=[Depends(get_admin_user)])`.

### Pattern 5: Next.js `middleware.ts` Admin Guard

**What:** Extend existing middleware to block non-admin users from `/admin/*` routes.
**Challenge:** `middleware.ts` only has the JWT cookie, not the decoded `is_admin` flag, without making a backend call.

**Recommended approach:** The middleware checks for cookie presence (as it does now). The actual admin check happens in the admin layout component (`frontend/app/admin/layout.tsx`) via `useAuth()`. On mount, if `user.is_admin` is false or user is null, redirect to `/dashboard`.

This is consistent with the existing pattern where `proxy.ts` (now `middleware.ts`) only checks cookie presence, and route-level checks happen in components. No backend call needed in middleware.

```typescript
// frontend/app/admin/layout.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user?.is_admin) return null;  // or a loading spinner

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

### Pattern 6: Celery Queue Inspection

**What:** Use `celery.control.inspect()` to get queue state from the running worker.
**When to use:** In the `/admin/system` backend route for system health data (D-21).

```python
# In admin.py system route
from app.worker.celery_app import celery

def get_celery_queue_stats() -> dict:
    inspector = celery.control.inspect(timeout=2.0)
    active = inspector.active() or {}
    reserved = inspector.reserved() or {}
    failed = inspector.stats() or {}
    return {
        "active_tasks": sum(len(v) for v in active.values()),
        "pending_tasks": sum(len(v) for v in reserved.values()),
        "worker_online": bool(active or reserved),
    }
```

**Pitfall:** `inspect()` calls block for up to `timeout` seconds waiting for worker response. Use a short timeout (1-2s) and handle empty returns gracefully — worker may not be running.

For failed jobs count, query the Celery result backend directly via Redis:
```python
import redis as redis_lib
r = redis_lib.from_url(os.getenv("REDIS_URL"))
failed_count = r.llen("celery.dead-letter") if r.exists("celery.dead-letter") else 0
```
Note: Celery doesn't maintain a persistent failed jobs list by default. The `REVOKED` state is tracked in the result backend. For failed job count, query `SELECT COUNT(*) FROM analyses WHERE ... status = 'failed'` from crawl meta stored in Redis (ephemeral) or accept that failed count is best-effort.

### Pattern 7: Redis Memory Usage

**What:** Use the Redis `INFO memory` command to get memory usage for D-19.

```python
from app.store.crawl_store import get_redis

def get_redis_memory_mb() -> float:
    r = get_redis()
    info = r.info("memory")
    return round(info["used_memory"] / (1024 * 1024), 2)
```

### Pattern 8: Disabled User Login Block

**What:** Check `is_disabled` flag in the signin route before issuing a JWT.
**Where to add:** In the `signin` route handler in `auth.py`, after password verification.

```python
# In signin route, after bcrypt.checkpw():
if user.get("is_disabled"):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="This account has been disabled. Contact support.",
    )
```

**Session handling decision:** Let existing JWTs expire naturally (within 24h). No denylist needed. This is acceptable because: (a) admin disabling is a moderation action, not an emergency security revoke; (b) avoiding per-request Redis lookup overhead; (c) 24h expiry is the existing design constraint.

### Pattern 9: Domain Blocklist Enforcement

**What:** Check submitted URL against `banned_domains` table at the `/analyze/` route entry point.
**Where:** In `analyze.py` route, after URL validation and before robots.txt check.

```python
# New banned_domains table:
CREATE TABLE IF NOT EXISTS banned_domains (
    domain     TEXT PRIMARY KEY,
    reason     TEXT,
    banned_at  TEXT NOT NULL
);

# In analyze.py route:
from app.store.history_store import is_domain_banned
if is_domain_banned(domain):
    raise HTTPException(status_code=403, detail="This domain is not permitted for analysis.")
```

### Pattern 10: Rate Limit Overrides

**What:** Per-user audit quota overrides stored in a new column or table.
**Recommended approach:** Add `audit_quota_override INTEGER` column to `subscriptions` table via `_add_column_if_missing`. The existing quota enforcement in `analyze.py` checks the subscription's `audit_count` against plan limits — extend that check to use the override if set.

```python
# In analyze.py quota check (existing logic):
quota = user_sub.get("audit_quota_override") or PLAN_QUOTAS[user_sub["plan"]]
if user_sub["audit_count"] >= quota:
    raise HTTPException(status_code=429, detail="Audit quota exceeded")
```

### Pattern 11: Manual Admin Creation Script

**What:** A backend management script to create the first admin user.
**Recommended:** Add a simple Python script `backend/scripts/create_admin.py`:

```python
# Usage: python -m scripts.create_admin admin@example.com password123
import sys, uuid, bcrypt
from app.store.history_store import get_user_by_email, _connect, _lock

email, password = sys.argv[1], sys.argv[2]
# Insert or update user as admin
```

Alternatively, document the SQL command to run manually:
```sql
UPDATE users SET is_admin = 1 WHERE email = 'admin@example.com';
```

### Anti-Patterns to Avoid

- **Checking `is_admin` in `middleware.ts`:** The middleware has no decoded user context without a backend call. Use the admin layout component for the check — consistent with existing patterns.
- **Exposing raw API keys in list responses:** The `/admin/system` API key endpoint should mask values (show first 8 chars + `...`). Only return the full key on explicit "reveal" action.
- **Using `inspect()` without a timeout:** The Celery inspector blocks by default. Always set `timeout=2.0` or shorter.
- **Cascade-deleting without transaction:** User hard delete must cascade across `analyses`, `schedules`, `subscriptions`, `competitor_groups`, `competitor_sites`. SQLite FK cascade handles this only if `PRAGMA foreign_keys=ON` is set — which it is in `_connect()`. Verify by testing with a user that has all related records.
- **Fetching all users without pagination:** The admin user list should paginate (limit/offset) — the user table will grow large.
- **Modifying `list_analyses` to accept `user_id=None`:** Don't break the user-scoped function. Add a separate `list_all_analyses()` for admin use.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Celery queue inspection | Custom Redis key scanning | `celery.control.inspect()` | Handles active, reserved, revoked states correctly |
| Redis memory stats | Custom memory calculation | `redis_client.info("memory")["used_memory"]` | Built-in, single call |
| Admin route protection | Custom JWT re-verification middleware | `Depends(get_admin_user)` FastAPI dependency | Same pattern as existing auth |
| Admin line charts | Custom SVG charts | Recharts (already in project) | Already installed and used in `ScoreTrendChart.tsx` |
| SQLite schema migration | Drop-and-recreate tables | `_add_column_if_missing()` (already in history_store) | Preserves existing data |

---

## Runtime State Inventory

> Included because this phase adds new columns to existing tables and new tables — existing records need to be handled.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `users` table — existing rows have no `is_admin` / `is_disabled` columns | `_add_column_if_missing()` with DEFAULT 0 — existing users get is_admin=0, is_disabled=0 automatically |
| Stored data | `subscriptions` table — existing rows have no `audit_quota_override` column | `_add_column_if_missing()` with NULL default — existing subscriptions get NULL (means "use plan default") |
| Stored data | `analyses` table — user_id column already exists (added in Phase 04) | No migration needed |
| Live service config | None — no external services have admin-specific config | None |
| OS-registered state | None — no OS-level registrations for admin role | None |
| Secrets/env vars | `GOOGLE_PSI_API_KEY`, `ANTHROPIC_API_KEY` in `.env` — admin UI can override these via `admin_settings` table. The env vars remain as fallback. | Code change: read from `admin_settings` first, fall back to `os.getenv()` |
| Build artifacts | None | None |

**New tables created by this phase (idempotent via `CREATE TABLE IF NOT EXISTS`):**
- `admin_settings` (key TEXT PK, value TEXT, updated_at TEXT)
- `banned_domains` (domain TEXT PK, reason TEXT, banned_at TEXT)

---

## Common Pitfalls

### Pitfall 1: `get_user_by_id` Missing `is_admin` and `is_disabled` Fields

**What goes wrong:** The existing `get_user_by_id` SELECT uses explicit columns: `id, email, name, password_hash, created_at`. After adding `is_admin` and `is_disabled` columns, these functions still won't return the new fields — causing `user.get("is_admin")` to always return None (falsy).

**Why it happens:** SQLite returns only the columns you SELECT. Adding the column to the table doesn't automatically update queries with explicit column lists.

**How to avoid:** Update `get_user_by_email` and `get_user_by_id` to include `is_admin, is_disabled` in their SELECT statements. Add a test that reads a user row and checks `is_admin` key is present.

**Warning signs:** `/auth/me` always returns `is_admin: false` even for the manually-created admin user.

### Pitfall 2: `UserOut` Schema Not Including `is_admin`

**What goes wrong:** The `/auth/me` endpoint returns a `UserOut` Pydantic model. If `is_admin` isn't added to `UserOut`, it won't appear in the response even if `get_current_user` returns it in the dict.

**Why it happens:** Pydantic v2 by default excludes fields not declared in the model.

**How to avoid:** Add `is_admin: bool = False` to `UserOut`. Update the `/auth/me` handler to include `is_admin` in the returned dict.

### Pitfall 3: Admin Routes Accidentally Accessible Without Auth

**What goes wrong:** If the admin router is mounted without per-route dependencies, routes become publicly accessible.

**Why it happens:** Forgetting to add `Depends(get_admin_user)` on individual routes or the router itself.

**How to avoid:** Either add `dependencies=[Depends(get_admin_user)]` to the `APIRouter()` constructor, or add `Depends(get_admin_user)` to every route. Test by hitting admin routes with no cookie (expect 401) and with a non-admin user cookie (expect 403).

### Pitfall 4: FK Cascade on User Delete Not Working

**What goes wrong:** Deleting a user doesn't delete their analyses, schedules, subscriptions, etc.

**Why it happens:** SQLite FK cascade requires `PRAGMA foreign_keys=ON` per connection AND the tables must have been created with `FOREIGN KEY ... ON DELETE CASCADE`. The `analyses` and `schedules` tables have `user_id TEXT` added via ALTER TABLE — these columns have no FK constraint (this was an explicit Phase 04 decision: "Use plain TEXT (no REFERENCES clause) to avoid SQLite ADD COLUMN FK restriction").

**How to avoid:** The admin `delete_user` function must manually delete related records in the correct order (competitor_sites → competitor_groups → analyses → schedules → subscriptions → users). Do not rely on SQLite cascade for user deletion.

```python
def delete_user_cascade(user_id: str) -> None:
    with _lock:
        conn = _connect()
        try:
            # Manual cascade since analyses/schedules user_id has no FK constraint
            conn.execute("DELETE FROM competitor_sites WHERE group_id IN "
                         "(SELECT id FROM competitor_groups WHERE user_id = ?)", (user_id,))
            conn.execute("DELETE FROM competitor_groups WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM analyses WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM schedules WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM subscriptions WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
        finally:
            conn.close()
```

### Pitfall 5: Celery `inspect()` Returning None

**What goes wrong:** `celery.control.inspect().active()` returns None instead of a dict when the worker is offline or slow to respond.

**Why it happens:** The inspect call times out or the worker is not running.

**How to avoid:** Always default to empty dict/list: `active = inspector.active() or {}`. Return a "worker offline" status to the frontend when all inspection calls return None.

### Pitfall 6: Admin Sidebar Shown to Non-Admin Regular Users

**What goes wrong:** The conditional admin sidebar link in the main dashboard sidebar appears for all users because the `is_admin` field isn't in `useAuth()`.

**Why it happens:** `AuthUser` type in `api.ts` and `AuthContext` don't include `is_admin`.

**How to avoid:** Add `is_admin: boolean` to `AuthUser` interface in `api.ts`. Update `fetchCurrentUser()` to map `is_admin` from the `/auth/me` response. Update `AuthContextValue` if needed (it already exposes `user`).

### Pitfall 7: `AuthProvider` Fetching Subscription for Admin Users

**What goes wrong:** Admin users don't have subscriptions (or might not). `fetchSubscription()` in `AuthProvider` will throw on 402/404 for admin users, causing unnecessary error noise.

**Why it happens:** The `AuthProvider` always tries to fetch subscription if a user is logged in.

**How to avoid:** In `AuthProvider`, skip `fetchSubscription()` if `user.is_admin` is true. Admins don't need subscription data.

---

## Code Examples

### Admin Analytics — Users Query
```python
# Source: project's history_store.py pattern
def get_admin_user_metrics() -> dict:
    conn = _connect()
    try:
        total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        active = conn.execute("SELECT COUNT(*) FROM users WHERE is_disabled = 0").fetchone()[0]
        disabled = conn.execute("SELECT COUNT(*) FROM users WHERE is_disabled = 1").fetchone()[0]
        plan_dist = conn.execute(
            "SELECT plan, COUNT(*) as count FROM subscriptions GROUP BY plan"
        ).fetchall()
        return {
            "total": total,
            "active": active,
            "disabled": disabled,
            "plan_distribution": {row["plan"]: row["count"] for row in plan_dist},
        }
    finally:
        conn.close()
```

### Admin Analytics — Signup Trend (Last 30 Days)
```python
def get_signup_trend(days: int = 30) -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT DATE(created_at) as date, COUNT(*) as count "
            "FROM users "
            "WHERE created_at >= DATE('now', ? || ' days') "
            "GROUP BY DATE(created_at) ORDER BY date ASC",
            (f"-{days}",),
        ).fetchall()
        return [{"date": row["date"], "count": row["count"]} for row in rows]
    finally:
        conn.close()
```

### Admin Analytics — MRR Calculation
```python
PLAN_PRICES = {"free": 0, "pro": 29, "agency": 99}  # USD/month

def get_mrr() -> float:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT plan, COUNT(*) as count FROM subscriptions "
            "WHERE status = 'active' AND plan != 'free' "
            "GROUP BY plan"
        ).fetchall()
        return sum(PLAN_PRICES.get(r["plan"], 0) * r["count"] for r in rows)
    finally:
        conn.close()
```

### Feature Toggle Usage in Existing Routes
```python
# In analyze.py — check maintenance mode and new signup pause
from app.store.history_store import get_admin_setting

# At route entry:
if get_admin_setting("feature_maintenance_mode") == "true":
    raise HTTPException(503, detail="System is in maintenance mode")

# In auth.py signup route:
if get_admin_setting("feature_new_signups") == "false":
    raise HTTPException(403, detail="New signups are temporarily paused")
```

### Frontend: Admin User Type Extension
```typescript
// frontend/app/lib/api.ts — extend AuthUser
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;  // NEW
}

// fetchCurrentUser must map is_admin from /auth/me response
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await apiFetch(`${API_BASE}/auth/me`);
  if (!res.ok) return null;
  const data = await res.json();
  return { ...data, is_admin: data.is_admin ?? false };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate admin user table | `is_admin` flag on existing users table | Phase 8 decision | Simpler; same login flow |
| Manual env file edits for API keys | `admin_settings` DB table with UI | Phase 8 | Ops convenience without SSH |

**Deprecated/outdated:**
- None specific to this phase.

---

## Open Questions

1. **Disabled user JWT invalidation window**
   - What we know: JWTs expire in 24h (Phase 04 decision). Disabling a user blocks new logins immediately. Active sessions continue for up to 24h.
   - What's unclear: Whether 24h window is acceptable for the use case (it probably is for a moderation tool, not a security emergency)
   - Recommendation: Accept natural expiry. Document in admin UI: "Disable takes full effect within 24 hours for active sessions."

2. **Admin settings as API key override fallback order**
   - What we know: Env vars (`GOOGLE_PSI_API_KEY`, `ANTHROPIC_API_KEY`) are loaded at startup. Admin settings in DB can override at runtime.
   - What's unclear: Where exactly to inject the override (at each call site, or at a centralized config module)
   - Recommendation: Add `get_effective_api_key(key_name)` helper that checks `admin_settings` first, then falls back to `os.getenv()`. Use at each call site in `audit.py` and `geo_nlp.py`.

3. **Recharts in admin analytics — existing import path**
   - What we know: Recharts is already used in `ScoreTrendChart.tsx` — confirmed it's in `package.json`
   - What's unclear: The exact Recharts version — need to verify `LineChart` and `BarChart` are available
   - Recommendation: Check `frontend/package.json` for `recharts` version before planning admin chart components. Expected to be `^2.x`.

---

## Environment Availability

> Step 2.6: SKIPPED — this phase is code/config changes only. No external tools, services, or CLIs are required beyond the project's existing Docker stack (FastAPI, SQLite, Redis, Celery, Next.js).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (existing, `backend/tests/`) |
| Config file | `backend/tests/conftest.py` (existing) |
| Quick run command | `cd backend && python -m pytest tests/test_admin.py -x` |
| Full suite command | `cd backend && python -m pytest tests/ -x` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Non-admin user gets 403 on `/admin/*` routes | unit | `pytest tests/test_admin.py::test_admin_routes_reject_non_admin -x` | ❌ Wave 0 |
| Unauthenticated user gets 401 on `/admin/*` routes | unit | `pytest tests/test_admin.py::test_admin_routes_reject_unauthenticated -x` | ❌ Wave 0 |
| Admin user gets 200 on `/admin/users` | unit | `pytest tests/test_admin.py::test_admin_list_users -x` | ❌ Wave 0 |
| Disable user blocks subsequent signin | unit | `pytest tests/test_admin.py::test_disable_user_blocks_login -x` | ❌ Wave 0 |
| Delete user cascades all related records | unit | `pytest tests/test_admin.py::test_delete_user_cascade -x` | ❌ Wave 0 |
| Admin plan change updates subscription table | unit | `pytest tests/test_admin.py::test_admin_change_user_plan -x` | ❌ Wave 0 |
| `is_admin: true` appears in `/auth/me` for admin user | unit | `pytest tests/test_admin.py::test_auth_me_includes_is_admin -x` | ❌ Wave 0 |
| Domain blocklist prevents analysis | unit | `pytest tests/test_admin.py::test_banned_domain_blocked -x` | ❌ Wave 0 |
| `admin_settings` get/set round-trip | unit | `pytest tests/test_admin.py::test_admin_settings_crud -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_admin.py -x`
- **Per wave merge:** `cd backend && python -m pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_admin.py` — covers all admin route behaviors listed above
- [ ] `conftest.py` admin fixtures: `admin_user` fixture (creates user with `is_admin=1`) and `admin_client` fixture (client with admin JWT cookie set)

---

## Sources

### Primary (HIGH confidence)
- Direct code analysis of `backend/app/dependencies/auth.py` — existing `get_current_user` and `get_current_subscription` pattern
- Direct code analysis of `backend/app/store/history_store.py` — `_add_column_if_missing`, `init_db`, existing CRUD patterns
- Direct code analysis of `backend/app/api/routes/history.py` — `Depends(get_current_user)` usage pattern
- Direct code analysis of `frontend/middleware.ts` — existing route guard (cookie presence only)
- Direct code analysis of `frontend/app/lib/auth.tsx` — `AuthProvider`, `useAuth`, `AuthContextValue`
- Direct code analysis of `frontend/app/lib/api.ts` — `apiFetch`, `AuthUser` type, fetcher patterns
- Direct code analysis of `backend/app/worker/celery_app.py` — Celery instance configuration
- `.planning/phases/08-admin-account-recommended-features/08-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- Celery documentation pattern for `inspect()` — standard Celery API, well-established in Celery 5.x
- Redis `INFO memory` command — standard Redis command, documented in Redis docs

### Tertiary (LOW confidence)
- None — all findings verified by direct code analysis or established library documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in the project; no new dependencies
- Architecture: HIGH — all patterns derive directly from existing codebase conventions
- Pitfalls: HIGH — identified from direct analysis of existing code decisions (Phase 04 FK constraint decision, explicit SELECT column lists in user queries)
- Celery inspect: MEDIUM — standard API but behavior when worker is offline requires runtime validation

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (stable — no fast-moving dependencies)
