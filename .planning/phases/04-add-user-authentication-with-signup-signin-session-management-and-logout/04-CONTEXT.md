# Phase 4: Add User Authentication — Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add full user authentication to the tool: multi-user account registration (email + name + password), sign-in, session management via JWT cookies, and logout. Every existing API endpoint and frontend route is gated behind authentication. Per-user data isolation — each user's history, analyses, and schedules are scoped to their account.

This phase does NOT include: password reset/recovery, OAuth/social login, admin approval flows, or email verification.

</domain>

<decisions>
## Implementation Decisions

### Auth Model
- **D-01:** Multi-user accounts with open registration — anyone with the URL can create an account (no invite or admin approval required)
- **D-02:** Per-user data isolation — each user sees only their own history, analyses, and schedules; existing SQLite tables (history, schedules) need `user_id` foreign keys added
- **D-03:** Signup fields: Email + Name + Password (all three required). Passwords stored as bcrypt hashes in a `users` table in SQLite
- **D-04:** Password reset is out of scope for this phase

### Session Mechanism
- **D-05:** JWT stored in an HTTP-only cookie (stateless auth, no Redis or DB lookup per request)
- **D-06:** Session expiry: 24 hours. JWT `exp` claim set to 24h from issue time
- **D-07:** Logout clears the HTTP-only cookie server-side (set cookie to empty with `max_age=0`)

### Protected Routes
- **D-08:** All API endpoints require authentication — every route returns 401 if no valid JWT cookie present. No public endpoints except `/login`, `/signup`, and `/health`
- **D-09:** Full app gated — unauthenticated frontend visitors are redirected to `/login` with no app content visible

### Frontend Auth Flow
- **D-10:** Auth enforcement via Next.js `middleware.ts` — server-side redirect before rendering. Unauthenticated requests to any route except `/login` and `/signup` redirect to `/login`
- **D-11:** Current user info (name, email) available via React context — `AuthContext` wraps the app in `layout.tsx`; components call `useAuth()` hook
- **D-12:** Session expiry mid-use: show a login modal overlay over the current page (user re-authenticates inline without losing their place). Triggered when any API call returns 401
- **D-13:** Auth routes: `/login` (sign in) and `/signup` (registration)
- **D-14:** Logout button placed in the sidebar, bottom-left corner, showing the logged-in user's name alongside it

### Claude's Discretion
- JWT library choice (e.g., `python-jose`, `PyJWT`) — pick the most actively maintained option
- Pydantic models for auth request/response schemas
- Exact SQLite schema for `users` table (id, email, name, password_hash, created_at minimum)
- Frontend login modal component design (keep consistent with existing TailwindCSS style)
- CORS cookie settings (`samesite`, `secure` flags) — use `samesite=lax`, `secure=False` for local dev

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/codebase/ARCHITECTURE.md` — System architecture, request flow, data layers; understand where auth middleware fits
- `.planning/codebase/STACK.md` — Tech stack details; FastAPI, Next.js App Router, SQLite, Redis versions and patterns
- `.planning/codebase/CONVENTIONS.md` — Coding conventions for Python and TypeScript/React; follow naming and import patterns

### Project State
- `.planning/STATE.md` — Current project state and completed phases
- `.planning/ROADMAP.md` — Phase 4 definition and dependencies

### Key Source Files (read before modifying)
- `backend/app/main.py` — FastAPI app entry point; where auth middleware/router mounts
- `backend/app/api/routes/` — Existing route structure; all routes need auth dependency added
- `frontend/app/layout.tsx` — Root layout; AuthContext provider wraps here
- `frontend/app/lib/api.ts` — API client; needs 401 handling to trigger login modal

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- SQLite (`history.db`) — already in use for history and schedules; add `users` table to the same DB
- Redis — already running; not needed for sessions (JWT is stateless) but available if needed
- TailwindCSS 4 — all existing UI uses Tailwind; login modal and auth pages should follow same pattern
- Existing `APIRouter` pattern in `backend/app/api/routes/` — new `/auth` router follows same structure

### Established Patterns
- FastAPI `HTTPException` for errors (`raise HTTPException(status_code=401, detail="...")`)
- FastAPI dependency injection (`Depends(...)`) — use for `get_current_user` auth dependency on routes
- Pydantic v2 models for request/response validation — follow same pattern as existing schemas
- `"use client"` directive on interactive React components — auth modal, login/signup forms need this
- `useAuth()` hook pattern consistent with existing hook naming in codebase

### Integration Points
- `backend/app/main.py` — mount new `/auth` router (signup, signin, logout endpoints)
- All existing routers in `backend/app/api/routes/` — add `current_user: User = Depends(get_current_user)` to every route handler
- `frontend/app/layout.tsx` — wrap `{children}` with `AuthProvider`
- `frontend/app/lib/api.ts` — intercept 401 responses, trigger login modal
- `frontend/app/` — add `middleware.ts` at app root for server-side route protection
- Existing SQLite `history.db` schema — add `user_id` column to `history` and `schedules` tables

</code_context>

<specifics>
## Specific Ideas

- Login modal appears over the current page when session expires (not a redirect) — user re-authenticates without losing their place
- Logout button in the sidebar at the bottom-left corner, alongside the logged-in user's name/email
- `/login` and `/signup` are the only public routes — middleware excludes these two paths from auth check

</specifics>

<deferred>
## Deferred Ideas

- Password reset / "forgot password" flow — out of scope for this phase
- Email verification on signup — not mentioned, assumed deferred
- OAuth / social login (Google, GitHub) — out of scope per PROJECT.md

</deferred>

---

*Phase: 04-add-user-authentication-with-signup-signin-session-management-and-logout*
*Context gathered: 2026-04-06*
