---
phase: 07-add-a-competitor-tracking-feature-to-the-ai-seo-tool
plan: "03"
subsystem: ui
tags: [react, typescript, nextjs, tailwind, competitor-tracking, svg, radar-chart]

# Dependency graph
requires:
  - phase: 07-02
    provides: Backend competitor routes (/competitors/groups, /competitors/discover, /competitors/groups/{id}/sites)

provides:
  - CompetitorGroup, CompetitorSite, CompetitorSuggestion, CompetitorDiscoveryResponse, RadarDimensions TypeScript interfaces
  - listCompetitorGroups, getCompetitorGroup, createCompetitorGroup, discoverCompetitors, addCompetitorSite, removeCompetitorSite, reauditCompetitorSite fetch functions
  - extractRadarDimensions helper (entity axis from geo_data.entity.entity_score)
  - 5 sub-components under frontend/app/components/competitors/
  - CompetitorsTab container component ready for plan 04 page.tsx wiring

affects:
  - 07-04 (wires CompetitorsTab into page.tsx MainTab union)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure SVG polygon radar chart (no recharts) using polarToCartesian math copied from ScoreTrendChart
    - GeoScoreRing + EngineScores reuse in SiteComparisonCard (size=100 override)
    - useEffect + setInterval/clearInterval polling with pendingSites guard for cleanup
    - Free-plan LockedFeature gate inside tab component (tab always visible in nav per D-01)
    - Inner/outer component split to avoid hook ordering issues with early return

key-files:
  created:
    - frontend/app/components/competitors/CompetitorRadarChart.tsx
    - frontend/app/components/competitors/CompetitorSuggestionCard.tsx
    - frontend/app/components/competitors/SiteComparisonCard.tsx
    - frontend/app/components/competitors/PrimarySiteSelector.tsx
    - frontend/app/components/competitors/CompetitorCard.tsx
    - frontend/app/components/competitors/CompetitorsTab.tsx
  modified:
    - frontend/app/lib/api.ts (competitor types + fetch functions appended)

key-decisions:
  - "GeoScoreRing uses named export not default — SiteComparisonCard and CompetitorCard import { GeoScoreRing }"
  - "EngineScores uses named export — SiteComparisonCard imports { EngineScores }"
  - "CompetitorsTab split into outer (plan gate) + inner (hook body) to avoid hooks-after-return React error"
  - "Polling tracks failed sites via analysis_id + '__failed' sentinel key so polling stops on failure without extra state"
  - "entity axis sourced from geo_data.entity.entity_score (NOT score_breakdown) per plan pitfall note"

patterns-established:
  - "Competitor components live under frontend/app/components/competitors/"
  - "All competitor components start with 'use client'; on line 1"
  - "API error objects carry .code and .cap fields for structured error surfacing"

requirements-completed: [D-01, D-03, D-04, D-05, D-06, D-07, D-08, D-14, D-15, D-16]

# Metrics
duration: 4min
completed: 2026-04-08
---

# Phase 07 Plan 03: Competitor Frontend Components Summary

**6 React components + api.ts additions delivering full competitor tracking UI — radar chart, discovery flow, polling, and comparison view — ready for plan 04 page.tsx wiring**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-08T17:54:06Z
- **Completed:** 2026-04-08T17:58:00Z
- **Tasks:** 3
- **Files modified:** 7 (1 modified, 6 created)

## Accomplishments

- Added CompetitorGroup/CompetitorSite/CompetitorSuggestion interfaces + 7 fetch functions + extractRadarDimensions to api.ts
- Created 5 sub-components (CompetitorRadarChart, CompetitorSuggestionCard, SiteComparisonCard, PrimarySiteSelector, CompetitorCard)
- Created CompetitorsTab container with discovery flow, 3-second polling with clearInterval cleanup, comparison grid, and competitor_cap_reached/quota_exceeded error surfacing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add competitor types and fetch functions to api.ts** - `3159394` (feat)
2. **Task 2: Create 5 competitor sub-components** - `120940e` (feat)
3. **Task 3: Create CompetitorsTab container** - `45c8007` (feat)

## Files Created/Modified

- `frontend/app/lib/api.ts` - Added 129 lines: competitor interfaces, 7 fetch functions, extractRadarDimensions helper
- `frontend/app/components/competitors/CompetitorRadarChart.tsx` - Pure SVG polygon radar with 6 labeled axes, SERIES_COLORS, polarToCartesian
- `frontend/app/components/competitors/CompetitorSuggestionCard.tsx` - Label-wrapped checkbox card with domain (font-mono) + reason
- `frontend/app/components/competitors/SiteComparisonCard.tsx` - GeoScoreRing (size=100) + EngineScores reuse, pending/error/complete states
- `frontend/app/components/competitors/PrimarySiteSelector.tsx` - History deduplication by domain (most-recent per domain), select dropdown
- `frontend/app/components/competitors/CompetitorCard.tsx` - 3-state card (pending spinner, complete ring, error border) with inline remove confirm
- `frontend/app/components/competitors/CompetitorsTab.tsx` - Self-contained tab: LockedFeature gate, discovery flow, polling, comparison view, 4 layout sections

## Decisions Made

- GeoScoreRing and EngineScores use named exports — imports adjusted to `{ GeoScoreRing }` and `{ EngineScores }` (discovered from reading source)
- CompetitorsTab split into outer (plan gate + early return) + inner (all hooks) to avoid React hooks-after-conditional-return error
- Polling uses sentinel key `analysis_id + "__failed"` in siteRecords map to stop polling on failed sites without adding separate state variable
- entity axis sourced from `geo_data?.entity?.entity_score` as specified in plan (NOT from score_breakdown which doesn't contain entity)

## Deviations from Plan

None - plan executed exactly as written, with one minor import adjustment: GeoScoreRing and EngineScores are named exports (not default exports), so `import { GeoScoreRing }` and `import { EngineScores }` were used instead of `import GeoScoreRing` / `import EngineScores`. This is a read-first discovery, not a deviation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 component files are ready for plan 04 to wire `CompetitorsTab` into `page.tsx`
- Plan 04 needs to: add "competitors" to the MainTab union type, add the tab nav button, and render `<CompetitorsTab />` in the tab switch
- TypeScript compiles clean across the entire frontend with zero errors

---
*Phase: 07-add-a-competitor-tracking-feature-to-the-ai-seo-tool*
*Completed: 2026-04-08*
