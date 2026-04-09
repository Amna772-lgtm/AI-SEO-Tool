# Phase 8: Admin Account — Recommended Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 08-admin-account-recommended-features
**Areas discussed:** User management, Analytics dashboard, System controls, Content moderation

---

## User Management

### Admin Account Creation

| Option | Description | Selected |
|--------|-------------|----------|
| Seed via env var | ADMIN_EMAIL env var designates an existing user as admin | |
| First-registered user | First account created automatically becomes admin | |
| CLI command | Management CLI command to promote any user to admin | |

**User's choice:** None of the above — user clarified: "create admin account manually through code, don't allow admin account creation through frontend"
**Notes:** Admin is created directly in database/code. No admin signup flow in frontend.

### User Management Actions

| Option | Description | Selected |
|--------|-------------|----------|
| View all users | Searchable/filterable table of all registered users | ✓ |
| Change user plans | Admin can upgrade/downgrade any user's plan without Stripe | ✓ |
| Delete/ban users | Admin can deactivate or permanently delete user accounts | ✓ |
| Impersonate users | Admin can switch into a user's view for debugging/support | |

**User's choice:** View all users, Change user plans, Delete/ban users
**Notes:** No impersonation in this phase.

### User Deletion Behavior

**User's choice:** Both options — Delete (hard delete, remove all data) AND Disable (soft deactivate, keep data, admin can reactivate)
**Notes:** User clarified: "admin should have both options delete and disable. In delete remove complete data as well and if disable keep data but user will be inactive after that admin can reactive the user"

### Admin UI Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Separate /admin route | Dedicated admin pages at /admin/* | ✓ |
| New tab in sidebar | Admin tab alongside existing sidebar tabs | |

**User's choice:** Separate /admin route

### Admin Panel Access

**User's choice:** Same login as regular users, backend checks role, redirects admin to /admin/dashboard
**Notes:** User clarified: "admin should be login same as other users, on backend check the role if it is admin then move to admin dashboard and all routes should be like admin/dashboard"

### Admin Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-only pages | Admin is purely for management, cannot run audits | ✓ |
| Both admin + user | Admin can switch between admin panel and regular tool | |

**User's choice:** Admin-only pages

---

## Analytics Dashboard

### Stats to Show

| Option | Description | Selected |
|--------|-------------|----------|
| User metrics | Total users, signups, active/disabled, plan distribution | ✓ |
| Audit metrics | Total audits, audits per day/week, average score, top domains | ✓ |
| Revenue metrics | Paid subscriptions, MRR, plan trends | ✓ |
| System health | Celery queue, failed jobs, audit duration, Redis memory | ✓ |

**User's choice:** All four

### Charts vs Snapshots

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot + charts | Summary cards plus line charts for trends over time | ✓ |
| Snapshot only | Just current totals and counts, no historical charts | |

**User's choice:** Snapshot + charts

---

## System Controls

### Control Capabilities

| Option | Description | Selected |
|--------|-------------|----------|
| Celery queue monitor | View/retry/cancel jobs, worker status | ✓ |
| Feature toggles | Enable/disable features site-wide | ✓ |
| API key management | View/rotate API keys from admin UI | ✓ |
| Error log viewer | View application errors in admin UI | |

**User's choice:** Celery queue monitor, Feature toggles, API key management

### Settings Storage

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite settings table | New admin_settings table, persists across restarts | ✓ |
| Redis cache | Fast access but volatile | |
| Environment variables | Write to .env, requires restart | |

**User's choice:** SQLite settings table

---

## Content Moderation

### Moderation Capabilities

| Option | Description | Selected |
|--------|-------------|----------|
| View all audits | Browse audits across all users, searchable | ✓ |
| Delete audits | Admin can delete any audit record | ✓ |
| Ban domains | Blocklist domains from being audited | ✓ |
| Rate limit overrides | Per-user quota overrides | ✓ |

**User's choice:** All four

---

## Claude's Discretion

- Admin dashboard layout and visual design
- admin_settings table schema
- Celery inspection approach
- Domain blocklist enforcement point
- Rate limit override mechanism
- Disabled user JWT session handling
- Admin sidebar/nav component design

## Deferred Ideas

- Admin audit logging — future phase
- Multi-admin role hierarchy — future phase
- Admin running audits / using regular tool — excluded
- Impersonation — excluded
- Error log viewer — not selected
- Email notifications on account actions — future phase
