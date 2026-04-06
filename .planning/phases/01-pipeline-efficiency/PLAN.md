# Phase 1: Pipeline Efficiency — Plan

**Phase:** 1
**Status:** Ready for execution
**Requirements:** PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05

---

## Plans

### Plan 1: HTML Caching + GEO Pipeline Rewire (PIPE-01)

**Objective:** Store raw HTML in Redis during the crawl so the GEO pipeline reads from cache instead of re-fetching every selected page over HTTP. This eliminates a second round-trip to external servers and removes the `httpx.Client` fetch loop from `geo_pipeline.py`.

**Files modified:**

- `backend/app/store/crawl_store.py` — add `store_page_html()` and `get_pages_html()`
- `backend/app/analyzers/crawler.py` — pass `_html` field through `on_page_crawled` callback; strip it in `crawl_store.append_page`
- `backend/app/worker/tasks.py` — update `on_page_crawled` to call `store_page_html` for HTML pages
- `backend/app/worker/geo_pipeline.py` — replace `_fetch_html` / `httpx.Client` block with `get_pages_html`; keep `_fetch_html` as fallback for empty cache hits

---

**Tasks:**

**Task 1 — Add HTML store functions to `crawl_store.py`**

Add the following to `backend/app/store/crawl_store.py` after the existing `_geo_key` block at the bottom of the file:

```python
# ── HTML cache (for GEO pipeline — avoids re-fetch) ──────────────────────────
# Key: crawl:html:{task_id}  (Redis hash: {url -> html_string})
# Same 2-hour TTL as crawl data.

def _html_key(task_id: str) -> str:
    return f"crawl:html:{task_id}"


def store_page_html(task_id: str, url: str, html: str) -> None:
    """Store raw HTML for a single URL under crawl:html:{task_id} hash."""
    r = get_redis()
    r.hset(_html_key(task_id), url, html)
    r.expire(_html_key(task_id), CRAWL_TTL_SECONDS)


def get_pages_html(task_id: str, urls: list[str]) -> dict[str, str]:
    """
    Bulk-fetch HTML for a list of URLs from Redis.
    Returns {url: html}. Missing URLs map to empty string.
    Uses pipeline for a single round-trip.
    """
    r = get_redis()
    key = _html_key(task_id)
    pipe = r.pipeline()
    for url in urls:
        pipe.hget(key, url)
    values = pipe.execute()
    return {u: (v or "") for u, v in zip(urls, values)}
```

No changes to existing functions. The `get_redis()` and `CRAWL_TTL_SECONDS` names are already defined at module scope.

**Task 2 — Thread HTML through the crawl callback**

In `backend/app/analyzers/crawler.py`, `build_page_data()` (line 292–309):

After `out["readability"] = _compute_readability(response.text)` (line 306), add:

```python
out["_html"] = response.text  # temporary; stripped by crawl_store.append_page
```

This follows the existing `_img_alts` convention (underscore-prefix = temporary field, not persisted).

In `backend/app/store/crawl_store.py`, `append_page()` (lines 68–75):

After `page_data = dict(page_data)` and before `page_data.setdefault(...)`, add:

```python
page_data.pop("_html", None)  # strip HTML before Redis serialisation — stored separately
```

This ensures the HTML never reaches the `crawl:pages:{task_id}` list and does not bloat page metadata for the Spider tab, CSV export, or pagination endpoints.

In `backend/app/worker/tasks.py`, `on_page_crawled()` (lines 73–74):

Update to call `store_page_html` when the page is HTML:

```python
from app.store.crawl_store import (
    set_meta, append_page, flush_pages_buffer, get_meta, get_all_pages,
    update_pages_alt_text, get_geo, set_inventory, store_page_html,   # add store_page_html
)

def on_page_crawled(page_data: dict) -> None:
    # Store raw HTML in a separate Redis hash for GEO pipeline use
    html = page_data.get("_html", "")
    if html and "html" in (page_data.get("content_type") or "").lower():
        store_page_html(task_id, page_data.get("address", ""), html)
    append_page(task_id, page_data)
```

Note: `task_id` is already in scope via closure (captured from `process_site`). The `_html` field is popped inside `append_page` before Redis serialisation.

**Task 3 — Rewire `geo_pipeline.py` to read from Redis**

In `backend/app/worker/geo_pipeline.py`:

1. Add import at the top (after existing `from app.store.crawl_store import set_geo`):

```python
from app.store.crawl_store import set_geo, get_pages_html
```

2. Replace the HTTP fetch block (lines 133–149 — the `with httpx.Client(...)` block through `html_pages = [...]`) with:

```python
# --- Step 1: Select pages and retrieve cached HTML from Redis ---
page_limit = _geo_page_limit(inventory_total)
urls_to_fetch = _select_pages_to_fetch(url, pages, max_count=page_limit)

# Primary: read HTML from Redis cache (stored during crawl)
html_map = get_pages_html(task_id, urls_to_fetch)

# Fallback: HTTP fetch for any URL with empty cache (e.g. pre-deploy tasks)
fetched: list[tuple[str, str]] = []
cache_misses = [u for u in urls_to_fetch if not html_map.get(u)]
if cache_misses:
    with httpx.Client(timeout=_FETCH_TIMEOUT, follow_redirects=True) as http_client:
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(_fetch_html, u, http_client): u for u in cache_misses}
            for future in as_completed(futures):
                page_url, html = future.result()
                if html:
                    html_map[page_url] = html

for u in urls_to_fetch:
    html = html_map.get(u, "")
    if html:
        fetched.append((u, html))

homepage_html = next((html for u, html in fetched if u.rstrip("/") == url.rstrip("/")), "")
about_html = _find_about_html(fetched)
all_page_urls = [p.get("address", "") for p in pages if p.get("address")]
html_pages = [(u, h) for u, h in fetched if h]
```

3. Keep `_fetch_html`, `_FETCH_HEADERS`, `_FETCH_TIMEOUT`, and `import httpx` — they remain as the fallback path. Do NOT remove them.

**Verification:**

- [ ] `python -c "from app.store.crawl_store import store_page_html, get_pages_html; print('OK')"` runs without error inside the backend container
- [ ] `python -c "from app.worker.geo_pipeline import run_geo_pipeline; print('OK')"` runs without import error
- [ ] After a fresh crawl, `redis-cli HKEYS crawl:html:{task_id}` shows the crawled HTML URLs (check by running `redis-cli --scan --pattern 'crawl:html:*'` then inspecting one key)
- [ ] GEO analysis completes and `redis-cli GET geo:score:{task_id}` returns a non-null JSON blob
- [ ] `cache_misses` log line should be absent for a freshly crawled task (all HTML served from cache)

---

### Plan 2: Shared Parse + FK Deduplication (PIPE-02 + PIPE-03)

**Objective:** Eliminate 4 independent BeautifulSoup instantiations per page by parsing HTML once in a new `geo_features.py` module. Consolidate the Flesch-Kincaid implementation — `geo_page_scores.py`'s copy is deleted and replaced by an import from `geo_features.py`. `geo_eeat.py` is NOT modified (it uses raw string regex, not BeautifulSoup).

**Files modified:**

- `backend/app/analyzers/geo_features.py` — NEW: shared `extract_page_features()` + `_count_syllables()` + `_flesch_kincaid_grade()`
- `backend/app/analyzers/geo_schema.py` — accept `list[dict]` (page features) instead of `list[tuple[str,str]]`
- `backend/app/analyzers/geo_content.py` — accept `list[dict]`, import FK from `geo_features`, remove local `_count_syllables` + `_flesch_kincaid_grade`
- `backend/app/analyzers/geo_page_scores.py` — accept `list[dict]`, delete `_count_syllables` + `_compute_fk_grade`, import from `geo_features`
- `backend/app/worker/geo_pipeline.py` — call `extract_page_features()` once per URL; pass feature list to Wave 1 analyzers

---

**Tasks:**

**Task 1 — Create `geo_features.py` with shared parse + FK functions**

Create `backend/app/analyzers/geo_features.py`:

```python
"""
Shared HTML feature extraction for GEO Wave 1 analyzers.
Parse each page's HTML exactly once; share results across geo_schema,
geo_content, and geo_page_scores. geo_eeat is excluded — it uses raw
string regex and does not require BeautifulSoup.

CRITICAL: JSON-LD extraction runs BEFORE tag stripping to avoid losing
<script type="application/ld+json"> blocks. After extraction, noise tags
are stripped once for all text-based analyzers.
"""
from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

# Tags stripped before text extraction (same set used by geo_content._clean_text)
_STRIP_TAGS = frozenset({"script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"})


def _count_syllables(word: str) -> int:
    """Approximate syllable count for a word. Canonical implementation."""
    word = word.lower().strip(".,!?;:")
    if not word:
        return 1
    vowels = "aeiouy"
    count, prev_vowel = 0, False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.endswith("e"):
        count = max(1, count - 1)
    return max(1, count)


def _flesch_kincaid_grade(text: str) -> float:
    """
    Flesch-Kincaid Grade Level (0.0–20.0).
    Canonical implementation — imported by geo_content and geo_page_scores.
    """
    words = re.findall(r"\b\w+\b", text)
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    if not words or not sentences:
        return 8.0
    num_words = len(words)
    num_sentences = len(sentences)
    num_syllables = sum(_count_syllables(w) for w in words)
    grade = (0.39 * (num_words / num_sentences)) + (11.8 * (num_syllables / num_words)) - 15.59
    return round(max(0.0, min(grade, 20.0)), 1)


def _extract_raw_json_ld(soup: BeautifulSoup) -> list[dict]:
    """
    Extract JSON-LD blocks from the UNSTRIPPED soup.
    Must be called before any tag.decompose() calls.
    Returns list of parsed JSON-LD dicts (invalid JSON silently skipped).
    """
    blocks = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            raw = tag.string or ""
            data = json.loads(raw.strip())
            if isinstance(data, list):
                blocks.extend(data)
            elif isinstance(data, dict):
                blocks.append(data)
        except Exception:
            pass
    return blocks


def extract_page_features(url: str, html: str) -> dict:
    """
    Parse HTML once and return all signals needed by Wave 1 GEO analyzers.

    Returns a dict with keys:
      url            str    — the page URL
      raw_json_ld    list   — JSON-LD blocks extracted BEFORE stripping
      soup           soup   — BeautifulSoup tree with noise tags STRIPPED
                              (safe for headings, links, meta, lists)
      body_text      str    — clean text for word count, FK, FAQ, NLP patterns
      html_str       str    — str(soup) after stripping (for regex patterns in geo_page_scores)
      fk_grade       float  — pre-computed Flesch-Kincaid grade (0.0–20.0)

    Callers MUST NOT call tag.decompose() on the returned soup — stripping
    is already done here. geo_eeat does not receive this dict; it keeps
    its raw html string interface.
    """
    if not html:
        return {
            "url": url,
            "raw_json_ld": [],
            "soup": BeautifulSoup("", "html.parser"),
            "body_text": "",
            "html_str": "",
            "fk_grade": 8.0,
        }

    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    # Step 1: Extract JSON-LD BEFORE stripping (script tags would be removed otherwise)
    raw_json_ld = _extract_raw_json_ld(soup)

    # Step 2: Strip noise tags once for all text-based analyzers
    for tag in soup.find_all(_STRIP_TAGS):
        tag.decompose()

    body_text = soup.get_text(separator=" ", strip=True)
    html_str = str(soup)
    fk_grade = _flesch_kincaid_grade(body_text)

    return {
        "url": url,
        "raw_json_ld": raw_json_ld,
        "soup": soup,
        "body_text": body_text,
        "html_str": html_str,
        "fk_grade": fk_grade,
    }
```

**Task 2 — Update `geo_schema.py` to accept page features**

`analyze_schemas()` currently iterates `for url, html in pages_html:` and calls `BeautifulSoup(html, ...)` + `_extract_json_ld(soup)` per page (lines ~211–217).

Change:

1. Signature: `analyze_schemas(pages_html: list[tuple[str, str]], site_type: str = "informational")` → `analyze_schemas(page_features: list[dict], site_type: str = "informational")`

2. Inside the loop, replace:
```python
# OLD
for url, html in pages_html:
    if not html:
        continue
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")
    json_ld_blocks = _extract_json_ld(soup)
    micro_types = _extract_microdata_types(soup)
    rdfa_types = _extract_rdfa_types(soup)
```
with:
```python
# NEW
for feat in page_features:
    url = feat["url"]
    soup = feat["soup"]
    if not feat["body_text"] and not feat["raw_json_ld"]:
        continue
    # Use pre-extracted JSON-LD (extracted before strip in geo_features)
    json_ld_blocks = feat["raw_json_ld"]
    micro_types = _extract_microdata_types(soup)
    rdfa_types = _extract_rdfa_types(soup)
```

Note: The internal `_extract_json_ld(soup)` helper in `geo_schema.py` is now bypassed for the main loop — `raw_json_ld` from the features dict is used directly. The `_extract_json_ld` function may be kept for any internal helper calls that still use it (e.g. `_check_semantic_match`), but it should NOT be called in the main per-page loop.

**Task 3 — Update `geo_content.py` to accept page features and import FK**

1. Remove `_count_syllables()` (lines 83–98) and `_flesch_kincaid_grade()` (lines 63–80) from `geo_content.py`.

2. Add import at top of `geo_content.py`:
```python
from app.analyzers.geo_features import _flesch_kincaid_grade
```

3. Change `analyze_content()` signature from `(pages_html: list[tuple[str, str]])` to `(page_features: list[dict])`.

4. Replace the per-page loop. Currently `_clean_text(html)` is called (which internally does `BeautifulSoup(html, ...)`). Replace with direct use of `feat["body_text"]`:

```python
# OLD
for url, html in pages_html:
    text = _clean_text(html)
    ...
    headings = _extract_headings(html)
    ...
    faq_qs = _detect_faq(html)

# NEW
for feat in page_features:
    url = feat["url"]
    text = feat["body_text"]
    soup = feat["soup"]
    headings = _extract_headings_from_soup(soup)   # see note below
    faq_qs = _detect_faq_from_text(text)            # see note below
```

For `_extract_headings` and `_detect_faq`: these currently accept `html: str` and instantiate BeautifulSoup internally. They MUST be refactored to accept `soup`/`text` directly — do NOT add thin wrappers that call the old html-accepting versions (that would preserve the redundant parse and silently fail PIPE-02).

Required refactors:
- Rename `_extract_headings(html: str) -> dict` → `_extract_headings(soup: BeautifulSoup) -> dict`. Replace the internal `BeautifulSoup(html, ...)` call with the `soup` parameter directly. Call `soup.find_all("h2")`, `soup.find_all("h3")` as before.
- Rename `_detect_faq(html: str) -> list[str]` → `_detect_faq(text: str, soup: BeautifulSoup) -> list[str]`. Replace the internal `BeautifulSoup(html, ...)` call with the `soup` parameter. Use `text` for regex pattern matching instead of re-extracting text from soup.

After refactoring, the loop becomes:
```python
headings = _extract_headings(soup)      # soup from feat["soup"]
faq_qs = _detect_faq(text, soup)        # text from feat["body_text"]
```

These are the ONLY call sites for both functions — no other code calls them. Old html-accepting signatures can be deleted entirely.

5. The `_flesch_kincaid_grade(text)` call inside `analyze_content()` (line ~282) continues to work via the imported version — no change needed to that call site.

**Task 4 — Update `geo_page_scores.py` to accept page features and remove FK copy**

1. Delete `_count_syllables()` (lines 105–119) and `_compute_fk_grade()` (lines 122–133) from `geo_page_scores.py`.

2. Add import at top:
```python
from app.analyzers.geo_features import _flesch_kincaid_grade as _compute_fk_grade
```
   (Alias as `_compute_fk_grade` to minimise changes to the single call site inside `_extract_page_features`.)

3. Change `score_pages()` signature from `(fetched_pages: list[tuple[str, str]])` to `(page_features: list[dict])`.

4. Inside `score_pages()`, replace the per-page call:

```python
# OLD
for url, html in fetched_pages:
    features = _extract_page_features(html)

# NEW
for feat in page_features:
    url = feat["url"]
    features = _extract_page_features_from_feat(feat)
```

5. Rename `_extract_page_features(html: str) -> dict` to `_extract_page_features_from_feat(feat: dict) -> dict`. Inside it:
   - Replace `BeautifulSoup(html, ...)` with `soup = feat["soup"]` — no re-parse
   - Replace the `for tag in soup.find_all([...]):  tag.decompose()` block — already stripped, remove it
   - Replace `body_text = soup.get_text(...)` with `body_text = feat["body_text"]`
   - Replace `html_str = str(soup)` with `html_str = feat["html_str"]`
   - Replace `fk_grade = _compute_fk_grade(body_text)` (or equivalent) with `fk_grade = feat["fk_grade"]`
   - All other feature extraction (soup.find, regex patterns) stays unchanged — `soup` is the stripped tree

**Task 5 — Rewire `geo_pipeline.py` Wave 1 to use `extract_page_features`**

In `backend/app/worker/geo_pipeline.py`:

1. Add import:
```python
from app.analyzers.geo_features import extract_page_features
```

2. After the HTML retrieval block (after `html_pages = [(u, h) for u, h in fetched if h]`), add:
```python
# Build shared feature dicts — one BeautifulSoup parse per page
page_features = [extract_page_features(u, h) for u, h in html_pages]
```

3. Update the Wave 1 task calls:
```python
# OLD
def _run_schema():
    return analyze_schemas(html_pages, site_type=site_type)

def _run_content():
    return analyze_content(html_pages)

def _run_page_scores():
    return score_pages(html_pages)

# NEW
def _run_schema():
    return analyze_schemas(page_features, site_type=site_type)

def _run_content():
    return analyze_content(page_features)

def _run_page_scores():
    return score_pages(page_features)
```

4. `_run_eeat()` is unchanged — it still receives `(all_page_urls, homepage_html, about_html, pages)`.

5. `analyze_nlp` in Wave 2 still receives `html_pages` (list of tuples) — do not change it.

**Verification:**

- [ ] `python -c "from app.analyzers.geo_features import extract_page_features, _flesch_kincaid_grade; print('OK')"` runs without error
- [ ] `python -c "from app.analyzers.geo_content import analyze_content; print('OK')"` — no circular import
- [ ] `python -c "from app.analyzers.geo_page_scores import score_pages; print('OK')"` — no circular import
- [ ] `grep -n "_compute_fk_grade\|_count_syllables" backend/app/analyzers/geo_page_scores.py` — should show only the import alias line, no function definitions
- [ ] `grep -n "_flesch_kincaid_grade\|_count_syllables" backend/app/analyzers/geo_content.py` — should show only the import line, no function definitions
- [ ] Full GEO analysis completes (check `redis-cli GET geo:schema:{task_id}` is non-null after a crawl)

---

### Plan 3: Dead Code Removal + Probe Reduction (PIPE-04 + PIPE-05)

**Objective:** Remove the `preliminary_score = compute_score(...)` call from `geo_pipeline.py` (its result is never stored and serves only as suggestions context). Update `generate_suggestions()` to derive its own lightweight summary from the component dicts directly. Separately, reduce the probe from 5 to 3 questions per engine, cutting Claude API calls from 26 to 16 (38.5% reduction).

**Files modified:**

- `backend/app/worker/geo_pipeline.py` — remove `preliminary_score = compute_score(...)` call; update `generate_suggestions` invocation to keyword args
- `backend/app/analyzers/geo_suggestions.py` — remove `score_data` parameter; update `_build_context` to derive summary from component dicts
- `backend/app/analyzers/geo_probe.py` — change question count from 5 to 3 in system prompt, user prompt, and return slice

---

**Tasks:**

**Task 1 — Remove `preliminary_score` from `geo_pipeline.py`**

In `geo_pipeline.py` lines 229–244:

1. Delete the `preliminary_score = compute_score(...)` block entirely (lines 230–237).

2. Update the `sug_future = executor.submit(...)` call to pass component dicts directly, using keyword arguments to prevent positional shift bugs (per PIPE-04 pitfall analysis):

```python
# OLD
sug_future = executor.submit(
    generate_suggestions,
    preliminary_score, schema_result, eeat_result,
    content_result, nlp_result, audit_result, site_type,
)

# NEW
sug_future = executor.submit(
    generate_suggestions,
    schema=schema_result,
    eeat=eeat_result,
    content=content_result,
    nlp=nlp_result,
    audit=audit_result,
    site_type=site_type,
)
```

3. Remove the unused `compute_score` import if `preliminary_score` was the only caller. Check: `compute_score` is also used on line 267 (`final_score = compute_score(...)`). Keep the import.

4. Clean up the ASCII diagram comment on lines 206–209 to remove the `preliminary_score` arrow — update to reflect the new flow:
```
# Layout: [nlp]   ──► [suggestions] ─┐
#         [probe]  ──────────────────┤
#         [entity] ──────────────────┤
#                                    └► final_score ──► persist
```

**Task 2 — Update `geo_suggestions.py` to drop `score_data`**

In `backend/app/analyzers/geo_suggestions.py`:

1. Remove `score_data: dict` from `generate_suggestions()` signature (currently the first positional argument).

2. Remove `score_data: dict` from `_build_context()` signature.

3. In `_build_context()`, replace the score summary lines (lines 54–59) that read from `score_data` with a lightweight component-based header:

```python
# OLD — requires score_data
lines = [
    f"Site Type: {site_type}",
    f"Overall AI Citation Score: {score_data.get('overall_score', 0)}/100 (Grade: {score_data.get('grade', 'F')})",
    "",
    "Score Breakdown:",
]
for cat, data in score_data.get("breakdown", {}).items():
    lines.append(f"  {cat}: {data['raw']}/100 (weighted {data['weighted']}/{data['weight']})")

# NEW — derives summary from component dicts
eeat_score = (eeat or {}).get("eeat_score", 0)
schema_coverage = (schema or {}).get("coverage_percent", 0)
avg_words = (content or {}).get("avg_word_count", 0)
snippet_readiness = (nlp or {}).get("ai_snippet_readiness", "Unknown")
lines = [
    f"Site Type: {site_type}",
    f"E-E-A-T Score: {eeat_score}/100",
    f"Schema coverage: {schema_coverage}%",
    f"Avg word count: {avg_words}",
    f"NLP snippet readiness: {snippet_readiness}",
    "",
]
```

4. The `_rule_based_suggestions()` function does NOT use `score_data` — no changes needed there.

5. The public `generate_suggestions()` signature becomes:

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

All parameters keyword-only after the removal (or keep positional — the pipeline now uses keyword args exclusively, so no ordering risk).

**Task 3 — Reduce probe questions from 5 to 3 in `geo_probe.py`**

Make the following 4 targeted changes in `backend/app/analyzers/geo_probe.py`:

1. `_QUESTION_GEN_SYSTEM` (line 63): change `"generate exactly 5 specific, realistic questions"` → `"generate exactly 3 specific, realistic questions"`

2. `_QUESTION_GEN_SYSTEM` (line 79): change `"Return a JSON array of exactly 5 question strings."` → `"Return a JSON array of exactly 3 question strings."`

3. `_generate_questions()` prompt (line 171): change `f"Generate 5 questions a user would ask..."` → `f"Generate 3 questions a user would ask..."`

4. `_generate_questions()` return slice (line 191): change `return [str(q) for q in parsed[:5]]` → `return [str(q) for q in parsed[:3]]`

Also: reduce `max_tokens=512` on line 184 to `max_tokens=300` (3 short question strings need far fewer tokens than 5).

The `_FALLBACK_QUESTIONS` dict entries each have 5 items — do NOT trim them. The existing `_generate_questions()` return path for the fallback is `return _FALLBACK_QUESTIONS.get(site_type, _FALLBACK_QUESTIONS["informational"])` which returns all 5. Add a slice here too:

```python
# Line 195 (fallback return):
return _FALLBACK_QUESTIONS.get(site_type, _FALLBACK_QUESTIONS["informational"])[:3]
```

**API call count after change:**
- 1 question-generation call
- 5 engines × 3 questions = 15 probe calls
- Total: **16 calls** (was 26 — 38.5% reduction, meets PIPE-05 ≥38% target)

**Frontend note:** `ProbePanel.tsx` displays questions dynamically via `probe.questions.map(...)` — no hardcoded "5 questions" text exists. No frontend changes required.

**Verification:**

- [ ] `grep -n "score_data" backend/app/analyzers/geo_suggestions.py` — should return zero matches
- [ ] `grep -n "preliminary_score" backend/app/worker/geo_pipeline.py` — should return zero matches
- [ ] `grep -n "exactly 5\|parsed\[:5\]\|Generate 5" backend/app/analyzers/geo_probe.py` — should return zero matches
- [ ] `grep -n "exactly 3\|parsed\[:3\]\|Generate 3" backend/app/analyzers/geo_probe.py` — should return 3 matches
- [ ] After a test run with `ANTHROPIC_API_KEY` set, `redis-cli GET geo:probe:{task_id}` returns a blob where `questions` has length 3
- [ ] `redis-cli GET geo:suggestions:{task_id}` is non-null and contains `critical`/`important`/`optional` keys

---

## Execution Order

```
Plan 1 → Plan 2 → Plan 3
```

- **Plan 1 must complete first.** Plan 2 rewires `geo_pipeline.py`'s Wave 1 section, which depends on having `html_pages` correctly populated from Redis (Plan 1). If Plan 2 runs against the original HTTP-fetch flow, the `extract_page_features` call will still work but PIPE-01 will not be implemented.
- **Plan 3 is independent of Plan 2** (touches different parts of the pipeline). It can be executed after Plan 1 completes even if Plan 2 is still in progress — however, running them sequentially (1 → 2 → 3) is safest.

---

## Success Criteria

(From ROADMAP — verbatim)

1. GEO pipeline retrieves HTML from `crawl:html:{task_id}` Redis hash; HTTP fallback fires only on cache miss. (PIPE-01)
2. A single `extract_page_features()` call per URL produces the features dict consumed by `geo_schema`, `geo_content`, and `geo_page_scores`. No BeautifulSoup instantiation exists in those three analyzers' per-page loops. (PIPE-02)
3. `_flesch_kincaid_grade` and `_count_syllables` are defined only in `geo_features.py`. `geo_content.py` and `geo_page_scores.py` import them; neither contains a local definition. (PIPE-03)
4. `preliminary_score = compute_score(...)` does not appear in `geo_pipeline.py`. `generate_suggestions()` signature has no `score_data` parameter. (PIPE-04)
5. Probe makes ≤16 Claude API calls per analysis (3 questions × 5 engines + 1 generation call). `probe.questions` in the Redis result has length 3. (PIPE-05)
