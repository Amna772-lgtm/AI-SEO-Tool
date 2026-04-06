# Phase 4: Add User Authentication — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 04-add-user-authentication-with-signup-signin-session-management-and-logout
**Areas discussed:** Auth model, Session mechanism, Protected routes, Frontend auth flow

---

## Auth model

| Option | Description | Selected |
|--------|-------------|----------|
| Single admin account | One hardcoded/env-seeded admin user; tool locked behind a password | |
| Multi-user accounts | Anyone can register; each user has their own history and schedules | ✓ |

**User's choice:** Multi-user accounts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Per-user data isolation | Each user sees only their own history, analyses, and schedules | ✓ |
| Shared data, access control only | All users see the same data; auth just gates access | |

**User's choice:** Per-user data isolation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Open registration | Anyone with the URL can create an account; public signup form | ✓ |
| Invite-only / admin approval | Admin must approve or pre-create accounts | |

**User's choice:** Open registration

---

| Option | Description | Selected |
|--------|-------------|----------|
| Email + password | Standard credentials, bcrypt hashed | ✓ (with addition) |
| Username + password | No email required | |
| OAuth only | Delegates to third-party providers | |

**User's choice:** Email + password — **with name field added** (user clarification: email + name + password required)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Out of scope for now | Skip password reset for this phase | ✓ |
| In scope | Email-based reset flow (requires SMTP) | |

**User's choice:** Out of scope for now

---

## Session mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| JWT in HTTP-only cookie | Stateless; no DB lookup per request; cookie cleared on logout | ✓ |
| Server-side session in Redis | Token stored in Redis; true revocation on logout | |
| Server-side session in SQLite | Token in sessions table; DB read per request | |

**User's choice:** JWT in HTTP-only cookie

---

| Option | Description | Selected |
|--------|-------------|----------|
| 7 days | Standard; survive browser restarts | |
| 24 hours | More secure; re-login required daily | ✓ |
| 30 days | Maximum convenience | |

**User's choice:** 24 hours

---

## Protected routes

| Option | Description | Selected |
|--------|-------------|----------|
| All endpoints | Every API route requires auth; no data accessible without session | ✓ |
| Write operations only | GETs public; POSTs protected | |

**User's choice:** All endpoints

---

| Option | Description | Selected |
|--------|-------------|----------|
| Login page only — full app gated | All unauthenticated visitors redirected to /login | ✓ |
| Landing page visible, app gated | Homepage public; dashboard requires auth | |
| App visible, submit gated | Browse results without auth; submitting URLs requires login | |

**User's choice:** Login page only — full app gated

---

## Frontend auth flow

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js middleware | middleware.ts intercepts every request; server-side redirect; no flash | ✓ |
| Layout-level guard | Root layout checks auth on mount; slight flash before redirect | |
| Per-page guard | Each page individually checks auth | |

**User's choice:** Next.js middleware

---

| Option | Description | Selected |
|--------|-------------|----------|
| React context | AuthContext + useAuth() hook; wraps app in layout.tsx | ✓ |
| Server components / props | Session decoded server-side, passed as props | |
| Zustand / Redux | Global client state store | |

**User's choice:** React context

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /login with return URL | API 401 → redirect to /login?redirect=/original-path | |
| Login modal overlay | Modal appears over current page; re-authenticate inline | ✓ |
| Redirect to /login, no return URL | Simple redirect; lands on dashboard after login | |

**User's choice:** Login modal overlay

---

| Option | Description | Selected |
|--------|-------------|----------|
| /login and /signup | Standard clean routes | ✓ |
| /auth/login and /auth/signup | Grouped under /auth/ prefix | |

**User's choice:** /login and /signup

---

**Logout button placement:** Sidebar, bottom-left corner (user clarification — not from options list)

---
