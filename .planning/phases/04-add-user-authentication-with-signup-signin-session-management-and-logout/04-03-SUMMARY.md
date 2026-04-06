---
phase: 04-add-user-authentication-with-signup-signin-session-management-and-logout
plan: "03"
subsystem: frontend-auth
tags: [auth, frontend, next.js, react-context, route-guard]
dependency_graph:
  requires: ["04-02"]
  provides: ["frontend-auth-foundation", "proxy-route-guard", "login-page", "signup-page"]
  affects: ["frontend/app/lib/api.ts", "frontend/app/lib/auth.tsx", "frontend/app/proxy.ts", "frontend/app/login/page.tsx", "frontend/app/signup/page.tsx"]
tech_stack:
  added: []
  patterns: ["apiFetch centralized fetch wrapper", "AuthContext + useAuth hook", "proxy.ts server-side route guard", "window.location.href redirect after auth"]
key_files:
  created:
    - frontend/app/lib/auth.tsx
    - frontend/app/proxy.ts
    - frontend/app/login/page.tsx
    - frontend/app/signup/page.tsx
  modified:
    - frontend/app/lib/api.ts
decisions:
  - "proxy.ts used instead of middleware.ts — Next.js 16.1.6 uses proxy.ts (RESEARCH §Pattern 4); CONTEXT.md D-10 names middleware.ts but research overrides this"
  - "/auth/me 401 does NOT dispatch auth:expired — prevents infinite loop on AuthProvider mount"
  - "AuthProvider exported but NOT wrapped in layout.tsx yet — plan 04 does that"
metrics:
  duration: "< 10 minutes"
  completed_date: "2026-04-06"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 1
---

# Phase 04 Plan 03: Frontend Auth Foundation Summary

Frontend authentication foundation: credential-bearing API fetches, AuthContext + useAuth hook, server-side route guard via proxy.ts, and standalone /login + /signup pages matching UI-SPEC.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | api.ts — credentials + 401 dispatch + auth helpers | 981b3c5 | frontend/app/lib/api.ts |
| 2 | AuthContext + useAuth hook + proxy.ts route guard | 9766a23 | frontend/app/lib/auth.tsx, frontend/app/proxy.ts |
| 3 | /login and /signup standalone pages | eb5287e | frontend/app/login/page.tsx, frontend/app/signup/page.tsx |

## What Was Built

### api.ts Migration (Task 1)

All 14 existing `fetch()` calls in `frontend/app/lib/api.ts` were migrated to `apiFetch()`. The `apiFetch` helper:
- Always sends `credentials: "include"` so the HTTP-only auth cookie travels cross-origin
- On 401 responses, dispatches `window.dispatchEvent(new Event("auth:expired"))` — consumed later by plan 04's SessionExpiredModal
- Skips the `auth:expired` dispatch for `/auth/me` calls (AuthProvider probe — would cause infinite loop)

Four new auth API functions appended at the bottom of the file:
- `signIn(email, password)` — POST /auth/signin, returns AuthUser
- `signUp(email, name, password)` — POST /auth/signup, returns AuthUser
- `signOut()` — POST /auth/logout
- `fetchCurrentUser()` — GET /auth/me, returns AuthUser | null (null on 401)

`AuthUser` interface: `{ id: string; email: string; name: string }`

### AuthContext (Task 2)

`frontend/app/lib/auth.tsx`:
- `AuthProvider` — calls `fetchCurrentUser()` on mount, holds `{user, loading}` state
- `useAuth()` — returns `{user, loading, signOut, refresh}`, throws if outside AuthProvider
- `signOut()` — calls API logout then redirects `window.location.href = "/login"`
- `refresh()` — re-fetches current user (for post-auth-action refreshes)

AuthProvider is exported but NOT yet wired into layout.tsx — that is plan 04's responsibility.

### proxy.ts Route Guard (Task 2)

`frontend/app/proxy.ts` (NOT `middleware.ts`):
- Runs on every request except `_next/static`, `_next/image`, `favicon.ico`
- Allows `/login` and `/signup` through unconditionally
- Checks `request.cookies.get("access_token")?.value` — cookie presence only (JWT signature verified server-side by `get_current_user()`)
- Redirects to `/login` if no cookie found

### /login Page (Task 3)

`frontend/app/login/page.tsx`:
- Standalone page — no sidebar, no top header
- Centered card: logo + heading "Sign in to your account" + subtext + form + footer link
- Email + Password fields with labels, inline validation errors (`role="alert"`)
- Submit calls `signIn()`, redirects to `/` on success
- Loading state: "Signing in..." with button `disabled`
- Footer: "Don't have an account? Create one" → /signup

### /signup Page (Task 3)

`frontend/app/signup/page.tsx`:
- Same card structure as /login
- Heading: "Create your account", subtext: "Fill in your details to get started."
- Name + Email + Password fields (Name validated first)
- Submit calls `signUp()`, redirects to `/` on success
- Loading state: "Creating account..." with button `disabled`
- Footer: "Already have an account? Sign in" → /login

## Deviations from Plan

### proxy.ts vs middleware.ts

**[Per RESEARCH guidance — not a bug fix]**
- CONTEXT.md D-10 names `middleware.ts` but RESEARCH §Pattern 4 confirms Next.js 16.1.6 deprecated that name in favor of `proxy.ts`
- Used `frontend/app/proxy.ts` as specified in the plan's interface section
- File `frontend/app/middleware.ts` does NOT exist — correct

None of the other plan instructions deviated.

## Key Implementation Notes

- `/auth/me` 401 exclusion: The `apiFetch` helper checks `!input.includes("/auth/me")` before dispatching `auth:expired`. This prevents the AuthProvider mount probe from triggering the session-expired modal before the user has ever logged in.
- AuthProvider NOT in layout.tsx yet: Plan 04 will wrap `{children}` with `<AuthProvider>` and also add the SessionExpiredModal and sidebar logout section.
- TypeScript: The worktree does not have `node_modules/` installed. TypeScript errors in the worktree are all pre-existing (missing `@types/node`, missing `react` types) — confirmed zero errors in `api.ts` when running tsc from the main project directory.

## Known Stubs

None. All files created in this plan are fully functional with real API endpoints wired up.

## Self-Check: PASSED

Files exist:
- FOUND: frontend/app/lib/api.ts (modified)
- FOUND: frontend/app/lib/auth.tsx (created)
- FOUND: frontend/app/proxy.ts (created)
- FOUND: frontend/app/login/page.tsx (created)
- FOUND: frontend/app/signup/page.tsx (created)
- NOT FOUND: frontend/app/middleware.ts (correct — should not exist)

Commits exist:
- 981b3c5 — feat(04-03): api.ts credentials + 401 dispatch + auth helpers
- 9766a23 — feat(04-03): AuthContext + useAuth hook + proxy.ts route guard
- eb5287e — feat(04-03): standalone /login and /signup pages
