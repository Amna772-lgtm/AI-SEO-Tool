---
phase: 05-implement-pricing-plan-selection-flow-after-signup
plan: "01"
subsystem: backend-persistence
tags: [subscriptions, sqlite, pydantic, stripe, testing]
dependency_graph:
  requires: []
  provides:
    - subscriptions table DDL in SQLite via history_store.init_db()
    - create_subscription / get_subscription_by_user / update_subscription / increment_audit_count / maybe_reset_pro_audit_count helpers
    - PlanSelectRequest / CheckoutRequest / SubscriptionOut Pydantic schemas
    - signup_and_subscribe pytest fixture
    - stripe>=15.0.1 declared in requirements.txt
  affects:
    - backend/app/store/history_store.py
    - backend/app/schemas/subscriptions.py
    - backend/tests/conftest.py
    - backend/tests/test_subscriptions.py
    - backend/requirements.txt
tech_stack:
  added: [stripe>=15.0.1]
  patterns:
    - SQLite CRUD with threading.Lock + _connect() pattern (consistent with existing history_store.py)
    - Pydantic v2 Literal types for strict plan validation
    - xfail(strict=False) test scaffolding — tests collected GREEN, failures become XFAIL
key_files:
  created:
    - backend/app/schemas/subscriptions.py
    - backend/tests/test_subscriptions.py
  modified:
    - backend/app/store/history_store.py
    - backend/tests/conftest.py
    - backend/requirements.txt
decisions:
  - "subscriptions table uses UNIQUE constraint on user_id (one subscription per user) enforced at DB level"
  - "CHECK constraints on plan ('free','pro','agency') and status ('active','canceled','past_due') enforce D-16/D-17 at DB level"
  - "FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE ensures referential integrity"
  - "update_subscription uses keyword-only args to prevent positional shift bugs (PIPE-04 pattern)"
  - "maybe_reset_pro_audit_count does lazy reset — called at audit time, not on a timer"
  - "signup_and_subscribe fixture bypasses HTTP route so plan 03 enforcement tests don't depend on plan 02 routes"
  - "PlanSelectRequest uses Literal['free'] — rejects pro/agency at Pydantic validation layer before any DB write"
  - "CheckoutRequest uses Literal['pro','agency'] — rejects free at validation layer"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 3
  files_changed: 5
---

# Phase 05 Plan 01: Subscription Persistence Foundation Summary

SQLite subscriptions table + CRUD helpers + Pydantic schemas + Wave 0 test scaffolding + stripe SDK dependency. All downstream plans (02 routes, 03 enforcement, 04 frontend) compile against this shared interface.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add subscriptions table DDL + CRUD helpers | a0859ad | backend/app/store/history_store.py |
| 2 | Create Pydantic schemas + stripe dependency | 80ee39e | backend/app/schemas/subscriptions.py, backend/requirements.txt |
| 3 | Wave 0 test scaffolding | 26bc68e | backend/tests/test_subscriptions.py, backend/tests/conftest.py |

## What Was Built

### Subscriptions Table (backend/app/store/history_store.py)

DDL added inside `init_db()` after the users table block:

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id                     TEXT PRIMARY KEY,
    user_id                TEXT NOT NULL UNIQUE,
    plan                   TEXT NOT NULL CHECK(plan IN ('free','pro','agency')),
    status                 TEXT NOT NULL CHECK(status IN ('active','canceled','past_due')) DEFAULT 'active',
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    current_period_start   TEXT,
    current_period_end     TEXT,
    audit_count            INTEGER NOT NULL DEFAULT 0,
    created_at             TEXT NOT NULL,
    updated_at             TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
```

### CRUD Helper Signatures

```python
create_subscription(user_id, plan, stripe_customer_id=None, stripe_subscription_id=None, current_period_start=None, current_period_end=None) -> dict
get_subscription_by_user(user_id) -> dict | None
update_subscription(user_id, *, plan=None, status=None, stripe_subscription_id=None, stripe_customer_id=None, current_period_start=None, current_period_end=None, audit_count=None) -> dict | None
increment_audit_count(user_id) -> None
maybe_reset_pro_audit_count(user_id) -> dict | None
```

### Pydantic Schema Signatures (backend/app/schemas/subscriptions.py)

```python
class PlanSelectRequest(BaseModel):
    plan: Literal["free"]  # POST /subscriptions/select — free only

class CheckoutRequest(BaseModel):
    plan: Literal["pro", "agency"]  # POST /subscriptions/create-checkout-session

class SubscriptionOut(BaseModel):
    id: str
    plan: Literal["free", "pro", "agency"]
    status: Literal["active", "canceled", "past_due"]
    audit_count: int
    current_period_end: str | None
    # classmethod: from_row(row: dict) -> SubscriptionOut
```

### Test Scaffolding Status

| Test | Requirement | Status | Green in Plan |
|------|-------------|--------|---------------|
| test_free_plan_creates_subscription | SUB-01 | xfail | 05-02 |
| test_pro_plan_returns_checkout_url | SUB-02 | xfail | 05-02 |
| test_webhook_activates_subscription | SUB-03 | xfail | 05-02 |
| test_free_quota_exceeded | SUB-04 | xfail | 05-03 |
| test_pro_quota_reset | SUB-05 | XPASSED (already green) | — |
| test_schedules_blocked_for_free | SUB-06 | xfail | 05-03 |
| test_webhook_invalid_signature | SUB-07 | xfail | 05-02 |

SUB-05 (test_pro_quota_reset) already passes because it tests `maybe_reset_pro_audit_count` directly — no HTTP route needed.

### Test Suite Result

```
27 passed, 6 xfailed, 1 xpassed in 6.70s
```

All existing Phase 04 tests continue to pass.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan is pure persistence/schema foundation with no UI rendering or data flow stubs.

## Self-Check: PASSED

- backend/app/store/history_store.py — FOUND, contains all 5 helpers and subscriptions DDL
- backend/app/schemas/subscriptions.py — FOUND, exports PlanSelectRequest, CheckoutRequest, SubscriptionOut
- backend/tests/test_subscriptions.py — FOUND, 7 tests collected
- backend/tests/conftest.py — FOUND, contains signup_and_subscribe fixture
- backend/requirements.txt — FOUND, contains stripe>=15.0.1
- Commit a0859ad — FOUND (Task 1)
- Commit 80ee39e — FOUND (Task 2)
- Commit 26bc68e — FOUND (Task 3)
