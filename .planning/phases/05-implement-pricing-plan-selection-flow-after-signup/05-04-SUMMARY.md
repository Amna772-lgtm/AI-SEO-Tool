---
phase: 05-implement-pricing-plan-selection-flow-after-signup
plan: 04
subsystem: ui
tags: [react, nextjs, stripe, subscription, tailwindcss]

# Dependency graph
requires:
  - phase: 05-02
    provides: POST /subscriptions/select, POST /subscriptions/create-checkout-session, GET /subscriptions/me endpoints
  - phase: 05-03
    provides: 402 quota_exceeded error shape from /analyze/
provides:
  - /select-plan page with three plan cards (Free, Pro, Agency) matching UI-SPEC
  - UpgradeModal component fired by quota:exceeded CustomEvent
  - apiFetch 402 dispatch (quota:exceeded window event)
  - AuthContext subscription state and refreshSubscription helper
  - Signup post-success redirect to /select-plan (D-11)
  - Home page subscription guard redirecting to /select-plan when no subscription (D-13)
  - Stripe success polling on /select-plan?status=success
affects:
  - future phases consuming AuthContext (subscription field now available)
  - any component calling apiFetch (402 now dispatches quota:exceeded)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CustomEvent dispatch on window for cross-component communication (quota:exceeded mirrors auth:expired)
    - Event-driven modal pattern (UpgradeModal mirrors SessionExpiredModal)
    - Stripe success polling: poll /subscriptions/me up to 5 times at 1s intervals after ?status=success

key-files:
  created:
    - frontend/app/select-plan/page.tsx
    - frontend/app/components/UpgradeModal.tsx
  modified:
    - frontend/app/signup/page.tsx
    - frontend/app/lib/api.ts
    - frontend/app/lib/auth.tsx
    - frontend/app/layout.tsx
    - frontend/app/page.tsx
    - frontend/app/components/history/ScoreTrendChart.tsx

key-decisions:
  - "Subscription state loaded in AuthProvider on mount after user is confirmed — non-fatal failure (no throw, sets null)"
  - "authLoading alias used in page.tsx to avoid collision with existing crawl loading state"
  - "minHeight 44px implemented as Tailwind class min-h-[44px] on buttons for acceptance criteria compliance"
  - "Stripe success polling checks sub.plan !== 'free' to confirm paid activation, not just active status"

patterns-established:
  - "Event-driven modal: window.addEventListener on CustomEvent name, useRef focus on CTA on open, Escape closes"
  - "Subscription guard pattern: useEffect watching authLoading + user + subscription, redirect when user exists but subscription is null"

requirements-completed: [D-01, D-07, D-08, D-11, D-12, D-13, D-14]

# Metrics
duration: 5min
completed: 2026-04-07
---

# Phase 05 Plan 04: Frontend Plan Selection Flow Summary

**Three-card /select-plan page with Free enrollment, Stripe Checkout redirect, UpgradeModal on 402, and subscription guard — wiring signup through plan selection to app access**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-07T12:19:58Z
- **Completed:** 2026-04-07T12:24:57Z
- **Tasks:** 2 automated + 1 checkpoint (pending human UAT)
- **Files modified:** 8

## Accomplishments

- Built /select-plan page with 3 plan cards exactly matching 05-UI-SPEC.md (copy, colors, layout, features, CTA states)
- Created UpgradeModal component fired by quota:exceeded window event — Free user copy and Pro user copy, Escape key, focus management
- Extended apiFetch to dispatch CustomEvent("quota:exceeded") on 402 responses
- Extended AuthContext with subscription state and refreshSubscription; loaded on mount alongside user
- Changed signup success redirect from "/" to "/select-plan" (D-11)
- Added home page subscription guard (D-13): redirects to /select-plan when authenticated user has no subscription
- Added Stripe success polling on /select-plan?status=success (up to 5 retries at 1s intervals)

## Task Commits

1. **Task 1: select-plan page + api helpers + auth context + signup redirect** - `204a3b1` (feat)
2. **Task 2: UpgradeModal + layout mount + subscription guard + Stripe polling** - `158e485` (feat)
3. **Task 3: Manual UAT** - checkpoint pending

## Files Created/Modified

- `frontend/app/select-plan/page.tsx` - Three-card plan selection screen with Free enrollment, Stripe checkout redirect, subscription check on mount, Stripe success polling
- `frontend/app/components/UpgradeModal.tsx` - Quota-exceeded modal, event-driven, mirrors SessionExpiredModal, plan-aware copy
- `frontend/app/lib/api.ts` - Added 402 quota:exceeded dispatch, Subscription type, fetchSubscription, selectFreePlan, createCheckoutSession
- `frontend/app/lib/auth.tsx` - Extended AuthContext with subscription + refreshSubscription, loads subscription after user confirmed
- `frontend/app/signup/page.tsx` - Changed post-signup redirect from "/" to "/select-plan"
- `frontend/app/layout.tsx` - Added UpgradeModal alongside SessionExpiredModal
- `frontend/app/page.tsx` - Added D-13 subscription guard useEffect
- `frontend/app/components/history/ScoreTrendChart.tsx` - Fixed pre-existing TypeScript strict cast error (Rule 1)

## Decisions Made

- Subscription loaded in AuthProvider mount alongside user, non-fatal on failure (sets null, does not throw)
- `authLoading` alias used in page.tsx to avoid shadowing the page's own `loading` crawl state
- Stripe success polling checks `sub.plan !== "free"` to confirm a paid plan activated via webhook, not just any active sub
- minHeight 44px uses Tailwind class `min-h-[44px]` on buttons (not inline style) to match acceptance criteria

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript strict cast error in ScoreTrendChart.tsx**
- **Found during:** Task 1 build verification
- **Issue:** `(d as Record<string, number | undefined>)[key]` caused "Conversion may be a mistake" TS error in two locations — TypeScript strict mode rejects the cast because TrendDataPoint doesn't sufficiently overlap with Record<string, number>
- **Fix:** Changed to `(d as unknown as Record<string, number | undefined>)[key]` in both `makePath()` and the dot render loop
- **Files modified:** `frontend/app/components/history/ScoreTrendChart.tsx`
- **Verification:** `npm run build` exits 0 after fix
- **Committed in:** `204a3b1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — pre-existing bug blocking build)
**Impact on plan:** Fix was necessary to unblock TypeScript compilation. No scope creep.

## Issues Encountered

- TypeScript strict mode in Next.js 16 rejected the existing cast pattern in ScoreTrendChart.tsx — unrelated to this plan's changes but blocked the build. Fixed inline.

## Event Contracts

### quota:exceeded CustomEvent

Dispatched by `apiFetch` when any fetch returns HTTP 402.

```typescript
// Dispatch (in api.ts):
window.dispatchEvent(new CustomEvent("quota:exceeded", { detail: body }));

// body shape from /analyze/ 402 response:
{
  detail: {
    code: "quota_exceeded" | "no_subscription",
    plan: "free" | "pro",
    limit: 1 | 10,
    message: string
  }
}

// UpgradeModal reads: event.detail?.detail || event.detail
// Checks detail.plan === "pro" to select Pro-user copy vs Free-user copy
```

## Integration Checklist — Production Environment Variables Required

The following env vars must be set for the subscription flow to work end-to-end:

| Variable | Where | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | backend .env | Stripe secret key (sk_live_... or sk_test_...) |
| `STRIPE_PRICE_PRO` | backend .env | Stripe Price ID for Pro plan (price_...) |
| `STRIPE_PRICE_AGENCY` | backend .env | Stripe Price ID for Agency plan (price_...) |
| `STRIPE_WEBHOOK_SECRET` | backend .env | Webhook signing secret from Stripe Dashboard or CLI (whsec_...) |
| `STRIPE_SUCCESS_URL` | backend .env | Redirect URL after Stripe Checkout success (e.g. https://yourdomain.com/select-plan?status=success&session_id={CHECKOUT_SESSION_ID}) |
| `STRIPE_CANCEL_URL` | backend .env | Redirect URL when user cancels Stripe Checkout (e.g. https://yourdomain.com/select-plan?status=cancelled) |

## Known Stubs

None — all plan card prices ($0, $29, $99) are placeholder values. The backend plan 05-02 routes do not expose pricing; the actual Stripe product prices are configured in the Stripe Dashboard. The frontend displays static price values that should be updated to match the actual configured Stripe prices before production launch.

## Next Phase Readiness

- All automated tasks complete; frontend builds cleanly with zero TypeScript errors
- Awaiting human UAT (Task 3 checkpoint) to confirm end-to-end flow works with live backend + Stripe CLI
- Login flow (D-12): returning users skip /select-plan — this is enforced by the login page redirecting to "/" directly (not to /select-plan), which the home page subscription guard allows through because users who logged in already have a subscription row

---
*Phase: 05-implement-pricing-plan-selection-flow-after-signup*
*Completed: 2026-04-07*
