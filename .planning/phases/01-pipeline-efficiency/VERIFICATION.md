---
phase: 01-pipeline-efficiency
verified: 2026-03-30T00:00:00Z
status: gaps_found
score: 4/5 criteria verified
gaps:
  - truth: "No BeautifulSoup instantiation in geo_schema.py, geo_content.py, or geo_page_scores.py per-page loops (PIPE-02)"
    status: partial
    reason: "geo_content.py still contains a local _clean_text() helper that instantiates BeautifulSoup; it is defined at module level but never called from the analyze_content loop. The dead function is not a runtime regression, but it is a maintenance risk and violates the letter of PIPE-02's 'no BeautifulSoup instantiation' rule. geo_schema.py also retains the dead _extract_json_ld() helper that accepts a BeautifulSoup object."
    artifacts:
      - path: "backend/app/analyzers/geo_content.py"
        issue: "_clean_text() at line 48-58 instantiates BeautifulSoup twice (lxml + html.parser fallback). Function is defined but never called from analyze_content loop — dead code, not an active violation, but present in the file."
      - path: "backend/app/analyzers/geo_schema.py"
        issue: "_extract_json_ld() at line 46-61 accepts a BeautifulSoup soup parameter — legacy function, never called from analyze_schemas loop. analyze_schemas uses feat['raw_json_ld'] instead. Dead code."
    missing:
      - "Remove dead _clean_text() from geo_content.py (lines 48-58) — now replaced by feat['body_text'] from geo_features"
      - "Remove dead _extract_json_ld() from geo_schema.py (lines 46-61) — now replaced by feat['raw_json_ld']"
---

# Phase 1: Pipeline Efficiency Verification Report

**Phase Goal:** The GEO pipeline runs without redundant HTTP fetches or duplicate parsing, and probe API costs are reduced by at least 38%.
**Verified:** 2026-03-30
**Status:** gaps_found (1 partial criterion — dead code, not a runtime failure)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth (Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | PIPE-01: HTML read from `crawl:html:{task_id}`; HTTP fallback only on cache miss | VERIFIED | geo_pipeline.py:139-151 |
| 2 | PIPE-02: Single `extract_page_features()` call per URL; no BS instantiation in per-page loops | PARTIAL | analyze_content/analyze_schemas loops are clean; dead _clean_text() and _extract_json_ld() still present in files |
| 3 | PIPE-03: FK/syllable functions canonical in geo_features.py; imported (not re-defined) in consumers | VERIFIED | geo_content.py:12, geo_page_scores.py:21 |
| 4 | PIPE-04: No `preliminary_score` in geo_pipeline.py; no `score_data` param in generate_suggestions | VERIFIED | grep confirms both absent |
| 5 | PIPE-05: Probe uses exactly 3 questions; max 16 Claude API calls (3q x 5 engines + 1 generation) | VERIFIED | geo_probe.py:78-80, :250-251 |

**Score: 4/5 truths fully verified (1 partial)**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/app/analyzers/geo_features.py` | Shared parse module with `extract_page_features`, `_flesch_kincaid_grade`, `_count_syllables` | VERIFIED | All three present, lines 22-125 |
| `backend/app/store/crawl_store.py` | `store_page_html` and `get_pages_html` for `crawl:html:{task_id}` hash | VERIFIED | Lines 195-214 |
| `backend/app/analyzers/crawler.py` | `_html` field populated in page_data; `_compute_readability` string-label function preserved | VERIFIED | Line 307 sets `_html`; lines 21-39 preserve `_compute_readability` returning "Good"/"Poor"/"N/A" |
| `backend/app/worker/tasks.py` | `store_page_html` called in `on_page_crawled` callback | VERIFIED | Lines 74-77 |
| `backend/app/worker/geo_pipeline.py` | `get_pages_html` call; no `preliminary_score`; wave 1 uses `page_features` | VERIFIED | Lines 139, 164, 180-189; grep confirms no `preliminary_score` |
| `backend/app/analyzers/geo_schema.py` | Accepts `list[dict]` features; uses `feat['raw_json_ld']` and `feat['soup']`; no BS in loop | PARTIAL | Loop is clean (lines 211-255); dead `_extract_json_ld()` at line 46 never called |
| `backend/app/analyzers/geo_content.py` | Accepts `list[dict]` features; imports FK; no local FK; no BS in loop | PARTIAL | Loop uses `feat['body_text']` and `feat['soup']`; imports FK from geo_features:12; dead `_clean_text()` at line 48 never called |
| `backend/app/analyzers/geo_page_scores.py` | Accepts `list[dict]` features; imports FK; no local FK; no BS | VERIFIED | Imports `_flesch_kincaid_grade as _compute_fk_grade` at line 21; no BS import used in loop; uses `feat['fk_grade']` at line 185 |
| `backend/app/analyzers/geo_suggestions.py` | No `score_data` parameter | VERIFIED | `generate_suggestions` signature at line 226: only schema/eeat/content/nlp/audit/site_type params |
| `backend/app/analyzers/geo_probe.py` | Generates exactly 3 questions; max 16 API calls | VERIFIED | `_generate_questions` returns `[:3]` at line 191/195; `_ask_one` per question per engine = 3×5=15 + 1 generation = 16 max |

---

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `tasks.py` on_page_crawled | `crawl:html:{task_id}` Redis hash | `store_page_html()` | WIRED | tasks.py:74-77 — stores html only for HTML content-type pages |
| `geo_pipeline.py` | Redis HTML cache | `get_pages_html()` | WIRED | geo_pipeline.py:139 — bulk pipeline fetch |
| `geo_pipeline.py` | HTTP fallback | `_fetch_html()` via ThreadPoolExecutor | WIRED | Lines 143-151 — only for cache misses |
| `geo_pipeline.py` | `extract_page_features` | Called per (url, html) pair | WIRED | Line 164: `[extract_page_features(u, h) for u, h in html_pages]` |
| `geo_pipeline.py` wave 1 | `analyze_schemas` | `page_features` list | WIRED | Line 180: `analyze_schemas(page_features, site_type=site_type)` |
| `geo_pipeline.py` wave 1 | `analyze_content` | `page_features` list | WIRED | Line 183: `analyze_content(page_features)` |
| `geo_pipeline.py` wave 1 | `score_pages` | `page_features` list | WIRED | Line 189: `score_pages(page_features)` |
| `geo_pipeline.py` | `generate_suggestions` | No `score_data` param | WIRED | Lines 245-253 — correct keyword-only call |
| `geo_probe.py` | question generation | `_generate_questions` returns exactly 3 | WIRED | Lines 187-195: `parsed[:3]` / fallback `[:3]` |
| `geo_probe.py` | per-engine probe | `_ask_one` per question × 5 engines = 15 calls + 1 generation | WIRED | Lines 249-251: `q_executor.map(_ask_one, questions)` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `geo_schema.py` analyze_schemas loop | `feat['raw_json_ld']`, `feat['soup']` | `extract_page_features()` from crawled HTML | Yes — JSON-LD blocks and stripped soup | FLOWING |
| `geo_content.py` analyze_content loop | `feat['body_text']`, `feat['soup']`, `feat['fk_grade']` | `extract_page_features()` | Yes | FLOWING |
| `geo_page_scores.py` score_pages loop | `feat['fk_grade']`, `feat['raw_json_ld']`, `feat['html_str']` | `extract_page_features()` | Yes | FLOWING |
| `crawl_store.py` get_pages_html | Redis hash `crawl:html:{task_id}` | `store_page_html` called per crawled HTML page | Yes — live HTML strings | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points available without starting the Docker stack.

---

## Requirements Coverage

No `requirements:` frontmatter found in PLAN.md. Verification performed directly against the five stated success criteria.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `geo_content.py` | 48-58 | Dead `_clean_text()` function instantiates BeautifulSoup — now unreachable from analyze_content loop | Warning | Not a runtime regression; misleads future readers into thinking BS is still used per-page |
| `geo_schema.py` | 46-61 | Dead `_extract_json_ld()` function accepts `soup: BeautifulSoup` — unreachable from analyze_schemas loop | Warning | Same as above — the loop uses `feat['raw_json_ld']` directly |
| `geo_page_scores.py` | 19 | `from bs4 import BeautifulSoup` import present | Info | BeautifulSoup is imported at the module level but is never instantiated in this file; the import itself is unused (feature extraction now done by geo_features). Low risk but unnecessary. |

---

## PIPE-01 Detail — HTML Cache (VERIFIED)

**crawl_store.py lines 191-214:**
- `_html_key(task_id)` returns `crawl:html:{task_id}`
- `store_page_html()` uses `hset` + `expire` — stores one URL per hash field
- `get_pages_html()` uses a Redis pipeline for a single round-trip across all requested URLs

**tasks.py lines 73-78 (`on_page_crawled` callback):**
```python
def on_page_crawled(page_data: dict) -> None:
    html = page_data.get("_html", "")
    if html and "html" in (page_data.get("content_type") or "").lower():
        store_page_html(task_id, page_data.get("address", ""), html)
    append_page(task_id, page_data)
```
HTML stored only for text/html pages. `append_page` strips `_html` before Redis serialization (crawl_store.py:70).

**geo_pipeline.py lines 134-156:**
- Primary: `get_pages_html(task_id, urls_to_fetch)` — bulk Redis read
- Fallback: HTTP fetch only for `[u for u in urls_to_fetch if not html_map.get(u)]`
- Correctly satisfies "HTTP fallback fires only on cache miss"

---

## PIPE-02 Detail — Single Parse Per URL (PARTIAL)

**What works (no runtime regression):**
- `geo_pipeline.py:164`: `page_features = [extract_page_features(u, h) for u, h in html_pages]` — one BS parse per URL
- `analyze_schemas` loop: reads `feat['raw_json_ld']` and `feat['soup']` — no new BS instantiation
- `analyze_content` loop: reads `feat['body_text']`, `feat['soup']`, `feat['fk_grade']` — no new BS instantiation
- `score_pages` loop: reads `feat` dict fields — no BS instantiation (import exists at line 19 but is never called)

**What still needs cleanup:**
- `geo_content.py` lines 48-58: `_clean_text(html: str)` instantiates BS but is never called. Dead code.
- `geo_schema.py` lines 46-61: `_extract_json_ld(soup: BeautifulSoup)` is defined but never called from `analyze_schemas`. Dead code.
- `geo_page_scores.py` line 19: `from bs4 import BeautifulSoup` — unused import (BS is never instantiated).

These do not cause duplicate parsing at runtime, but they are cleanup items that should be removed per the phase goal of eliminating redundant parsing.

---

## PIPE-03 Detail — FK/Syllable Functions Canonical (VERIFIED)

- `geo_features.py:22` — `_count_syllables()` defined (canonical)
- `geo_features.py:39` — `_flesch_kincaid_grade()` defined (canonical)
- `geo_content.py:12` — `from app.analyzers.geo_features import _flesch_kincaid_grade` — imports, no local definition
- `geo_page_scores.py:21` — `from app.analyzers.geo_features import _flesch_kincaid_grade as _compute_fk_grade` — imports, no local definition
- `crawler.py:21-39` — `_compute_readability()` preserved as a string-label function returning "Good"/"Poor"/"N/A"; uses its own local `_count_syllables_simple()` which is correct — it is isolated to the crawler and does not conflict with geo_features.py's canonical float implementation

---

## PIPE-04 Detail — No Preliminary Score (VERIFIED)

grep of `geo_pipeline.py` finds no match for `preliminary_score` or `score_data`.

`generate_suggestions` signature (geo_suggestions.py:226-233):
```python
def generate_suggestions(
    schema: dict | None = None,
    eeat: dict | None = None,
    content: dict | None = None,
    nlp: dict | None = None,
    audit: dict | None = None,
    site_type: str = "informational",
) -> dict:
```
No `score_data` parameter. Confirmed PIPE-04 satisfied.

---

## PIPE-05 Detail — Probe API Call Count (VERIFIED)

**Question generation:** `_generate_questions()` at geo_probe.py:148-195
- Claude API: 1 call to generate questions array
- Returns `parsed[:3]` (line 191) or `fallback[:3]` (line 195)
- Always exactly 3 questions

**Per-engine probe:** `_probe_engine()` at geo_probe.py:213-259
- `_ask_one(q)` called for each question: `q_executor.map(_ask_one, questions)` (line 251)
- 3 questions × 1 call each = 3 calls per engine
- 5 engines run in parallel: 3 × 5 = 15 probe calls

**Total: 1 (generation) + 15 (probes) = 16 API calls maximum.**
This is exactly the ≤16 bound stated in PIPE-05.

---

## Human Verification Required

None. All criteria are verifiable statically.

---

## Gaps Summary

All five pipeline efficiency criteria are implemented correctly at runtime. The single gap is **dead code** in two files that was not removed during the refactor:

1. `geo_content.py` — `_clean_text()` function (lines 48-58) instantiates BeautifulSoup internally but is never called from the `analyze_content` loop. The loop correctly uses `feat['body_text']` from `geo_features.extract_page_features()`.

2. `geo_schema.py` — `_extract_json_ld()` function (lines 46-61) accepts a BeautifulSoup soup argument but is never called from `analyze_schemas`. The loop correctly uses `feat['raw_json_ld']`.

3. `geo_page_scores.py` — `from bs4 import BeautifulSoup` import at line 19 is unused (BS is never instantiated in this file).

These are cleanup items. They do not cause any duplicate HTTP fetch, duplicate BS parse, or extra API call at runtime. The phase goal is achieved in practice. The recommendation is to remove these three dead code blocks before the next phase begins to keep the codebase clean.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
