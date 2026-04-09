# Deferred Items — Phase 08

## Out-of-scope discoveries during plan 08-01 execution

### Pre-existing test failure: test_webhook_activates_subscription

**File:** backend/tests/test_subscriptions.py
**Test:** test_webhook_activates_subscription
**Error:** AttributeError: 'dict' object has no attribute 'data'
**Location:** backend/app/api/routes/subscriptions.py:123 — `obj = event.data.object`

**Root cause:** The test monkeypatches `stripe.Webhook.construct_event` to return a plain dict,
but the webhook route code accesses it with dot-notation (`event.data.object`, `event.type`).
The Stripe SDK returns a StripeObject (supports both dict and attribute access), but the plain
dict used in the test does not.

**Impact:** Pre-existing failure, not introduced by plan 08-01 changes. No files modified by
this plan touch subscriptions.py or test_subscriptions.py.

**Recommended fix:** Either convert `event` to a SimpleNamespace in the test, or update the
route to use `event["type"]` and `event["data"]["object"]` dict access for testability.
