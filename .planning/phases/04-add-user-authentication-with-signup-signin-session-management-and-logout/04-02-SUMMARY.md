---
phase: 04-add-user-authentication-with-signup-signin-session-management-and-logout
plan: "02"
subsystem: backend-auth
tags: [auth, isolation, routes, sqlite, testing]
dependency_graph:
  requires: ["04-01"]
  provides: ["route-protection", "per-user-data-isolation"]
  affects: ["backend/app/api/routes/*", "backend/app/store/history_store.py"]
tech_stack:
  added: []
  patterns: ["Depends(get_current_user) on every non-auth route", "_get_meta_for_user ownership check", "_add_column_if_missing idempotent ALTER TABLE"]
key_files:
  created: []
  modified:
    - backend/app/store/history_store.py
    - backend/app/api/routes/analyze.py
    - backend/app/api/routes/sites.py
    - backend/app/api/routes/geo.py
    - backend/app/api/routes/history.py
    - backend/app/api/routes/schedules.py
    - backend/tests/test_auth.py
decisions:
  - "Return 404 (not 403) on cross-user resource access to prevent existence leakage"
  - "Celery worker (tasks.py) NOT modified — pre-auth save_analysis produces NULL user_id rows (orphaned, invisible to all users)"
  - "Added _get_schedule_internal helper so mark_schedule_ran and get_due_schedules bypass user scoping"
  - "geo.py has 12 routes (not 13 as stated in plan) — plan count was off by one; all routes protected"
metrics:
  duration_minutes: 7
  completed_date: "2026-04-06"
  tasks_completed: 3
  files_modified: 7
---

# Phase 04 Plan 02: Route Protection + Per-User Data Isolation Summary

JWT auth from plan 01 applied to every existing API endpoint; analyses and schedules tables gain `user_id` columns with user-scoped query helpers enforcing strict cross-user data isolation.

## Tasks Completed

### Task 1: user_id columns + user-scoped store functions (history_store.py)

- Added `_add_column_if_missing(conn, table, column, col_type)` — idempotent `ALTER TABLE ADD COLUMN` (SQLite has no `IF NOT EXISTS` for this)
- `init_db()` now calls the helper for `analyses.user_id TEXT` and `schedules.user_id TEXT`, then creates `idx_analyses_user_id` and `idx_schedules_user_id` indexes
- `save_analysis` gains `user_id: str | None = None` (default None preserves Celery worker compatibility)
- `list_analyses`, `get_analysis`, `delete_analysis`, `count_analyses` — all now require `user_id: str` and filter with `WHERE user_id = ?`
- `create_schedule`, `get_schedule`, `list_schedules`, `update_schedule`, `delete_schedule` — all now require `user_id: str` and filter/enforce ownership
- `get_due_schedules()` — unchanged (Celery Beat must see all users' due schedules)
- `mark_schedule_ran()` — uses new `_get_schedule_internal()` which bypasses user scoping

**Commit:** `fd33d4b`

### Task 2: Route protection + user_id threading (5 route files)

Routes protected per file:

| File | Routes Protected |
|------|-----------------|
| analyze.py | 1 (POST /analyze/) |
| sites.py | 4 (get_site, list_pages, get_site_audit, get_site_overview) |
| geo.py | 12 (all geo sub-routes including export) |
| history.py | 3 (get_history, get_history_item, delete_history_item) |
| schedules.py | 6 (create, list_all, get_one, edit, remove, trigger) |
| **Total** | **26 route handlers** |

Key implementation details:
- `analyze.py`: stamps `user_id: current_user["id"]` into the Redis meta dict at job creation time
- `sites.py` and `geo.py`: both define a local `_get_meta_for_user(task_id, user_id)` helper that returns 404 if meta is missing or `meta["user_id"] != user_id`
- `history.py` and `schedules.py`: all store calls pass `user_id=current_user["id"]`
- `schedules.py` trigger route: also stamps `user_id` into the new Redis meta for the triggered task

**Commit:** `b347c6c`

### Task 3: Cross-user isolation tests (test_auth.py)

19 new tests appended (27 total, all passing):

- `test_protected_routes_401` — parametrized over 15 endpoints, each must return 401 without cookie
- `test_health_is_public` — GET /health returns 200 without auth
- `test_auth_signup_is_public` — POST /auth/signup returns 422 (not 401) on empty body
- `test_user_isolation_schedules` — User B cannot see, fetch, or delete User A's schedule; User A's schedule survives
- `test_user_isolation_history` — User B cannot see or fetch User A's history record; cross-user GET by id returns 404

**Commit:** `ba16512`

## Decisions Made

1. **404 not 403 on cross-user access** — returning 403 leaks existence. All ownership checks return 404 so attackers cannot enumerate other users' resource IDs.

2. **Celery worker not modified** — `tasks.py` calls `save_analysis(...)` without `user_id`. The parameter has `default=None`, so Celery-saved analyses have `user_id = NULL` and are invisible to all authenticated users. Wiring user_id through the worker is deferred to plan 03.

3. **`_get_schedule_internal` helper** — `get_schedule` now requires `user_id`. Internal callers (`mark_schedule_ran`) that operate by schedule_id only use the private `_get_schedule_internal` which bypasses scoping.

4. **geo.py route count** — Plan stated 13 geo routes; actual file has 12. All 12 are protected. No routes were missed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added `_get_schedule_internal` for Beat compatibility**
- **Found during:** Task 1
- **Issue:** `mark_schedule_ran()` calls `get_schedule(schedule_id)` — but after Task 1, `get_schedule` requires `user_id`. Beat must update schedules without knowing which user owns them.
- **Fix:** Added `_get_schedule_internal(schedule_id)` that queries by id only (no user filter). `mark_schedule_ran` uses this internal helper. `get_due_schedules` was already correct (no user filter).
- **Files modified:** `backend/app/store/history_store.py`
- **Commit:** `fd33d4b`

## Known Stubs

None — all wired data flows correctly. Celery worker producing NULL user_id rows is a documented architectural constraint (deferred to plan 03), not a stub.

## Test Results

```
27 passed in 3.54s
```

- 8 original plan-01 auth tests: all green
- 15 parametrized 401-protection tests: all green
- 2 isolation tests (schedules + history): all green
- 2 public-endpoint tests (health + signup): all green

## Self-Check: PASSED
