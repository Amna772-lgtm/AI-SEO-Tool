# Phase 7: Add a Competitor Tracking Feature — Research

**Researched:** 2026-04-08
**Domain:** Competitor discovery (Claude AI), SQLite CRUD extension, FastAPI route patterns, React custom SVG radar chart
**Confidence:** HIGH — All findings verified directly from source code; no novel external dependencies required

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Standalone "Competitors" tab added to main navigation (always visible, gated)
- **D-02:** Free users see a locked/upgrade prompt; Pro and Agency users can use the feature
- **D-03:** Primary site selected from dropdown of previously audited sites (history API) — no URL input at this step
- **D-04:** User selects primary site, clicks "Find Competitors" button
- **D-05:** Claude API called with structured prompt: site type, main topics/keywords, homepage content summary, probe questions already generated for that site
- **D-06:** Claude returns 5–8 competitor domain suggestions, each with a one-line reason
- **D-07:** Confirmation card UI — one card per suggestion, domain + reason + checkbox; "Add Competitors" button queues audits
- **D-08:** User can also manually add a competitor URL via text input alongside suggestion cards
- **D-09:** One competitor group per primary site
- **D-10:** New `competitor_groups` table: `(id TEXT PK, user_id TEXT, primary_analysis_id TEXT FK analyses.id, created_at TEXT)`
- **D-11:** New `competitor_sites` table: `(id TEXT PK, group_id TEXT FK competitor_groups.id, url TEXT, analysis_id TEXT FK analyses.id nullable, created_at TEXT)` — `analysis_id` null until audit completes
- **D-12:** Group auto-named after primary site's domain (no naming UI)
- **D-13:** Competitor cap: Free=0, Pro=3, Agency=10 per group
- **D-14:** All-in-one layout: primary site selector → competitor cards row → comparison view
- **D-15:** Two comparison components: side-by-side score cards (GeoScoreRing + EngineScores) and a radar/spider chart (6 GEO dimensions)
- **D-16:** No gap table — radar chart covers visual comparison need
- **D-17:** Competitor audits count against monthly quota (existing `/analyze/` quota enforcement)
- **D-18:** Re-auditing a competitor burns one quota slot — same as a new audit
- **D-19:** Free users see upgrade prompt explaining feature requires Pro or Agency

### Claude's Discretion

- Exact Claude prompt structure for competitor discovery
- API route structure for competitor group CRUD (`/competitors/` prefix)
- Loading/pending states for competitor audit cards
- Empty state design when no primary site has been audited yet
- Fallback message if Claude fails or returns no useful suggestions
- Migration strategy for new tables (`CREATE TABLE IF NOT EXISTS` pattern)

### Deferred Ideas (OUT OF SCOPE)

- Scheduled automatic competitor re-audits
- Gap table (sorted by biggest dimension gap)
- Web search API integration (SerpAPI/Google CSE) for competitor discovery
- White-label competitor comparison reports (PDF export)
- Competitor keyword gap analysis

</user_constraints>

---

## Summary

Phase 7 adds a Competitor Tracking feature: AI-powered competitor discovery, auditing competitors through the existing pipeline, and a side-by-side comparison view. The implementation is a pure extension of existing infrastructure — no new external libraries, no new services. The backend adds two new SQLite tables, a new FastAPI router, and a Claude-powered competitor discovery function. The frontend adds a new tab with custom SVG radar chart and reuses existing `GeoScoreRing` and `EngineScores` components.

**Critical finding from UI-SPEC:** The CONTEXT.md references Recharts `RadarChart` as "already a dependency via ScoreTrendChart". This is INCORRECT — `ScoreTrendChart.tsx` is a custom SVG implementation and `recharts` is NOT in `package.json`. The radar chart MUST be implemented as custom SVG polygon math, identical in approach to `ScoreTrendChart.tsx`. The planner must not install recharts.

**Primary recommendation:** Implement in 4 plans: (1) DB tables + store helpers, (2) `/competitors/` API routes + Claude discovery, (3) Frontend CompetitorsTab + components, (4) Wire tab into page.tsx + integration polish.

---

## Standard Stack

No new packages required. All implementation uses existing dependencies.

### Core (existing — no installation needed)

| Library | Version (in use) | Purpose in Phase 7 |
|---------|------------------|--------------------|
| FastAPI | `>=0.100.0` | New `/competitors/` APIRouter |
| SQLite3 (stdlib) | Python 3.11 built-in | Two new tables in history.db |
| anthropic | `>=0.30.0` | Claude API for competitor discovery |
| Next.js App Router | `16.1.6` | New CompetitorsTab route in page.tsx |
| React | `19.2.3` | New client components |
| TailwindCSS | `^4` | Styling — all inline utility classes |
| SVG (browser native) | — | Radar chart (custom polygon — no library) |

### What NOT to install

| Temptation | Why to avoid |
|------------|--------------|
| recharts | NOT in package.json; ScoreTrendChart is custom SVG; radar chart follows same pattern |
| d3 | Overkill — 6-axis polygon math is ~40 lines of trig |
| Any shadcn component | Project uses no component library — all components are handwritten |

---

## Architecture Patterns

### New File Map

```
backend/app/
├── api/routes/
│   └── competitors.py          # NEW — APIRouter with /competitors/ prefix
├── analyzers/
│   └── competitor_discovery.py # NEW — Claude prompt + JSON parse + fallback
└── store/
    └── history_store.py        # MODIFY — add competitor_groups + competitor_sites tables + CRUD

frontend/app/components/
└── competitors/                # NEW directory
    ├── CompetitorsTab.tsx       # Top-level tab container
    ├── PrimarySiteSelector.tsx  # Dropdown from history API
    ├── CompetitorSuggestionCard.tsx  # Discovery confirmation card
    ├── CompetitorCard.tsx       # Queued/completed/error competitor card
    ├── CompetitorRadarChart.tsx # Custom SVG polygon radar chart
    └── SiteComparisonCard.tsx   # Side-by-side card (reuses GeoScoreRing + EngineScores)

frontend/app/
├── lib/api.ts                  # MODIFY — add CompetitorGroup types + fetch functions
└── page.tsx                    # MODIFY — add "competitors" to MainTab union + nav + tab panel
```

### Pattern 1: SQLite Table Addition in `history_store.py`

New tables are added in `init_db()` using `CREATE TABLE IF NOT EXISTS` inside the existing `executescript()` block. Foreign key references use plain `TEXT` (no `REFERENCES` clause) to avoid SQLite ADD COLUMN FK restriction — consistent with how `user_id` was added to existing tables.

```python
# Source: backend/app/store/history_store.py init_db() pattern
conn.executescript("""
    CREATE TABLE IF NOT EXISTS competitor_groups (
        id                   TEXT PRIMARY KEY,
        user_id              TEXT NOT NULL,
        primary_analysis_id  TEXT NOT NULL,
        created_at           TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_competitor_groups_user_id
        ON competitor_groups(user_id);
    CREATE INDEX IF NOT EXISTS idx_competitor_groups_primary_analysis_id
        ON competitor_groups(primary_analysis_id);

    CREATE TABLE IF NOT EXISTS competitor_sites (
        id           TEXT PRIMARY KEY,
        group_id     TEXT NOT NULL,
        url          TEXT NOT NULL,
        analysis_id  TEXT,
        created_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_competitor_sites_group_id
        ON competitor_sites(group_id);
    CREATE INDEX IF NOT EXISTS idx_competitor_sites_analysis_id
        ON competitor_sites(analysis_id);
""")
```

**Key constraint:** `competitor_groups.primary_analysis_id` is scoped: only fetch groups where the linked analysis also belongs to the current user. JOIN at query time, not via FK constraint (SQLite ADD COLUMN cannot add FK).

### Pattern 2: FastAPI Route with Plan Gating

All competitor routes require auth (`get_current_user` dependency) and plan check. Pattern from `analyze.py`:

```python
# Source: backend/app/api/routes/analyze.py (quota pattern)
@router.post("/groups")
def create_competitor_group(
    request: CompetitorGroupRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    sub = get_subscription_by_user(current_user["id"])
    plan = sub["plan"] if sub else "free"
    if plan == "free":
        raise HTTPException(
            status_code=403,
            detail={"code": "feature_unavailable", "plan": "free",
                    "message": "Competitor Tracking requires Pro or Agency plan."}
        )
    # plan-specific competitor cap enforced when adding competitor_sites
    cap = 3 if plan == "pro" else 10  # agency = 10
```

### Pattern 3: Claude Discovery Function

New `competitor_discovery.py` in `backend/app/analyzers/`. Pattern mirrors `geo_probe.py` — uses `anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)`, parses JSON from response, has fallback for API failure.

```python
# Pattern from backend/app/analyzers/geo_probe.py
import anthropic, json, re, os

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL   = os.getenv("ANTHROPIC_MODEL", "")

_DISCOVERY_SYSTEM = """You are an expert at identifying competitor websites...
Return ONLY a valid JSON array of objects: [{"domain": "...", "reason": "..."}]
No markdown, no explanation."""

def discover_competitors(
    site_url: str,
    site_type: str,
    key_topics: list[str],
    probe_questions: list[str],
    homepage_summary: str,
) -> list[dict] | None:
    """Returns list of {domain, reason} dicts or None on failure."""
    if not ANTHROPIC_API_KEY:
        return None
    # ... build prompt, call API, parse JSON, return list
```

**Fallback:** When Claude fails (no API key, timeout, invalid JSON), return `None`. Frontend shows: "Couldn't find suggestions right now. Add competitors manually using the field below."

**Prompt inputs to feed Claude (from D-05):**
- `site_type` from `geo_data.site_type.site_type`
- `key_topics` from `geo_data.nlp.key_topics` (up to 8)
- `probe_questions` from `geo_data.probe.questions` (the 3 questions already generated)
- `homepage_summary` — extract from `geo_data.content` avg_word_count + reading_level, or fetch from the stored history record's top-level URL

### Pattern 4: Frontend API Client Addition

New types and fetch functions appended to `frontend/app/lib/api.ts` following the exact existing pattern:

```typescript
// Pattern from frontend/app/lib/api.ts — existing types section
export interface CompetitorSite {
  id: string;
  group_id: string;
  url: string;
  domain: string;
  analysis_id: string | null;
  created_at: string;
  // resolved from analysis when available:
  analysis?: HistoryItem | null;
}

export interface CompetitorGroup {
  id: string;
  user_id: string;
  primary_analysis_id: string;
  primary_domain: string;
  created_at: string;
  sites: CompetitorSite[];
}
```

### Pattern 5: Competitor Audit Status Polling

Competitor cards in "Auditing..." state need to know when the analysis completes. The analysis is tracked via `analysis_id` (a `task_id`) stored in `competitor_sites`. The frontend polls `GET /sites/{analysis_id}` (existing endpoint) to check status, exactly as the home page polls for live crawls. When `status === "completed"`, the `analysis_id` in the competitor site record is populated and the card transitions from pending to complete.

**Implementation approach:** The competitors API endpoint response for a group should include each site's `analysis_id`. The frontend can poll `GET /sites/{analysis_id}` for pending sites every ~3 seconds. When `status === "completed"`, refetch the full group to get `analysis` data populated.

### Pattern 6: Custom SVG Radar Chart

`CompetitorRadarChart.tsx` implements a polygon radar chart with pure SVG math. The 6 axes (NLP, Schema, E-E-A-T, Content, Entity, Technical) are evenly distributed at 60° intervals (360° / 6). For each site, polygon vertices are computed from each axis score (0-100) scaled to the chart radius.

```typescript
// Source: frontend/app/components/history/ScoreTrendChart.tsx (custom SVG pattern)
// Polar → Cartesian conversion for radar axes:
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// For 6 axes at 60° intervals:
// axis 0 = NLP        at 0° (top)
// axis 1 = Schema     at 60°
// axis 2 = E-E-A-T    at 120°
// axis 3 = Content    at 180°
// axis 4 = Entity     at 240°
// axis 5 = Technical  at 300°
```

**Score breakdown keys** (from `ScoreResult.breakdown` in `api.ts`):
- `nlp` → NLP axis
- `structured_data` → Schema axis
- `eeat` → E-E-A-T axis
- `conversational` → Content axis
- `entity` → Entity axis (from `geo_data.entity.entity_score` — NOT in `score_breakdown`)
- `technical` → Technical axis

**Critical:** `entity` score is NOT in `score_breakdown` in the existing TypeScript types. It lives at `geo_data.entity.entity_score`. The radar chart data extraction must source this separately from the history record's `geo_data` blob.

**Color palette for radar polygons** (from `ScoreTrendChart.tsx` — must match):
- Primary site: `#4f46e5` (indigo — "overall" series color)
- Competitor 1: `#2563eb`
- Competitor 2: `#7c3aed`
- Competitor 3: `#d97706`
- Competitor 4: `#0891b2`
- Competitor 5: `#db2777`

### Pattern 7: Tab Registration in `page.tsx`

The `MainTab` union type on line 30 must be extended:
```typescript
// BEFORE:
type MainTab = "dashboard" | "crawl" | "audit" | "geo" | "insights" | "history" | "schedules";
// AFTER:
type MainTab = "dashboard" | "crawl" | "audit" | "geo" | "insights" | "history" | "schedules" | "competitors";
```

The nav array on line 640 must receive a new entry for `competitors`. The tab content area (bottom of page.tsx) receives a new conditional panel: `{!authLoading && mainTab === "competitors" && (<CompetitorsTab />)}`.

The Competitors tab is always visible in the nav (D-01) — the plan gate is enforced inside `CompetitorsTab` itself (renders `<LockedFeature>` for Free users), not by hiding the tab.

### Anti-Patterns to Avoid

- **Storing competitor data separately from analyses:** Competitor analyses ARE regular analyses in the `analyses` table. The `competitor_sites.analysis_id` is just a foreign key into `analyses`. Never duplicate the GEO data blob.
- **Gating the tab visibility:** Tab appears in nav for all plans. `LockedFeature` renders inside the tab content. Do not conditionally hide the nav item.
- **Polling status via a new endpoint:** Use existing `GET /sites/{task_id}` to poll. Do not create a new status endpoint for competitor audits.
- **Custom UI framework components:** No shadcn, no Radix, no Headless UI. All components handwritten with Tailwind utilities and inline SVG.
- **Installing recharts:** The chart is pure SVG polygon math. ScoreTrendChart.tsx proves this is maintainable at project scale.
- **Fetching the full GEO blob for the competitor group list:** The `/competitors/groups/` list endpoint should return lightweight data (domain, score, grade, site_type). Only fetch full `geo_data` when rendering the comparison view — use `getHistoryRecord(analysis_id)` for full data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Competitor audit pipeline | Custom crawl/analysis | `POST /analyze/` (existing) | Identical pipeline; quota enforcement built-in |
| Per-analysis data storage | New competitor-specific storage | `save_analysis()` in `history_store.py` | Competitors are just analyses scoped via competitor_sites FK |
| Auth cookie reading | JWT decode in route | `get_current_user` FastAPI Depends | Already handles expiry, 401, user lookup |
| Plan enforcement | Custom plan checks | `get_subscription_by_user()` + `maybe_reset_pro_audit_count()` | Already handles Pro reset, agency unlimited |
| Quota enforcement | Custom counter | `increment_audit_count()` (already called by `/analyze/`) | Competitor audits go through `/analyze/` — quota fires automatically |
| Score ring display | New SVG ring component | `GeoScoreRing` (size=100) | Already accepts `score` + `grade` props; size is configurable |
| Engine scores display | New engine card grid | `EngineScores` component | Accepts `score: ScoreResult` prop directly |

**Key insight:** The competitor feature adds zero new data shapes. A competitor analysis is a `HistoryRecord` with `HistoryItem` fields. The `competitor_sites` table is the only new concept — it's a mapping table linking groups to analysis IDs.

---

## Common Pitfalls

### Pitfall 1: Entity Score Missing from `score_breakdown`

**What goes wrong:** Building the radar chart from `score_breakdown` — the entity dimension is absent.
**Why it happens:** `ScoreResult.breakdown` in `api.ts` has keys: `structured_data`, `eeat`, `conversational`, `technical`, `nlp`, `speed`, `probe`. No `entity` key.
**How to avoid:** Source entity score from `historyRecord.geo_data?.entity?.entity_score ?? 0`. The other 5 axes come from `score_breakdown` weighted values (use `raw` not `weighted` for per-axis comparison). Explicitly map:
```typescript
const radarDimensions = {
  nlp:             record.score_breakdown?.nlp?.raw ?? 0,
  structured_data: record.score_breakdown?.structured_data?.raw ?? 0,
  eeat:            record.score_breakdown?.eeat?.raw ?? 0,
  conversational:  record.score_breakdown?.conversational?.raw ?? 0,
  entity:          record.geo_data?.entity?.entity_score ?? 0,
  technical:       record.score_breakdown?.technical?.raw ?? 0,
};
```

### Pitfall 2: Competitor Group "One Per Primary Site" Enforcement

**What goes wrong:** Multiple groups created for the same `primary_analysis_id`, leading to duplicate comparison views.
**Why it happens:** Backend doesn't enforce uniqueness.
**How to avoid:** `competitor_groups` table should have a `UNIQUE` constraint or the `CREATE GROUP` logic should check `SELECT id FROM competitor_groups WHERE user_id = ? AND primary_analysis_id = ?` and return the existing group if found. Upsert or "get-or-create" pattern. The D-09 decision implies one group per primary site — the `GET /competitors/groups/?primary_analysis_id=X` endpoint is the canonical lookup.

### Pitfall 3: Claude Competitor Discovery Returning Domains vs Full URLs

**What goes wrong:** Claude returns `https://rival.com/` (full URL) or bare domain `rival.com` inconsistently. Frontend validation strips to bare domain; competitor audit re-adds `https://` prefix via `startAnalysis()`.
**Why it happens:** LLM output is unpredictable in format.
**How to avoid:** In `competitor_discovery.py`, normalize the output: strip protocols and paths, keep only `hostname` component using `urlparse`. Before storing, normalize to bare domain. Before calling `POST /analyze/`, prefix with `https://`.

### Pitfall 4: Competitor Cap Checked at Wrong Layer

**What goes wrong:** Cap (3 for Pro, 10 for Agency) checked only when calling `POST /analyze/` — but that endpoint doesn't know the competitor context and only checks the monthly quota. The competitor-specific cap must be checked separately.
**Why it happens:** D-17 says competitor audits count against monthly quota (handled by `/analyze/`), but D-13 defines a separate per-group competitor cap.
**How to avoid:** Enforce cap in `POST /competitors/groups/{group_id}/sites` — count existing `competitor_sites` for the group before inserting. Return 403 with `{"code": "competitor_cap_reached", "cap": 3}` if limit exceeded. The monthly quota remains enforced by `/analyze/` independently.

### Pitfall 5: Polling Competitor Audit Status Without Cleanup

**What goes wrong:** Frontend polls `GET /sites/{analysis_id}` indefinitely even after completion. Stale intervals accumulate if the component unmounts.
**Why it happens:** React `setInterval` without cleanup.
**How to avoid:** Follow the `useEffect` + cleanup pattern already in `page.tsx`:
```typescript
useEffect(() => {
  if (!pendingSites.length) return;
  const id = setInterval(async () => { /* refetch group */ }, 3000);
  return () => clearInterval(id);  // cleanup on unmount or when pendingSites clears
}, [pendingSites]);
```

### Pitfall 6: History Dropdown Shows Too Many Sites

**What goes wrong:** `PrimarySiteSelector` calls `getHistory()` which returns up to 50 items by default — if a user has 50 audits, the dropdown is bloated.
**Why it happens:** No domain deduplication in the history list.
**How to avoid:** Group by `domain` in the dropdown — deduplicate by domain, show only the most recent analysis per domain. For each unique domain, track the `id` (analysis_id) of the most recent analysis and use that as the `value` for the select option.

### Pitfall 7: SQLite WAL Concurrent Write Conflict

**What goes wrong:** `competitor_groups` and `competitor_sites` writes from the API process conflict with Celery worker writes to `analyses`.
**Why it happens:** SQLite WAL mode allows one writer at a time. The `_lock = threading.Lock()` in `history_store.py` only protects within-process writes.
**How to avoid:** Wrap all new `competitor_groups`/`competitor_sites` writes in `with _lock:` exactly as all other write operations in `history_store.py`. The WAL + `_lock` pattern is already established and adequate — no additional synchronization needed.

---

## Code Examples

### Backend: Discovery Prompt Structure (D-05)

```python
# Source: pattern from backend/app/analyzers/geo_probe.py _generate_questions()
def _build_discovery_prompt(
    site_url: str,
    site_type: str,
    key_topics: list[str],
    probe_questions: list[str],
) -> str:
    domain = _extract_domain(site_url)
    parts = [
        f"Primary website: {domain}",
        f"Site type: {site_type}",
        f"Key topics: {', '.join(key_topics[:8]) if key_topics else 'not determined'}",
        f"Sample user queries for this site: {'; '.join(probe_questions[:3]) if probe_questions else 'none'}",
        "",
        "Generate 5-8 competitor domains that directly compete with this website.",
        "For each competitor, provide a one-sentence reason why they compete.",
        'Return ONLY a JSON array: [{"domain": "competitor.com", "reason": "..."}]',
        "No markdown, no explanation, no additional text.",
    ]
    return "\n".join(parts)
```

### Backend: Competitor Store Helpers Skeleton

```python
# New functions in backend/app/store/history_store.py

def create_competitor_group(user_id: str, primary_analysis_id: str) -> dict[str, Any]:
    """Get-or-create: return existing group if one already exists for this primary_analysis_id."""
    # SELECT first; INSERT only if not found
    group_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            existing = conn.execute(
                "SELECT * FROM competitor_groups WHERE user_id=? AND primary_analysis_id=?",
                (user_id, primary_analysis_id)
            ).fetchone()
            if existing:
                return dict(existing)
            conn.execute(
                "INSERT INTO competitor_groups (id, user_id, primary_analysis_id, created_at) VALUES (?,?,?,?)",
                (group_id, user_id, primary_analysis_id, now)
            )
            conn.commit()
        finally:
            conn.close()
    return get_competitor_group(group_id, user_id)

def add_competitor_site(group_id: str, url: str) -> dict[str, Any]:
    site_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO competitor_sites (id, group_id, url, analysis_id, created_at) VALUES (?,?,?,NULL,?)",
                (site_id, group_id, url, now)
            )
            conn.commit()
        finally:
            conn.close()
    return {"id": site_id, "group_id": group_id, "url": url, "analysis_id": None, "created_at": now}

def link_competitor_analysis(site_id: str, analysis_id: str) -> None:
    """Called after POST /analyze/ succeeds — records the task_id against the competitor site."""
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE competitor_sites SET analysis_id=? WHERE id=?",
                (analysis_id, site_id)
            )
            conn.commit()
        finally:
            conn.close()
```

### Frontend: Radar Chart Axis Extraction

```typescript
// Source: derived from api.ts ScoreResult and GeoResponse types
interface RadarDimensions {
  nlp: number;
  structured_data: number;
  eeat: number;
  conversational: number;
  entity: number;
  technical: number;
}

function extractRadarDimensions(record: HistoryRecord): RadarDimensions {
  const bd = record.score_breakdown;
  return {
    nlp:             bd?.nlp?.raw             ?? 0,
    structured_data: bd?.structured_data?.raw ?? 0,
    eeat:            bd?.eeat?.raw            ?? 0,
    conversational:  bd?.conversational?.raw  ?? 0,
    entity:          record.geo_data?.entity?.entity_score ?? 0,
    technical:       bd?.technical?.raw       ?? 0,
  };
}
```

### Frontend: API Route Map for `/competitors/`

```typescript
// Appended to frontend/app/lib/api.ts

// GET  /competitors/groups                   — list user's groups (with primary domain)
// GET  /competitors/groups/{group_id}        — single group with all sites + analysis data
// POST /competitors/groups                   — create (or get-or-create) group for a primary_analysis_id
// POST /competitors/discover                 — trigger Claude discovery, returns suggestions
// POST /competitors/groups/{id}/sites        — add a competitor_site + dispatch audit
// DELETE /competitors/groups/{id}/sites/{site_id} — remove a competitor site
// POST /competitors/groups/{id}/sites/{site_id}/reaudit — re-dispatch audit (burns quota)

export async function discoverCompetitors(primaryAnalysisId: string): Promise<CompetitorSuggestion[]> {
  const res = await apiFetch(`${API_BASE}/competitors/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ primary_analysis_id: primaryAnalysisId }),
  });
  if (!res.ok) throw new Error("Discovery failed");
  return res.json();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts for charts | Custom SVG (no library) | Established from project start | Radar chart MUST be custom SVG — zero new deps |
| Global unscoped DB functions | `user_id` scoped queries | Phase 04 | All new competitor CRUD must scope by `user_id` |
| Raw quota tracking | `increment_audit_count()` + `maybe_reset_pro_audit_count()` | Phase 05 | Competitor audits handled automatically by `/analyze/` flow |
| Single-user history | Per-user isolation with `user_id` FK | Phase 04 | `competitor_groups.user_id` must be included in all WHERE clauses |

---

## Open Questions

1. **Where does homepage content come from for the discovery prompt?**
   - What we know: `geo_data.content` has aggregate stats (avg_word_count, reading_level). No raw homepage text in `analyses` table.
   - What's unclear: D-05 says "homepage content summary" — the best proxy available is `key_topics` (from `nlp`) + `faq_questions` from `content`. No raw text stored.
   - Recommendation: Use `key_topics` + `faq_questions[:3]` + `site_type` as the "content summary" proxy. Do not fetch the live URL again. This is sufficient context for Claude to generate meaningful suggestions.

2. **Linking `analysis_id` back to `competitor_sites` after dispatch**
   - What we know: `POST /analyze/` returns `{site_id: task_id}`. The competitor route calls this and receives the `task_id`.
   - What's unclear: D-11 says `analysis_id` is null until audit completes — but we can link it immediately after dispatch (we have the `task_id` right away).
   - Recommendation: `link_competitor_analysis(site_id, task_id)` immediately after `process_site.delay()` succeeds. The `analysis_id` being populated means "audit dispatched" — completion is determined by polling `GET /sites/{analysis_id}` for `status === "completed"`.

3. **EngineScores component accepts `ScoreResult` — but competitor records may not have engine_scores yet**
   - What we know: `EngineScores` component early-returns null when `engineScores` is empty.
   - What's unclear: Will all competitor analyses always have `engine_scores` populated?
   - Recommendation: `EngineScores` already handles this gracefully (returns null). `SiteComparisonCard` should handle null score gracefully — show "Score pending" placeholder when `geo_data?.score` is null.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 introduces no new external services, CLI tools, or runtimes. All dependencies (SQLite, FastAPI, Anthropic SDK, Next.js) are already installed and running.

---

## Validation Architecture

nyquist_validation is `true` in `.planning/config.json` — validation section is included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (Python backend tests) |
| Config file | none — tests discovered by convention in `backend/tests/` |
| Quick run command | `docker exec -it ai_seo_backend pytest backend/tests/test_competitors.py -x -q` |
| Full suite command | `docker exec -it ai_seo_backend pytest backend/tests/ -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | `create_competitor_group` returns existing group on duplicate `primary_analysis_id` | unit | `pytest backend/tests/test_competitors.py::test_get_or_create_group -x` | Wave 0 |
| COMP-02 | Competitor cap: Pro plan rejects 4th competitor with 403 | unit | `pytest backend/tests/test_competitors.py::test_competitor_cap_pro -x` | Wave 0 |
| COMP-03 | Free plan returns 403 on `POST /competitors/groups` | unit | `pytest backend/tests/test_competitors.py::test_competitor_free_plan_gate -x` | Wave 0 |
| COMP-04 | `discover_competitors` returns None gracefully when ANTHROPIC_API_KEY missing | unit | `pytest backend/tests/test_competitors.py::test_discovery_no_api_key -x` | Wave 0 |
| COMP-05 | `link_competitor_analysis` updates `analysis_id` in `competitor_sites` | unit | `pytest backend/tests/test_competitors.py::test_link_competitor_analysis -x` | Wave 0 |
| COMP-06 | Radar dimension extraction uses `entity_score` from `geo_data.entity`, not `score_breakdown` | manual | Review `extractRadarDimensions()` logic | — |

### Sampling Rate

- **Per task commit:** `docker exec -it ai_seo_backend pytest backend/tests/test_competitors.py -x -q`
- **Per wave merge:** `docker exec -it ai_seo_backend pytest backend/tests/ -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/test_competitors.py` — covers COMP-01 through COMP-05
- [ ] Fixture in `backend/tests/conftest.py` — `pro_user_with_group` fixture (user + subscription + primary analysis + competitor_group)

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md contains only system description — no explicit coding directives, forbidden patterns, or testing requirements beyond what is already captured in the project conventions. The following constraints are inferred from the project's architecture and previous phase decisions:

1. No new external Python packages without explicit need — use existing `anthropic`, `sqlite3`, `fastapi`
2. No new Node/npm packages — no recharts, no d3, no shadcn
3. All new backend routes use `APIRouter`, mounted in `main.py` with prefix
4. All routes protected by `get_current_user` FastAPI Depends
5. All SQLite writes use `with _lock:` pattern from `history_store.py`
6. Frontend components: `"use client"` directive, PascalCase filenames, Tailwind utilities only, inline SVG icons
7. TypeScript types centralized in `frontend/app/lib/api.ts`
8. No `print()` logging — existing codebase uses print/traceback but CLAUDE.md documents this as a known issue (SEC-05 pending); new code should not add more print() calls
9. Return 404 (not 403) on cross-user resource access to prevent existence leakage (Phase 04 decision)

---

## Sources

### Primary (HIGH confidence)

- `backend/app/store/history_store.py` — init_db pattern, _lock pattern, _add_column_if_missing, all CRUD patterns
- `backend/app/api/routes/analyze.py` — quota check pattern, Celery dispatch pattern
- `backend/app/api/routes/history.py` — user-scoped query pattern
- `backend/app/analyzers/geo_probe.py` — Claude API call pattern, JSON parse with fallback
- `backend/app/dependencies/auth.py` — get_current_user, get_current_subscription dependencies
- `backend/app/main.py` — route mounting pattern
- `frontend/app/lib/api.ts` — TypeScript type patterns, apiFetch helper, all existing type shapes
- `frontend/app/components/history/ScoreTrendChart.tsx` — custom SVG chart implementation (no recharts)
- `frontend/app/components/geo/GeoScoreRing.tsx` — reusable score ring, size prop
- `frontend/app/components/geo/EngineScores.tsx` — engine card component, null guard pattern
- `frontend/app/components/LockedFeature.tsx` — plan gate component, quota:exceeded event dispatch
- `frontend/app/page.tsx` — MainTab union type, nav array pattern, tab panel conditional rendering, Spinner component
- `.planning/phases/07-add-a-competitor-tracking-feature-to-the-ai-seo-tool/07-CONTEXT.md` — all 19 locked decisions
- `.planning/phases/07-add-a-competitor-tracking-feature-to-the-ai-seo-tool/07-UI-SPEC.md` — component inventory, color/typography/spacing, recharts correction

### Secondary (MEDIUM confidence)

- Phase 04 CONTEXT.md — JWT cookie auth, get_current_user pattern
- Phase 05 CONTEXT.md — plan tier definitions, quota enforcement decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing, verified from package.json and source files
- Architecture patterns: HIGH — verified from source code, no novel patterns
- Custom SVG radar chart: HIGH — ScoreTrendChart.tsx proves approach; 6-axis polar math is straightforward
- Claude discovery prompt: MEDIUM — prompt structure is Claude's discretion per CONTEXT.md; pattern mirrors geo_probe.py (HIGH confidence); exact prompt effectiveness is untestable without running it
- Pitfalls: HIGH — entity score gap verified from api.ts type definitions; cap/quota separation verified from analyze.py; polling pattern verified from page.tsx

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack, no fast-moving dependencies)
