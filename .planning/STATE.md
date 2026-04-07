---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 05
status: completed
last_updated: "2026-04-07T12:26:10.641Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
---

# Project State

**Last Updated:** 2026-03-31
**Current Phase:** 05
**Overall Status:** Executing

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** Give website owners a credible, actionable score for AI citation readiness
**Current focus:** Phase 05 — implement-pricing-plan-selection-flow-after-signup

## Current Phase

**Phase 1: Pipeline Efficiency**
Goal: Remove redundant HTTP fetches, consolidate HTML parsing, reduce API cost — no user-visible changes.

Requirements: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05

Status: Phase 01 COMPLETE — All 3 plans executed

## Milestone Progress

| Phase | Status |
|-------|--------|
| Phase 1: Pipeline Efficiency | COMPLETE |
| Phase 2: Scoring Accuracy | Not started |
| Phase 3: Security, Tests & UX | Not started |

## Decisions

- HTTP fallback preserved in geo_pipeline.py for cache-miss/pre-deploy scenarios (PIPE-01)
- geo_eeat.py excluded from shared parse — uses raw string regex, not BeautifulSoup (PIPE-02)
- JSON-LD extraction runs BEFORE tag stripping in geo_features.py to preserve script blocks (PIPE-02)
- _compute_fk_grade alias used in geo_page_scores.py import to minimize call-site changes (PIPE-03)
- generate_suggestions() uses keyword-only args to prevent positional shift bugs (PIPE-04)
- Probe reduced 5→3 questions: 16 total API calls vs 26 (38.5% reduction) (PIPE-05)
- [Phase 04]: Return 404 not 403 on cross-user resource access to prevent existence leakage
- [Phase 04]: Celery worker not modified — save_analysis produces NULL user_id rows (orphaned, invisible to users). Deferred to plan 03
- [Phase 04]: _get_schedule_internal helper added so mark_schedule_ran bypasses user scoping for Beat compatibility
- [Phase 04]: SessionExpiredModal falls back to /login redirect when no user in context to prevent broken state
- [Phase 05]: subscriptions table uses UNIQUE constraint on user_id + CHECK constraints on plan/status enforced at DB level
- [Phase 05]: update_subscription uses keyword-only args to prevent positional shift bugs (PIPE-04 pattern)
- [Phase 05]: signup_and_subscribe fixture bypasses HTTP route so plan 03 enforcement tests are independent of plan 02 routes
- [Phase 05]: webhook_router and router exported separately from subscriptions.py so webhook mounts at /webhooks without auth dep leaking in
- [Phase 05]: Stripe HMAC signature verification via stripe.Webhook.construct_event — webhook authenticates via sig header not JWT cookie
- [Phase 05]: authLoading alias used in page.tsx to avoid collision with crawl loading state
- [Phase 05]: Stripe success polling checks sub.plan !== free to confirm paid activation via webhook

## Codebase Map

See: .planning/codebase/ (generated 2026-03-30)

- STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md
- CONVENTIONS.md, TESTING.md, CONCERNS.md

## Accumulated Context

### Roadmap Evolution

- Phase 4 added: Add user authentication with Signup, Signin, Session management, and Logout
- Phase 5 added: Implement Pricing Plan Selection Flow After Signup

### Phase 04 Decisions

- PyJWT used directly (not python-jose which is abandoned) (AUTH-D01)
- bcrypt used directly for password hashing (not passlib which is abandoned) (AUTH-D03)
- JWT stored in HTTP-only cookie, samesite=lax, secure=False for local dev (AUTH-D05)
- JWT exp set to 24 hours using HS256 and JWT_SECRET_KEY env var (AUTH-D06)
- Logout clears cookie server-side with max_age=0 (AUTH-D07)
- /health endpoint public; existing routes NOT yet protected (that is plan 02) (AUTH-D08)
- Email stored and compared lowercase for case-insensitive uniqueness

### Phase 04 Decisions (Plan 03)

- proxy.ts used instead of middleware.ts — Next.js 16.1.6 uses proxy.ts per RESEARCH §Pattern 4
- /auth/me 401 does NOT dispatch auth:expired to prevent infinite loop on AuthProvider mount
- AuthProvider exported but NOT wrapped in layout.tsx yet — plan 04 does that

### Phase 04 Progress

- Plan 01 COMPLETE: /auth router (signup, signin, logout, me), users table, get_current_user dependency, 8/8 pytest GREEN
- Plan 03 COMPLETE: frontend auth foundation — apiFetch helper, AuthContext/useAuth, proxy.ts route guard, /login and /signup pages
