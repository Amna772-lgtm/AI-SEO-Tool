---
phase: 08-admin-account-recommended-features
plan: "03"
subsystem: backend-admin-api
tags: [admin, api, fastapi, celery, redis, moderation, user-management]
dependency_graph:
  requires: [08-01]
  provides: [admin-api-routes]
  affects: [08-04, 08-05, 08-06]
tech_stack:
  added: []
  patterns: [router-level-dependency, lazy-imports-in-handlers, graceful-fallback]
key_files:
  created:
    - backend/app/api/routes/admin.py
  modified:
    - backend/app/main.py
decisions:
  - "Router-level Depends(get_admin_user) on APIRouter constructor enforces auth on all routes without per-route annotation"
  - "Celery inspect uses timeout=2.0 with try/except fallback so offline worker does not crash health endpoint"
  - "API keys masked in GET /system/settings via v[:8]+... pattern; full value available via dedicated /reveal/{key} endpoint"
  - "Lazy imports inside handlers (from app.store.history_store import ...) prevent circular import chains at module load"
  - "main.py already had admin router mounted at HEAD (bb78bcd0) — no change needed, only admin.py was created"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-09"
  tasks_completed: 2
  files_created: 1
  files_modified: 0
---

# Phase 08 Plan 03: Admin API Router Summary

**One-liner:** Complete FastAPI admin router with 20+ endpoints covering user management, moderation (with date/score filters), dashboard analytics, system health (Celery/Redis), job retry/cancel, and masked settings.

## What Was Built

Created `backend/app/api/routes/admin.py` — a FastAPI APIRouter with all admin endpoints required by the admin panel frontend. The router uses a router-level `dependencies=[Depends(get_admin_user)]` so every route automatically enforces admin authentication without per-route annotation.

### Endpoints Created

**User Management (D-11 through D-14)**
- `GET /admin/users` — paginated list with search, plan_filter, status_filter
- `PUT /admin/users/{user_id}/plan` — change subscription plan
- `POST /admin/users/{user_id}/disable` — disable account
- `POST /admin/users/{user_id}/enable` — re-enable account
- `DELETE /admin/users/{user_id}` — cascade delete user + all data

**Moderation (D-25 through D-28)**
- `GET /admin/moderation/audits` — list analyses with date_from, date_to, score_min, score_max filters (per D-25)
- `DELETE /admin/moderation/audits/{analysis_id}` — delete an analysis
- `GET /admin/moderation/banned-domains` — list banned domains
- `POST /admin/moderation/banned-domains` — ban a domain
- `DELETE /admin/moderation/banned-domains/{domain}` — unban a domain
- `GET /admin/moderation/quota-overrides` — list user quota overrides
- `PUT /admin/moderation/quota-overrides/{user_id}` — set quota override
- `DELETE /admin/moderation/quota-overrides/{user_id}` — remove quota override

**Analytics Dashboard (D-16 through D-20)**
- `GET /admin/dashboard` — aggregates user metrics, audit metrics, revenue metrics, system health, signup trend, audit trend

**System Control (D-21 through D-24)**
- `GET /admin/system/health` — Celery queue stats + Redis memory (graceful fallback if offline)
- `GET /admin/system/settings` — all settings with API keys masked (first 8 chars + "...")
- `GET /admin/system/settings/reveal/{key}` — full unmasked value for a specific key
- `PUT /admin/system/settings` — set/update a key-value setting
- `GET /admin/system/jobs` — list active/pending Celery jobs (per D-21)
- `POST /admin/system/jobs/{task_id}/retry` — retry a stuck job (per D-21)
- `POST /admin/system/jobs/{task_id}/cancel` — cancel/revoke a job (per D-21)

### Pydantic Schemas

- `UpdatePlanRequest` — validates plan in `^(free|pro|agency)$`
- `UpdateSettingRequest` — key (1-100 chars) + value (max 1000 chars)
- `BanDomainRequest` — domain (3-253 chars) + optional reason
- `SetQuotaRequest` — quota integer 0-100000

## Test Results

- `tests/test_admin.py`: 41/41 passed
- Full suite (excluding pre-existing subscription webhook failure): 81/81 passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree files missing from working tree after soft reset**
- **Found during:** Task 1 verification
- **Issue:** The `git reset --soft` to base commit `bb78bcd0` left the working tree at the old checkout state (`3712e53`). Files added in plans 08-01 and 08-02 (get_admin_user in auth.py, admin store functions in history_store.py, UserOut.is_admin in schemas/auth.py, test_admin.py, conftest.py admin_user fixture) were absent from the worktree's working tree.
- **Fix:** Ran `git checkout HEAD -- <files>` to restore all required files from HEAD commit to the worktree working tree.
- **Files restored:** backend/app/dependencies/auth.py, backend/app/store/history_store.py, backend/app/api/routes/auth.py, backend/app/api/routes/analyze.py, backend/app/schemas/auth.py, backend/tests/conftest.py, backend/tests/test_admin.py

**2. [Pre-existing, Out of Scope] test_webhook_activates_subscription fails**
- **Found during:** Full suite run
- **Issue:** `subscriptions.py` uses `event.data.object` on a plain dict — `AttributeError`. Pre-dates this plan.
- **Action:** Confirmed failure exists on HEAD before any changes. Out of scope. Logged here for awareness.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1+2 | 174e484 | feat(08-03): admin API router — all 20+ routes |

## Self-Check: PASSED

- FOUND: backend/app/api/routes/admin.py
- FOUND: commit 174e484
- FOUND: .planning/phases/08-admin-account-recommended-features/08-03-SUMMARY.md
