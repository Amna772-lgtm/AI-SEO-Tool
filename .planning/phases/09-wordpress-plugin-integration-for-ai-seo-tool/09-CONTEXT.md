# Phase 9: WordPress Plugin Integration for AI SEO Tool - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a WordPress plugin called "AI SEO Tool" that allows WordPress site owners to connect to their existing AI SEO Tool account (via API key), trigger a full GEO citation readiness audit of their WordPress site, and view the results entirely within the WordPress admin.

This phase also includes adding API key generation to the existing tool (new account settings page + backend endpoint).

This phase does NOT include: Gutenberg sidebar per-page scoring, scheduled auto-audits from within WordPress, white-label/multi-site WordPress network support, or competitor tracking within the WordPress plugin.

</domain>

<decisions>
## Implementation Decisions

### Plugin Role & UX Flow
- **D-01:** The plugin has two screens:
  1. **Connection screen** — User enters their API key (obtained from their AI SEO Tool account settings). On successful connection, transitions to the dashboard screen.
  2. **Dashboard screen** — Shows: remaining plan quota, profile info, usage stats, audit history, and an "Analyze" button.
- **D-02:** When user clicks "Analyze", the plugin sends the API key + current WordPress site URL to the existing `/analyze/` endpoint. The full GEO crawl pipeline runs as normal. Results are displayed inside WordPress admin.
- **D-03:** No separate data store in the plugin — all data comes from the AI SEO Tool backend API.

### WordPress Admin Navigation
- **D-04:** Plugin registers as a **top-level menu item** in the WordPress admin sidebar, labeled "AI SEO Tool".
- **D-05:** Sub-pages under the top-level item: Dashboard, GEO Analysis, Technical Audit, History, Settings (API key management).

### Results Display — Tabs to Rebuild in WordPress
- **D-06:** Four tabs are rebuilt inside WordPress admin:
  1. **Dashboard** — Overall GEO score ring, status code distribution, indexability summary, pages table
  2. **GEO Analysis** — AI Citation Score, per-engine scores, suggestions panel, and all 7 GEO sub-tabs (Schema, Content, E-E-A-T, NLP, Visibility, Entity, Pages)
  3. **Technical Audit** — HTTPS status, sitemap detection, broken links, missing canonicals, security headers checklist, PageSpeed scores
  4. **History** — List of past analyses with scores and trend chart
- **D-07:** A "View Full Report" link in each tab links back to the full AI SEO Tool web app for anything not rebuilt in the plugin.

### Analysis Progress UX
- **D-08:** While analysis runs, the plugin shows a **live progress bar with phase labels** (Crawling → Technical Checks → GEO Analysis) by polling the job status endpoint every 3 seconds. Same UX pattern as the main tool.

### Tech Stack
- **D-09:** Plugin architecture: **PHP + React** using WordPress's `@wordpress/scripts` (wp-scripts) build tooling and webpack. PHP handles plugin registration, `wp_options` settings storage, and REST route proxying. React renders the admin page UI.
- **D-10:** Plugin REST routes are registered at `/wp-json/ai-seo-tool/v1/` and proxy requests to the AI SEO Tool backend (avoids CORS issues from the browser calling the backend directly).
- **D-11:** Plugin slug: `ai-seo-tool`. Main plugin file: `ai-seo-tool.php`.

### Authentication — API Key System
- **D-12:** Users generate an API key from a new **"API Keys" section in their AI SEO Tool account settings** (new settings page in the Next.js frontend).
- **D-13:** Backend changes required:
  - New `api_keys` table: `(id TEXT PK, user_id TEXT FK users.id, key_hash TEXT, name TEXT, created_at TEXT, last_used_at TEXT nullable)`
  - New endpoint: `POST /auth/api-key` (generate key), `GET /auth/api-keys` (list), `DELETE /auth/api-keys/{id}` (revoke)
  - API key auth middleware: accept `Authorization: Bearer <api-key>` header as an alternative to cookie JWT on all existing protected routes
- **D-14:** API keys are shown once at generation time (hashed in DB). User copies it to the WordPress plugin settings.

### Plan Gating in the Plugin
- **D-15:** The plugin detects the user's plan from the API (`/auth/me` or a new `/auth/plan` endpoint) after connection.
- **D-16:** Feature gating by plan:
  - **Free:** Dashboard tab only, no GEO Analysis sub-tabs (shows upgrade prompt), no Technical Audit detail, no History trend chart
  - **Pro/Agency:** Full access to all 4 tabs and all features
- **D-17:** Quota errors from the backend (`402 quota_exceeded`) are surfaced in the plugin as an upgrade prompt with plan details.

### Plugin Distribution
- **D-18:** Plugin will be submitted to the **WordPress.org plugin directory** for public distribution with auto-updates.
- **D-19:** Plugin must comply with WordPress.org plugin guidelines: GPL-compatible license, no external calls during activation, settings sanitization.

### Claude's Discretion
- PHP proxy architecture details (curl vs wp_remote_get, error handling)
- React component library choice within wp-scripts context (re-use @wordpress/components or custom TailwindCSS — note: Tailwind may conflict with WP admin styles)
- Polling implementation (setTimeout loop vs wp-api-fetch with retry)
- How to handle the WP site URL detection (use `get_site_url()` PHP function, passed to React via `wp_localize_script`)
- Settings page UI layout (tabs or accordion)
- Build/bundle setup for wp-scripts + React
- Plugin readme.txt format for WordPress.org submission

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/codebase/ARCHITECTURE.md` — System architecture, request flow, Celery task flow, data layers
- `.planning/codebase/STACK.md` — Tech stack versions; FastAPI, Next.js App Router, SQLite, Redis
- `.planning/codebase/CONVENTIONS.md` — Python/TypeScript coding conventions, API route patterns
- `.planning/codebase/STRUCTURE.md` — Directory structure, file organization

### Auth & Plan Foundation (read before touching auth/API keys/subscriptions)
- `.planning/phases/04-add-user-authentication-with-signup-signin-session-management-and-logout/04-CONTEXT.md` — JWT cookie auth, user table, get_current_user dependency
- `.planning/phases/05-implement-pricing-plan-selection-flow-after-signup/05-CONTEXT.md` — Plan system, quota enforcement, subscriptions table
- `backend/app/api/routes/auth.py` — Existing auth routes to understand before adding API key routes
- `backend/app/api/routes/analyze.py` — Existing analyze route (quota enforcement, job dispatch)
- `backend/app/dependencies/auth.py` — get_current_user dependency to extend for API key auth

### Admin & Settings Foundation
- `.planning/phases/08-admin-account-recommended-features/08-CONTEXT.md` — Admin panel patterns, admin_settings table, wp_options patterns to follow

### External Specs
- WordPress Plugin Handbook (https://developer.wordpress.org/plugins/) — Plugin registration, wp_options, REST API, wp-scripts
- No external specs beyond what's described in this CONTEXT.md

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/api/routes/analyze.py` — Existing `/analyze/` endpoint; plugin will call this directly with API key auth
- `backend/app/store/history_store.py` — History queries; `/history/` endpoint already returns what the WP plugin needs
- `backend/app/api/routes/geo.py` — GEO results endpoint; plugin calls this to fetch analysis results
- `frontend/src/components/` — Existing React components (GeoScoreRing, EngineScores, etc.) are Next.js components and cannot be directly reused in the WP plugin, but serve as design reference
- `backend/app/dependencies/auth.py` — Extend this to support `Authorization: Bearer` header alongside cookie auth

### Established Patterns
- API key hashing: use `secrets.token_urlsafe(32)` + `hashlib.sha256` (same as session token pattern)
- SQLite migrations: use `CREATE TABLE IF NOT EXISTS` + `_add_column_if_missing` pattern from `history_store.py`
- Plan enforcement: middleware pattern in `analyze.py` — check plan, check quota, raise 402 with structured error
- Settings storage in WordPress: `get_option('ai_seo_tool_api_key')` / `update_option(...)` pattern

### Integration Points
- New `api_keys` table in `history_store.py` (or new `api_keys_store.py`)
- New `/auth/api-key` routes in `backend/app/api/routes/auth.py`
- New account settings page in `frontend/src/app/` (Next.js App Router)
- WordPress plugin directory: `wordpress-plugin/` at project root (new directory)

</code_context>

<specifics>
## Specific Ideas

- Connection screen should feel like a signup/onboarding flow — not a raw settings form. Clean card UI with a field for the API key and a "Connect" button.
- After connection, the dashboard screen is the primary view. The "Analyze" button is prominent.
- Dashboard screen shows: plan name, audits used / audits limit, last audit date, and audit history list.
- Progress polling mirrors the main tool's UX exactly — same phase labels (Crawling / Technical Checks / GEO Analysis).
- The WordPress plugin proxy approach (PHP → backend) is intentional: avoids the user needing to configure CORS on their AI SEO Tool instance.

</specifics>

<deferred>
## Deferred Ideas

- Gutenberg sidebar per-page GEO scoring (would be its own phase)
- Scheduled auto-audits triggered from within WordPress (leverages WP Cron — future phase)
- WordPress multisite / network activation support
- White-label plugin branding for Agency plan users
- Auto-detecting the WordPress site URL and pre-filling the Analyze form (Claude's discretion to implement if trivial)

</deferred>

---

*Phase: 09-wordpress-plugin-integration-for-ai-seo-tool*
*Context gathered: 2026-04-17*
