# Phase 8: Admin Account — Recommended Features - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an admin role to the existing multi-user system with a dedicated admin panel at `/admin/*`. Admin accounts are created manually in code/database (no frontend admin signup). On login, the backend checks `is_admin` — if true, the frontend redirects to `/admin/dashboard`. Admin accounts are admin-only (cannot use the regular SEO tool). The admin panel includes: user management, analytics dashboard, system controls, and content moderation.

This phase does NOT include: admin signup flow, OAuth/SSO for admin, admin audit logging (who did what), multi-admin role hierarchy (all admins are equal), or admin access to the regular SEO tool.

</domain>

<decisions>
## Implementation Decisions

### Admin Account Creation & Auth
- **D-01:** Admin accounts are created manually through code/database — no admin registration through the frontend
- **D-02:** Add `is_admin` boolean column to the existing `users` table (default false)
- **D-03:** Admin uses the same `/auth/signin` login flow as regular users — backend checks `is_admin` flag on the user record after authentication
- **D-04:** If `is_admin` is true, the `/auth/me` response includes `is_admin: true`; frontend redirects to `/admin/dashboard` instead of the main app
- **D-05:** Admin accounts are admin-only — they cannot access the regular SEO tool (no audit running, no history, no schedules)
- **D-06:** All `/admin/*` API routes require both valid JWT AND `is_admin=true` — non-admin users hitting `/admin/*` get 403

### Admin UI Structure
- **D-07:** Dedicated admin pages at `/admin/*` — separate from the main tool (not a tab in the sidebar)
- **D-08:** Admin routes: `/admin/dashboard` (analytics), `/admin/users` (user management), `/admin/system` (system controls), `/admin/moderation` (content moderation)
- **D-09:** Admin navigation link appears in the sidebar only for admin users; regular users never see it
- **D-10:** Admin panel has its own sidebar/nav layout with links to Dashboard, Users, System, Moderation

### User Management
- **D-11:** Searchable/filterable table of all registered users showing: email, name, plan, signup date, audit count, status (active/disabled)
- **D-12:** Admin can change any user's plan (Free/Pro/Agency) — manual override without Stripe
- **D-13:** Admin can **disable** a user (soft deactivate) — user can't log in, data is preserved, admin can reactivate later
- **D-14:** Admin can **delete** a user (hard delete) — removes the user and cascade-deletes all their analyses, schedules, competitor groups, and subscription data permanently
- **D-15:** No impersonation in this phase

### Analytics Dashboard
- **D-16:** User metrics: total users, new signups (daily/weekly/monthly trend), active vs disabled count, plan distribution (Free/Pro/Agency breakdown)
- **D-17:** Audit metrics: total audits run, audits per day/week trend, average score across all audits, most-audited domains
- **D-18:** Revenue metrics: active paid subscriptions count, MRR (monthly recurring revenue), plan upgrade/downgrade trends
- **D-19:** System health: Celery queue depth, failed jobs count, average audit duration, Redis memory usage
- **D-20:** Dashboard shows summary cards with current totals at top, plus line charts for trends over time (signups, audits, revenue). Recharts already available.

### System Controls
- **D-21:** Celery queue monitor: view active/pending/failed jobs, retry or cancel stuck jobs, see worker status
- **D-22:** Feature toggles: enable/disable features site-wide (e.g., disable competitor tracking, pause new signups, maintenance mode)
- **D-23:** API key management: view/rotate Google PSI and Anthropic API keys from admin UI without editing .env files
- **D-24:** Feature toggles and API keys stored in a new `admin_settings` SQLite table — persists across restarts, editable from admin UI

### Content Moderation
- **D-25:** Browse all audits across all users — searchable by domain, user, date, score
- **D-26:** Admin can delete any audit record permanently
- **D-27:** Domain blocklist: admin can ban specific domains from being audited (prevent crawler abuse)
- **D-28:** Per-user rate limit overrides: admin can give a user extra quota or throttle an abusive user below normal limits

### Claude's Discretion
- Admin dashboard layout and visual design — follow existing TailwindCSS patterns
- `admin_settings` table schema (key-value or structured columns)
- Celery inspection approach (Celery `inspect` API or direct Redis queue reads)
- Domain blocklist enforcement point (URL validator or analyze route)
- Rate limit override storage and enforcement mechanism
- How to handle disabled user's active JWT sessions (invalidate immediately or let expire naturally)
- Admin sidebar component design and navigation patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/codebase/ARCHITECTURE.md` — System architecture, request flow, data layers
- `.planning/codebase/STACK.md` — Tech stack; FastAPI, Next.js App Router, SQLite, Redis, Recharts
- `.planning/codebase/CONVENTIONS.md` — Python/TypeScript coding conventions, API route patterns
- `.planning/codebase/STRUCTURE.md` — Directory structure, file organization

### Auth & Plan Foundation (read before touching users/auth/subscriptions)
- `.planning/phases/04-add-user-authentication-with-signup-signin-session-management-and-logout/04-CONTEXT.md` — JWT cookie auth, users table schema, `get_current_user` dependency, AuthContext, route guard
- `.planning/phases/05-implement-pricing-plan-selection-flow-after-signup/05-CONTEXT.md` — Plan tiers (Free/Pro/Agency), Stripe integration, subscriptions table, quota enforcement

### Key Source Files (read before modifying)
- `backend/app/store/history_store.py` — SQLite tables (users, subscriptions, analyses, schedules, competitor_groups, competitor_sites), `init_db()`, `_add_column_if_missing()`
- `backend/app/dependencies/auth.py` — `get_current_user` FastAPI dependency; extend for admin check
- `backend/app/api/routes/auth.py` — Signin handler; `/auth/me` response needs `is_admin` field
- `backend/app/main.py` — Router mounting; mount new `/admin` router group
- `frontend/app/lib/api.ts` — API client and TypeScript types; add admin types and fetchers
- `frontend/app/lib/auth.tsx` — AuthProvider/useAuth; needs `is_admin` in user context for redirect logic
- `frontend/proxy.ts` — Next.js route guard; add `/admin/*` route protection (admin-only)
- `frontend/app/page.tsx` — Main UI shell; admin sidebar link conditional rendering
- `backend/app/worker/celery_app.py` — Celery app; for queue inspection in system controls

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `history_store.py` — All SQLite helpers live here; `init_db()` for new tables, `_add_column_if_missing()` for migrations
- `get_current_user` dependency — Extend to create `get_admin_user` that checks `is_admin=true`
- `AuthContext`/`useAuth()` — Already provides user info; add `is_admin` flag to the context
- `proxy.ts` — Route guard pattern; extend to gate `/admin/*` routes to admin-only
- Recharts — Already used by `ScoreTrendChart.tsx`; reuse for admin analytics charts
- TailwindCSS CSS variables — All UI uses `var(--accent)`, `var(--surface)`, etc.; admin pages follow same pattern
- `SessionExpiredModal` — Modal pattern reusable for admin confirmations (delete user, ban domain)

### Established Patterns
- FastAPI `Depends(get_current_user)` on all protected routes — extend with `Depends(get_admin_user)` for admin routes
- `APIRouter` in `backend/app/api/routes/` mounted in `main.py` — new admin routes follow same pattern
- `CREATE TABLE IF NOT EXISTS` in `init_db()` for new tables
- `apiFetch()` with `credentials: "include"` for all API calls
- CSS variables for consistent theming across pages

### Integration Points
- `users` table — add `is_admin BOOLEAN DEFAULT 0` column via `_add_column_if_missing()`
- `backend/app/api/routes/` — new `admin.py` (or `admin/` directory) with user management, analytics, system, moderation routes
- `backend/app/main.py` — mount admin router with `/admin` prefix
- `frontend/app/admin/` — new directory for admin pages (dashboard, users, system, moderation)
- `frontend/app/lib/auth.tsx` — add `is_admin` to user type and context
- `frontend/proxy.ts` — add admin route guard logic
- New `admin_settings` table in `history_store.py` for feature toggles and API keys
- New `banned_domains` table (or column in admin_settings) for domain blocklist

</code_context>

<specifics>
## Specific Ideas

- Admin created manually in code/DB only — never through frontend signup
- Same login page for everyone — backend differentiates by `is_admin` flag, frontend redirects accordingly
- Admin is admin-only — cannot also use the regular SEO tool
- Delete = hard delete with cascade; Disable = soft deactivate with data preserved and reactivation possible
- All admin routes under `/admin/*` pattern

</specifics>

<deferred>
## Deferred Ideas

- Admin audit logging (track who did what action and when) — future phase
- Multi-admin role hierarchy (super-admin, moderator, viewer) — future phase
- Admin access to run audits / use the regular tool — explicitly excluded
- Impersonation (admin switching into user's view) — excluded from this phase
- Error log viewer in admin UI — not selected for this phase
- Email notifications to users on account actions (disabled, plan changed) — future phase

</deferred>

---

*Phase: 08-admin-account-recommended-features*
*Context gathered: 2026-04-09*
