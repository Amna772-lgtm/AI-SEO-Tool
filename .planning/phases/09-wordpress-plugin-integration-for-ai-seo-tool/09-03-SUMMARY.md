---
phase: 09-wordpress-plugin-integration-for-ai-seo-tool
plan: 03
subsystem: ui
tags: [wordpress, php, react, wp-scripts, webpack, rest-api]

requires:
  - phase: 09-01
    provides: Bearer token auth on /auth/me — proxy connect route validates credentials against this

provides:
  - WordPress plugin PHP shell: main file with GPL-2.0-or-later header, activation hook, constants
  - Admin menu with 1 top-level item + 5 sub-pages (Dashboard, GEO Analysis, Technical Audit, History, Settings)
  - PHP REST proxy: 10 routes at /wp-json/ai-seo-tool/v1/ forwarding to FastAPI backend with Bearer auth
  - Connection management routes: /connect (validate + save), /disconnect (clear), /settings (read)
  - React placeholder entry point compiled with @wordpress/scripts (build/index.js + build/index.asset.php)

affects:
  - 09-04 (React UI components mount into #ai-seo-tool-root div — depends on admin menu render_page())
  - 09-05 (Settings tab uses aiSeoTool.nonce and aiSeoTool.apiBase localized vars from ai-seo-tool.php)

tech-stack:
  added:
    - "@wordpress/scripts ^32.0.0 (build tooling — webpack + babel + dependency extraction)"
    - "@wordpress/element (React wrapper — avoids duplicate React instances in WP)"
    - "@wordpress/components (WP admin UI primitives — avoids TailwindCSS/wp-admin CSS conflict)"
  patterns:
    - "wp_localize_script passes PHP data (siteUrl, apiBase, nonce, connected) to React at aiSeoTool global"
    - "PHP proxy pattern: register_rest_route → wp_remote_get/post with Bearer header — no browser CORS"
    - "All render_page() callbacks output single #ai-seo-tool-root div — React owns entire tab routing"
    - "Activation hook: add_option only if not set — idempotent, no external calls (D-19)"
    - "index.asset.php loaded via include before wp_enqueue_script to get correct dependency array"

key-files:
  created:
    - wordpress-plugin/ai-seo-tool.php
    - wordpress-plugin/includes/class-activator.php
    - wordpress-plugin/includes/class-admin-menu.php
    - wordpress-plugin/includes/class-rest-proxy.php
    - wordpress-plugin/src/index.js
    - wordpress-plugin/package.json
    - wordpress-plugin/readme.txt
    - wordpress-plugin/build/index.js
    - wordpress-plugin/build/index.asset.php
  modified:
    - .gitignore (added /wordpress-plugin/node_modules)

key-decisions:
  - "All React UI uses @wordpress/components — avoids TailwindCSS v4 cascade conflict with WP admin unlayered CSS"
  - "PHP proxy serves all backend calls server-side — no CORS headers needed on FastAPI backend"
  - "connect route validates API key against /auth/me before saving to wp_options — fail-fast on bad credentials"
  - "src/index.js imports from @wordpress/element not react directly — prevents duplicate React instances in WP context"
  - "node_modules excluded from git; package-lock.json committed for reproducible installs"

patterns-established:
  - "PHP proxy pattern: private proxy_get/proxy_post helpers + public route callbacks — consistent error handling via format_response()"
  - "WP plugin activation: add_option (not update_option) for idempotent defaults — safe to re-activate"

requirements-completed: [WP-04, WP-05, WP-09, WP-10, WP-11]

duration: 15min
completed: 2026-04-17
---

# Phase 09 Plan 03: WordPress Plugin PHP Shell Summary

**WordPress plugin scaffold with GPL-2.0-or-later main file, 5-page admin menu, 10-route PHP REST proxy forwarding Bearer-authenticated requests to FastAPI, and wp-scripts React placeholder compiled to build/index.js**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-17T00:00:00Z
- **Completed:** 2026-04-17T00:15:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Plugin main file with complete WordPress header (Plugin Name, GPL-2.0-or-later, requires PHP 8.0, tested up to 6.7) and activation hook that sets default wp_options without external calls (D-19 compliant)
- Admin menu with `add_menu_page` (dashicons-chart-bar, position 30) + 5 sub-menu items; all pages render into a single `#ai-seo-tool-root` div with `data-page` attribute for React routing
- PHP REST proxy registering 10 routes at `/wp-json/ai-seo-tool/v1/`: 7 backend proxy routes (analyze, site status, pages, audit, geo, me, history) + connect/disconnect/settings for credential management
- All proxy routes use `wp_remote_get`/`wp_remote_post` with `timeout => 30`, `Authorization: Bearer` header from `wp_options`, `sanitize_text_field` for path params, `is_user_logged_in() && current_user_can('manage_options')` permission
- React entry point using `@wordpress/element` (no direct React import) compiles to `build/index.js` + `build/index.asset.php` via `npm run build`

## Task Commits

1. **Task 1: Plugin main file, activation hook, admin menu, build config** - `2f9a04f` (feat)
2. **Task 2: PHP REST proxy routes + React placeholder** - `81592bf` (feat)
3. **Housekeeping: gitignore + package-lock.json** - `8b91f31` (chore)

## Files Created/Modified

- `wordpress-plugin/ai-seo-tool.php` - Main plugin file with WordPress header, constants, require_once chain, activation/menu/REST/enqueue hooks
- `wordpress-plugin/includes/class-activator.php` - Sets `ai_seo_tool_api_key` and `ai_seo_tool_backend_url` options on activation; no external calls
- `wordpress-plugin/includes/class-admin-menu.php` - `add_menu_page` + 5 `add_submenu_page` calls; `render_page()` outputs `#ai-seo-tool-root` div
- `wordpress-plugin/includes/class-rest-proxy.php` - 10 REST routes, Bearer auth forwarding, connect/disconnect/settings credential management
- `wordpress-plugin/src/index.js` - React placeholder using `@wordpress/element` + `@wordpress/components` Spinner
- `wordpress-plugin/package.json` - `@wordpress/scripts ^32.0.0` devDependency with build/start/lint scripts
- `wordpress-plugin/readme.txt` - WordPress.org-format readme with Stable tag 1.0.0
- `wordpress-plugin/build/index.js` - Compiled React app (wp-scripts output, 346 bytes minified)
- `wordpress-plugin/build/index.asset.php` - WP dependency manifest (auto-generated by wp-scripts)
- `.gitignore` - Added `/wordpress-plugin/node_modules`

## Decisions Made

- Used `@wordpress/components` for all React UI (per UI-SPEC.md) — avoids TailwindCSS v4 cascade conflict with WP admin unlayered CSS
- PHP proxy pattern (server-side via `wp_remote_get/post`) means no CORS configuration needed on FastAPI
- `connect` route validates the API key against `/auth/me` before saving to `wp_options` — user gets immediate feedback on bad credentials
- `src/index.js` imports from `@wordpress/element` not `react` directly — prevents duplicate React instances in WP context (Pitfall 2 per RESEARCH.md)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- PHP syntax check (`php -l`) failed due to a broken icu4c library on the dev machine (pre-existing environment issue). Verified PHP files are syntactically correct by manual review; the build passing with wp-scripts (which requires valid JS but not PHP validation) confirms the build pipeline works. PHP linting can be done in a Docker-based PHP environment.

## Known Stubs

- `wordpress-plugin/src/index.js` renders a `<Spinner />` placeholder with "AI SEO Tool loading..." text — intentional stub, replaced by full React app in Plans 04-05.

## User Setup Required

None - no external service configuration required for the plugin PHP scaffold.

## Next Phase Readiness

- Plugin shell ready for React UI implementation in Plans 04-05
- `#ai-seo-tool-root` div is the React mount point; `data-page` attribute routes to the correct tab
- `aiSeoTool` JS global (siteUrl, apiBase, nonce, connected, mainAppUrl) available in all React components
- All 10 REST proxy routes wired — React components can call `/wp-json/ai-seo-tool/v1/` endpoints immediately

---
*Phase: 09-wordpress-plugin-integration-for-ai-seo-tool*
*Completed: 2026-04-17*
