---
phase: 05-implement-pricing-plan-selection-flow-after-signup
plan: 02
subsystem: payments
tags: [stripe, fastapi, webhook, subscriptions, pytest]

# Dependency graph
requires:
  - phase: 05-01
    provides: subscriptions table, create_subscription/get_subscription_by_user/update_subscription store functions, PlanSelectRequest/CheckoutRequest/SubscriptionOut schemas
  - phase: 04
    provides: get_current_user dependency, JWT cookie auth
provides:
  - POST /subscriptions/select — Free plan enrollment, returns SubscriptionOut
  - POST /subscriptions/create-checkout-session — Stripe Checkout session creation for pro/agency
  - POST /webhooks/stripe — Stripe webhook handler (signature-verified, async, no auth dep)
  - GET /subscriptions/me — Current user subscription lookup
  - get_current_subscription dependency in auth.py (raises 402 on missing sub)
affects:
  - 05-03 (enforcement plan uses get_current_subscription dep and the mounted routes)
  - 04-frontend (frontend calls /subscriptions/select and /subscriptions/create-checkout-session)

# Tech tracking
tech-stack:
  added: [stripe SDK (already in requirements.txt)]
  patterns: [webhook_router exported separately for different mount prefix, async webhook handler reads raw body before JSON parsing, monkeypatch.setenv for Stripe env vars in tests]

key-files:
  created:
    - backend/app/api/routes/subscriptions.py
  modified:
    - backend/app/dependencies/auth.py
    - backend/app/main.py
    - backend/tests/test_subscriptions.py

key-decisions:
  - "webhook_router and router exported as separate objects from subscriptions.py so they can be mounted at different prefixes (/webhooks vs /subscriptions)"
  - "stripe.Webhook.construct_event used for HMAC signature verification — webhook authenticates via sig header not user cookie"
  - "409 on duplicate free plan enrollment prevents Free re-entry exploit"
  - "STRIPE_PRICE_PRO env var checked at request time (not module import) so missing key raises 500 not silent failure"

patterns-established:
  - "Pattern: Two APIRouter objects in one module when routes need different mount prefixes"
  - "Pattern: async webhook handler that reads request.body() before JSON parsing to preserve raw bytes for signature verification"
  - "Pattern: monkeypatch.setenv for Stripe env vars in test setup to prevent 500 from missing config"

requirements-completed: [D-01, D-06, D-07, D-08, D-09, D-10, D-11, D-13, SUB-01, SUB-02, SUB-03, SUB-07]

# Metrics
duration: 4min
completed: 2026-04-07
---

# Phase 05 Plan 02: /subscriptions Router + Stripe Webhook Summary

**Four HTTP endpoints (select/checkout/webhook/me) with Stripe HMAC webhook verification and get_current_subscription dep, flipping SUB-01/02/03/07 from xfail to green**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T12:11:23Z
- **Completed:** 2026-04-07T12:15:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Built complete `/subscriptions` router: free enrollment (POST /select), Stripe Checkout session creation (POST /create-checkout-session), subscription lookup (GET /me)
- Built async Stripe webhook handler at `/webhooks/stripe` with `stripe.Webhook.construct_event` signature verification — no auth dependency (Stripe authenticates via HMAC not cookie)
- Added `get_current_subscription` dependency to `auth.py` — raises HTTP 402 with `{"code": "no_subscription"}` when user has no subscription row
- Mounted both routers in `main.py` at their correct prefixes
- Flipped 4 tests from xfail to actually passing: SUB-01, SUB-02, SUB-03, SUB-07

## Endpoint Details

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | /subscriptions/select | JWT cookie | Free plan only; 409 if already subscribed |
| POST | /subscriptions/create-checkout-session | JWT cookie | Pro/Agency; returns {checkout_url} |
| GET | /subscriptions/me | JWT cookie | 404 if no subscription |
| POST | /webhooks/stripe | Stripe HMAC sig | Async, raw body, no get_current_user |

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| STRIPE_SECRET_KEY | Stripe API key (sk_test_... or sk_live_...) |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret (whsec_...) |
| STRIPE_PRICE_PRO | Stripe Price ID for Pro plan (price_...) |
| STRIPE_PRICE_AGENCY | Stripe Price ID for Agency plan (price_...) |
| FRONTEND_URL | Base URL for Stripe redirect (default: http://localhost:3000) |

## Webhook Events Handled

- `checkout.session.completed` — Creates or updates subscription row using `client_reference_id` as user_id, sets plan from metadata
- `customer.subscription.updated` / `customer.subscription.deleted` — Acknowledged (no-op; future plan)
- All other events — Acknowledged with 200 (Stripe best practice)

## Tests Moved from xfail to Green

| Test | Requirement | What it verifies |
|------|------------|-----------------|
| test_free_plan_creates_subscription | SUB-01 | POST /subscriptions/select returns 200 with plan=free, status=active |
| test_pro_plan_returns_checkout_url | SUB-02 | POST /subscriptions/create-checkout-session returns checkout_url |
| test_webhook_activates_subscription | SUB-03 | Webhook creates subscription row with stripe IDs |
| test_webhook_invalid_signature | SUB-07 | Bad Stripe signature returns 400 |

Still xfail (become green in plan 05-03): SUB-04 (quota enforcement), SUB-05 (pro quota reset), SUB-06 (schedules blocked for free).

Note: test_pro_quota_reset (SUB-05) is XPASS — the `maybe_reset_pro_audit_count` function was implemented in plan 05-01 and the test passes; xfail mark removal deferred to plan 05-03.

## Task Commits

1. **Task 1: Create /subscriptions router + get_current_subscription dep** - `4c02f31` (feat)
2. **Task 2: Mount routers in main.py + flip SUB-01/02/03/07 to green** - `35b6f3d` (feat)

## Files Created/Modified

- `backend/app/api/routes/subscriptions.py` — New file: router + webhook_router with 4 endpoints
- `backend/app/dependencies/auth.py` — Appended get_current_subscription dependency + added Depends import
- `backend/app/main.py` — Added subscriptions import + 2 include_router calls
- `backend/tests/test_subscriptions.py` — Removed xfail marks from 4 tests + added monkeypatch.setenv calls

## Decisions Made

- Two APIRouter objects (`router` and `webhook_router`) exported from one module so they can be mounted at different prefixes without any auth dependency leaking into the webhook
- Stripe signature verification uses `stripe.Webhook.construct_event` (SDK method) rather than manual HMAC — handles both ValueError (bad payload) and SignatureVerificationError (bad sig)
- 409 conflict returned when user attempts free enrollment twice (prevents double-free exploit noted in RESEARCH Pitfall 6)
- `STRIPE_PRICE_*` env vars checked at request time so missing config raises 500 immediately rather than failing silently during Stripe API call

## Deviations from Plan

None - plan executed exactly as written. The monkeypatch.setenv additions were specified in the plan's action section.

## Issues Encountered

None - all tests passed on first run.

## Integration Note for Plan 04 (Frontend)

The frontend `/select-plan` page (plan 04) calls:
1. `POST /subscriptions/select` with `{"plan": "free"}` for free enrollment
2. `POST /subscriptions/create-checkout-session` with `{"plan": "pro"|"agency"}` to get Stripe redirect URL

After Stripe Checkout completes, Stripe calls `POST /webhooks/stripe` which activates the subscription. The frontend success URL is `/select-plan?status=success&session_id={CHECKOUT_SESSION_ID}`.

## Next Phase Readiness

- `/subscriptions` routes live and verified — plan 05-03 (enforcement) can now use `get_current_subscription` dep
- `get_current_subscription` raises 402 with `{"code": "no_subscription"}` — enforcement plan can gate `/analyze/` and `/schedules` behind this
- All 4 target tests green; 3 enforcement tests remain xfail pending plan 05-03

---
*Phase: 05-implement-pricing-plan-selection-flow-after-signup*
*Completed: 2026-04-07*
