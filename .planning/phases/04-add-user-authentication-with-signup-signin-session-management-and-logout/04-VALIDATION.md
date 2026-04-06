---
phase: 4
slug: add-user-authentication-with-signup-signin-session-management-and-logout
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (backend) / manual browser checks (frontend) |
| **Config file** | `backend/pytest.ini` or `backend/pyproject.toml` |
| **Quick run command** | `cd backend && python -m pytest tests/test_auth.py -v` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_auth.py -v`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | users table | unit | `pytest tests/test_auth.py::test_user_table_exists` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | signup endpoint | unit | `pytest tests/test_auth.py::test_signup` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | signin + JWT cookie | unit | `pytest tests/test_auth.py::test_signin_sets_cookie` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | logout clears cookie | unit | `pytest tests/test_auth.py::test_logout_clears_cookie` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 1 | /auth/me endpoint | unit | `pytest tests/test_auth.py::test_me_endpoint` | ❌ W0 | ⬜ pending |
| 4-01-06 | 01 | 1 | route protection (401) | unit | `pytest tests/test_auth.py::test_protected_routes_401` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | user_id isolation | unit | `pytest tests/test_auth.py::test_user_isolation` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 3 | frontend login flow | manual | Browser: navigate to app, verify redirect to /login | n/a | ⬜ pending |
| 4-03-02 | 03 | 3 | session expiry modal | manual | Browser: expire token, verify modal appears over current page | n/a | ⬜ pending |
| 4-03-03 | 03 | 3 | logout button in sidebar | manual | Browser: verify logout button with user name in bottom-left sidebar | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_auth.py` — stubs for all auth endpoint tests
- [ ] `backend/tests/conftest.py` — shared fixtures (test client, test DB, test user helper)
- [ ] `pip install pytest pytest-asyncio httpx` — if not already in requirements

*Existing pytest infrastructure may partially exist; Wave 0 adds auth-specific test stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Unauthenticated redirect to /login | D-09, D-10 | Next.js proxy.ts server-side redirect — no API to test | Open browser in incognito, navigate to `/`, verify redirect to `/login` |
| Session expiry login modal | D-12 | Requires time-based token expiry or manual token manipulation | Sign in, manually expire JWT in DevTools → cookies, make any API call, verify modal appears without page navigation |
| Logout button placement | D-14 | UI layout — bottom-left sidebar | Sign in, verify sidebar shows user name + Logout button at bottom-left |
| /signup and /login are public | D-08, D-09 | Front-end routing behavior | Navigate to /signup and /login without auth cookie — verify pages load (no redirect) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
