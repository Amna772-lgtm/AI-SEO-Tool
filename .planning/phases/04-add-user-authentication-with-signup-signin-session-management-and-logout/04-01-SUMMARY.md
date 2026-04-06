---
phase: 04-add-user-authentication-with-signup-signin-session-management-and-logout
plan: 01
subsystem: auth
tags: [jwt, bcrypt, pydantic, fastapi, sqlite, pytest, http-only-cookie]

# Dependency graph
requires: []
provides:
  - users table in SQLite (id, email UNIQUE, name, password_hash, created_at)
  - create_user / get_user_by_email / get_user_by_id helpers in history_store.py
  - /auth/signup, /auth/signin, /auth/logout, /auth/me FastAPI endpoints
  - get_current_user FastAPI dependency (JWT cookie decoder)
  - create_access_token helper (HS256, 24h expiry)
  - HTTP-only access_token cookie (samesite=lax, secure=False for dev)
  - /health public endpoint
  - pytest test suite (8 tests, all GREEN)
affects:
  - 04-02 (route protection — adds Depends(get_current_user) to existing routes)
  - 04-03 (frontend auth — login/signup pages, AuthContext, middleware)

# Tech tracking
tech-stack:
  added: [PyJWT>=2.12.1, bcrypt>=5.0.0, pytest>=7.0.0, pytest-asyncio>=0.21.0]
  patterns:
    - HTTP-only JWT cookie auth (stateless, no Redis session store)
    - FastAPI dependency injection for auth (Depends(get_current_user))
    - bcrypt password hashing via bcrypt.hashpw / bcrypt.checkpw
    - Thread-safe SQLite user CRUD following existing history_store pattern

key-files:
  created:
    - backend/app/api/routes/auth.py
    - backend/app/dependencies/__init__.py
    - backend/app/dependencies/auth.py
    - backend/app/schemas/auth.py
    - backend/tests/__init__.py
    - backend/tests/conftest.py
    - backend/tests/test_auth.py
  modified:
    - backend/requirements.txt
    - backend/app/store/history_store.py
    - backend/app/main.py

key-decisions:
  - "PyJWT used directly (not python-jose which is abandoned, not passlib which is abandoned)"
  - "bcrypt used directly for password hashing (not passlib)"
  - "JWT stored in HTTP-only cookie (samesite=lax, secure=False for local dev)"
  - "JWT exp set to 24 hours using HS256 and JWT_SECRET_KEY env var"
  - "Email stored and compared lowercase for case-insensitive uniqueness"
  - "Existing routes NOT protected in this plan — that is plan 02's responsibility"

patterns-established:
  - "Auth dependency pattern: from app.dependencies.auth import get_current_user"
  - "Cookie name constant: COOKIE_NAME = 'access_token' in dependencies/auth.py"
  - "DB helpers follow existing history_store pattern: _lock + _connect() + try/finally"

requirements-completed: [AUTH-D01, AUTH-D03, AUTH-D05, AUTH-D06, AUTH-D07, AUTH-D08]

# Metrics
duration: 4min
completed: 2026-04-06
---

# Phase 4 Plan 1: Backend Auth Foundation Summary

**FastAPI /auth router (signup, signin, logout, me) with bcrypt + PyJWT HTTP-only cookies, users SQLite table, and 8 passing pytest tests**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-06T18:08:53Z
- **Completed:** 2026-04-06T18:12:31Z
- **Tasks:** 3 (Task 0, Task 1, Task 2, Task 3)
- **Files modified:** 10

## Accomplishments

- users table added to SQLite with UNIQUE email constraint and all required columns
- /auth router with signup (201), signin (200), logout (200), me (200/401) — all HTTP-only JWT cookie based
- get_current_user FastAPI dependency ready for plan 02 to attach to existing routes
- pytest suite fully GREEN: 8/8 tests pass in 2.44s inside Docker container

## Task Commits

1. **Task 0: Test scaffolding** - `092acf9` (test)
2. **Task 1: Users table + DB helpers** - `26e9224` (feat)
3. **Task 2: Pydantic schemas + get_current_user dependency** - `a1fdf65` (feat)
4. **Task 3: /auth router + mount in main.py** - `2efe982` (feat)

## Files Created/Modified

- `backend/requirements.txt` - Added PyJWT, bcrypt, pytest, pytest-asyncio
- `backend/app/store/history_store.py` - Added users table SQL + create_user/get_user_by_email/get_user_by_id
- `backend/app/schemas/auth.py` - SignupRequest, SigninRequest, UserOut (Pydantic v2)
- `backend/app/dependencies/__init__.py` - Package init
- `backend/app/dependencies/auth.py` - create_access_token, get_current_user, JWT constants
- `backend/app/api/routes/auth.py` - Full /auth router (signup, signin, logout, me)
- `backend/app/main.py` - Mounted auth router at /auth prefix, added /health endpoint
- `backend/tests/__init__.py` - Package init
- `backend/tests/conftest.py` - client and signup_user pytest fixtures
- `backend/tests/test_auth.py` - 8 auth endpoint tests

## Decisions Made

- **PyJWT over python-jose:** python-jose is abandoned (last release 2022), PyJWT is actively maintained
- **bcrypt directly:** passlib is also abandoned; bcrypt>=5.0.0 used directly via bcrypt.hashpw/checkpw
- **HTTP-only cookie:** stateless JWT in cookie — no Redis session lookup on every request
- **24-hour expiry:** JWT_EXPIRE_HOURS = 24, configurable via JWT_SECRET_KEY env var
- **Email lowercased at write-time:** email.lower() in create_user and get_user_by_email for case-insensitive uniqueness
- **secure=False for local dev:** plan specifies flipping to True via env config in a later plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Python packages (PyJWT, bcrypt, pytest) not pre-installed on host; installed into running Docker container for test verification. Requirements.txt updated so next image rebuild will include them.

## Known Stubs

None - all auth endpoints are fully wired with real DB storage and real JWT logic.

## Next Phase Readiness

- `get_current_user` dependency is ready to be added to all existing routes (plan 02)
- Frontend auth pages (login, signup), AuthContext, and Next.js middleware are plan 03's responsibility
- JWT_SECRET_KEY must be set as an environment variable in docker-compose.yml before production use

---
*Phase: 04-add-user-authentication-with-signup-signin-session-management-and-logout*
*Completed: 2026-04-06*
