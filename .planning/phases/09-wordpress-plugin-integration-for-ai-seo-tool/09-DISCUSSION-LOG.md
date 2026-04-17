# Phase 9: WordPress Plugin Integration for AI SEO Tool - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 09-wordpress-plugin-integration-for-ai-seo-tool
**Areas discussed:** Plugin role, Auth method, Results display, Tech stack, API key generation, Analysis progress, Plugin distribution, WP admin location, Plan gating, Plugin branding

---

## Plugin Role

| Option | Description | Selected |
|--------|-------------|----------|
| Trigger audits from WP admin | Connect via API key, trigger full crawl, show results in WP | ✓ |
| Per-page Gutenberg sidebar | Per-page GEO score in the block editor | |
| WP admin dashboard widget | Summary widget linking back to main tool | |

**User's choice:** Two-screen plugin — Screen 1: connection/API key entry. Screen 2: dashboard with remaining quota, profile, usage stats, history + Analyze button. Plugin sends API key + site URL to backend, shows full results in WP admin.

---

## Auth Method

| Option | Description | Selected |
|--------|-------------|----------|
| API key from account settings | Self-serve key generation, paste into plugin | ✓ |
| Hosted instance URL + email/password | Exchange credentials for token | |

**User's choice:** API key from account settings page (new feature to add to the existing tool).

---

## Results Display

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded summary + link to full tool | Key metrics in WP + "View Full Report" link | |
| Full results rebuilt in WP admin | Replicate all relevant tabs inside WordPress | ✓ |

**User's choice:** Full results rebuilt in WP admin.

---

## Tech Stack

| Option | Description | Selected |
|--------|-------------|----------|
| PHP + WordPress REST API + React | Modern WP plugin with wp-scripts | ✓ |
| Pure PHP + HTML forms | Old-school rendering, limited interactivity | |

**User's choice:** PHP + React using wp-scripts.

---

## API Key Generation Location

| Option | Description | Selected |
|--------|-------------|----------|
| Account settings page (new) | Self-serve in existing tool | ✓ |
| Admin manually creates keys | Admin panel only, no self-serve | |

**User's choice:** Account settings page in existing tool. User can generate, view, and revoke keys.

---

## Tabs to Rebuild in WordPress

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard | Score ring, status distribution, pages table | ✓ |
| GEO Analysis | Full AI scores with all 7 sub-tabs | ✓ |
| Technical Audit | HTTPS, sitemap, broken links, PageSpeed | ✓ |
| History | Past audits and trend chart | ✓ |

**User's choice:** All four tabs.

---

## Analysis Progress UX

| Option | Description | Selected |
|--------|-------------|----------|
| Live progress bar + phase label | Poll every 3s, show Crawling/Technical/GEO labels | ✓ |
| Spinner + redirect when done | Simple loader, refresh on completion | |

**User's choice:** Live progress bar with phase labels, polling every 3 seconds.

---

## Plugin Distribution

| Option | Description | Selected |
|--------|-------------|----------|
| Download .zip from account dashboard | Private distribution | |
| WordPress.org plugin directory | Public, auto-updates, requires review | ✓ |

**User's choice:** WordPress.org plugin directory.

---

## WordPress Admin Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level menu item | Prominent sidebar item like WooCommerce | ✓ |
| Under Tools submenu | Less prominent, under Tools > AI SEO Tool | |

**User's choice:** Top-level menu item labeled "AI SEO Tool".

---

## Plan Gating in the Plugin

| Option | Description | Selected |
|--------|-------------|----------|
| Full plugin, quota enforced by backend | Backend returns 402 on quota exceeded | |
| Feature-gated UI | Plugin detects plan, locks tabs for Free users | ✓ |

**User's choice:** Feature-gated UI. Free users see Dashboard only; Pro/Agency get all 4 tabs.

---

## Plugin Branding

| Option | Description | Selected |
|--------|-------------|----------|
| AI SEO Tool | Same name as main product | ✓ |
| GEO Citation Checker for WordPress | Descriptive, keyword-rich | |
| Let me decide later | Placeholder name for now | |

**User's choice:** "AI SEO Tool"

---

## Claude's Discretion

- PHP proxy architecture (curl vs wp_remote_get)
- React component library within wp-scripts (WordPress components vs custom TailwindCSS)
- Polling implementation details
- WP site URL auto-detection via get_site_url()
- Settings page UI layout
- Build setup for wp-scripts
- Plugin readme.txt for WordPress.org

## Deferred Ideas

- Gutenberg sidebar per-page scoring
- WordPress Cron-based scheduled re-audits
- Multisite/network support
- White-label branding for Agency users
