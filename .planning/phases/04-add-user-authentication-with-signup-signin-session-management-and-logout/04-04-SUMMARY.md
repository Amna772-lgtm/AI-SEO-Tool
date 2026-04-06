---
phase: 04-add-user-authentication-with-signup-signin-session-management-and-logout
plan: "04"
subsystem: auth
tags: [react, nextjs, auth, session, jwt, context]

# Dependency graph
requires:
  - phase: 04-03
    provides: AuthProvider, useAuth, apiFetch with auth:expired dispatch, /login and /signup pages
provides:
  - AuthProvider wrapping entire app via layout.tsx
  - SessionExpiredModal that re-authenticates inline on 401 events
  - Sidebar user info section with name, email, and Sign out button
affects: [any component using useAuth, any page needing user identity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global client boundary: AuthProvider in layout.tsx wraps all children so useAuth() is available anywhere"
    - "Session recovery modal pattern: auth:expired event triggers inline re-auth without navigation"
    - "Sidebar user identity section with mt-auto anchoring to bottom-left"

key-files:
  created:
    - frontend/app/components/auth/SessionExpiredModal.tsx
  modified:
    - frontend/app/layout.tsx
    - frontend/app/page.tsx

key-decisions:
  - "SessionExpiredModal falls back to /login redirect when no user in context (prevents infinite loop)"
  - "Sign out in sidebar calls useAuth().signOut() which already handles redirect to /login"
  - "Pre-existing TypeScript errors in ScoreTrendChart.tsx are out of scope — confirmed pre-existing before changes"

patterns-established:
  - "auth:expired event pattern: apiFetch dispatches, SessionExpiredModal listens — decoupled by event bus"
  - "Sidebar user section: conditional on user != null so unauthenticated views show no user info"

requirements-completed:
  - AUTH-D11
  - AUTH-D12
  - AUTH-D14

# Metrics
duration: 3min
completed: 2026-04-06
---

# Phase 04 Plan 04: Auth Wiring — AuthProvider, SessionExpiredModal, Sidebar Logout Summary

**AuthProvider wired into root layout.tsx, SessionExpiredModal mounted globally for inline 401 re-auth, and sidebar bottom-left user info + Sign out button added to page.tsx**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-06T18:34:08Z
- **Completed:** 2026-04-06T18:37:12Z
- **Tasks:** 2 of 3 automated tasks completed (Task 3 is human-verify checkpoint)
- **Files modified:** 3

## Accomplishments

- AuthProvider now wraps the entire Next.js app via layout.tsx — useAuth() is available in any component
- SessionExpiredModal listens for the `auth:expired` window event, renders inline password re-auth over the current page, and dismisses on success without redirecting
- Sidebar shows logged-in user's name and email at bottom-left with a Sign out icon button that calls useAuth().signOut() on click
- The modal is not dismissable (no close button) — user must authenticate or be redirected to /login

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap layout.tsx with AuthProvider + mount SessionExpiredModal globally** - `4291c6d` (feat)
2. **Task 2: Add sidebar user info + Sign-out button to page.tsx** - `9d3f4c3` (feat)
3. **Task 3: Manual UAT** - awaiting human checkpoint

## Files Created/Modified

- `frontend/app/components/auth/SessionExpiredModal.tsx` - Modal overlay that re-authenticates on auth:expired events; listens via addEventListener, auto-focuses password field, pre-fills email from context
- `frontend/app/layout.tsx` - Added AuthProvider wrapper and SessionExpiredModal mount; Geist font setup preserved
- `frontend/app/page.tsx` - Added useAuth import + hook call, added sidebar user info block (name, email, Sign out icon) anchored with mt-auto

## Decisions Made

- SessionExpiredModal falls back to /login redirect when `user` is null in context (prevents broken state where modal shows with no email to pre-fill)
- Sign out button does not show a confirmation dialog per D-14 and UI-SPEC (not a destructive data action)
- Pre-existing TypeScript errors in ScoreTrendChart.tsx (type cast issue) confirmed out-of-scope — existed before any changes in this plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `git stash` during pre-existing error verification accidentally restored layout.tsx to original state. Fix: re-applied changes using Edit tool. No impact on committed result.

## User Setup Required

None - no external service configuration required.

## Manual UAT Results

Pending — Task 3 checkpoint awaiting human verification.

See Task 3 how-to-verify block for the 10 UAT steps covering:
1. Unauthenticated redirect (D-09, D-10)
2. Public auth routes (D-08)
3. Signup flow
4. Sidebar logged-in state (D-14)
5. Logout flow
6. Login flow
7. Per-user isolation (D-02)
8. Session expiry modal (D-12)
9. Health endpoint
10. /auth/me endpoint

## Known Stubs

None — all wiring is live against the real AuthProvider and apiFetch implementation from plan 03.

## Known Limitations

- Analyses started before auth was added have NULL user_id in the database (orphaned rows, invisible to users). This is documented in STATE.md and is intentional per plan 03 decisions.
- Password reset not implemented — deferred per D-04 in CONTEXT.md.
- No email verification — deferred per CONTEXT.md Deferred section.

## Next Phase Readiness

Phase 4 is feature-complete pending manual UAT sign-off (Task 3 checkpoint). After UAT approval:
- Phase 04 can be marked COMPLETE
- Future work: wire user_id through Celery worker so save_analysis writes correct user_id for analyses run after auth was added

---
*Phase: 04-add-user-authentication-with-signup-signin-session-management-and-logout*
*Completed: 2026-04-06*
