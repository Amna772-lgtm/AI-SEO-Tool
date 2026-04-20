---
phase: 09-wordpress-plugin-integration-for-ai-seo-tool
plan: 01
subsystem: auth
tags: [api-keys, bearer-auth, jwt, sqlite, fastapi, sha256, httpbearer]

# Dependency graph
requires:
  - phase: 04-authentication
    provides: JWT cookie auth, users table, get_current_user dependency, history_store.py patterns
  - phase: 08-admin-panel
    provides: history_store.py admin tables, init_db pattern with executescript blocks
provides:
  - api_keys table in SQLite with SHA-256 hash storage and FK cascade
  - 5 store functions: create_api_key_record, list_api_keys, revoke_api_key, get_user_by_api_key_hash, update_api_key_last_used
  - 3 REST endpoints: POST /auth/api-key, GET /auth/api-keys, DELETE /auth/api-keys/{id}
  - Dual auth middleware: Bearer API key + JWT cookie on all protected routes
  - ApiKeyCreateRequest and ApiKeyOut Pydantic schemas
  - 9 passing tests covering full CRUD and Bearer auth on /auth/me and /analyze/
affects:
  - 09-02 (WordPress plugin needs these endpoints to connect)
  - future plans using get_current_user (now accepts Bearer tokens)

# Tech tracking
tech-stack:
  added: [fastapi.security.HTTPBearer, hashlib.sha256, secrets.token_urlsafe]
  patterns: [dual-auth-bearer-before-cookie, hash-only-storage, structured-logging-on-auth-events]

key-files:
  created:
    - backend/tests/test_api_keys.py
    - backend/tests/test_api_key_auth.py
  modified:
    - backend/app/store/history_store.py
    - backend/app/schemas/auth.py
    - backend/app/dependencies/auth.py
    - backend/app/api/routes/auth.py

key-decisions:
  - "SHA-256 hash stored in DB, raw key returned once at creation (WP-14/D-14)"
  - "Bearer auth checked BEFORE cookie JWT in get_current_user to avoid false cookie fallback"
  - "HTTPBearer(auto_error=False) used so missing Bearer header falls through to cookie path"
  - "update_api_key_last_used called on every successful Bearer auth to track usage"
  - "api_keys table uses FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE"

patterns-established:
  - "Dual auth pattern: Bearer API key first, JWT cookie fallback — reuse for any new protected route"
  - "API key hash lookup: SHA-256 of raw key, never store raw key"
  - "Structured logging on all auth events: info on success, warning on failure"

requirements-completed: [WP-01, WP-02, WP-03, WP-04, WP-05, WP-06, WP-07]

# Metrics
duration: 15min
completed: 2026-04-17
---

# Phase 09 Plan 01: Backend API Key System Summary

**SHA-256-hashed API key system with Bearer+Cookie dual auth, 3 CRUD endpoints, and 9 passing tests enabling WordPress plugin authentication**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-17T11:38:00Z
- **Completed:** 2026-04-17T11:53:35Z
- **Tasks:** 3 (Task 0, Task 1, Task 2)
- **Files modified:** 6

## Accomplishments

- Built api_keys SQLite table with SHA-256 hash storage, FK cascade, and dual indexes
- Extended get_current_user to accept Bearer API key before falling back to JWT cookie — all existing routes now also support API key auth without any route changes
- Implemented 3 new endpoints (POST /auth/api-key, GET /auth/api-keys, DELETE /auth/api-keys/{id}) with structured logging
- 9/9 tests pass covering key creation, listing, revocation, Bearer auth on /auth/me and /analyze/, cookie auth regression, invalid key rejection, and revoked key rejection

## Task Commits

1. **Task 0: Wave 0 test stubs** - `622e90e` (test)
2. **Task 1: api_keys table + store functions + schemas** - `9d473f3` (feat)
3. **Task 2: Dual auth + 3 endpoints + full tests** - `816d1fe` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `backend/app/store/history_store.py` - Added api_keys table to init_db(), 5 store functions, logging import
- `backend/app/schemas/auth.py` - Added ApiKeyCreateRequest and ApiKeyOut schemas
- `backend/app/dependencies/auth.py` - Extended get_current_user with HTTPBearer dual auth
- `backend/app/api/routes/auth.py` - Added 3 API key management endpoints
- `backend/tests/test_api_keys.py` - 7 tests for key CRUD and Bearer auth
- `backend/tests/test_api_key_auth.py` - 2 tests for dual auth on /analyze/

## Decisions Made

- Bearer auth checked BEFORE cookie JWT so API key clients are not confused by an absent cookie
- `HTTPBearer(auto_error=False)` prevents FastAPI from auto-rejecting requests without an Authorization header, preserving the cookie fallback path
- `update_api_key_last_used` called on every successful Bearer auth request for usage tracking
- `api_keys.key_hash` column is UNIQUE so a compromised key can be definitively revoked

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing test failure: `test_subscriptions.py::test_webhook_activates_subscription` was already failing before this plan (Stripe mock dict lacks `.data` attribute). Confirmed by git stash verification. Logged as out-of-scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Bearer auth is live on all existing protected routes including /analyze/
- WordPress plugin can now authenticate via `Authorization: Bearer <api-key>` header
- Plan 02 (WordPress plugin PHP/React scaffold) can begin immediately
- No blockers

---
*Phase: 09-wordpress-plugin-integration-for-ai-seo-tool*
*Completed: 2026-04-17*

## Self-Check: PASSED

- FOUND: backend/app/store/history_store.py
- FOUND: backend/app/schemas/auth.py
- FOUND: backend/app/dependencies/auth.py
- FOUND: backend/app/api/routes/auth.py
- FOUND: backend/tests/test_api_keys.py
- FOUND: backend/tests/test_api_key_auth.py
- FOUND: .planning/phases/09-wordpress-plugin-integration-for-ai-seo-tool/09-01-SUMMARY.md
- FOUND: commit 622e90e (test stubs)
- FOUND: commit 9d473f3 (store + schemas)
- FOUND: commit 816d1fe (dual auth + endpoints + tests)
