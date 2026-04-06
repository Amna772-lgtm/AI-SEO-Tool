# AI SEO Tool — GEO Citation Readiness Platform

## What This Is

An AI-powered SEO audit and citation readiness platform. Users submit a website URL and the system automatically crawls every page, extracts SEO metadata, runs a full technical health check, and scores how likely AI-powered search engines (ChatGPT, Claude, Perplexity, Gemini, Grok) are to cite the site. Results are stored permanently and users can schedule recurring re-audits to track improvements over time.

## Core Value

**Give website owners a credible, actionable score for AI citation readiness** — not just SEO metrics, but a genuine assessment of whether AI engines will find, understand, and cite their content.

## Requirements

### Validated

- ✓ Full-site BFS crawl with smart sitemap sampling (50 concurrent, streaming to Redis)
- ✓ Technical audit (HTTPS, sitemap, PageSpeed, broken links, canonicals, security headers)
- ✓ GEO pipeline — 8-dimension citation readiness score with per-engine breakdowns
- ✓ Schema/structured data extraction (JSON-LD, Microdata, RDFa)
- ✓ E-E-A-T analysis (author signals, trust pages, expertise, citations)
- ✓ Content quality analysis (word count, readability, FAQ detection, factual density)
- ✓ NLP analysis via Claude API (intent, snippet readiness, query patterns)
- ✓ Multi-engine AI visibility probe (Claude simulating 5 engine personas)
- ✓ Entity authority analysis (Wikipedia, sameAs, org schema, authority links)
- ✓ Per-page GEO scoring (5 categories per page, A–F grade)
- ✓ Prioritized recommendations (Critical / Important / Optional)
- ✓ History (persistent SQLite, trend charts, side-by-side comparison)
- ✓ Scheduled re-audits (daily / weekly / monthly via Celery Beat)
- ✓ React/Next.js frontend with 7-tab UI (Dashboard, Spider, Technical, GEO, Insights, History, Schedules)

### Active

- [ ] Fix E-E-A-T scoring accuracy (40–60% → 80%+): topic-entity alignment, citation validation, expanded credential patterns
- [ ] Eliminate redundant HTTP re-fetching in GEO pipeline (pass crawled HTML instead of re-fetching)
- [ ] Consolidate 4× HTML parsing per page into a single parse pass
- [ ] Integrate per-page scores into the final unified score
- [ ] Add AI crawler access signals to technical scoring
- [ ] Add security headers to technical score dimension
- [ ] Fix factual density false positives (filter out nav/footer/ad zones)
- [ ] Reduce probe API cost (26 Claude calls → 16 with 3 questions per engine)
- [ ] Add authentication + rate limiting to all API endpoints
- [ ] Add structured logging (replace print() with logging module)
- [ ] Add automated test suite starting with geo_score.py and url_validator.py
- [ ] Add crawl progress indicator (% complete + current phase)
- [ ] Add pages CSV export endpoint
- [ ] JavaScript SPA detection + optional Playwright rendering

### Out of Scope

- Real ChatGPT/Gemini/Grok API integration — requires separate API keys per user; deferred to future milestone
- Backlink/domain authority analysis — requires third-party data providers (Moz, Ahrefs); deferred
- Real SERP/AI snippet inclusion data — no public API exists; deferred
- Multi-user accounts / SaaS billing — single-user tool for now
- Mobile app — web-only

## Context

**This is a brownfield project** — the full system is implemented and working. The current work focuses on improving accuracy, reliability, and production readiness of the existing implementation.

**Key technical findings from codebase analysis (2026-03-31):**
- GEO pipeline uses Claude personas to simulate other AI engines — scores are estimates, not real data
- All scoring weights are hardcoded guesses with no empirical validation
- E-E-A-T detection has ~40-60% accuracy due to shallow regex pattern matching
- GEO pipeline re-fetches pages already in Redis (double HTTP cost)
- HTML is parsed 4× per page by independent modules
- 26 Claude API calls per analysis (1 question-gen + 5 engines × 5 questions)
- Zero automated tests anywhere in the codebase
- No auth or rate limiting on any endpoint
- SQLite shared between 2 containers (write-conflict risk)

**Stack:** FastAPI + Celery + Redis (Python 3.11) | Next.js 16 + React 19 + TypeScript + TailwindCSS 4 | Docker Compose | SQLite | Anthropic Claude API | Google PageSpeed Insights API

## Constraints

- **Tech Stack**: Python 3.11 backend, Next.js 16 frontend — no language changes
- **Compatibility**: Docker Compose deployment — changes must work within existing container setup
- **API Budget**: Claude API calls are paid — probe cost reduction is a priority
- **No Auth Yet**: No user system exists — adding auth is in scope for this milestone
- **Single-instance**: SQLite is acceptable for current scale; PostgreSQL migration deferred

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Simulate engine personas with Claude | No public APIs for ChatGPT/Gemini/Grok | — Pending (works, but not ground truth) |
| Redis ephemeral + SQLite persistent split | Fast live access vs. permanent history | ✓ Good |
| 50-concurrent BFS crawl | Speed vs. server load balance | ✓ Good |
| Wave-based GEO pipeline | Parallelism within dependency constraints | ✓ Good |
| Smart sampling for large sites | Avoid crawling 4000+ pages per audit | ✓ Good |
| Hardcoded scoring weights | No training data available | ⚠️ Revisit (needs empirical calibration) |

---
*Last updated: 2026-03-31 — initial project initialization from brownfield codebase analysis*
