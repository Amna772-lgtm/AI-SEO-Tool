---
phase: "01"
plan: "1-2-3"
subsystem: "geo-pipeline"
tags: ["performance", "redis", "html-cache", "beautifulsoup", "deduplication", "api-cost"]
dependency_graph:
  requires: []
  provides: ["html-cache", "shared-page-features", "reduced-probe-api-calls"]
  affects: ["geo_pipeline", "geo_schema", "geo_content", "geo_page_scores", "geo_suggestions", "geo_probe"]
tech_stack:
  added: ["geo_features.py"]
  patterns: ["shared-parse", "redis-html-hash", "http-fallback", "canonical-fk-implementation"]
key_files:
  created:
    - "backend/app/analyzers/geo_features.py"
  modified:
    - "backend/app/store/crawl_store.py"
    - "backend/app/analyzers/crawler.py"
    - "backend/app/worker/tasks.py"
    - "backend/app/worker/geo_pipeline.py"
    - "backend/app/analyzers/geo_schema.py"
    - "backend/app/analyzers/geo_content.py"
    - "backend/app/analyzers/geo_page_scores.py"
    - "backend/app/analyzers/geo_suggestions.py"
    - "backend/app/analyzers/geo_probe.py"
decisions:
  - "HTTP fallback preserved in geo_pipeline.py for pre-deploy or cache-miss scenarios"
  - "geo_eeat.py excluded from shared parse — uses raw string regex, not BeautifulSoup"
  - "JSON-LD extraction runs BEFORE tag stripping in geo_features.py to preserve script blocks"
  - "_compute_fk_grade alias used in geo_page_scores.py import to minimize call-site changes"
  - "crawler.py _compute_readability() string-label function preserved — frontend Spider tab consumes it"
metrics:
  duration: "~20 minutes"
  completed: "2026-03-31"
  tasks_completed: 10
  files_modified: 9
  files_created: 1
---

# Phase 1 Plans 1-2-3: Pipeline Efficiency Summary

HTML cached in Redis during crawl; GEO pipeline reads from cache with HTTP fallback; single BeautifulSoup parse per page shared across Wave 1 analyzers; FK duplication eliminated; preliminary score removed; probe reduced from 5 to 3 questions (38.5% API call reduction).

## Objectives Completed

All 5 requirements (PIPE-01 through PIPE-05) implemented across 3 sequential plans.

## Plan 1: HTML Caching + GEO Pipeline Rewire (PIPE-01)

**What changed:**

- `crawl_store.py`: Added `store_page_html()` (Redis HSET under `crawl:html:{task_id}`) and `get_pages_html()` (pipeline bulk-fetch, single round-trip)
- `crawler.py`: `build_page_data()` now sets `out["_html"] = response.text` for HTML pages (underscore-prefix convention = temporary field)
- `crawl_store.py` `append_page()`: Strips `_html` before JSON serialisation to prevent bloating `crawl:pages:{task_id}`
- `tasks.py` `on_page_crawled()`: Calls `store_page_html()` when content-type is HTML; `_html` is stripped in `append_page()`
- `geo_pipeline.py`: Replaced `httpx.Client` fetch-all block with Redis `get_pages_html()` read; HTTP fallback fires only for `cache_misses`

**Result:** GEO pipeline no longer re-fetches pages it just crawled. HTTP fallback remains for pre-deploy tasks or TTL expiry.

## Plan 2: Shared Parse + FK Deduplication (PIPE-02 + PIPE-03)

**What changed:**

- `geo_features.py` (NEW): `extract_page_features(url, html)` parses HTML once, extracts JSON-LD before stripping, strips noise tags, computes body_text/html_str/fk_grade. Contains canonical `_count_syllables()` and `_flesch_kincaid_grade()`.
- `geo_schema.py`: Signature `analyze_schemas(pages_html)` → `analyze_schemas(page_features)`. Loop now iterates `feat` dicts; uses `feat["raw_json_ld"]` and `feat["soup"]` — no BeautifulSoup instantiation in loop.
- `geo_content.py`: Signature `analyze_content(pages_html)` → `analyze_content(page_features)`. Local `_count_syllables` and `_flesch_kincaid_grade` deleted; imported from `geo_features`. `_extract_headings(html)` refactored to `_extract_headings(soup)`. `_detect_faq(html)` refactored to `_detect_faq(text, soup)`. `_count_lists(html)` refactored to `_count_lists(soup)`.
- `geo_page_scores.py`: Signature `score_pages(fetched_pages)` → `score_pages(page_features)`. Local `_count_syllables` and `_compute_fk_grade` deleted; imported from `geo_features` as alias. `_extract_page_features(html)` renamed to `_extract_page_features_from_feat(feat)` — uses `feat["soup"]`, `feat["body_text"]`, `feat["html_str"]`, `feat["raw_json_ld"]`, `feat["fk_grade"]`.
- `geo_pipeline.py`: Added `page_features = [extract_page_features(u, h) for u, h in html_pages]` after HTML retrieval. Wave 1 calls updated to pass `page_features`.

**Critical implementation detail:** JSON-LD extraction (`_extract_raw_json_ld`) runs BEFORE `tag.decompose()` stripping in `geo_features.py`. This preserves `<script type="application/ld+json">` blocks that would otherwise be lost.

## Plan 3: Dead Code Removal + Probe Reduction (PIPE-04 + PIPE-05)

**What changed:**

- `geo_pipeline.py`: Deleted `preliminary_score = compute_score(...)` block (8 lines). Updated `generate_suggestions` call to use keyword arguments — eliminates positional ordering risk.
- `geo_suggestions.py`: Removed `score_data: dict` from `generate_suggestions()` and `_build_context()`. `_build_context` now derives summary from component dicts directly (`eeat_score`, `schema_coverage`, `avg_words`, `snippet_readiness`).
- `geo_probe.py`: Changed question count 5→3 in system prompt (2 locations), user prompt, and `parsed[:5]` → `parsed[:3]` return slice. Reduced `max_tokens` 512→300. Added `[:3]` slice to fallback questions return.

**API call math:** 1 question-generation + (3 questions × 5 engines) = 16 calls (was 26 — 38.5% reduction, meets PIPE-05 ≥38% target).

## Deviations from Plan

None — plans executed exactly as written. All implementation decisions (fallback preservation, geo_eeat exclusion, alias import) matched plan specifications.

## Known Stubs

None — no placeholder data or stub values introduced. All changes are structural refactors with no behavioral stubs.

## Self-Check: PASSED

All created files exist on disk. All task commits verified in git history.

Tasks committed:
- `858cf39` feat(01-1): HTML caching + GEO pipeline rewire (PIPE-01)
- `c77fffc` feat(01-2): shared parse + FK deduplication (PIPE-02 + PIPE-03)
- `d24ddd1` feat(01-3): dead code removal + probe reduction (PIPE-04 + PIPE-05)
