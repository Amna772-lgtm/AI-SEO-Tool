# Phase 5: Pricing Plan Selection Flow — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Session:** 2026-04-07
**Mode:** discuss (interactive)

---

## Areas Discussed

All four areas selected by user: Plan structure & tiers, Payment integration, Selection timing & gating, Where plan is stored.

---

## Q&A Log

### Area: Plan structure & tiers

**Q:** What pricing tiers do you want to offer?
**User input (free text):** "three-tier free(single audit, top-level scores only), pro(10 audits, full-per-page-score, actionable suggestions, scheduled re-audits), agency(unlimited audits, full-per-page-scores, white-label reports, schedule reaudits)"

**Q:** Are audit counts per month (resets monthly) or a lifetime cap?
**User input (free text):** "for free 1 audit ever and for pro it would be per month"

**Decisions captured:**
- Free: 1 audit lifetime cap, top-level scores only
- Pro: 10 audits/month (resets monthly), full per-page scores, actionable suggestions, scheduled re-audits
- Agency: unlimited, full per-page scores, white-label reports, scheduled re-audits

---

### Area: Payment integration

**Q:** Is there real payment processing in this phase, or plan selection only?
**User context:** Asked whether Stripe works locally — confirmed yes (test mode + Stripe CLI)

**Q:** Include Stripe payment flow in this phase?
**Answer:** Yes — full Stripe integration

**Q:** Which Stripe integration style?
**Answer:** Stripe Checkout (Recommended) — redirect to hosted payment page

**Decisions captured:**
- Full Stripe Checkout integration
- Free requires no payment
- Pro/Agency redirect to Stripe Checkout
- Webhook `checkout.session.completed` activates subscription
- Test keys in .env, Stripe CLI for local webhook forwarding

---

### Area: Selection timing & gating

**Q:** When is the plan selection screen shown after signup?
**Answer:** Mandatory step before app access (Recommended)

**Q:** What happens when a Free or Pro user hits their audit limit?
**Answer:** Block with upgrade prompt (Recommended) — 402 response, upgrade modal on frontend

**Decisions captured:**
- `/select-plan` shown immediately after signup, mandatory
- Returning users skip plan selection
- 402 + upgrade modal when limit exceeded

---

### Area: Where plan is stored

**Q:** How should plan/subscription data be stored?
**Answer:** Separate subscriptions table

**Decisions captured:**
- New `subscriptions` table linked to `users`
- Stores plan, Stripe customer ID, Stripe subscription ID, status, period dates, audit_count

---

## Deferred / Out of Scope (noted during discussion)

- Invoice/billing history UI
- Plan downgrade flow
- Email notifications
- Admin billing dashboard
