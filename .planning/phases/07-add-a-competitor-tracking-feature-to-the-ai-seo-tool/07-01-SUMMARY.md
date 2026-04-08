---
phase: 07-add-a-competitor-tracking-feature-to-the-ai-seo-tool
plan: "01"
subsystem: database
tags: [sqlite, competitor-tracking, store-helpers, tdd, pytest]

# Dependency graph
requires:
  - phase: 05-implement-pricing-plan-selection-flow-after-signup
    provides: subscriptions table + create_subscription/get_subscription_by_user helpers for pro_user_with_group fixture
provides:
  - competitor_groups SQLite table with UNIQUE constraint on (user_id, primary_analysis_id)
  - competitor_sites SQLite table with nullable analysis_id column
  - 7 CRUD helpers: get_or_create_competitor_group, get_competitor_group, list_competitor_groups, add_competitor_site, link_competitor_analysis, count_competitor_sites, delete_competitor_site
  - pro_user_with_group pytest fixture in conftest.py
  - Wave 0 test file (5 green tests + 3 xfail Plan 02 scaffolds)
affects:
  - 07-02 (API routes for competitor groups/sites consume these store helpers)
  - 07-03 (frontend competitor UI reads group/sites data)
  - 07-04 (comparison view queries competitor analyses)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SELECT-before-INSERT idempotency for get_or_create (D-09 enforcement)
    - UNIQUE INDEX at DB layer as second line of defense for one-group-per-primary-site
    - TDD RED-GREEN cycle with xfail scaffolds for future plans

key-files:
  created:
    - backend/tests/test_competitors.py
  modified:
    - backend/app/store/history_store.py
    - backend/tests/conftest.py

key-decisions:
  - "competitor_groups enforces D-09 (one group per primary site per user) via both SELECT-before-INSERT at query layer AND UNIQUE INDEX at DB layer"
  - "competitor_sites.analysis_id is nullable TEXT (not FK) — per research Pattern 1, SQLite cannot add FK via ALTER TABLE"
  - "delete_competitor_site included in Plan 01 although Plan 02 uses it — avoids a partial-data migration in a future plan"
  - "Plan 02 xfail tests (cap enforcement, free plan gate) use xfail(strict=False) so they remain valid even if accidentally passing"

patterns-established:
  - "Pattern: Store helpers use with _lock: + _connect() + try/finally conn.close() (matches existing schedule/subscription helpers)"
  - "Pattern: get_competitor_group embeds sites list directly in response dict — avoids N+1 query at API layer"

requirements-completed: [D-09, D-10, D-11, D-12, D-13, COMP-01, COMP-05]

# Metrics
duration: 15min
completed: 2026-04-08
---

# Phase 07 Plan 01: Competitor Tracking — SQLite Data Layer Summary

**Two new SQLite tables (competitor_groups, competitor_sites) with 7 store CRUD helpers and Wave 0 TDD tests covering the store-layer contract for the competitor tracking feature**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-08T10:22:00Z
- **Completed:** 2026-04-08T10:37:19Z
- **Tasks:** 2 (TDD: 1 RED + 1 GREEN)
- **Files modified:** 3

## Accomplishments
- Competitor data layer foundation: competitor_groups and competitor_sites tables added to history.db via init_db()
- 7 store helpers exported covering the full CRUD contract for Plan 02 API routes
- Wave 0 TDD test suite: 5 tests GREEN for COMP-01 and COMP-05; 3 xfail scaffolds reserved for Plan 02 enforcement
- pro_user_with_group fixture added to conftest.py for use across Plans 02-04

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — Create test_competitors.py with failing tests + pro_user_with_group fixture** - `1aa002c` (test)
2. **Task 2: Add competitor_groups + competitor_sites tables and 6 store helpers to history_store.py** - `14b0899` (feat)

**Plan metadata:** (docs commit below)

_Note: TDD tasks have two commits — RED (test) then GREEN (feat)_

## Files Created/Modified
- `backend/tests/test_competitors.py` - 5 Wave 0 store-layer tests + 3 xfail Plan 02 scaffolds
- `backend/app/store/history_store.py` - DDL for competitor_groups and competitor_sites tables + 7 CRUD helpers
- `backend/tests/conftest.py` - Added pro_user_with_group fixture

## Decisions Made
- competitor_groups uses UNIQUE INDEX on (user_id, primary_analysis_id) as a second DB-level defense for D-09 in addition to SELECT-before-INSERT
- analysis_id stored as plain TEXT (no REFERENCES clause) — SQLite cannot add FK constraints via ALTER TABLE per research Pattern 1
- delete_competitor_site included in Plan 01 rather than Plan 02 since it pairs naturally with the other site mutation helpers
- xfail scaffolds use strict=False to avoid noise if a future test dependency partially satisfies them

## Deviations from Plan

None - plan executed exactly as written. The plan specified 6 helpers but noted delete_competitor_site as a bonus "(Yes, 7 helpers — delete_competitor_site is needed for Plan 02's DELETE route; include it now.)" — all 7 were implemented as directed.

## xfail Tests Reserved for Plan 02

The following tests are scaffolded but marked `@pytest.mark.xfail(reason="implemented in Plan 02")`:
- `test_competitor_cap_pro` — Pro plan limited to 3 competitor sites (D-13)
- `test_competitor_cap_agency` — Agency plan limited to 10 competitor sites (D-13)
- `test_competitor_free_plan_gate` — Free plan cannot access competitor tracking (D-19)

## Issues Encountered
- `test_webhook_activates_subscription` in test_subscriptions.py was already failing before this plan (pre-existing regression unrelated to competitor tracking). Confirmed by stash-and-rerun check. Logged as out-of-scope; no action taken.

## Known Stubs

None — this plan is pure data layer. No UI rendering, no stubs.

## Next Phase Readiness
- Plan 02 can now import all 7 helpers and build REST API routes for competitor tracking
- pro_user_with_group fixture available for API-layer tests in Plan 02
- competitor_groups and competitor_sites tables will exist in any fresh DB that runs init_db()

---
*Phase: 07-add-a-competitor-tracking-feature-to-the-ai-seo-tool*
*Completed: 2026-04-08*
