# Requirements: AI SEO Tool — GEO Citation Readiness Platform

**Defined:** 2026-03-31
**Core Value:** Give website owners a credible, actionable score for AI citation readiness

## v1 Requirements — Milestone: Accuracy & Production Hardening

Requirements for this improvement milestone. All improvements to the existing working system.

### Pipeline Efficiency

- [x] **PIPE-01**: GEO pipeline uses already-crawled HTML from Redis instead of re-fetching pages over HTTP
- [x] **PIPE-02**: HTML is parsed once per page; extracted features shared across all GEO analyzers (no 4× redundant BeautifulSoup instantiation)
- [x] **PIPE-03**: Flesch-Kincaid readability is computed once (in a new geo_features.py) and reused; duplicate float implementations in geo_content.py and geo_page_scores.py removed (crawler.py's string-label version is preserved — it serves the frontend)
- [x] **PIPE-04**: Preliminary score removed; suggestions generator receives partial data directly
- [x] **PIPE-05**: Probe API calls reduced from 26 to ≤16 per analysis (3 questions per engine vs. 5)

### Scoring Accuracy

- [ ] **SCORE-01**: E-E-A-T expertise detection uses topic-entity alignment (expertise must match page topic area, not just be present on page)
- [ ] **SCORE-02**: Citation detection validates that doi.org / pubmed / ncbi patterns link to real citations (not just text mentions)
- [ ] **SCORE-03**: Credential pattern recognition expanded to include board-certified, fellowship-trained, CISSP, CPA, PE, LCSW, and other professional designations
- [ ] **SCORE-04**: Trust page detection uses content heuristics (not just URL pattern matching) to reduce false positives
- [ ] **SCORE-05**: Factual density scoring filters out nav, footer, and ad zones before counting signals
- [ ] **SCORE-06**: Per-page GEO scores averaged into the final unified score (not computed separately and discarded)
- [ ] **SCORE-07**: AI crawler access (robots.txt bot check) factored into technical dimension score — sites blocking all AI crawlers are penalized
- [ ] **SCORE-08**: Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) included in technical dimension score
- [ ] **SCORE-09**: PSI defaults to mobile-only for scoring; desktop metrics shown in UI but not included in score

### Security & Reliability

- [ ] **SEC-01**: All API endpoints protected by API key authentication
- [ ] **SEC-02**: Rate limiting applied per IP (max N requests per minute to /analyze/)
- [ ] **SEC-03**: All bare `except Exception: pass` blocks replaced with structured error logging
- [ ] **SEC-04**: Health check endpoints (`/health`, `/ready`) added to backend
- [ ] **SEC-05**: All `print()` logging replaced with Python `logging` module (structured, leveled)

### Test Coverage

- [ ] **TEST-01**: Unit tests for `geo_score.py` covering all 8 weight dimensions with known inputs/outputs
- [ ] **TEST-02**: Unit tests for `url_validator.py` covering valid URLs, private IPs, malformed inputs
- [ ] **TEST-03**: Unit tests for `geo_eeat.py` credential and trust-page detection patterns
- [ ] **TEST-04**: Integration tests for `/analyze/` and `/sites/{id}` API routes using FastAPI TestClient

### User Experience

- [ ] **UX-01**: Crawl progress shows percentage complete and current phase (crawling / technical checks / GEO analysis)
- [ ] **UX-02**: Pages table exportable as CSV (all columns, all pages)
- [ ] **UX-03**: Failed crawls show a retry button
- [ ] **UX-04**: Per-engine probe scores labeled as "simulated" in the UI with a tooltip explanation

## v2 Requirements — Future Milestone

Deferred — not in current roadmap.

### Advanced Signals
- **ADV-01**: Backlink profile analysis via Common Crawl or third-party API
- **ADV-02**: JavaScript SPA detection with optional Playwright/Puppeteer rendering
- **ADV-03**: Topical coverage clustering (group pages by topic, measure depth per cluster)
- **ADV-04**: Real AI engine API integration where available (Perplexity API)
- **ADV-05**: Ground-truth calibration dataset for scoring weight validation

### Infrastructure
- **INF-01**: PostgreSQL migration (replace SQLite for concurrent safety)
- **INF-02**: Multi-user accounts with session-based auth
- **INF-03**: WebSocket/SSE for real-time crawl progress (replace polling)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real ChatGPT / Gemini / Grok API calls | No public API; separate keys per user; future milestone |
| Backlink / domain authority scoring | Requires third-party data providers |
| Multi-user / SaaS billing | Single-user tool for current milestone |
| Mobile app | Web-only |
| Crawl customization UI | Deferred UX improvement |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 through PIPE-05 | Phase 1 | Pending |
| SCORE-01 through SCORE-05 | Phase 2 | Pending |
| SCORE-06 through SCORE-09 | Phase 2 | Pending |
| SEC-01 through SEC-05 | Phase 3 | Pending |
| TEST-01 through TEST-04 | Phase 3 | Pending |
| UX-01 through UX-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 — initial definition from brownfield analysis*
