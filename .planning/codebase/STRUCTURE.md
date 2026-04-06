---
focus: arch
document: STRUCTURE
generated: 2026-03-30
---

# Directory & File Structure

## Top-Level Layout

```
d:/AI SEO Tool/
├── backend/                  # Python backend (FastAPI + Celery)
├── frontend/                 # Next.js frontend
├── docker-compose.yml        # Container orchestration (redis, backend, worker)
├── CLAUDE.md                 # Project documentation
├── .env                      # Secrets (GOOGLE_PSI_API_KEY, ANTHROPIC_API_KEY, etc.)
└── AI SEO Tool.pdf           # Project spec document
```

---

## Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py               # FastAPI app factory, router mounting, CORS config
│   ├── analyzers/            # Core analysis engines
│   │   ├── crawler.py        # BFS web crawler (50 concurrent, httpx, streaming)
│   │   ├── audit.py          # Technical checks (HTTPS, sitemap, PSI, security headers)
│   │   ├── robots.py         # robots.txt parser + AI bot access checker
│   │   ├── page_inventory.py # Sitemap fetcher + URL sampling strategy
│   │   ├── geo_site_type.py  # Site type classifier (Wave 0)
│   │   ├── geo_schema.py     # JSON-LD/Microdata/RDFa extractor (Wave 1)
│   │   ├── geo_content.py    # Content quality analyzer (Wave 1)
│   │   ├── geo_eeat.py       # E-E-A-T trust signals (Wave 1)
│   │   ├── geo_page_scores.py# Per-page GEO scorer (Wave 1)
│   │   ├── geo_nlp.py        # NLP + Claude API snippet analysis (Wave 2)
│   │   ├── geo_probe.py      # Multi-engine AI visibility probe via Claude (Wave 2)
│   │   ├── geo_entity.py     # Entity authority analyzer (Wave 2)
│   │   ├── geo_score.py      # Final unified + per-engine score computation
│   │   └── geo_suggestions.py# Claude API suggestions generator
│   ├── api/
│   │   └── routes/
│   │       ├── analyze.py    # POST /analyze/ — start crawl
│   │       ├── sites.py      # GET /sites/{id}/... — crawl results
│   │       ├── geo.py        # GET /sites/{id}/geo/... — GEO results
│   │       ├── history.py    # GET /history/ — past analyses
│   │       └── schedules.py  # CRUD /schedules/ — recurring audits
│   ├── schemas/
│   │   └── analysis.py       # Pydantic request/response models
│   ├── store/
│   │   ├── crawl_store.py    # Redis read/write (crawl pages + metadata)
│   │   └── history_store.py  # SQLite read/write (history + schedules)
│   ├── utils/
│   │   └── url_validator.py  # URL validation (format, private IPs, length)
│   └── worker/
│       ├── celery_app.py     # Celery app + Beat scheduler config
│       ├── tasks.py          # `process_site` Celery task (main orchestrator)
│       └── geo_pipeline.py   # GEO wave orchestrator (Wave 0 → 1 → 2 → score)
└── requirements.txt          # Python dependencies
```

### Key Backend Files by Size
| File | Lines | Purpose |
|------|-------|---------|
| `analyzers/crawler.py` | ~902 | Main crawl engine |
| `analyzers/geo_page_scores.py` | ~667 | Per-page scoring |
| `analyzers/page_inventory.py` | ~593 | Sitemap + sampling |
| `store/history_store.py` | ~471 | SQLite persistence |
| `analyzers/geo_eeat.py` | ~407 | E-E-A-T detection |
| `analyzers/geo_content.py` | ~377 | Content analysis |
| `api/routes/geo.py` | ~370 | GEO API endpoints |
| `analyzers/geo_probe.py` | ~347 | AI visibility probe |

---

## Frontend (`frontend/`)

```
frontend/
├── app/
│   ├── page.tsx              # Main UI shell — tab routing, state, URL bar
│   ├── layout.tsx            # Root Next.js layout (metadata, fonts)
│   ├── globals.css           # Global styles (Tailwind base)
│   ├── favicon.ico
│   ├── lib/
│   │   └── api.ts            # API client (fetch wrappers) + all TypeScript types
│   └── components/
│       ├── geo/              # GEO Analysis tab components (14 files)
│       │   ├── GeoTab.tsx        # GEO tab container, sub-tab routing
│       │   ├── GeoScoreRing.tsx  # Animated score ring (SVG)
│       │   ├── ScoreBreakdown.tsx# Category bar chart
│       │   ├── EngineScores.tsx  # Per-engine score cards
│       │   ├── SuggestionsList.tsx# Prioritized recommendations
│       │   ├── SchemaPanel.tsx   # Schema sub-tab
│       │   ├── ContentPanel.tsx  # Content sub-tab
│       │   ├── EeatPanel.tsx     # E-E-A-T sub-tab
│       │   ├── NlpPanel.tsx      # NLP sub-tab
│       │   ├── ProbePanel.tsx    # Visibility probe sub-tab
│       │   ├── EntityPanel.tsx   # Entity authority sub-tab
│       │   ├── PageScoresPanel.tsx# Per-page scores sub-tab
│       │   ├── ChecklistPanel.tsx # SEO checklist (Insights tab)
│       │   └── SiteStructurePanel.tsx # URL tree (Insights tab)
│       ├── history/
│       │   ├── HistoryTab.tsx    # History tab container
│       │   └── ScoreTrendChart.tsx # Score trend line chart
│       └── schedules/
│           └── SchedulesTab.tsx  # Schedules management UI
├── eslint.config.mjs         # ESLint 9 flat config
├── next.config.ts            # Next.js config
├── postcss.config.mjs        # PostCSS + Tailwind v4
├── tsconfig.json             # TypeScript config (strict, ES2017)
└── package.json              # Dependencies (Next.js 16, React 19, Tailwind 4)
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service definitions: redis, backend (port 8000), worker |
| `.env` | `GOOGLE_PSI_API_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| `frontend/tsconfig.json` | TypeScript strict mode, `@/*` path alias |
| `frontend/eslint.config.mjs` | ESLint 9 flat config (Next.js rules) |
| `backend/requirements.txt` | Python deps with `>=` version pins |

---

## Module Organization Philosophy

- **Backend**: Feature-per-file in `analyzers/`; each GEO agent is its own module
- **Frontend**: Feature-per-component in `components/`; all API types centralized in `lib/api.ts`
- **No shared monorepo tooling** — backend and frontend are independent projects within the same repo
