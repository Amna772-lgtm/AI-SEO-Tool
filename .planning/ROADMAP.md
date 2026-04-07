# Roadmap: AI SEO Tool — GEO Citation Readiness Platform

**Milestone:** v1 — Accuracy & Production Hardening
**Created:** 2026-03-31
**Granularity:** Coarse

## Phases

- [x] **Phase 1: Pipeline Efficiency** - Remove redundant fetches, consolidate parsing, reduce API cost — no user-visible changes
- [ ] **Phase 2: Scoring Accuracy** - Fix E-E-A-T detection, factual density, and integrate all signals into the final score
- [ ] **Phase 3: Security, Tests & UX** - Add auth, rate limiting, structured logging, test suite, and UI improvements

---

## Phase Details

### Phase 1: Pipeline Efficiency

**Goal**: The GEO pipeline runs without redundant HTTP fetches or duplicate parsing, and probe API costs are reduced by at least 38%.
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05
**Success Criteria** (what must be TRUE):
  1. A full analysis completes without the GEO pipeline making any outbound HTTP requests for pages already in Redis
  2. HTML for each page is parsed exactly once; all GEO analyzers consume the same parsed structure
  3. `_flesch_kincaid_grade` and `_count_syllables` are defined only in `geo_features.py`; `geo_content.py` and `geo_page_scores.py` import them and contain no local float implementations (crawler.py's string-label `_compute_readability` is preserved — different function, different consumer)
  4. The probe stage issues 15 Claude API calls or fewer per analysis (3 questions x 5 engines) instead of 26
  5. The preliminary score computation path is removed; suggestions receive partial data directly from Wave 1 results
**Plans**:
1. HTML Caching + GEO Pipeline Rewire (PIPE-01)
2. Shared Parse + FK Deduplication (PIPE-02, PIPE-03)
3. Dead Code Removal + Probe Reduction (PIPE-04, PIPE-05)
**UI hint**: no

---

### Phase 2: Scoring Accuracy

**Goal**: The GEO citation score reflects genuine content signals — per-page scores feed the unified score, E-E-A-T detection is semantically grounded, and technical signals (AI crawler access, security headers, mobile PSI) are included in the final score.
**Depends on**: Phase 1
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07, SCORE-08, SCORE-09
**Success Criteria** (what must be TRUE):
  1. E-E-A-T expertise signals are only counted when detected credential patterns match the topic area of the page they appear on
  2. Citation links are only counted when they resolve to actual doi.org, pubmed, or ncbi document URLs — not bare text mentions
  3. Trust page detection does not false-positive on pages that merely contain the word "contact" or "privacy" in body copy
  4. Factual density counts (statistics, currency, citations) exclude content inside nav, footer, and known ad container elements
  5. The final unified score changes when per-page GEO scores change — per-page averages are a measurable input to the unified score
  6. A site that blocks all 7 AI crawlers in robots.txt receives a lower technical dimension score than an otherwise identical site that permits them
  7. A site with zero security headers scores lower in the technical dimension than an otherwise identical site with all five headers present
  8. The scoring engine uses mobile PSI data as the primary performance input; desktop PSI data is displayed in the UI only
**Plans**: TBD
**UI hint**: no

---

### Phase 3: Security, Tests & UX

**Goal**: The API is protected by authentication and rate limiting, all errors are logged with structure, the test suite covers core scoring and validation logic, and the UI exposes crawl progress and actionable controls.
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, TEST-01, TEST-02, TEST-03, TEST-04, UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Requests to /analyze/ and all /sites/ routes without a valid API key receive a 401 response
  2. More than N requests per minute to /analyze/ from the same IP receive a 429 response
  3. GET /health returns 200 and GET /ready returns 200 only when Redis and the worker are reachable
  4. All error paths write structured log entries with level, module, and message — no bare except/pass blocks and no print() calls remain
  5. Running pytest produces passing tests for geo_score.py weight dimensions, url_validator.py edge cases, geo_eeat.py credential/trust-page patterns, and the /analyze/ + /sites/{id} API routes
  6. The crawl progress bar shows a percentage and the current phase label (Crawling / Technical Checks / GEO Analysis) as the job runs
  7. The pages table has an export button that downloads all pages as a CSV with all columns
  8. Failed crawls show a retry button that re-submits the same URL
  9. Per-engine probe score cards are labeled "Simulated" with a tooltip explaining the scores are Claude-generated estimates
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pipeline Efficiency | 0/3 | Ready to execute | - |
| 2. Scoring Accuracy | 0/0 | Not started | - |
| 3. Security, Tests & UX | 0/0 | Not started | - |

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 1 | Pending |
| PIPE-02 | Phase 1 | Pending |
| PIPE-03 | Phase 1 | Pending |
| PIPE-04 | Phase 1 | Pending |
| PIPE-05 | Phase 1 | Pending |
| SCORE-01 | Phase 2 | Pending |
| SCORE-02 | Phase 2 | Pending |
| SCORE-03 | Phase 2 | Pending |
| SCORE-04 | Phase 2 | Pending |
| SCORE-05 | Phase 2 | Pending |
| SCORE-06 | Phase 2 | Pending |
| SCORE-07 | Phase 2 | Pending |
| SCORE-08 | Phase 2 | Pending |
| SCORE-09 | Phase 2 | Pending |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |
| SEC-03 | Phase 3 | Pending |
| SEC-04 | Phase 3 | Pending |
| SEC-05 | Phase 3 | Pending |
| TEST-01 | Phase 3 | Pending |
| TEST-02 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 3 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-02 | Phase 3 | Pending |
| UX-03 | Phase 3 | Pending |
| UX-04 | Phase 3 | Pending |

**Coverage: 26/26 v1 requirements mapped. No orphans.**

### Phase 4: Add user authentication with Signup Signin Session management and Logout

**Goal:** Multi-user accounts gate the entire tool — open registration with email/name/password, JWT HTTP-only cookie sessions (24h), per-user data isolation for history and schedules, full app redirected to /login when unauthenticated, session-expired re-auth modal mid-use, and a sidebar logout button.
**Requirements**: AUTH-D01, AUTH-D02, AUTH-D03, AUTH-D05, AUTH-D06, AUTH-D07, AUTH-D08, AUTH-D09, AUTH-D10, AUTH-D11, AUTH-D12, AUTH-D13, AUTH-D14
**Depends on:** Phase 3
**Plans:** 4/4 plans complete

Plans:
- [x] 04-01-PLAN.md — Backend auth foundation: users table, /auth router (signup/signin/logout/me), get_current_user dependency, pytest scaffolding
- [x] 04-02-PLAN.md — Protect existing routes with auth dependency + per-user data isolation (user_id columns + scoped queries) + cross-user isolation tests
- [x] 04-03-PLAN.md — Frontend foundation: api.ts credentials + 401 dispatch, AuthContext, proxy.ts route guard, /login and /signup pages
- [x] 04-04-PLAN.md — Wire AuthProvider into layout, SessionExpiredModal, sidebar user info + Sign-out button (manual UAT)

### Phase 5: Implement Pricing Plan Selection Flow After Signup

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 4
**Plans:** 4/4 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 5 to break down) (completed 2026-04-07)

---
*Roadmap created: 2026-03-31*
