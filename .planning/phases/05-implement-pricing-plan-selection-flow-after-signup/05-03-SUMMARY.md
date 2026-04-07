---
phase: 05-implement-pricing-plan-selection-flow-after-signup
plan: 03
subsystem: api
tags: [fastapi, sqlite, subscriptions, quota, feature-gating, pytest]

# Dependency graph
requires:
  - phase: 05-01
    provides: subscriptions table DDL + CRUD helpers (get_subscription_by_user, increment_audit_count, maybe_reset_pro_audit_count)
provides:
  - "POST /analyze/ enforces Free 1-lifetime cap, Pro 10/month cap with lazy reset, Agency unlimited"
  - "POST /analyze/ increments audit_count on every successful job dispatch"
  - "POST /schedules/ returns 403 plan_required for Free users and users without subscriptions"
  - "GET /sites/{id}/geo returns null page_scores and empty suggestions for Free users"
  - "GET /sites/{id}/geo/pages returns locked response for Free users"
  - "GET /sites/{id}/geo/suggestions returns empty locked response for Free users"
  - "SUB-04, SUB-05, SUB-06 tests green (no xfail)"
affects: [05-04-frontend, future-upgrade-modal, future-billing-enforcement]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-dispatch quota check: subscription lookup -> plan branch -> HTTPException 402 before Celery enqueue"
    - "Post-dispatch audit increment: increment_audit_count after process_site.delay() succeeds"
    - "Lazy Pro period reset: maybe_reset_pro_audit_count called before quota check on Pro plan"
    - "Feature gate pattern: get_subscription_by_user -> user_plan check -> null/empty gated fields"

key-files:
  created: []
  modified:
    - backend/app/api/routes/analyze.py
    - backend/app/api/routes/schedules.py
    - backend/app/api/routes/geo.py
    - backend/tests/test_subscriptions.py
    - backend/tests/test_auth.py

key-decisions:
  - "increment_audit_count is called after process_site.delay() succeeds but before return — ensures count only increments on successful dispatch"
  - "maybe_reset_pro_audit_count called before Pro quota check to implement lazy billing period reset (RESEARCH Pitfall 5)"
  - "Free users with no subscription on /schedules get the same 403 as Free plan users — both require upgrade"
  - "geo/pages and geo/suggestions return 200 with locked=True rather than 403 so frontend can display upgrade prompts inline"
  - "test_schedules_blocked_for_free payload fixed: hour_utc renamed to hour to match CreateScheduleRequest schema"
  - "test_user_isolation_schedules updated to create Pro subscription for user A before schedule creation (enforcement now active)"

patterns-established:
  - "Quota enforcement pattern: check subscription -> plan branch -> raise 402 with structured detail before dispatching work"
  - "Feature gate pattern: get_subscription_by_user -> user_plan == 'free' -> return gated/null data"
  - "Locked resource response: {locked: True, required_plan: 'pro'} instead of 403 for read endpoints"

requirements-completed: [D-02, D-03, D-04, D-05, D-14, D-18, D-19, D-20, D-21, D-22, SUB-04, SUB-05, SUB-06]

# Metrics
duration: 18min
completed: 2026-04-07
---

# Phase 05 Plan 03: Quota Enforcement and Feature Gating Summary

**Free 1-audit lifetime cap, Pro 10/month cap with lazy reset, and feature gating on per-page scores + suggestions + schedules — 3 xfail tests flipped GREEN**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-07T11:58:00Z
- **Completed:** 2026-04-07T12:16:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `analyze.py` enforces Free 1-audit lifetime cap (402 quota_exceeded), Pro 10/month cap with lazy billing period reset, Agency unlimited — increments audit_count on success
- `schedules.py` blocks Free users and users without subscriptions from creating schedules (403 plan_required with upgrade message)
- `geo.py` gates per-page scores and suggestions for Free users — returns null/empty with locked=True so frontend can display upgrade prompts inline
- 3 previously-xfail tests (SUB-04, SUB-05, SUB-06) now pass as regular assertions; full suite: 30 passed, 4 xfailed

## Task Commits

Each task was committed atomically:

1. **Task 1: Quota enforcement + audit_count increment in /analyze/** - `195fe3b` (feat)
2. **Task 2: Block schedules for Free users + gate per-page + suggestions** - `c585fa3` (feat)

**Plan metadata:** (docs commit — see final commit below)

## Files Created/Modified

- `backend/app/api/routes/analyze.py` — Added subscription lookup, Free/Pro/Agency quota branches, increment_audit_count post-dispatch
- `backend/app/api/routes/schedules.py` — Added get_subscription_by_user import and Free-plan 403 block at top of POST /
- `backend/app/api/routes/geo.py` — Added get_subscription_by_user import; gated page_scores and suggestions in /geo endpoint; gated /geo/pages and /geo/suggestions individual endpoints
- `backend/tests/test_subscriptions.py` — Removed xfail from test_free_quota_exceeded, test_pro_quota_reset, test_schedules_blocked_for_free; fixed hour_utc->hour in schedules test payload
- `backend/tests/test_auth.py` — Fixed test_user_isolation_schedules: added Pro subscription creation for user A before schedule creation

## API Response Shapes (for frontend plan 05-04)

### 402 — Quota Exceeded (analyze endpoint)

No subscription:
```json
{ "detail": { "code": "no_subscription", "message": "Plan selection required." } }
```

Free plan cap:
```json
{ "detail": { "code": "quota_exceeded", "plan": "free", "limit": 1, "message": "You've used your 1 free audit. Upgrade to Pro for 10 audits per month." } }
```

Pro plan cap:
```json
{ "detail": { "code": "quota_exceeded", "plan": "pro", "limit": 10, "message": "You've used all 10 audits for this billing period. Upgrade to Agency for unlimited audits." } }
```

### 403 — Schedules Blocked (schedules endpoint)

```json
{ "detail": { "code": "plan_required", "message": "Upgrade to Pro to schedule re-audits.", "required_plan": "pro" } }
```

### 200 Locked — Per-page scores / suggestions (geo endpoints)

`GET /sites/{id}/geo/pages` for Free:
```json
{ "site_id": "...", "page_scores": null, "locked": true, "required_plan": "pro" }
```

`GET /sites/{id}/geo/suggestions` for Free:
```json
{ "site_id": "...", "locked": true, "required_plan": "pro", "critical": [], "important": [], "optional": [] }
```

`GET /sites/{id}/geo` for Free: `page_scores` is null, `suggestions` is `[]`

## Decisions Made

- `increment_audit_count` is called after `process_site.delay()` succeeds but before return — ensures count only increments on successful dispatch (not on robots/validation failures)
- `maybe_reset_pro_audit_count` called before Pro quota check to implement lazy billing period reset (RESEARCH Pitfall 5 pattern)
- Free users with no subscription on `/schedules` get the same 403 as Free plan users — no subscription = no scheduling access
- Geo endpoints return 200 with `locked=True` rather than 403 for read endpoints, so frontend can display upgrade prompts inline without an error state
- `test_schedules_blocked_for_free` payload fixed: `hour_utc` renamed to `hour` to match `CreateScheduleRequest` schema (plan had wrong field name)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test_user_isolation_schedules broken by new schedule enforcement**
- **Found during:** Task 2 (schedules enforcement)
- **Issue:** Existing test `test_user_isolation_schedules` in test_auth.py created a schedule with a user that had no subscription, which now correctly returns 403 instead of 201
- **Fix:** Added Pro subscription creation for user A via `create_subscription(user_id=user_a_id, plan="pro")` before the schedule creation in the test
- **Files modified:** backend/tests/test_auth.py
- **Verification:** `pytest tests/ -v` — 30 passed, 4 xfailed
- **Committed in:** c585fa3 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed hour_utc field name in test_schedules_blocked_for_free**
- **Found during:** Task 2 (reading schedules.py CreateScheduleRequest schema)
- **Issue:** Plan specified `hour_utc: 9` in the test payload but `CreateScheduleRequest` uses `hour` (not `hour_utc`), causing a 422 validation error instead of the expected 403
- **Fix:** Renamed `hour_utc` to `hour` in the test payload and changed path from `/schedules` to `/schedules/` to match router prefix
- **Files modified:** backend/tests/test_subscriptions.py
- **Verification:** test passes with status 403
- **Committed in:** c585fa3 (Task 2 commit)

**3. [Rule 3 - Blocking] Merged main branch (05-01 changes) into worktree before implementing 05-03**
- **Found during:** Task 1 start (subscription functions missing from worktree)
- **Issue:** Worktree was at commit 7871b40 (pre-05-01). Plan 05-03 depends on 05-01 helpers. Subscription functions did not exist.
- **Fix:** `git merge main` to bring in 05-01 commits (subscriptions table DDL, CRUD helpers, test scaffolding, schemas)
- **Files modified:** history_store.py, schemas/subscriptions.py, tests/conftest.py, tests/test_subscriptions.py
- **Verification:** All 05-01 imports resolved, tests collected
- **Committed in:** N/A (git merge, not a code change)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- Worktree was not synced with main branch — 05-01 plan outputs were missing. Resolved by merging main before starting implementation.

## Known Stubs

None — all enforcement and gating is wired to real subscription data. The geo gating returns locked responses but does not stub data; it correctly returns null/empty when user is Free-plan.

## Next Phase Readiness

- All backend enforcement endpoints are complete and tested
- Response shapes documented above for frontend consumption
- Plan 05-04 (frontend) can now wire upgrade modals to:
  - 402 from `/analyze/` → show upgrade prompt with plan/limit from detail
  - 403 from `/schedules/` → show Pro upgrade prompt
  - `locked: true` from geo endpoints → show per-page/suggestions upgrade teaser
- SUB-01, SUB-02, SUB-03, SUB-07 still xfail — await plan 05-02 (Stripe + subscription routes)

---
*Phase: 05-implement-pricing-plan-selection-flow-after-signup*
*Completed: 2026-04-07*
