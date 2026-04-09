---
phase: 08-admin-account-recommended-features
plan: 01
subsystem: database
tags: [sqlite, admin, auth, pytest, celery]

requires:
  - phase: 04-auth
    provides: get_current_user dependency, users table, JWT cookie auth
  - phase: 05-subscriptions
    provides: subscriptions table with plan/status columns
  - phase: 07-competitor-tracking
    provides: competitor_groups and competitor_sites tables

provides:
  - is_admin and is_disabled columns on users table (idempotent migration)
  - admin_settings key-value table with get/set/get_all helpers
  - banned_domains table with add/remove/check/list helpers
  - get_admin_user FastAPI dependency (raises 403 for non-admins)
  - list_all_users with search/plan_filter/status_filter pagination
  - list_all_analyses with D-25 date_from/date_to/score_min/score_max filters
  - delete_user_cascade across 6 tables in a single transaction
  - celery_get_active_jobs/celery_retry_job/celery_cancel_job (D-21)
  - quota override helpers (get/set/remove) on subscriptions.audit_quota_override
  - admin analytics helpers (user metrics, signup trend, audit metrics, revenue)
  - admin_user pytest fixture for admin-authenticated tests
  - backend/scripts/create_admin.py CLI with --promote mode
  - /admin/ping route for dependency testing
  - 41 passing pytest tests covering all admin DB helpers and auth dependency

affects:
  - 08-02 through 08-06 (all subsequent admin plans depend on these helpers and dependency)

tech-stack:
  added: []
  patterns:
    - "Idempotent column migration via _add_column_if_missing (established in Phase 04, extended here)"
    - "Admin dependency chains: get_admin_user = Depends(get_current_user) + is_admin guard"
    - "Celery helpers use try/except to return empty list/False when worker offline"
    - "Alias pattern: add_banned_domain/remove_banned_domain wrap ban_domain/unban_domain"

key-files:
  created:
    - backend/app/api/routes/admin.py
    - backend/tests/test_admin.py
    - backend/scripts/create_admin.py
    - backend/scripts/__init__.py
  modified:
    - backend/app/store/history_store.py
    - backend/app/dependencies/auth.py
    - backend/app/schemas/auth.py
    - backend/app/main.py
    - backend/tests/conftest.py
    - backend/app/api/routes/auth.py

key-decisions:
  - "admin_settings and banned_domains tables added in init_db (same migration pattern as existing tables)"
  - "celery_get_active_jobs returns empty list when worker offline — callers must handle empty gracefully"
  - "add_banned_domain/remove_banned_domain are aliases for ban_domain/unban_domain to match plan API naming"
  - "/auth/me updated to forward is_admin field so admin status is visible to frontend"
  - "audit_quota_override is nullable INTEGER — NULL means use plan default, not zero"

patterns-established:
  - "Admin test pattern: sign up normally, UPDATE users SET is_admin=1 directly in DB, re-signin for fresh cookie"
  - "get_admin_user = Depends(get_current_user) + HTTPException 403 — admin routes always require both"

requirements-completed: [D-01, D-02, D-06, D-13, D-14, D-21, D-24, D-25, D-27, D-28]

duration: 45min
completed: 2026-04-09
---

# Phase 08 Plan 01: Admin Foundation Summary

**SQLite admin schema migrations (is_admin, is_disabled, admin_settings, banned_domains, audit_quota_override) + 20+ admin store helpers + get_admin_user dependency + 41 passing tests**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-09T10:00:00Z
- **Completed:** 2026-04-09T10:45:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- DB schema extended with 5 new columns/tables via idempotent migration (is_admin, is_disabled on users; audit_quota_override on subscriptions; admin_settings and banned_domains tables)
- 20+ admin store helper functions covering settings CRUD, domain blocklist, user management, analytics, analysis moderation, Celery job management, and quota overrides
- get_admin_user FastAPI dependency established as the security gate for all future admin routes (raises 403 for non-admins, 401 for unauthenticated)
- 41 pytest tests covering all helpers, the dependency, and the admin_user fixture

## Task Commits

1. **Task 1: DB schema migrations + admin store helpers** - `c768b97` (feat)
2. **Task 2: get_admin_user dependency + fixtures + script** - `658e6eb` (feat)
3. **Rule 1 fix: /auth/me is_admin forwarding** - `e1d1091` (fix)

## Files Created/Modified

- `backend/app/store/history_store.py` - Added 5 migration steps + 20+ admin helper functions
- `backend/app/dependencies/auth.py` - Added get_admin_user dependency
- `backend/app/schemas/auth.py` - Added is_admin: bool = False to UserOut
- `backend/app/main.py` - Registered admin router at /admin prefix
- `backend/app/api/routes/auth.py` - Forward is_admin in /auth/me response
- `backend/app/api/routes/admin.py` - Created with /admin/ping health check endpoint
- `backend/tests/test_admin.py` - Created with 41 admin tests
- `backend/tests/conftest.py` - Added admin_user fixture
- `backend/scripts/create_admin.py` - Created CLI with new-user and --promote modes
- `backend/scripts/__init__.py` - Created empty package init

## Decisions Made

- `admin_settings` and `banned_domains` tables created in `init_db()` using the existing `conn.executescript()` pattern — no separate migration file needed for SQLite
- Celery helpers (`celery_get_active_jobs`, `celery_retry_job`, `celery_cancel_job`) use broad `except Exception: return []`/`return False` because the worker may be offline during tests — callers handle empty gracefully
- `add_banned_domain` and `remove_banned_domain` are thin aliases over `ban_domain`/`unban_domain` to match the plan's API naming without renaming the primary functions
- `audit_quota_override` is nullable INTEGER (NULL = use plan default, not 0) per D-28 semantics

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] /auth/me did not forward is_admin field**
- **Found during:** Task 2 (test_auth_me_includes_is_admin failing)
- **Issue:** The `/auth/me` route constructed response dict manually with only id/email/name. After adding is_admin to UserOut and get_user_by_id, the me() endpoint still returned is_admin=False for all users including admins.
- **Fix:** Added `"is_admin": bool(current_user.get("is_admin", False))` to the me() return dict.
- **Files modified:** backend/app/api/routes/auth.py
- **Verification:** test_auth_me_includes_is_admin passes (41/41 green)
- **Committed in:** e1d1091

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Necessary for correctness — admin status must be visible in /auth/me for the frontend to render admin UI. No scope creep.

## Issues Encountered

Pre-existing test failure in `test_subscriptions.py::test_webhook_activates_subscription` (AttributeError on dict attribute access). Not introduced by this plan — logged to `deferred-items.md`.

## Known Stubs

None — all implemented helpers are fully wired to SQLite.

## Next Phase Readiness

- Plans 02-06 can import `get_admin_user` from `app.dependencies.auth` to protect admin routes
- The `admin_user` fixture in `conftest.py` is available for all subsequent admin test files
- All analytics and moderation store helpers are ready for plan 02 to expose via HTTP routes
- `create_admin.py` script is deployable for creating the first admin account in production

---
*Phase: 08-admin-account-recommended-features*
*Completed: 2026-04-09*
