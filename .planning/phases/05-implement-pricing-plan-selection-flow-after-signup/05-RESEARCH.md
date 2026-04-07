# Phase 05: Implement Pricing Plan Selection Flow After Signup - Research

**Researched:** 2026-04-07
**Domain:** Stripe Checkout (subscription billing), FastAPI webhooks, Next.js route gating, SQLite schema extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Three tiers: Free, Pro, Agency
- **D-02:** Free — 1 audit lifetime, top-level scores only (no per-page breakdown, no actionable suggestions, no scheduled re-audits)
- **D-03:** Pro — 10 audits per month (resets monthly), full per-page scores, actionable suggestions, scheduled re-audits
- **D-04:** Agency — unlimited audits, full per-page scores, white-label reports, scheduled re-audits
- **D-05:** Free lifetime cap (not monthly) — a Free user's single audit never resets
- **D-06:** Full Stripe integration via Stripe Checkout (redirect to Stripe-hosted payment page — not embedded Elements)
- **D-07:** Free plan requires no payment — clicking "Get Started" on Free immediately records the subscription and redirects to the app
- **D-08:** Pro and Agency plans redirect to Stripe Checkout; subscription is activated on successful `checkout.session.completed` webhook
- **D-09:** Stripe test mode keys (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) stored in `.env` / environment variables — no hardcoded keys
- **D-10:** Stripe CLI used locally for webhook forwarding (`stripe listen --forward-to localhost:8000/webhooks/stripe`)
- **D-11:** Plan selection is mandatory immediately after signup — signup success redirects to `/select-plan` (not `/`); user cannot reach the dashboard without completing plan selection
- **D-12:** Existing login flow (returning users) skips plan selection — `/select-plan` is only for new signups
- **D-13:** If a user somehow has no subscription record (edge case), the app redirects them to `/select-plan` rather than breaking
- **D-14:** When a Free or Pro user hits their audit limit, the `/analyze/` API returns a 402 (Payment Required) error; the frontend shows an upgrade modal explaining the limit with a link to upgrade
- **D-15:** Separate `subscriptions` table linked to `users` — stores plan, Stripe subscription ID, Stripe customer ID, status, current_period_start, current_period_end, audit_count (for monthly reset tracking)
- **D-16:** `subscriptions.plan` column: enum values `"free"`, `"pro"`, `"agency"`
- **D-17:** `subscriptions.status` column: `"active"`, `"canceled"`, `"past_due"` (mirrors Stripe subscription status)
- **D-18:** Audit usage tracked in `subscriptions.audit_count` (int), reset to 0 at `current_period_end` for Pro; never reset for Free
- **D-19:** Per-page scores returned by the API only if user's plan is Pro or Agency — Free users receive null/omitted per-page data
- **D-20:** Actionable suggestions (GEO recommendations) returned only for Pro and Agency
- **D-21:** Scheduled re-audits (schedules feature) blocked at API level for Free users — POST /schedules returns 403 with upgrade message
- **D-22:** White-label PDF reports (Agency only) — Free and Pro users get standard-branded reports only

### Claude's Discretion

- Exact Stripe Checkout session creation parameters (success_url, cancel_url, mode)
- Price IDs for Pro and Agency plans (created in Stripe dashboard during setup)
- `subscriptions` table DDL (column types, indexes, foreign key constraints)
- `/select-plan` page visual design — follow existing TailwindCSS + CSS variable patterns from signup/login pages
- Upgrade modal component design — consistent with existing modal patterns (SessionExpiredModal)
- How to handle the `cancel_url` for Stripe Checkout (redirect back to `/select-plan` so user can pick again)

### Deferred Ideas (OUT OF SCOPE)

- Invoice / billing history UI — future phase
- Plan downgrade flow — future phase
- Email notifications (welcome email, payment receipts, expiry warnings) — future phase
- Admin billing dashboard — future phase
- Dunning management (failed payment retries) — Stripe handles automatically, no custom logic needed yet
</user_constraints>

---

## Summary

This phase wires a mandatory subscription selection step into the post-signup flow. Three functional areas must work together: (1) the plan selection UI (`/select-plan`), (2) a backend `/subscriptions` router that handles Free enrollment, Stripe Checkout session creation, and the Stripe webhook, and (3) plan limit enforcement injected into every protected API route.

The backend is FastAPI + synchronous route handlers + SQLite (WAL mode). The existing pattern is `Depends(get_current_user)` on every protected route. The plan is to load the subscription alongside the user in that dependency and expose a `get_current_subscription` helper. The frontend uses HTTP-only JWT cookie auth, a Next.js `middleware.ts` route guard, and TailwindCSS with CSS variables. The `apiFetch` helper already handles 401; it needs to be extended to handle 402 (quota exceeded).

Stripe Checkout (hosted redirect, not embedded Elements) is the right choice for this scope — it requires no PCI compliance burden on the app, needs only the Python `stripe` SDK on the backend (no frontend Stripe.js for the checkout flow itself), and the entire subscription lifecycle is confirmed via webhook.

**Primary recommendation:** Use `stripe>=15.0.0` (latest verified), create the Stripe Checkout session in `mode="subscription"` with `client_reference_id=user_id`, and activate the subscription row exclusively from the `checkout.session.completed` webhook — never from the success_url redirect.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (Python) | 15.0.1 (verified via pip) | Create Checkout sessions, verify webhook signatures | Official Stripe SDK; no hand-rolled HTTP calls |
| FastAPI | >=0.100.0 (already installed) | Webhook route (raw body required) | Already in stack |
| SQLite (via stdlib sqlite3) | stdlib | subscriptions table | Already in stack; WAL mode already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| stripe (npm) | 22.0.0 (verified via npm view) | Not needed for Checkout redirect flow | Only needed if using embedded Elements later |
| @stripe/stripe-js | 9.1.0 (verified via npm view) | Not needed for Checkout redirect flow | Only needed if using embedded Elements later |

**Both npm Stripe packages are NOT needed for this phase.** The hosted Checkout redirect is a pure server-side URL redirect — no Stripe.js on the frontend.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Stripe Elements (embedded) | Elements requires stripe-js, PCI SAQ A-EP, more frontend work — out of scope (D-06 locked) |
| `checkout.session.completed` webhook activation | Polling after success_url | Polling is unreliable (user closes tab) and creates race conditions — webhook is the only correct approach |

**Installation (backend only):**
```bash
pip install stripe>=15.0.1
```
Add to `backend/requirements.txt`:
```
stripe>=15.0.1
```

---

## Architecture Patterns

### Recommended Project Structure

New files to add:

```
backend/app/
├── api/routes/
│   └── subscriptions.py        # /subscriptions router (plan select + webhook)
├── schemas/
│   └── subscriptions.py        # Pydantic models: PlanSelectRequest, SubscriptionOut
└── store/
    └── history_store.py        # ADD: create_subscription(), get_subscription_by_user(),
                                #      update_subscription(), increment_audit_count()

frontend/app/
├── select-plan/
│   └── page.tsx                # /select-plan page (plan cards, "Get Started"/"Start Pro" CTAs)
├── components/
│   └── UpgradeModal.tsx        # 402 upgrade modal (mirrors SessionExpiredModal structure)
└── lib/
    └── api.ts                  # ADD: selectFreePlan(), createCheckoutSession(),
                                #      fetchSubscription() helpers; extend apiFetch for 402
```

### Pattern 1: `subscriptions` Table DDL

**What:** New SQLite table in `history_store.py` `init_db()` alongside existing `users`, `analyses`, `schedules`.

**When to use:** All subscription persistence goes here.

```python
# Source: existing history_store.py pattern, adapted for subscriptions
conn.executescript("""
    CREATE TABLE IF NOT EXISTS subscriptions (
        id                   TEXT PRIMARY KEY,
        user_id              TEXT NOT NULL UNIQUE,
        plan                 TEXT NOT NULL CHECK(plan IN ('free','pro','agency')),
        status               TEXT NOT NULL CHECK(status IN ('active','canceled','past_due'))
                             DEFAULT 'active',
        stripe_customer_id   TEXT,
        stripe_subscription_id TEXT,
        current_period_start TEXT,
        current_period_end   TEXT,
        audit_count          INTEGER NOT NULL DEFAULT 0,
        created_at           TEXT NOT NULL,
        updated_at           TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
""")
```

Key design notes:
- `user_id UNIQUE` — one subscription per user (no multiple rows)
- `stripe_customer_id` and `stripe_subscription_id` are NULL for Free plan users
- `audit_count` int, reset to 0 when `current_period_end` is passed (Pro only)

### Pattern 2: `get_current_user` Extension

**What:** Extend `backend/app/dependencies/auth.py` to also return the subscription alongside the user, or add a separate `get_current_subscription` dependency.

**When to use:** Any route that needs plan enforcement.

Recommended: Add `get_current_subscription` as a separate dependency that calls `get_subscription_by_user(user_id)` so routes can `Depends(get_current_subscription)` independently.

```python
# backend/app/dependencies/auth.py addition
from app.store.history_store import get_subscription_by_user

def get_current_subscription(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the subscription row for the current user. Raises 402 if no subscription."""
    sub = get_subscription_by_user(current_user["id"])
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "no_subscription", "message": "Plan selection required."},
        )
    return sub
```

### Pattern 3: Stripe Checkout Session Creation

**What:** Backend creates a Checkout session and returns the URL; frontend does a full-page redirect (not fetch).

**When to use:** When user clicks "Start Pro" or "Start Agency" on `/select-plan`.

```python
# backend/app/api/routes/subscriptions.py
import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.post("/create-checkout-session")
def create_checkout_session(
    body: PlanSelectRequest,  # plan: "pro" | "agency"
    current_user: dict = Depends(get_current_user),
):
    price_id = (
        os.getenv("STRIPE_PRICE_PRO") if body.plan == "pro"
        else os.getenv("STRIPE_PRICE_AGENCY")
    )
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        customer_email=current_user["email"],
        client_reference_id=current_user["id"],  # links session back to user_id
        success_url="http://localhost:3000/select-plan?status=success",
        cancel_url="http://localhost:3000/select-plan?status=cancelled",
    )
    return {"checkout_url": session.url}
```

Frontend side: receive `checkout_url` and do `window.location.href = checkout_url`. This is a plain browser redirect — no apiFetch needed for the redirect itself.

### Pattern 4: Stripe Webhook Handler (FastAPI raw body)

**What:** FastAPI route at `/webhooks/stripe` that reads raw bytes (required for signature verification), verifies the event, and activates the subscription.

**Critical:** Stripe signature verification requires the raw, un-parsed request body. FastAPI's `Request.body()` returns raw bytes correctly. This route must NOT use a Pydantic body model (which would parse and re-serialize the body).

```python
# backend/app/api/routes/subscriptions.py
import stripe
from fastapi import APIRouter, HTTPException, Request

WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(request: Request):
    payload = await request.body()          # raw bytes — do NOT use body: dict
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        stripe_sub_id = session.get("subscription")
        stripe_cust_id = session.get("customer")
        plan = _plan_from_session(session)   # derive from price metadata or lookup
        if user_id:
            activate_subscription(user_id, plan, stripe_sub_id, stripe_cust_id)
    return {"status": "ok"}
```

**Mounting note:** The webhook route must be mounted WITHOUT auth (`Depends(get_current_user)` must NOT be applied). Mount it at a path included in middleware's PUBLIC_PATHS or as its own router prefix excluded from auth.

The route `async def stripe_webhook` uses `async def` because `await request.body()` is async — this is the ONE exception to the project's sync-route pattern (confirmed in CONVENTIONS.md: "Route handlers are synchronous functions" but this must be async for raw body).

### Pattern 5: Plan Enforcement in `/analyze/`

**What:** Check subscription quota before dispatching the crawl job.

```python
# backend/app/api/routes/analyze.py addition
from app.dependencies.auth import get_current_subscription
from app.store.history_store import get_subscription_by_user, increment_audit_count
from datetime import datetime, timezone

@router.post("/")
def analyze_site(
    request: AnalyzeRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    sub = get_subscription_by_user(current_user["id"])
    if not sub:
        raise HTTPException(status_code=402, detail={"code": "no_subscription"})

    plan = sub["plan"]
    # Free: lifetime cap of 1
    if plan == "free" and sub["audit_count"] >= 1:
        raise HTTPException(
            status_code=402,
            detail={"code": "quota_exceeded", "plan": "free", "limit": 1},
        )
    # Pro: monthly cap of 10 (reset at current_period_end)
    if plan == "pro":
        _maybe_reset_pro_count(sub)   # reset if period rolled over
        sub = get_subscription_by_user(current_user["id"])  # re-fetch after reset
        if sub["audit_count"] >= 10:
            raise HTTPException(
                status_code=402,
                detail={"code": "quota_exceeded", "plan": "pro", "limit": 10},
            )
    # Agency: no cap
    # ... proceed with crawl, increment count
    increment_audit_count(current_user["id"])
    # ... rest of existing analyze logic
```

### Pattern 6: `apiFetch` 402 Handling

**What:** Extend the existing `apiFetch` helper in `frontend/app/lib/api.ts` to dispatch a `quota:exceeded` event on 402, parallel to the existing `auth:expired` dispatch on 401.

```typescript
// frontend/app/lib/api.ts — apiFetch extension
if (res.status === 402 && typeof window !== "undefined") {
  const body = await res.clone().json().catch(() => ({}));
  window.dispatchEvent(new CustomEvent("quota:exceeded", { detail: body }));
}
```

The `UpgradeModal` component listens for `quota:exceeded` and shows the modal — same event-driven pattern as `SessionExpiredModal` listening for `auth:expired`.

### Pattern 7: Next.js Middleware for `/select-plan` Gating

**What:** `frontend/middleware.ts` currently has `PUBLIC_PATHS = ["/login", "/signup"]`. `/select-plan` must be auth-required (user must be logged in to reach it) but plan-selection-exempt (user has no subscription yet). The middleware cannot check subscription status (no DB access in Edge runtime), so the gating is handled client-side on the `/select-plan` page itself.

```typescript
// frontend/middleware.ts — add /select-plan to public list is WRONG
// /select-plan needs auth cookie present (user must be logged in)
// So it stays behind the existing token check — NO change to PUBLIC_PATHS needed.
// The page itself checks: if user already has a subscription, redirect to /
```

The `/select-plan` page's `useEffect` should call `fetchSubscription()` on mount: if subscription exists and is active, redirect to `/`. If the user has no cookie (unauthenticated), middleware already redirects to `/login`.

For the D-13 edge case (authenticated user has no subscription record), the main app page (`/`) should also check subscription status and redirect to `/select-plan` if missing.

### Anti-Patterns to Avoid

- **Activating subscription from success_url:** The `success_url` redirect fires in the browser — the user could close the tab before it loads, leaving them with a paid Stripe subscription but no app record. Activation MUST happen only in the webhook.
- **Passing Pydantic body model to webhook handler:** FastAPI parses JSON bodies into Python objects, which re-serializes differently, breaking Stripe's HMAC signature verification. Use `Request` object and `await request.body()` directly.
- **Hardcoding price IDs:** Price IDs go in `.env` as `STRIPE_PRICE_PRO` and `STRIPE_PRICE_AGENCY`. They look like `price_1AbcDef...` and are created in the Stripe dashboard.
- **Blocking the webhook route with auth middleware:** The Stripe webhook sends no auth cookie. The webhook endpoint must be unauthenticated — use webhook secret verification instead.
- **Using SQLite `REFERENCES` in `ALTER TABLE ADD COLUMN`:** The existing codebase uses `_add_column_if_missing` with no FK clause for this reason (SQLite restriction). The `subscriptions` table is created fresh in `init_db()` `CREATE TABLE IF NOT EXISTS` so FK syntax is allowed there.
- **Applying `get_current_subscription` to the `/webhooks/stripe` route:** The webhook is Stripe-to-backend, not user-to-backend. It has no auth cookie. Never apply `get_current_user` to it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form | Custom credit card input | Stripe Checkout (hosted) | PCI compliance, card validation, 3DS, Apple/Google Pay — all free with hosted checkout |
| Webhook signature verification | Parse headers manually | `stripe.Webhook.construct_event()` | Timing-safe HMAC comparison, replay attack prevention, Stripe SDK handles it |
| Stripe API calls | Raw httpx calls to api.stripe.com | `stripe` Python SDK | Type safety, automatic retries, error object hierarchy |
| Monthly period reset logic | Cron job or Beat task | Read `current_period_end` from `checkout.session.completed` payload | Stripe sets the period; read it from the webhook, don't compute it independently |

**Key insight:** Stripe handles all payment state. The app's job is only to record what Stripe tells it via webhooks. Never derive subscription state from the success URL.

---

## Common Pitfalls

### Pitfall 1: Webhook Route Behind Auth Guard
**What goes wrong:** Stripe's POST to `/webhooks/stripe` gets redirected to `/login` by `middleware.ts` because it has no auth cookie.
**Why it happens:** `middleware.ts` checks ALL routes except `PUBLIC_PATHS`. Stripe's server has no cookie.
**How to avoid:** Either add `/webhooks/stripe` to `PUBLIC_PATHS` in `middleware.ts` (only the cookie check is there, not the Stripe secret check), OR mount it at a dedicated path the middleware ignores. The webhook verifies authenticity via `STRIPE_WEBHOOK_SECRET`, so allowing it through middleware is safe.
**Warning signs:** Stripe dashboard shows `302` or `401` responses for webhook deliveries.

### Pitfall 2: Race Condition — Success URL vs Webhook
**What goes wrong:** User is redirected to `success_url` before the `checkout.session.completed` webhook arrives. Frontend polls `/auth/me` or `/subscriptions/me` and finds no subscription yet — shows an error.
**Why it happens:** Webhooks have slight propagation delay (typically < 2 seconds, but not instant).
**How to avoid:** On the success URL landing (`/select-plan?status=success`), the frontend should poll `/subscriptions/me` with up to 5 retries / 1s delay, showing a "Confirming your subscription..." spinner until the webhook activates the subscription.
**Warning signs:** Users completing payment see "no subscription" briefly then it resolves.

### Pitfall 3: Stripe CLI Not Installed
**What goes wrong:** D-10 specifies `stripe listen --forward-to localhost:8000/webhooks/stripe` for local dev, but the Stripe CLI is not currently installed on the development machine (verified: `stripe --version` returns "not found").
**Why it happens:** Stripe CLI is a separate install; it's not a pip or npm package.
**How to avoid:** The plan must include a Wave 0 step for installing the Stripe CLI. Alternatively, use Stripe's webhook testing dashboard or the `stripe trigger` command. For testing webhooks in automated tests, use `stripe.Webhook.construct_event` with a known test payload and test secret.
**Warning signs:** Webhook events not received during local development.

### Pitfall 4: `async def` Route in a Sync Codebase
**What goes wrong:** The project convention is synchronous FastAPI routes (`def`, not `async def`). The webhook handler MUST be `async def` to call `await request.body()`. Mixing them incorrectly can cause confusion.
**Why it happens:** The async/sync distinction in FastAPI is real — sync routes run in a thread pool, async routes run on the event loop.
**How to avoid:** Only the webhook handler should be `async def`. All other new subscription routes follow the project pattern and use sync `def`.
**Warning signs:** `RuntimeError: no running event loop` if `await` is called in a sync route.

### Pitfall 5: Pro Quota Reset Timing
**What goes wrong:** Pro users' `audit_count` never resets because `current_period_end` is a stored string and the comparison is never triggered.
**Why it happens:** Stripe sends a `customer.subscription.updated` or `invoice.paid` webhook each billing cycle — but the current phase only listens to `checkout.session.completed`. For simplicity, the period-end is stored and the reset can be done lazily (on the next audit request, check if `current_period_end < now`).
**How to avoid:** In `analyze.py` quota check, before comparing `audit_count`, check if `current_period_end` has passed and reset `audit_count = 0` if so. This lazy reset avoids needing a periodic task.
**Warning signs:** Pro users stuck at 10 even after their billing period renews.

### Pitfall 6: Free Plan `select-plan` Re-entry
**What goes wrong:** A Free user who has exhausted their 1 audit visits `/select-plan` to upgrade and accidentally triggers another Free enrollment, resetting their subscription record.
**Why it happens:** The `/subscriptions/select` endpoint doesn't check if a subscription already exists.
**How to avoid:** `POST /subscriptions/select` checks `get_subscription_by_user(user_id)` — if a subscription exists and plan is `free`, reject with a 409 directing to upgrade. Only allow re-selection if upgrading to a paid plan.

---

## Code Examples

### subscriptions table helpers (follows existing history_store.py pattern)

```python
# backend/app/store/history_store.py — additions

def create_subscription(
    user_id: str,
    plan: str,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    current_period_start: str | None = None,
    current_period_end: str | None = None,
) -> dict[str, Any]:
    sub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO subscriptions
                    (id, user_id, plan, status, stripe_customer_id,
                     stripe_subscription_id, current_period_start,
                     current_period_end, audit_count, created_at, updated_at)
                VALUES (?, ?, ?, 'active', ?, ?, ?, ?, 0, ?, ?)
                """,
                (sub_id, user_id, plan, stripe_customer_id,
                 stripe_subscription_id, current_period_start,
                 current_period_end, now, now),
            )
            conn.commit()
        finally:
            conn.close()
    return get_subscription_by_user(user_id)


def get_subscription_by_user(user_id: str) -> dict[str, Any] | None:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM subscriptions WHERE user_id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_subscription(
    user_id: str,
    *,
    plan: str | None = None,
    status: str | None = None,
    stripe_subscription_id: str | None = None,
    stripe_customer_id: str | None = None,
    current_period_start: str | None = None,
    current_period_end: str | None = None,
    audit_count: int | None = None,
) -> dict[str, Any] | None:
    """Keyword-only partial update — follows generate_suggestions() pattern (PIPE-04 decision)."""
    current = get_subscription_by_user(user_id)
    if not current:
        return None
    new_plan = plan if plan is not None else current["plan"]
    new_status = status if status is not None else current["status"]
    # ... etc
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """UPDATE subscriptions SET plan=?, status=?, stripe_subscription_id=?,
                   stripe_customer_id=?, current_period_start=?, current_period_end=?,
                   audit_count=?, updated_at=? WHERE user_id=?""",
                (new_plan, new_status, stripe_subscription_id or current["stripe_subscription_id"],
                 stripe_customer_id or current["stripe_customer_id"],
                 current_period_start or current["current_period_start"],
                 current_period_end or current["current_period_end"],
                 audit_count if audit_count is not None else current["audit_count"],
                 now, user_id),
            )
            conn.commit()
        finally:
            conn.close()
    return get_subscription_by_user(user_id)


def increment_audit_count(user_id: str) -> None:
    """Atomically increment audit_count for the user's subscription."""
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE subscriptions SET audit_count = audit_count + 1, updated_at = ? WHERE user_id = ?",
                (datetime.now(timezone.utc).isoformat(), user_id),
            )
            conn.commit()
        finally:
            conn.close()
```

### `/select-plan` page structure (TailwindCSS + CSS variables, matches signup/page.tsx)

```typescript
// frontend/app/select-plan/page.tsx — structure outline
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { selectFreePlan, createCheckoutSession, fetchSubscription } from "../lib/api";
import { useAuth } from "../lib/auth";

const PLANS = [
  { id: "free", name: "Free", price: "$0", cta: "Get Started Free",
    features: ["1 audit (lifetime)", "Top-level scores only"] },
  { id: "pro", name: "Pro", price: "$XX/mo", cta: "Start Pro",
    features: ["10 audits/month", "Full per-page scores", "Actionable suggestions", "Scheduled re-audits"] },
  { id: "agency", name: "Agency", price: "$XX/mo", cta: "Start Agency",
    features: ["Unlimited audits", "Full per-page scores", "White-label reports", "Scheduled re-audits"] },
] as const;
```

### UpgradeModal (mirrors SessionExpiredModal pattern)

```typescript
// frontend/app/components/UpgradeModal.tsx — event listener pattern
useEffect(() => {
  function handleQuotaExceeded(e: Event) {
    const detail = (e as CustomEvent).detail;
    setQuotaDetail(detail);
    setOpen(true);
  }
  window.addEventListener("quota:exceeded", handleQuotaExceeded);
  return () => window.removeEventListener("quota:exceeded", handleQuotaExceeded);
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe.js embedded Elements | Stripe Checkout (hosted) | ~2019 | Hosted checkout handles 3DS, Apple Pay, international cards automatically |
| `stripe.checkout.Session.create()` class method | Same (still the standard API) | — | No change needed |
| `construct_event` with `body.decode()` | Pass raw bytes directly | stripe-python v3+ | SDK accepts bytes, no decode needed |

**No deprecated patterns apply to this phase.** The `stripe.Webhook.construct_event` pattern and `stripe.checkout.Session.create` with `mode="subscription"` are both current as of stripe-python 15.0.1 (verified 2026-04-07).

---

## Open Questions

1. **Stripe Price IDs for Pro and Agency**
   - What we know: Price IDs must be created in the Stripe dashboard (test mode) before the webhook can be tested end-to-end.
   - What's unclear: The specific dollar amounts for Pro and Agency were not specified in CONTEXT.md (left to Claude's discretion).
   - Recommendation: Plan Wave 0 should include a setup step: "Create Pro and Agency recurring prices in Stripe test dashboard; store as `STRIPE_PRICE_PRO` and `STRIPE_PRICE_AGENCY` in `.env`." Prices can be placeholder amounts ($9/mo Pro, $29/mo Agency) for the test phase.

2. **Deriving plan from `checkout.session.completed` event**
   - What we know: The session contains `line_items` but fetching them requires an extra Stripe API call (`stripe.checkout.Session.retrieve(id, expand=["line_items"])`).
   - What's unclear: Whether to expand line_items or use session metadata.
   - Recommendation: When creating the checkout session, pass `metadata={"plan": "pro"}` (or "agency"). The webhook reads `session["metadata"]["plan"]` to determine which plan to activate — no extra API call needed.

3. **`/select-plan` route in middleware.ts**
   - What we know: The middleware currently blocks all non-`/login`/`/signup` routes without a cookie. `/select-plan` requires auth (user must be logged in). Stripe's webhook has no cookie.
   - What's unclear: Whether the webhook endpoint is affected by the middleware.
   - Recommendation: Add `/webhooks` (or `/webhooks/stripe`) to `PUBLIC_PATHS` in `middleware.ts`. The webhook is secured by `STRIPE_WEBHOOK_SECRET`, not by the cookie. Do NOT add `/select-plan` to `PUBLIC_PATHS` — it should require an auth cookie.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| stripe (Python pip) | Backend Checkout + webhook | Installable | 15.0.1 (latest) | None — required |
| Stripe CLI | Local webhook forwarding (D-10) | NOT INSTALLED | — | Use Stripe dashboard webhook test UI; or skip local webhook testing in CI |
| STRIPE_SECRET_KEY | Backend session creation | Not in .env yet | — | Plan must include Wave 0 step to add test keys |
| STRIPE_WEBHOOK_SECRET | Webhook signature verification | Not in .env yet | — | Plan must include Wave 0 step |
| STRIPE_PRICE_PRO / STRIPE_PRICE_AGENCY | Session creation | Not created yet | — | Plan must include Wave 0 step: create prices in Stripe dashboard |
| SQLite (stdlib) | subscriptions table | Built-in Python | 3.x | None needed |
| Next.js middleware.ts | Route gating | Already installed (confirmed) | 16.1.6 | None needed |

**Missing dependencies with no fallback:**
- `stripe` Python package must be added to `requirements.txt` and installed in the backend container
- Stripe test mode API keys must be obtained from the Stripe dashboard and added to `.env`
- Stripe price IDs for Pro and Agency must be created in the Stripe test dashboard

**Missing dependencies with fallback:**
- Stripe CLI: not installed locally; during development, Stripe's hosted webhook test tool or manual test scripts (using `stripe.Webhook.construct_event` with a known payload and test secret) can substitute. Plan should flag this for the human to install if they want live-forwarding during dev.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 7.x |
| Config file | none (pytest discovers `backend/tests/`) |
| Quick run command | `cd backend && pytest tests/test_subscriptions.py -x` |
| Full suite command | `cd backend && pytest tests/ -x` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUB-01 | Free plan enrollment creates subscriptions row | unit | `pytest tests/test_subscriptions.py::test_free_plan_creates_subscription -x` | Wave 0 |
| SUB-02 | Pro plan returns checkout_url | unit | `pytest tests/test_subscriptions.py::test_pro_plan_returns_checkout_url -x` | Wave 0 |
| SUB-03 | Stripe webhook activates pro subscription | unit | `pytest tests/test_subscriptions.py::test_webhook_activates_subscription -x` | Wave 0 |
| SUB-04 | 402 returned when Free user exceeds 1 audit | unit | `pytest tests/test_subscriptions.py::test_free_quota_exceeded -x` | Wave 0 |
| SUB-05 | Pro user's monthly count resets after period_end | unit | `pytest tests/test_subscriptions.py::test_pro_quota_reset -x` | Wave 0 |
| SUB-06 | /schedules POST returns 403 for Free user | unit | `pytest tests/test_subscriptions.py::test_schedules_blocked_for_free -x` | Wave 0 |
| SUB-07 | Unauthenticated webhook request rejected (bad sig) | unit | `pytest tests/test_subscriptions.py::test_webhook_invalid_signature -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && pytest tests/test_subscriptions.py -x`
- **Per wave merge:** `cd backend && pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_subscriptions.py` — covers SUB-01 through SUB-07
- [ ] conftest.py update: add `signup_and_subscribe` fixture (creates user + subscription row in one call)

---

## Project Constraints (from CLAUDE.md)

The CLAUDE.md describes the system architecture but contains no explicit coding directives beyond what is already captured in `.planning/codebase/CONVENTIONS.md`. The relevant actionable constraints:

- Backend routes are synchronous (`def`) — the Stripe webhook handler is the ONLY exception (`async def` required for `await request.body()`)
- All SQLite helpers follow the `_lock` + `_connect()` + `try/finally conn.close()` pattern from `history_store.py`
- Error handling uses `raise HTTPException(status_code=..., detail=...)` — never bare `except: pass`
- Frontend uses TailwindCSS v4 + CSS variables (`var(--accent)`, `var(--surface)`, `var(--border)`, `var(--muted)`, `var(--foreground)`, `var(--surface-elevated)`, `var(--error)`) — no inline hex colors
- `apiFetch()` with `credentials: "include"` for all API calls — Stripe redirect is a `window.location.href` assignment (not a fetch)
- `"use client"` directive required on all interactive React components
- No hardcoded secrets — `os.getenv("STRIPE_SECRET_KEY")` pattern only
- TypeScript strict mode — all new types must be fully typed, no `any` unless unavoidable

---

## Sources

### Primary (HIGH confidence)
- Stripe API reference (docs.stripe.com/api/checkout/sessions/create) — checkout session parameters, client_reference_id, metadata
- Stripe webhooks docs (docs.stripe.com/webhooks) — construct_event pattern, raw body requirement
- pip registry — stripe 15.0.1 verified current as of 2026-04-07
- npm registry — stripe 22.0.0, @stripe/stripe-js 9.1.0 verified current as of 2026-04-07
- Existing codebase — history_store.py, dependencies/auth.py, middleware.ts, api.ts, SessionExpiredModal.tsx read directly

### Secondary (MEDIUM confidence)
- Frank-Mich FastAPI Stripe webhook template (blog.frank-mich.com) — FastAPI raw body pattern cross-verified with official Stripe docs

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stripe package versions verified via pip/npm registries
- Architecture: HIGH — all integration points read from actual source files
- Pitfalls: HIGH — derived from Stripe official docs + codebase analysis (middleware, sync routes, SQLite pattern)
- Environment: HIGH — Stripe CLI absence verified via `stripe --version`

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (Stripe SDK API is stable; middleware.ts patterns are pinned to Next.js 16.1.6)
