# Phase 5: Implement Pricing Plan Selection Flow After Signup - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

After a user completes signup, they are redirected to a mandatory plan selection screen before accessing the app. They choose Free, Pro, or Agency. Free is auto-enrolled with no payment. Pro and Agency trigger Stripe Checkout (hosted payment page). Once payment is confirmed (via Stripe webhook), the subscription is recorded in a new `subscriptions` table and the user is let into the app.

Plan limits are enforced at the API layer — when a user exceeds their quota, the API returns an error and the frontend shows an upgrade modal.

This phase does NOT include: admin billing dashboard, invoice history UI, email notifications, dunning management, or plan downgrade flows.

</domain>

<decisions>
## Implementation Decisions

### Plan Tiers
- **D-01:** Three tiers: Free, Pro, Agency
- **D-02:** Free — 1 audit lifetime, top-level scores only (no per-page breakdown, no actionable suggestions, no scheduled re-audits)
- **D-03:** Pro — 10 audits per month (resets monthly), full per-page scores, actionable suggestions, scheduled re-audits
- **D-04:** Agency — unlimited audits, full per-page scores, white-label reports, scheduled re-audits
- **D-05:** Free lifetime cap (not monthly) — a Free user's single audit never resets

### Payment Integration
- **D-06:** Full Stripe integration via Stripe Checkout (redirect to Stripe-hosted payment page — not embedded Elements)
- **D-07:** Free plan requires no payment — clicking "Get Started" on Free immediately records the subscription and redirects to the app
- **D-08:** Pro and Agency plans redirect to Stripe Checkout; subscription is activated on successful `checkout.session.completed` webhook
- **D-09:** Stripe test mode keys (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) stored in `.env` / environment variables — no hardcoded keys
- **D-10:** Stripe CLI used locally for webhook forwarding (`stripe listen --forward-to localhost:8000/webhooks/stripe`)

### Selection Timing & Gating
- **D-11:** Plan selection is mandatory immediately after signup — signup success redirects to `/select-plan` (not `/`); user cannot reach the dashboard without completing plan selection
- **D-12:** Existing login flow (returning users) skips plan selection — `/select-plan` is only for new signups
- **D-13:** If a user somehow has no subscription record (edge case), the app redirects them to `/select-plan` rather than breaking
- **D-14:** When a Free or Pro user hits their audit limit, the `/analyze/` API returns a 402 (Payment Required) error; the frontend shows an upgrade modal explaining the limit with a link to upgrade

### Subscription Storage
- **D-15:** Separate `subscriptions` table linked to `users` — stores plan, Stripe subscription ID, Stripe customer ID, status, current_period_start, current_period_end, audit_count (for monthly reset tracking)
- **D-16:** `subscriptions.plan` column: enum values `"free"`, `"pro"`, `"agency"`
- **D-17:** `subscriptions.status` column: `"active"`, `"canceled"`, `"past_due"` (mirrors Stripe subscription status)
- **D-18:** Audit usage tracked in `subscriptions.audit_count` (int), reset to 0 at `current_period_end` for Pro; never reset for Free

### Plan Feature Gating
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/codebase/ARCHITECTURE.md` — System architecture, request flow, data layers
- `.planning/codebase/STACK.md` — Tech stack; FastAPI, Next.js App Router, SQLite, Redis versions and patterns
- `.planning/codebase/CONVENTIONS.md` — Coding conventions for Python and TypeScript/React

### Phase 4 Auth Foundation (read before touching auth/users)
- `.planning/phases/04-add-user-authentication-with-signup-signin-session-management-and-logout/04-CONTEXT.md` — Auth decisions (JWT cookie, users table schema, AuthContext, route guard)

### Key Source Files (read before modifying)
- `backend/app/api/routes/auth.py` — Signup handler (line ~44: `window.location.href = "/"` redirect needs changing to `/select-plan`)
- `backend/app/store/history_store.py` — SQLite helpers; add subscriptions table DDL and CRUD helpers here
- `backend/app/dependencies/auth.py` — `get_current_user` dependency; extend to also attach subscription/plan info
- `frontend/app/signup/page.tsx` — Post-signup redirect (currently goes to `/`; must go to `/select-plan`)
- `frontend/app/lib/api.ts` — `apiFetch` helper; needs to handle 402 responses (quota exceeded) alongside 401
- `frontend/app/layout.tsx` — Root layout; `/select-plan` must be excluded from auth guard (or have its own guard logic)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/app/signup/page.tsx` — Pattern for full-page auth screens (centered card, CSS variables, TailwindCSS); `/select-plan` should match this visual style
- `frontend/app/components/auth/SessionExpiredModal` — Existing modal pattern; upgrade modal can follow same structure
- `frontend/app/lib/auth.tsx` — `AuthProvider` / `useAuth()` hook; plan/subscription info should be added to the auth context
- `backend/app/store/history_store.py` — All SQLite helpers live here; subscriptions table helpers follow same pattern
- `backend/app/dependencies/auth.py` — `get_current_user` FastAPI dependency; extend to load subscription alongside user

### Established Patterns
- CSS variables (`var(--accent)`, `var(--surface)`, `var(--border)`, `var(--muted)`) — all UI uses these; plan cards should too
- `apiFetch()` with `credentials: "include"` — all API calls use this; Stripe Checkout redirect is an exception (standard browser redirect)
- FastAPI `Depends(get_current_user)` on all protected routes — plan enforcement middleware can reuse this
- HTTP-only JWT cookie — user identity always available server-side

### Integration Points
- `frontend/app/signup/page.tsx` line ~40: change `window.location.href = "/"` → `window.location.href = "/select-plan"`
- `backend/app/api/routes/` — new `/subscriptions` router (or extend `/auth`) for plan selection + Stripe webhook
- `backend/app/main.py` — mount Stripe webhook route (must be unauthenticated, uses webhook secret for verification)
- `frontend/proxy.ts` (Next.js route guard) — add `/select-plan` to the list of auth-required but pre-plan routes
- `backend/app/store/history_store.py` — add `create_subscription()`, `get_subscription_by_user()`, `update_subscription()` helpers

</code_context>

<specifics>
## Specific Ideas

- Plan selection screen shows three plan cards side-by-side (or stacked on mobile) — Free card has a "Get Started Free" CTA, Pro has "Start Pro", Agency has "Start Agency"
- Free plan selection creates a `subscriptions` row immediately with `status="active"`, `stripe_subscription_id=NULL`
- Pro/Agency: backend creates a Stripe Checkout session and returns the `session.url`; frontend redirects the browser to that URL
- Stripe `success_url` should include the session ID so the webhook can match it, OR use a polling endpoint to confirm activation after return
- Upgrade modal triggered by 402 response should show current plan, limit hit, and a single CTA to the plan upgrade page

</specifics>

<deferred>
## Deferred Ideas

- Invoice / billing history UI — future phase
- Plan downgrade flow — future phase
- Email notifications (welcome email, payment receipts, expiry warnings) — future phase
- Admin billing dashboard — future phase
- Dunning management (failed payment retries) — Stripe handles automatically, no custom logic needed yet

</deferred>

---

*Phase: 05-implement-pricing-plan-selection-flow-after-signup*
*Context gathered: 2026-04-07*
