---
phase: 08-admin-account-recommended-features
plan: 06
subsystem: frontend
tags: [admin, system-controls, moderation, feature-toggles, job-management]
dependency_graph:
  requires: [08-03, 08-04]
  provides: [admin-system-page, admin-moderation-page, admin-api-types]
  affects:
    - frontend/app/admin/system/page.tsx
    - frontend/app/admin/moderation/page.tsx
    - frontend/app/lib/api.ts
tech_stack:
  added: []
  patterns: [optimistic-toggle-update, confirm-dialog-gate, search-debounce-300ms, inline-edit-pattern]
key_files:
  created: []
  modified:
    - frontend/app/admin/system/page.tsx
    - frontend/app/admin/moderation/page.tsx
    - frontend/app/lib/api.ts
decisions:
  - "is_admin added as optional field on AuthUser to fix pre-existing TS errors from plan 04 (layout.tsx, login.tsx, dashboard.tsx referenced it without the type field)"
  - "All admin API types and functions added to api.ts in a single block to avoid split across multiple plans"
  - "Cancel job requires ConfirmDialog per threat model — accidental cancellation is MEDIUM severity"
  - "Feature toggles use optimistic update + revert on error pattern to feel instant"
  - "loadAnalyses() accepts overrides object to support both debounced search and Apply Filters button without stale closure issues"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-09"
  tasks_completed: 2
  files_created: 0
  files_modified: 3
---

# Phase 08 Plan 06: System Controls and Moderation Pages Summary

Admin system controls page (Celery queue with job retry/cancel per D-21, feature toggles, masked API key management) and content moderation page (all audits with date/score filters per D-25, domain blocklist, quota overrides) built as fully interactive React components wired to admin API endpoints.

## What Was Built

**Admin API types and functions (`api.ts`):**
All types and API functions needed by plans 05 and 06 added in a single block:
- `AdminSystemHealth`, `AdminCeleryHealth`, `AdminJob`, `AdminUser`, `AdminUsersResponse`
- `AdminAnalysis`, `AdminAnalysesResponse`, `BannedDomain`, `QuotaOverride`
- `AdminTrendPoint`, `AdminUserMetrics`, `AdminAuditMetrics`, `AdminRevenueMetrics`
- `fetchAdminDashboard`, `fetchAdminSystemHealth`, `fetchAdminSettings`, `updateAdminSetting`
- `fetchAdminJobs`, `adminRetryJob`, `adminCancelJob`
- `fetchAdminUsers`, `adminUpdateUserPlan`, `adminDisableUser`, `adminEnableUser`, `adminDeleteUser`
- `fetchAdminAnalyses` (with date_from, date_to, score_min, score_max params per D-25)
- `adminDeleteAnalysis`, `fetchBannedDomains`, `adminBanDomain`, `adminUnbanDomain`
- `fetchQuotaOverrides`, `adminSetQuotaOverride`, `adminRemoveQuotaOverride`
- `is_admin?: boolean` added to `AuthUser` (fixes plan 04 TS errors)

**System page (`/admin/system`):**
- QUEUE STATUS card: active/pending task counts + Worker Online/Offline badge (green/red)
- Worker offline state: shows "--" for counts + warning text
- Refresh button re-fetches health, settings, and jobs
- Active Jobs table (per D-21): Task ID (truncated monospace), Name, State badge (green=active, yellow=pending), Worker, Started time, Retry and Cancel actions
- Cancel requires ConfirmDialog with task ID in message body
- FEATURE TOGGLES section: 3 ToggleRow components (Competitor Tracking, New User Signups, Maintenance Mode) using `aria-pressed` toggle buttons
- Toggle saves optimistically, reverts on error, shows "Saved" for 2 seconds
- Maintenance Mode banner shown at top of page when `feature_maintenance_mode=true`
- API CREDENTIALS section: 2 MaskedApiKey rows (Google PSI, Anthropic) showing `key[0:8]...` or "Not set", Edit/Save Key/Cancel flow with inline success/error feedback

**Moderation page (`/admin/moderation`):**
- ALL AUDITS section with full filter bar (per D-25):
  - Text search debounced 300ms
  - From/To date inputs (`type="date"`)
  - Min/Max score inputs (`type="number"` 0-100)
  - Apply Filters button and Clear button (resets all filters)
- Audits table: Domain (monospace), User Email, Date (YYYY-MM-DD), Score, Grade, Delete action
- Delete opens ConfirmDialog with domain and date in message
- Pagination: Previous/Next with "Showing X-Y of Z audits" counter
- Empty state: "No audits yet" heading + body
- DOMAIN BLOCKLIST panel: domain + reason form, "Ban Domain" button, scrollable list with domain/reason/date and Unban button; count badge in header; empty state
- RATE LIMIT OVERRIDES panel: user ID + quota add form, table with inline edit (replaces cell with number input) and Remove action; empty state "No overrides set"

## Deviations from Plan

**[Rule 2 - Missing Critical] Added `is_admin?: boolean` to AuthUser type**
- Found during: TypeScript verification
- Issue: `frontend/app/admin/layout.tsx`, `frontend/app/login/page.tsx`, and `frontend/app/dashboard/page.tsx` (from plan 04) all reference `user.is_admin` but `AuthUser` in api.ts had no such field, causing 4 TS errors
- Fix: Added `is_admin?: boolean` as optional field to `AuthUser` interface
- Files modified: `frontend/app/lib/api.ts`
- Commit: b43ee4b

**[Rule 2 - Missing Critical] Added all admin API functions for plan 05 as well**
- Found during: Task 1 implementation
- Issue: Plan 05 (admin dashboard + users page) depends on the same api.ts functions; since plan 05 has not run yet, none of the types or functions existed
- Fix: Added the complete admin API surface (dashboard, users, system, moderation) in one block so plan 05 can proceed without api.ts work
- Files modified: `frontend/app/lib/api.ts`
- Commit: b43ee4b

## Checkpoint Reached: Task 3 — Human Verification

Task 3 is a `checkpoint:human-verify` gate. The automated work is complete. Human must verify the full admin panel end-to-end before this plan can be marked complete.

### Verification steps:
1. `cd backend && python -m scripts.create_admin admin@test.com password123`
2. `cd backend && uvicorn app.main:app --reload`
3. `cd frontend && npm run dev`
4. Go to http://localhost:3000/login, sign in with admin@test.com / password123
5. Verify redirect to /admin/dashboard
6. System: click "System" in sidebar, verify queue status shows, worker badge appears
7. System: verify active jobs list shows (or empty state "No active jobs")
8. System: try toggling a feature flag, verify it persists on refresh
9. System: try editing an API key (save/cancel flow)
10. Moderation: click "Moderation", verify audits table loads with filter bar
11. Moderation: try date range and score range filters, verify results update
12. Moderation: try banning a domain, verify it appears in blocklist, try unbanning
13. Sign out, verify redirect to /login; sign in as regular user, verify no /admin access

## Self-Check

### Files exist in worktree
- `frontend/app/admin/system/page.tsx` — contains `fetchAdminSystemHealth`, `QUEUE STATUS`, `Worker Online`, `ToggleRow`, `MaskedApiKey`, `feature_maintenance_mode`, `No active jobs`, `Maintenance mode is ON`
- `frontend/app/admin/moderation/page.tsx` — contains `fetchAdminAnalyses`, `DOMAIN BLOCKLIST`, `RATE LIMIT OVERRIDES`, `Apply Filters`, `Delete this audit?`, `No blocked domains`, `No overrides set`, `type="date"`, `type="number"`
- `frontend/app/lib/api.ts` — contains `AdminJob`, `fetchAdminJobs`, `adminRetryJob`, `adminCancelJob`, `fetchAdminAnalyses`, `BannedDomain`, `QuotaOverride`, `is_admin`

### Commits exist
- `b43ee4b` — feat(08-06): system controls page
- `3f2b736` — feat(08-06): moderation page

### TypeScript
- `npx tsc --noEmit` in main repo frontend/ — no errors (verified before committing)

## Self-Check: PASSED

## Known Stubs

None — all sections are fully wired to real API functions. Empty states are intentional UI for when the server returns no data, not stubs.
