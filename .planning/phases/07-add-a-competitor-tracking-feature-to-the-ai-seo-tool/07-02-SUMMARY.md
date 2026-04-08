---
phase: 07-add-a-competitor-tracking-feature-to-the-ai-seo-tool
plan: "02"
subsystem: api
tags: [fastapi, competitors, claude, celery, sqlite]

requires:
  - phase: 07-01
    provides: competitor_groups + competitor_sites tables and 7 store helpers (get_or_create_competitor_group, add_competitor_site, link_competitor_analysis, etc.)

provides:
  - POST /competitors/discover endpoint with Claude-powered discovery returning 5-8 {domain, reason} objects
  - GET /competitors/groups and POST /competitors/groups for group CRUD
  - GET /competitors/groups/{id} with 404 on cross-user access
  - POST /competitors/groups/{id}/sites that dispatches process_site.delay() and links analysis_id
  - DELETE /competitors/groups/{id}/sites/{id} with 404 on not-found
  - POST /competitors/groups/{id}/sites/{id}/reaudit that re-dispatches and relinks
  - Free plan gated with 403 code=feature_unavailable on all competitor routes
  - PLAN_COMPETITOR_CAP table (free=0, pro=3, agency=10) enforced per group
  - competitor_discovery.py analyzer with Claude prompt + JSON parse + fallback

affects:
  - 07-03 (frontend must use these route contracts)
  - 07-04 (review/optimization phase)

tech-stack:
  added: []
  patterns:
    - _require_paid_plan() helper centralizes free-plan gate returning plan string
    - _check_quota_or_raise() mirrors analyze.py quota logic for competitor audits
    - process_site.delay(url, task_id) called with positional args matching existing Celery task signature
    - task_id generated locally before delay() call; Celery return value not used

key-files:
  created:
    - backend/app/api/routes/competitors.py
    - backend/app/analyzers/competitor_discovery.py (created in plan 7 commit, tested here)
  modified:
    - backend/app/main.py (added competitors import + include_router at /competitors)
    - backend/tests/test_competitors.py (2 bug fixes: staticmethod lambda, client2 signin)

key-decisions:
  - "get_analysis() used instead of non-existent get_history_record() - same scoped lookup"
  - "process_site.delay(url, task_id) called positionally to match existing Celery signature"
  - "FakeClient lambda wrapped in staticmethod() to prevent Python descriptor binding self as api_key"
  - "test_competitor_cap_agency fixed to sign in on client2 before making authenticated requests"

patterns-established:
  - "Competitor route auth: _require_paid_plan() returns plan string, reused across all 7 routes"
  - "Cap enforcement: count_competitor_sites(group_id) >= cap raises 403 competitor_cap_reached"
  - "Quota check: _check_quota_or_raise mirrors analyze.py using sub['audit_count'] field"

requirements-completed: [D-02, D-05, D-06, D-07, D-08, D-13, D-17, D-18, D-19, COMP-02, COMP-03, COMP-04]

duration: 7min
completed: 2026-04-08
---

# Phase 07 Plan 02: Competitor API Routes Summary

**FastAPI /competitors router with 7 routes: free-plan gating, pro/agency cap enforcement, Claude discovery, process_site.delay dispatch, and re-audit — all 13 tests GREEN**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-08T17:41:40Z
- **Completed:** 2026-04-08T17:48:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `competitors.py` APIRouter with all 7 routes mounted at `/competitors` prefix
- Implemented plan gating: free plan blocked (403 feature_unavailable), pro cap=3, agency cap=10
- Claude discovery endpoint extracts geo_data from primary analysis and calls `discover_competitors()`
- Re-audit endpoint generates fresh task_id, dispatches process_site.delay(), and relinks analysis_id
- All 13 tests in `test_competitors.py` GREEN with zero regressions (1 pre-existing subscription webhook failure out of scope)

## Task Commits

1. **Task 1: Fix FakeClient lambda binding bug** - `57ab367` (test)
2. **Task 2: Create competitors route + mount in main.py** - `382ae3c` (feat)

## Route Signatures

| Method | Path | Auth | Plan Gate | Response |
|--------|------|------|-----------|----------|
| POST | /competitors/discover | required | pro/agency | {suggestions, fallback} |
| GET | /competitors/groups | required | pro/agency | {groups: [...]} |
| POST | /competitors/groups | required | pro/agency | group object |
| GET | /competitors/groups/{id} | required | pro/agency | group or 404 |
| POST | /competitors/groups/{id}/sites | required | pro/agency | site with analysis_id |
| DELETE | /competitors/groups/{id}/sites/{site_id} | required | pro/agency | {deleted: true} |
| POST | /competitors/groups/{id}/sites/{site_id}/reaudit | required | pro/agency | {id, analysis_id, url} |

## PLAN_COMPETITOR_CAP Table

```python
PLAN_COMPETITOR_CAP = {"free": 0, "pro": 3, "agency": 10}
```

Cap is enforced per group: `count_competitor_sites(group_id) >= cap` raises 403 with `competitor_cap_reached`.

## Claude Discovery Prompt Structure

`discover_competitors()` builds prompt from:
- `primary_domain` — domain from history record
- `site_type` — from `geo_data.site_type.site_type`
- `key_topics[:8]` — from `geo_data.nlp.key_topics`
- `probe_questions[:3]` — from `geo_data.probe.questions`
- `faq_questions[:3]` — from `geo_data.content.faq_questions`

Returns `None` when ANTHROPIC_API_KEY is empty, SDK missing, API error, or unparseable response. Route returns `{suggestions: [], fallback: True, message: "Couldn't find suggestions right now..."}` on None.

## Quota + Cap Interaction (D-13 + D-17)

1. Cap check (`count_competitor_sites >= PLAN_COMPETITOR_CAP[plan]`) runs BEFORE quota check
2. Quota check mirrors `analyze.py`: reads `sub["audit_count"]` and raises 402 quota_exceeded if over limit
3. After dispatch: `increment_audit_count()` increments the counter
4. Re-audit also burns a quota slot (D-18)

## Tests Now Green (Formerly xfail)

| Test | Status | Notes |
|------|--------|-------|
| test_discovery_no_api_key | GREEN | discovers None when key empty |
| test_discovery_normalizes_domains | GREEN | Fixed staticmethod lambda bug |
| test_competitor_free_plan_gate | GREEN | 403 feature_unavailable |
| test_competitor_cap_pro | GREEN | 4th site returns 403 cap=3 |
| test_competitor_cap_agency | GREEN | 11th site returns 403 cap=10 |
| test_cross_user_group_returns_404 | GREEN | Phase 04 decision honored |
| test_add_site_dispatches_analyze_and_links | GREEN | task_id linked to analysis_id |
| test_reaudit_dispatches_new_analyze | GREEN | 2 delay() calls, new task_id |

## Files Created/Modified
- `backend/app/api/routes/competitors.py` — 7-route APIRouter with plan gates, caps, quota, discovery, reaudit
- `backend/app/main.py` — added `competitors` import and `include_router` at `/competitors`
- `backend/tests/test_competitors.py` — 2 auto-fixes: staticmethod lambda, client2 signin
- `backend/app/analyzers/competitor_discovery.py` — already created in prior commit; tested here

## Decisions Made
- Used `get_analysis()` (the actual function name) instead of `get_history_record()` referenced in the plan's interface section — same behavior, different name in the codebase
- Called `process_site.delay(url, task_id)` with positional args matching the actual Celery task signature `def process_site(url: str, task_id: str, ...)`, not `process_site.delay(task_id=..., url=..., user_id=...)` as specified in the plan (user_id is not a parameter)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Python descriptor binding in FakeClient lambda**
- **Found during:** Task 1 (running discovery tests)
- **Issue:** `type("M", (), {"Anthropic": lambda api_key: FakeClient()})()` — when `instance.Anthropic` is accessed, Python's descriptor protocol passes the instance as the first positional arg, causing `lambda() got multiple values for argument 'api_key'`
- **Fix:** Wrapped lambda with `staticmethod()`: `"Anthropic": staticmethod(lambda api_key: FakeClient())`
- **Files modified:** `backend/tests/test_competitors.py`
- **Verification:** `test_discovery_normalizes_domains` passes
- **Committed in:** 57ab367

**2. [Rule 1 - Bug] Fixed test_competitor_cap_agency missing auth on client2**
- **Found during:** Task 2 (running full test suite)
- **Issue:** `client2 = TestClient(app)` created fresh client without signing in, so all requests returned 401 Not Authenticated
- **Fix:** Added `client2.post("/auth/signin", json={"email": u["email"], "password": u["password"]})` before group creation
- **Files modified:** `backend/tests/test_competitors.py`
- **Verification:** `test_competitor_cap_agency` passes (13/13 GREEN)
- **Committed in:** 382ae3c

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs in tests)
**Impact on plan:** Both fixes necessary for test correctness. No scope changes. Route implementation matches plan spec exactly.

## Issues Encountered
- Pre-existing failure: `test_webhook_activates_subscription` was already failing before this plan (AttributeError: dict has no .data attribute in subscriptions.py:123). Logged to deferred items — out of scope for this plan.

## Next Phase Readiness
- Backend contract is stable: 7 routes with exact signatures defined and tested
- Plan 03 (frontend) can now build against `/competitors/*` endpoints
- OpenAPI docs show all 7 routes under "competitors" tag at `/docs`

---
*Phase: 07-add-a-competitor-tracking-feature-to-the-ai-seo-tool*
*Completed: 2026-04-08*

## Self-Check: PASSED

- FOUND: backend/app/api/routes/competitors.py
- FOUND: backend/app/analyzers/competitor_discovery.py
- FOUND: .planning/phases/07-add-a-competitor-tracking-feature-to-the-ai-seo-tool/07-02-SUMMARY.md
- FOUND commit: 57ab367 (test fix)
- FOUND commit: 382ae3c (feat implementation)
- FOUND commit: 0dfa62a (docs/metadata)
