---
phase: 09-wordpress-plugin-integration-for-ai-seo-tool
plan: 02
subsystem: auth, ui
tags: [fastapi, nextjs, react, typescript, pydantic, sqlite, tailwindcss]

# Dependency graph
requires:
  - phase: 09-01
    provides: API key backend (create_api_key_record, list_api_keys, revoke_api_key in history_store + /auth/api-key routes)

provides:
  - MeOut schema with plan/plan_status/audit_count/audit_limit fields
  - /auth/me extended response for WP plugin plan gating
  - Settings index page at /dashboard/settings
  - API Keys management UI at /dashboard/settings/api-keys with full CRUD

affects:
  - 09-03 (WP plugin auth — reads /auth/me for plan data)
  - 09-04 (WP plugin settings page — user navigates here from plugin)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MeOut separate from UserOut — backward-compatible extension of /auth/me"
    - "_PLAN_AUDIT_LIMITS dict for plan-to-limit mapping (same keyword-only args pattern as PIPE-04)"
    - "One-time key reveal with navigator.clipboard.writeText + 2s Copied! feedback"
    - "Revoke confirmation modal with fixed overlay pattern"

key-files:
  created:
    - frontend/app/dashboard/settings/layout.tsx
    - frontend/app/dashboard/settings/page.tsx
    - frontend/app/dashboard/settings/api-keys/page.tsx
  modified:
    - backend/app/schemas/auth.py
    - backend/app/api/routes/auth.py

key-decisions:
  - "MeOut is a separate schema from UserOut — keeps /signup and /signin responses unchanged"
  - "audit_quota_override takes precedence over plan-based limit — matches subscriptions table design from Phase 05"
  - "apiFetch used for all API calls — inherits credentials:include and 401/402 handling"
  - "Pre-existing test_webhook_activates_subscription failure confirmed out-of-scope (stripe.Webhook dict vs object)"

patterns-established:
  - "Settings layout: max-w-3xl centered with py-8 px-4"
  - "One-time secret reveal pattern: monospace code block + copy button + warning text in error color"

requirements-completed: [WP-12, WP-13, WP-14, WP-15]

# Metrics
duration: 15min
completed: 2026-04-17
---

# Phase 09 Plan 02: API Keys UI and /auth/me Extension Summary

**Next.js API Keys management UI (generate/list/revoke with one-time reveal) and /auth/me extended with plan, plan_status, audit_count, audit_limit for WordPress plugin plan gating**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-17T11:45:00Z
- **Completed:** 2026-04-17T12:00:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 backend, 3 frontend created)

## Accomplishments

- Extended `/auth/me` with `MeOut` schema returning plan, plan_status, audit_count, audit_limit — WP plugin can now gate features by plan
- Created `_PLAN_AUDIT_LIMITS` constant (free=3, pro=50, agency=200) with audit_quota_override support
- Built full API Keys management page (252 lines) with generate flow, one-time key reveal, copy-to-clipboard, key list table, and revoke confirmation modal
- Created settings index and layout pages; navigable at `/dashboard/settings`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend /auth/me with plan and subscription data** - `820765d` (feat)
2. **Task 2: Next.js API Keys settings page** - `213f829` (feat)

## Files Created/Modified

- `backend/app/schemas/auth.py` — Added MeOut model with plan/plan_status/audit_count/audit_limit
- `backend/app/api/routes/auth.py` — Import MeOut + get_subscription_by_user, add _PLAN_AUDIT_LIMITS, update /me endpoint
- `frontend/app/dashboard/settings/layout.tsx` — Simple max-w-3xl centered settings container
- `frontend/app/dashboard/settings/page.tsx` — Settings index with link card to API Keys
- `frontend/app/dashboard/settings/api-keys/page.tsx` — Full CRUD: generate with one-time reveal, list table, revoke modal

## Decisions Made

- MeOut is separate from UserOut to keep /signup and /signin response shapes unchanged — backward compatible
- audit_quota_override takes precedence over plan-based limit, matching the Phase 05 subscriptions table design
- apiFetch used for all API calls to inherit credentials:include, 401 dispatch, and 402 quota handling
- Pre-existing `test_webhook_activates_subscription` failure (stripe.Webhook dict vs object attribute access) confirmed out-of-scope and unchanged by this plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `test_webhook_activates_subscription` was already failing before this plan (stripe mock returns dict, code uses `.data.object` attribute access). Confirmed pre-existing via git stash test. Logged to `deferred-items.md`.
- `frontend/app/admin/system/page.tsx` TypeScript build error (`user_email` not in `QuotaOverride`) was pre-existing. Logged to `deferred-items.md`.

## Known Stubs

None — API calls are wired to real backend endpoints from Plan 01. No placeholder data flows to UI rendering.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /auth/me now returns plan data needed by WP plugin (Plan 03)
- API Keys UI complete — users can generate keys before installing the WP plugin
- Settings navigation path established at /dashboard/settings/api-keys

---
*Phase: 09-wordpress-plugin-integration-for-ai-seo-tool*
*Completed: 2026-04-17*
