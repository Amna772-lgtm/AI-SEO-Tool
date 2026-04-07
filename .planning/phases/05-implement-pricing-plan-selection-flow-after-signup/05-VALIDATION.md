---
phase: 5
slug: implement-pricing-plan-selection-flow-after-signup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | none — pytest discovers `backend/tests/` |
| **Quick run command** | `cd backend && pytest tests/test_subscriptions.py -x` |
| **Full suite command** | `cd backend && pytest tests/ -x` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pytest tests/test_subscriptions.py -x`
- **After every plan wave:** Run `cd backend && pytest tests/ -x`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-??-01 | TBD | 0 | SUB-01 | unit | `pytest tests/test_subscriptions.py::test_free_plan_creates_subscription -x` | ❌ W0 | ⬜ pending |
| 5-??-02 | TBD | 0 | SUB-02 | unit | `pytest tests/test_subscriptions.py::test_pro_plan_returns_checkout_url -x` | ❌ W0 | ⬜ pending |
| 5-??-03 | TBD | 0 | SUB-03 | unit | `pytest tests/test_subscriptions.py::test_webhook_activates_subscription -x` | ❌ W0 | ⬜ pending |
| 5-??-04 | TBD | 0 | SUB-04 | unit | `pytest tests/test_subscriptions.py::test_free_quota_exceeded -x` | ❌ W0 | ⬜ pending |
| 5-??-05 | TBD | 0 | SUB-05 | unit | `pytest tests/test_subscriptions.py::test_pro_quota_reset -x` | ❌ W0 | ⬜ pending |
| 5-??-06 | TBD | 0 | SUB-06 | unit | `pytest tests/test_subscriptions.py::test_schedules_blocked_for_free -x` | ❌ W0 | ⬜ pending |
| 5-??-07 | TBD | 0 | SUB-07 | unit | `pytest tests/test_subscriptions.py::test_webhook_invalid_signature -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_subscriptions.py` — stubs for SUB-01 through SUB-07
- [ ] `backend/tests/conftest.py` — update: add `signup_and_subscribe` fixture (creates user + subscription row in one call)

*Note: Existing test infrastructure (pytest + conftest.py) is already present from Phase 4.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout redirect opens Stripe-hosted payment page | D-08 | Requires live Stripe test keys and browser | Navigate to `/select-plan`, click "Start Pro", confirm redirect to checkout.stripe.com |
| Post-payment redirect returns to app with active subscription | D-08 | Requires Stripe test card and full browser flow | Complete Stripe Checkout with test card 4242 4242 4242 4242, confirm redirect to `/` with subscription active |
| `/select-plan` page visual design matches signup/login style | D-11 | Visual QA only | Open `/select-plan` in browser, confirm three plan cards, CSS variable colors, responsive layout |
| Upgrade modal triggered by 402 response | D-14 | Requires frontend interaction | Hit audit limit as Free user, confirm modal appears with current plan info and upgrade CTA |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
