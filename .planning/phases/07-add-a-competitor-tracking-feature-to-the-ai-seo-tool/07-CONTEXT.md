# Phase 7: Add a Competitor Tracking feature to the AI SEO Tool - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can discover competitor websites via AI (Claude), audit them using the existing crawl + GEO pipeline, and view a side-by-side comparison against their primary site in a dedicated Competitors tab.

The discovery flow uses Claude to suggest 5–8 competitor domains based on what the GEO pipeline already knows about the site (site type, main topics, keywords, homepage content). The user confirms suggestions, selected competitors are queued through the identical `process_site` Celery task, and results are stored as regular analyses in SQLite.

This phase does NOT include: web search API integration for competitor discovery, white-label competitor reports, competitor keyword gap analysis, or scheduled automatic competitor re-audits (schedules are handled by the existing Schedules tab).

</domain>

<decisions>
## Implementation Decisions

### Competitors Tab Placement & Entry Point
- **D-01:** A standalone **Competitors** tab is added to the main navigation (alongside Dashboard, Spider, Technical, GEO, Insights, History, Schedules)
- **D-02:** The tab is always visible but gated — Free users see a locked/upgrade prompt; Pro and Agency users can use it
- **D-03:** Inside the tab, user selects their primary site from a **dropdown of previously audited sites** (populated from history API). No URL input — user must have already audited their site first.

### Competitor Discovery Flow
- **D-04:** User selects primary site from dropdown, clicks **"Find Competitors"** button
- **D-05:** System calls Claude API with a structured prompt including: site type, main topics/keywords, homepage content summary, and the probe questions already generated for that site
- **D-06:** Claude returns 5–8 competitor domain suggestions, each with a one-line reason
- **D-07:** User sees a **confirmation card UI** — one card per suggestion, showing domain + reason, with a checkbox to select/deselect. An "Add Competitors" button confirms selection and queues audits.
- **D-08:** User can also manually add a competitor URL via a text input alongside the suggestion cards

### Competitor Group Data Model
- **D-09:** One competitor group per primary site (one group = one primary analysis linked to N competitor analyses)
- **D-10:** New `competitor_groups` table: `(id TEXT PK, user_id TEXT, primary_analysis_id TEXT FK analyses.id, created_at TEXT)`
- **D-11:** New `competitor_sites` table: `(id TEXT PK, group_id TEXT FK competitor_groups.id, url TEXT, analysis_id TEXT FK analyses.id nullable, created_at TEXT)` — `analysis_id` is null until the audit completes
- **D-12:** Group is auto-named after the primary site's domain (no naming UI)
- **D-13:** Competitor cap by plan:
  - Free: 0 — Competitor Tracking is not available (tab shows upgrade prompt)
  - Pro: 3 competitors per group max
  - Agency: 10 competitors per group max

### Comparison View
- **D-14:** All-in-one layout within the Competitors tab: primary site selector at top → competitor cards row → comparison view below
- **D-15:** Comparison view includes **two components**:
  1. **Side-by-side score cards** — one card per site (primary + each competitor) showing: overall score (GeoScoreRing), grade, per-engine scores (EngineScores component), site type
  2. **Radar/spider chart** — one polygon per site across the 6 GEO dimensions (NLP, Schema, E-E-A-T, Content, Entity, Technical). Uses Recharts `RadarChart` (already a dependency via ScoreTrendChart)
- **D-16:** No gap table in this phase — side-by-side cards + radar chart are the comparison view

### Plan Limits & Quota
- **D-17:** Competitor audits **count against the user's monthly quota** (same as any other audit). Pro user adding 3 competitors uses 3 of their 10 monthly audits. The existing `/analyze/` quota enforcement handles this automatically.
- **D-18:** Re-auditing a competitor (refresh button on competitor card) triggers a new `/analyze/` job and burns one quota slot — same as a new audit
- **D-19:** Free users hitting the Competitors tab see an upgrade prompt explaining the feature requires Pro or Agency

### Claude's Discretion
- Exact Claude prompt structure for competitor discovery (include site type, topics, keywords, probe questions)
- API route structure for competitor group CRUD (`/competitors/` prefix or under `/sites/`)
- Loading/pending states for competitor audit cards (spinner, "Auditing..." label)
- Empty state design when no primary site has been audited yet
- How to surface the "Find Competitors" result if Claude fails or returns no useful suggestions (fallback message)
- Migration strategy for new `competitor_groups` and `competitor_sites` tables (use `_add_column_if_missing` pattern from `history_store.py` or fresh `CREATE TABLE IF NOT EXISTS`)

</decisions>

<specifics>
## Specific Ideas

- The suggestion cards should be clean — domain as the headline, one-line reason below, checkbox in the corner
- Recharts `RadarChart` is already available (used by `ScoreTrendChart`) — use it directly, no new chart library
- The competitor audit flow reuses the identical `POST /analyze/` endpoint — competitors are not special cases in the pipeline

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/codebase/ARCHITECTURE.md` — System architecture, Celery task flow, Redis vs SQLite data layers
- `.planning/codebase/STACK.md` — Tech stack versions; FastAPI, Next.js App Router, SQLite, Redis, Recharts
- `.planning/codebase/CONVENTIONS.md` — Python snake_case, TypeScript PascalCase, API route patterns, error handling

### Auth & Plan Enforcement (read before touching routes or quota)
- `.planning/phases/04-add-user-authentication-with-signup-signin-session-management-and-logout/04-CONTEXT.md` — JWT cookie auth, `get_current_user` dependency, route protection pattern
- `.planning/phases/05-implement-pricing-plan-selection-flow-after-signup/05-CONTEXT.md` — Plan tiers (D-01 to D-22), quota enforcement via 402, `subscriptions` table schema

### Key Source Files (read before modifying)
- `backend/app/store/history_store.py` — SQLite helpers, `init_db()`, `_add_column_if_missing()` migration pattern; add new tables here
- `backend/app/api/routes/analyze.py` — `POST /analyze/` quota check and Celery dispatch; competitor audits reuse this endpoint
- `backend/app/api/routes/history.py` — `GET /history/` pattern for fetching past analyses by user; competitor groups query analyses the same way
- `backend/app/analyzers/geo_probe.py` — Probe questions generated per site; these should be fed into the Claude competitor discovery prompt
- `backend/app/worker/tasks.py` — `process_site` Celery task; no changes needed (competitors run through it as-is)
- `frontend/app/lib/api.ts` — Centralized API client and TypeScript types; add competitor group types and fetch functions here
- `frontend/app/page.tsx` — Main UI shell with tab routing; add Competitors tab here
- `frontend/app/components/history/HistoryTab.tsx` — Existing comparison view patterns to reference
- `frontend/app/components/geo/GeoScoreRing.tsx` — Reuse for per-site score display in comparison cards
- `frontend/app/components/geo/EngineScores.tsx` — Reuse for per-engine score cards in comparison view
- `frontend/app/components/history/ScoreTrendChart.tsx` — See Recharts usage pattern for RadarChart implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GeoScoreRing.tsx` — Animated SVG score ring; drop in for each site's overall score card
- `EngineScores.tsx` — Per-engine score cards (ChatGPT, Perplexity, Gemini, Claude, Grok); reuse directly
- `ScoreTrendChart.tsx` — Recharts `LineChart` wrapper; same library provides `RadarChart` for free
- `HistoryRecord` type in `api.ts` — Has full `geo_data` blob including `score_breakdown`; competitor records share this type
- `getHistory()` / `getHistoryRecord()` in `api.ts` — Competitor analyses are stored as regular history items; these functions fetch their data
- `history_store.py` `save_analysis()` — Competitors saved through the same function; no changes needed

### Established Patterns
- All new SQLite tables go in `history_store.py` `init_db()` using `CREATE TABLE IF NOT EXISTS`
- Migration of existing DB uses `_add_column_if_missing()` — use for any ALTER TABLE operations
- New API routes: `APIRouter` in `backend/app/api/routes/`, mounted in `main.py` with prefix
- Auth protection: `get_current_user` FastAPI dependency injected into every protected route
- Plan gating: check `user.subscription.plan` in route handler; return 403 if plan doesn't permit

### Integration Points
- **New `competitor_groups` and `competitor_sites` tables** → `history_store.py` `init_db()`
- **New `/competitors/` API routes** → new `backend/app/api/routes/competitors.py`, mounted in `main.py`
- **Claude competitor discovery** → new function in `backend/app/analyzers/` or inline in the competitors route
- **Competitors tab** → new `frontend/app/components/competitors/CompetitorsTab.tsx`, registered in `page.tsx` tab list
- **Recharts RadarChart** → already available via the `recharts` package used by `ScoreTrendChart`

</code_context>

<deferred>
## Deferred Ideas

- Scheduled automatic competitor re-audits (e.g., re-audit all competitors weekly) — the existing Schedules tab handles scheduling; competitor re-audits can be added to that flow later
- Gap table (sorted by biggest dimension gap) — mentioned in initial spec, deferred to keep this phase focused; radar chart covers the visual comparison need
- Web search API integration (SerpAPI/Google CSE) for higher-accuracy competitor discovery — Claude-only approach for now
- White-label competitor comparison reports (PDF export)
- Competitor keyword gap analysis (which keywords they rank for that you don't)

</deferred>

---

*Phase: 07-add-a-competitor-tracking-feature-to-the-ai-seo-tool*
*Context gathered: 2026-04-08*
