# Phase 1: Pipeline Efficiency - Research

**Researched:** 2026-03-30
**Domain:** Python backend — Celery/async pipeline, Redis data access, BeautifulSoup HTML parsing, Claude API cost optimization
**Confidence:** HIGH (all findings derived from direct source-code inspection)

---

## Summary

The GEO pipeline currently makes a second round of HTTP fetches for pages it already crawled, re-parses HTML with BeautifulSoup independently in four separate analyzers for the same set of URLs, duplicates the Flesch-Kincaid computation across three files, computes a "preliminary score" whose only consumer is the suggestions generator, and runs 26 Claude API calls per probe (1 question-generation call + 5 engines × 5 questions). All five requirements (PIPE-01 through PIPE-05) are independently addressable, but there is one hard dependency: PIPE-01 (HTML from Redis) must be resolved before PIPE-02 (shared parse) is designed, because the design of the shared-parse interface depends on whether HTML arrives from Redis or from HTTP.

**Primary recommendation:** Implement in dependency order — PIPE-01 first (Redis HTML store), then PIPE-02 (shared parse), then PIPE-03 (readability dedup), then PIPE-05 (probe reduction), then PIPE-04 (preliminary score removal) last because it is the lowest-risk change once everything else is stable.

---

## Project Constraints (from CLAUDE.md)

No CONTEXT.md exists for this phase. The following constraints come from CLAUDE.md:

- Backend: FastAPI + Celery + Redis (Python 3.11)
- Redis TTL for all crawl data: 2 hours (`CRAWL_TTL_SECONDS = 7200`)
- GEO agent results stored under `geo:{agent}:{task_id}` keys in Redis
- External API keys: `ANTHROPIC_API_KEY`, `GOOGLE_PSI_API_KEY`
- Docker Compose deployment — no additional services may be added
- No authentication or rate limiting currently in place

---

## PIPE-01: Redis HTML Retrieval

### Current State

**The critical finding: HTML is NOT stored in Redis today.**

The crawler pipeline works as follows:
1. `crawler.py` — `build_page_data()` (line 306) calls `_compute_readability(response.text)` using the live HTTP response, then discards `response.text`. Only the extracted metadata dict is passed onward.
2. `tasks.py` — `on_page_crawled()` (line 73-74) calls `append_page(task_id, page_data)` where `page_data` is the metadata dict — no HTML field.
3. `crawl_store.py` — `append_page()` (line 68) serialises the metadata dict to JSON and pushes it to `crawl:pages:{task_id}` Redis list. No HTML key exists.

As a result, `geo_pipeline.py` (line 138-144) re-fetches all selected URLs over HTTP using `httpx.Client` with a shared `ThreadPoolExecutor(max_workers=8)`. This is by design in the current architecture, not an oversight.

### What Needs to Change for PIPE-01

To eliminate the re-fetch, HTML must be stored during the original crawl. Two approaches exist:

**Option A — Store HTML inside the page JSON (in `crawl:pages:{task_id}`).**
- Pro: No new Redis key type; retrieval via existing `get_all_pages()`.
- Con: Every consumer of `get_all_pages()` (the Spider tab, pagination endpoint, CSV export) would receive and serialize large HTML blobs they don't need. Redis memory usage increases significantly — a 50-page site with ~50KB HTML/page adds ~2.5MB per task. The frontend API routes in `sites.py` line 107 already project specific fields; adding HTML to the list bloats every list-range call.

**Option B — Store HTML in a separate Redis hash `crawl:html:{task_id}` keyed by URL.**
- Pro: No impact on existing page-metadata consumers. HTML is fetched only by the GEO pipeline. Memory is bounded to the 2-hour TTL same as other crawl data.
- Con: Requires a new `crawl_store.py` function (`set_page_html`, `get_pages_html`) and one extra Redis call in the crawler per HTML page.
- **Recommended approach.**

### Implementation Sketch (Option B)

In `crawl_store.py`, add:
```python
def _html_key(task_id: str) -> str:
    return f"crawl:html:{task_id}"

def store_page_html(task_id: str, url: str, html: str) -> None:
    r = get_redis()
    r.hset(_html_key(task_id), url, html)
    r.expire(_html_key(task_id), CRAWL_TTL_SECONDS)

def get_pages_html(task_id: str, urls: list[str]) -> dict[str, str]:
    """Return {url: html} for the given URLs. Missing URLs return empty string."""
    r = get_redis()
    key = _html_key(task_id)
    pipe = r.pipeline()
    for url in urls:
        pipe.hget(key, url)
    values = pipe.execute()
    return {u: (v or "") for u, v in zip(urls, values)}
```

In `crawler.py` `build_page_data()`, the HTML can be passed back through `on_page_crawled` by including a `_html` field (prefixed with `_` to match the existing `_img_alts` convention), stripped before Redis persistence in `crawl_store.append_page()`.

In `geo_pipeline.py`, replace `_fetch_html` / `httpx.Client` block with a call to `get_pages_html(task_id, urls_to_fetch)`.

### Risk: HTML Not Available in Redis

If the GEO pipeline is called from a context where `task_id` is not available (e.g. a future standalone re-analysis endpoint), the fallback must remain HTTP fetch. The `_fetch_html` function should be kept but only invoked when a URL returns empty from Redis.

---

## PIPE-02: Shared BeautifulSoup Parse

### Current State

Each of the four Wave 1 analyzers independently parses HTML from scratch. Here is the exact parse location per analyzer:

| Analyzer | Function | Line | Parser Used |
|---|---|---|---|
| `geo_schema.py` | `analyze_schemas()` | line 214-217 | `lxml` with `html.parser` fallback |
| `geo_content.py` | `_clean_text()` | line 49-51 | `lxml` with `html.parser` fallback |
| `geo_content.py` | `_extract_headings()` | line 114-116 | `lxml` with `html.parser` fallback |
| `geo_content.py` | `_detect_faq()` | line 130-132 | `lxml` with `html.parser` fallback |
| `geo_eeat.py` | (implicitly via text-matching on raw html string in `analyze_eeat`) | — | No BS parse — uses raw string regex |
| `geo_page_scores.py` | `_extract_page_features()` | line 142-144 | `lxml` with `html.parser` fallback |

`geo_eeat.py` does NOT parse HTML with BeautifulSoup directly — it receives `homepage_html` and `about_html` as raw strings and runs regex patterns against them. So the 4× BS redundancy is: schema, content (×3 internal calls), and page_scores.

### Shared Parse Design Options

**Option A — Pass `BeautifulSoup` object as parameter.**
- Pro: Minimal code change. Each analyzer adds `soup: BeautifulSoup | None = None` parameter; parses only if `None`.
- Con: `soup` objects are not thread-safe for mutation (decompose, etc.). `geo_content._clean_text()` calls `tag.decompose()` to strip nav/footer tags, mutating the tree. If a single `soup` is shared, the first caller's decompose would affect subsequent callers.
- **Verdict: NOT safe without copying or pre-stripping.**

**Option B — Pre-extract a `PageFeatures` dataclass in the pipeline before the parallel wave.**
- Pro: Thread-safe. Each analyzer receives immutable extracted data, not a live tree. Decomposition happens once in the pipeline's extraction step.
- Con: Requires a new shared module (e.g. `geo_features.py`) and changing all four analyzer signatures.
- **Recommended approach.**

**Option C — Parse once per-URL in the pipeline, pass the text content strings.**
- Pro: Simple. Extract `body_text`, `html_str`, `headings`, `scripts` once, pass as a dict.
- Con: Some analyzers need the full tree (e.g. schema extraction walks all `<script type="application/ld+json">` tags). Serialising the tree to string and re-parsing defeats the purpose.
- **Verdict: Only viable if schema extraction is moved to the feature-extraction step.**

### Recommended: Minimal PageFeatures dict (not a dataclass)

A plain dict is simpler than a dataclass for this codebase style:

```python
# In a new file: backend/app/analyzers/geo_features.py
def extract_page_features(url: str, html: str) -> dict:
    """
    Parse HTML once and return all signals needed by Wave 1 analyzers.
    Strips noise tags before text extraction so no analyzer needs to do it.
    """
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    # Strip noise — happens once here
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"]):
        tag.decompose()

    body_text = soup.get_text(separator=" ", strip=True)
    html_str = str(soup)   # for regex-based author/citation patterns in geo_eeat / geo_page_scores

    return {
        "url": url,
        "soup": soup,          # for structural queries (headings, links, schema scripts NOT stripped)
        "body_text": body_text,
        "html_str": html_str,
        # pre-extracted fields for common needs:
        "h1": ...,
        "h2s": ...,
        "title": ...,
        "meta_descp": ...,
        "canonical": ...,
    }
```

**Caveat on `soup` sharing after decompose:** After stripping nav/footer/script/style tags, schema extraction via `soup.find_all("script", type="application/ld+json")` would find nothing because script tags were stripped. Therefore the schema extractor must either (a) receive the original unstripped soup, or (b) have its JSON-LD extraction run before the strip. The cleanest resolution is to run JSON-LD extraction as part of `extract_page_features` before stripping, and include the raw schema data in the features dict.

### Analyzer Signature Changes Required

| Analyzer | Current Signature | New Signature |
|---|---|---|
| `geo_schema.analyze_schemas` | `(pages_html: list[tuple[str, str]], site_type)` | `(page_features: list[dict], site_type)` |
| `geo_content.analyze_content` | `(pages_html: list[tuple[str, str]])` | `(page_features: list[dict])` |
| `geo_eeat.analyze_eeat` | `(page_urls, homepage_html, about_html, pages)` | unchanged — receives raw html strings, not soup |
| `geo_page_scores.score_pages` | `(fetched_pages: list[tuple[str, str]])` | `(page_features: list[dict])` |

`geo_eeat` is the outlier — it doesn't do BeautifulSoup parsing; it regex-matches against raw HTML strings. Its signature need not change.

---

## PIPE-03: Flesch-Kincaid Deduplication

### Current State — Three Implementations

| File | Function | Lines | Returns | Used By |
|---|---|---|---|---|
| `crawler.py` | `_compute_readability(html)` | 21-39 | `"Good"` / `"Poor"` / `"N/A"` (string label) | `build_page_data()` line 306 → stored in `page.readability` → API `sites.py` line 107 → frontend Spider tab column |
| `geo_content.py` | `_flesch_kincaid_grade(text)` | 63-80 | `float` (0.0–20.0) | `analyze_content()` line 282 → stored as `flesch_kincaid_grade` in content_result |
| `geo_page_scores.py` | `_compute_fk_grade(text)` | 122-133 | `float` (0.0–20.0, rounded) | `_extract_page_features()` line ~170-area → used in `_score_content_quality()` |

The comment on `geo_page_scores.py` line 106 explicitly says: `"""Approximate syllable count — copied from geo_content.py."""` and line 123: `"""Flesch-Kincaid Grade Level — copied from geo_content.py."""` — the developer knew this was a duplicate.

### Key Dependency: crawler.py version must stay

The `crawler.py` version returns a string label (`"Good"` / `"Poor"` / `"N/A"`), not a float. This label is stored per-page in Redis under the `readability` field and is consumed by:
- `backend/app/api/routes/sites.py` line 107 (API response)
- `frontend/app/lib/api.ts` line 43 (`readability: string | null`)
- `frontend/app/page.tsx` lines 343, 572, 1202 (Spider tab column, page detail panel, CSV export)

**The crawler.py `_compute_readability` function MUST NOT be removed.** It produces a different output type (label) and serves the frontend directly. PIPE-03 scope is limited to the duplicate float-returning implementations in `geo_content.py` and `geo_page_scores.py`.

### Correct Implementation

`geo_content.py`'s `_flesch_kincaid_grade` is the more complete implementation:
- Has a dedicated `_count_syllables()` helper with the `"e"` ending correction.
- Returns a rounded float.
- Has been in production longer.

`geo_page_scores.py`'s `_compute_fk_grade` is identical in logic (same formula, same syllable counter) but has a slightly different comment noting it was copied.

### Removal Strategy

1. Move `_count_syllables` and `_flesch_kincaid_grade` from `geo_content.py` into the new `geo_features.py` shared module (created for PIPE-02).
2. In `geo_content.py`, import from `geo_features`.
3. In `geo_page_scores.py`, delete `_count_syllables_simple` (lines ~105-119) and `_compute_fk_grade` (lines ~122-133); import from `geo_features`.
4. If PIPE-02's `extract_page_features` pre-computes the FK grade, `geo_page_scores._extract_page_features` can read it from the features dict instead of recomputing.

**Safe removal order:** Step 3 can only happen after the import in step 1 is in place. Steps 1-3 are a single atomic change set.

---

## PIPE-04: Preliminary Score Removal

### Current State

In `geo_pipeline.py` lines 230-244:
```python
preliminary_score = compute_score(
    schema=schema_result,
    eeat=eeat_result,
    content=content_result,
    nlp=nlp_result,
    audit=audit_result,
    site_type=site_type,
)
sug_future = executor.submit(
    generate_suggestions,
    preliminary_score, schema_result, eeat_result,
    content_result, nlp_result, audit_result, site_type,
)
```

`preliminary_score` is passed as `score_data` to `generate_suggestions()`. It is NOT stored in Redis (never passed to `set_geo()`). It is only used as context for Claude when generating suggestions.

### generate_suggestions Signature

```python
def generate_suggestions(
    score_data: dict,
    schema: dict | None,
    eeat: dict | None,
    content: dict | None,
    nlp: dict | None,
    audit: dict | None,
    site_type: str = "informational",
) -> dict:
```

`score_data` is used in `_build_context()` (lines 53-59):
```python
f"Overall AI Citation Score: {score_data.get('overall_score', 0)}/100 (Grade: {score_data.get('grade', 'F')})",
for cat, data in score_data.get("breakdown", {}).items():
    lines.append(f"  {cat}: {data['raw']}/100 (weighted {data['weighted']}/{data['weight']})")
```

So `generate_suggestions` uses three fields from `score_data`: `overall_score`, `grade`, and `breakdown`.

### Removal Strategy

The `preliminary_score = compute_score(...)` call costs one full score computation. Removing it means `generate_suggestions` must receive the component dicts directly and derive its own summary, OR the final score computation must be moved earlier.

**Option A — Pass component dicts; remove score_data parameter.**
Change `generate_suggestions` signature to drop `score_data`. The context builder computes a lightweight summary from the component dicts directly (no full weighted computation). The Claude prompt loses the numeric overall score and breakdown, but still receives all the raw signal data. This simplifies the pipeline: no score computation before suggestions launch.

**Option B — Pass `None` as score_data.**
Already handled: `score_data.get('overall_score', 0)` defaults to 0 gracefully. This is a one-line change (`preliminary_score = {}`) with no functional correctness risk, but doesn't actually eliminate the `compute_score` call.

**Option C — Move final score computation before suggestions launch.**
Not feasible without waiting for probe and entity results, which defeats the parallelism purpose.

**Recommended: Option A.** Remove `score_data` parameter. Update `_build_context` to derive a lightweight summary (e.g. component-level flags: "schema coverage X%, eeat_score Y/100") from the dicts directly. The suggestion quality remains equivalent — Claude already receives the full breakdown data; the numeric total score added little unique signal.

**Impact on `_rule_based_suggestions`:** The rule-based fallback (lines 114-220) does NOT use `score_data` at all — it only uses `schema`, `eeat`, `content`, `nlp`, `audit`. So the fallback path requires zero changes.

---

## PIPE-05: Probe API Call Reduction

### Current State

The probe makes **26 Claude API calls** per analysis:
- 1 call to `_generate_questions()` (generates 5 questions)
- 5 engines × 5 questions = 25 calls to `_ask_one()`
- **Total: 26 calls**

The question-generation system prompt (`_QUESTION_GEN_SYSTEM`, lines 61-80) explicitly asks for `"exactly 5 questions"` and the `return [str(q) for q in parsed[:5]]` slices to 5.

`_probe_engine()` (lines 213-258) uses `ThreadPoolExecutor(max_workers=len(questions))` — so parallelism adapts automatically to question count.

`analyze_probe()` (line 191) slices: `return [str(q) for q in parsed[:5]]` — any reduction to 3 means changing only the generation prompt and the slice.

### Reduction to 3 Questions: What Changes

1. `_QUESTION_GEN_SYSTEM` prompt: change `"generate exactly 5 specific, realistic questions"` → `"generate exactly 3 specific, realistic questions"` and `"Return a JSON array of exactly 5 question strings"` → `"Return a JSON array of exactly 3 question strings"`.
2. `_generate_questions()` line 171: change `f"Generate 5 questions"` → `f"Generate 3 questions"`.
3. `_generate_questions()` return: `return [str(q) for q in parsed[:5]]` → `[:3]`.
4. `_fallback_questions` dict: each list has 5 entries; trim to 3 or slice with `[:3]` at usage.
5. (Optional) `max_tokens=512` for question generation can be reduced to `~300` for 3 questions.

**New API call count:**
- 1 generation call
- 5 engines × 3 questions = 15 calls
- **Total: 16 calls** (38.5% reduction — exactly meets the ≥38% target)

### Quality Tradeoff Assessment

The probe is a simulation: Claude playing different AI engine personas and checking if the domain is mentioned. With 5 questions, the mention rate is averaged over 5 data points per engine. With 3, it's averaged over 3. The statistical variance is higher, but the fundamental signal quality is unchanged — the questions are still brand-specific, and a site that gets mentioned tends to get mentioned across all questions. The CLAUDE.md specification notes probe has only 8% weight in the final score, so variance here has minimal impact on the overall score.

The fallback question lists already provide generic questions; reducing from 5 to 3 fallback questions still covers the primary user-intent patterns.

### Other Optimization Opportunities in geo_probe.py

- `max_tokens=300` per probe call (line 233) is already tight and appropriate for 2-4 sentence answers.
- The `_generate_questions` call uses `max_tokens=512` (line 184) — acceptable for 3 questions; could drop to 256.
- No caching of questions across runs (questions are regenerated every analysis). This is correct behavior since site content can change.
- No other Claude API calls exist in `geo_probe.py` beyond generation + probing.

---

## Architecture Patterns

### Recommended Shared Module

Create `backend/app/analyzers/geo_features.py`:
- `extract_page_features(url: str, html: str) -> dict` — single parse point
- `_count_syllables(word: str) -> int` — moved from geo_content.py
- `_flesch_kincaid_grade(text: str) -> float` — moved from geo_content.py

This module has no imports from other GEO analyzers (no circular deps).

### Recommended Project Structure After Changes

```
backend/app/analyzers/
├── geo_features.py      # NEW: shared HTML parsing + FK computation
├── geo_schema.py        # MODIFIED: accepts page_features list
├── geo_content.py       # MODIFIED: accepts page_features list, imports FK from geo_features
├── geo_eeat.py          # UNCHANGED: already uses raw html strings + regex
├── geo_page_scores.py   # MODIFIED: accepts page_features list, imports FK from geo_features
├── geo_probe.py         # MODIFIED: 3 questions instead of 5
├── geo_suggestions.py   # MODIFIED: drop score_data parameter
└── ...
backend/app/store/
└── crawl_store.py       # MODIFIED: add store_page_html / get_pages_html
backend/app/analyzers/
└── crawler.py           # MODIFIED: pass _html field through on_page_crawled, strip in store
backend/app/worker/
└── geo_pipeline.py      # MODIFIED: use Redis HTML, build page_features, remove preliminary_score
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syllable counting | Custom NLP syllable library | Existing `_count_syllables` (already in codebase) | Good enough for FK approximation; no new dependency needed |
| HTML parsing | Custom parser | `BeautifulSoup` with `lxml` + `html.parser` fallback | Already used; consistent |
| Redis pipelining | Manual multi-get loop | `r.pipeline()` with `hget` per URL | Already used in `update_pages_alt_text`; same pattern applies to HTML retrieval |

---

## Common Pitfalls

### Pitfall 1: soup.decompose() Contamination
**What goes wrong:** If a shared `BeautifulSoup` object is passed to multiple analyzers and the first one calls `tag.decompose()` to strip nav/script tags, the tree is mutated. Subsequent analyzers see a stripped tree.
**Why it happens:** `geo_content._clean_text()` strips `{"script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"}` tags by decomposing them. `geo_schema._extract_json_ld()` looks for `<script type="application/ld+json">` — if script tags are already stripped, it finds nothing.
**How to avoid:** Run JSON-LD/Microdata/RDFa extraction **before** stripping in `extract_page_features`, store the raw schema data in the features dict. Then strip. Alternatively, do all extractions from a clean copy and strip only for text extraction.
**Warning signs:** Schema analyzer returns `has_json_ld=False` for pages known to have JSON-LD.

### Pitfall 2: HTML Not in Redis for Old Task IDs
**What goes wrong:** After PIPE-01, the GEO pipeline reads HTML from Redis. If a task was crawled before the deployment (no HTML stored), `get_pages_html` returns empty strings for all URLs. The pipeline silently produces empty analysis.
**Why it happens:** The HTML hash key only exists for tasks crawled after the new `store_page_html` call is deployed.
**How to avoid:** Keep the HTTP fallback (`_fetch_html`) in `geo_pipeline.py`. When `get_pages_html` returns empty for a URL, fall back to HTTP fetch. Remove the fallback only after confirming no re-analysis of pre-deployment tasks is needed.
**Warning signs:** All GEO analysis results come back as empty/zero for a task that was crawled before deploy.

### Pitfall 3: Redis Memory Spike from HTML Storage
**What goes wrong:** Storing raw HTML in Redis increases memory use. A large site with 40 pages × 100KB HTML = 4MB per task. With 10 concurrent tasks, that's 40MB of additional Redis memory.
**Why it happens:** HTML is much larger than metadata.
**How to avoid:** Only store HTML for pages selected for GEO analysis (the 15-40 selected URLs), not all crawled pages. The selection happens in `_select_pages_to_fetch()`. Store HTML only for these URLs, not for every crawled page.
**Warning signs:** Redis `INFO memory` shows `used_memory` climbing significantly after deploy.

### Pitfall 4: Probe Mention Rate Denominator Change
**What goes wrong:** Reducing from 5 to 3 questions changes the denominator for `mention_rate` calculation. Any stored historical probe results used for comparison will have been computed with 5 questions; new results with 3 questions may show systematically different rates even for identical sites.
**Why it happens:** `mention_rate = mention_count / len(probes) * 100`. With 3 questions, a single mention is worth 33.3%; with 5 it was 20%.
**How to avoid:** This is acceptable — the History feature stores overall analysis records, not probe sub-counts. Since probe only contributes 8% to the final score, any variance is small. Add a `questions_per_engine: 3` field to the probe result dict so the frontend can show it.
**Warning signs:** Users notice probe scores jumping around compared to historical runs.

### Pitfall 5: generate_suggestions Called with Wrong Signature
**What goes wrong:** After PIPE-04 removes `score_data`, any caller that still passes a positional `score_data` argument will silently send `schema` as the first positional arg.
**Why it happens:** Python positional argument shifting.
**How to avoid:** When removing `score_data`, also convert the call site in `geo_pipeline.py` to use keyword arguments for all parameters to `generate_suggestions()`. Add a deprecation period if needed.
**Warning signs:** `generate_suggestions` logs schema data as `site_type`.

---

## Suggested Order of Changes

```
1. PIPE-03 (partial) — Create geo_features.py with shared FK + syllable functions
                        Import in geo_content.py (no behavior change yet)

2. PIPE-01 — Add store_page_html / get_pages_html to crawl_store.py
              Modify crawler.py to pass _html through on_page_crawled
              Modify append_page to strip _html before Redis serialisation
              Modify geo_pipeline.py to read HTML from Redis with HTTP fallback

3. PIPE-02 — Add extract_page_features() to geo_features.py
              Call it in geo_pipeline.py before Wave 1 (replace html_pages list)
              Modify geo_schema, geo_content, geo_page_scores to accept page_features

4. PIPE-03 (complete) — Delete _count_syllables/_compute_fk_grade from geo_page_scores.py
                         Delete _count_syllables from geo_content.py (already imported)

5. PIPE-05 — Change question count 5→3 in geo_probe.py prompt + slice

6. PIPE-04 — Remove preliminary_score from geo_pipeline.py
              Update generate_suggestions signature and _build_context
```

**Rationale:** Steps 1-2-3 are the riskiest (data flow changes) and should be done in order with testing between each. Steps 4-6 are low-risk cleanup with no data-flow impact and can be done in any order after step 3 is stable.

---

## Code Examples

### geo_content.py — FK implementation (canonical, HIGH confidence)
```python
# geo_content.py lines 63-98 — THE version to keep
def _flesch_kincaid_grade(text: str) -> float:
    words = re.findall(r"\b\w+\b", text)
    sentences = re.split(r"[.!?]+", text)
    sentences = [s for s in sentences if s.strip()]
    if not words or not sentences:
        return 8.0
    num_words = len(words)
    num_sentences = len(sentences)
    num_syllables = sum(_count_syllables(w) for w in words)
    grade = (0.39 * (num_words / num_sentences)) + (11.8 * (num_syllables / num_words)) - 15.59
    return round(max(0.0, min(grade, 20.0)), 1)
```

### crawl_store.py — Redis pipeline pattern for multi-get (HIGH confidence)
```python
# Pattern already used in update_pages_alt_text (lines 96-121)
pipe = r.pipeline()
pipe.rpush(key, *buf)
pipe.expire(key, CRAWL_TTL_SECONDS)
pipe.execute()
# Apply same pattern for HTML multi-hget
```

### geo_probe.py — Question generation prompt change (HIGH confidence)
```python
# Line 171 change:
# FROM:
f"Generate 5 questions a user would ask..."
# TO:
f"Generate 3 questions a user would ask..."

# Line 191 change:
# FROM:
return [str(q) for q in parsed[:5]]
# TO:
return [str(q) for q in parsed[:3]]

# System prompt lines 63+79:
# "generate exactly 5" → "generate exactly 3"
# "JSON array of exactly 5" → "JSON array of exactly 3"
```

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes with no new external dependencies. All tools (Redis, Python 3.11, BeautifulSoup, httpx, Anthropic SDK) are already in use.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no pytest.ini, no tests/ directory found |
| Config file | None |
| Quick run command | `pytest backend/tests/ -x -q` (after Wave 0 setup) |
| Full suite command | `pytest backend/tests/ -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | HTML stored in Redis during crawl; GEO pipeline reads it without HTTP | integration | `pytest backend/tests/test_pipe01_html_store.py -x` | Wave 0 |
| PIPE-02 | Single BS parse per page; feature dict passed to all analyzers | unit | `pytest backend/tests/test_pipe02_shared_parse.py -x` | Wave 0 |
| PIPE-03 | FK computed once; geo_page_scores imports from geo_features | unit | `pytest backend/tests/test_pipe03_fk_dedup.py -x` | Wave 0 |
| PIPE-04 | preliminary_score removed; suggestions callable without score_data | unit | `pytest backend/tests/test_pipe04_suggestions.py -x` | Wave 0 |
| PIPE-05 | Probe makes ≤16 API calls (3 questions × 5 engines + 1 generation) | unit/mock | `pytest backend/tests/test_pipe05_probe_calls.py -x` | Wave 0 |

### Wave 0 Gaps

- [ ] `backend/tests/__init__.py` — package marker
- [ ] `backend/tests/test_pipe01_html_store.py` — covers PIPE-01
- [ ] `backend/tests/test_pipe02_shared_parse.py` — covers PIPE-02
- [ ] `backend/tests/test_pipe03_fk_dedup.py` — covers PIPE-03
- [ ] `backend/tests/test_pipe04_suggestions.py` — covers PIPE-04
- [ ] `backend/tests/test_pipe05_probe_calls.py` — covers PIPE-05
- [ ] Framework install: `pip install pytest` inside the backend container

---

## Open Questions

1. **HTML storage size budget**
   - What we know: Redis is in-memory; tasks expire after 2 hours; GEO analyzes 15-40 pages max.
   - What's unclear: Current Redis memory headroom in the Docker container. Default Redis config has no memory limit set in `docker-compose.yml`.
   - Recommendation: Only store HTML for the GEO-selected URLs (15-40 pages), not all crawled pages. Monitor `redis-cli INFO memory` after deploy.

2. **BeautifulSoup lxml availability**
   - What we know: All four analyzers attempt `lxml` first and fall back to `html.parser`. This means `lxml` is expected to be installed.
   - What's unclear: Whether `lxml` is in `requirements.txt`.
   - Recommendation: Verify `lxml` is in backend requirements before adding a new parse point in `geo_features.py`.

3. **Probe result backward compatibility**
   - What we know: History feature stores full analysis records; probe results are stored as a blob.
   - What's unclear: Whether any frontend component reads `len(result.questions)` to display "5 questions tested" vs "3 questions tested".
   - Recommendation: Add `questions_per_engine: 3` to probe result dict so the frontend can display accurately.

---

## Sources

### Primary (HIGH confidence — direct source code inspection)
- `D:/AI SEO Tool/backend/app/worker/geo_pipeline.py` — full file: pipeline orchestration, fetch pattern, preliminary score usage
- `D:/AI SEO Tool/backend/app/store/crawl_store.py` — full file: Redis key structure, no HTML storage confirmed
- `D:/AI SEO Tool/backend/app/analyzers/crawler.py` — lines 1-60, 265-310: `_compute_readability` location and usage
- `D:/AI SEO Tool/backend/app/analyzers/geo_schema.py` — lines 1-60, 191-220: BS parse location in analyze_schemas
- `D:/AI SEO Tool/backend/app/analyzers/geo_content.py` — lines 1-140, 241-330: FK implementation, analyze_content signature
- `D:/AI SEO Tool/backend/app/analyzers/geo_eeat.py` — lines 1-60, 368-373: no BS parse, raw html regex confirmed
- `D:/AI SEO Tool/backend/app/analyzers/geo_page_scores.py` — lines 1-170, 595-640: duplicated FK, score_pages signature
- `D:/AI SEO Tool/backend/app/analyzers/geo_probe.py` — full file: question generation, 26-call structure confirmed
- `D:/AI SEO Tool/backend/app/analyzers/geo_suggestions.py` — full file: generate_suggestions signature and score_data usage
- `D:/AI SEO Tool/backend/app/worker/tasks.py` — lines 65-100: on_page_crawled → append_page flow
- `D:/AI SEO Tool/frontend/app/page.tsx` — lines 343, 572, 1202: readability field usage confirmed

### Secondary (MEDIUM confidence)
- None — all findings are code-derived, not from external sources.

---

## Metadata

**Confidence breakdown:**
- Current state findings: HIGH — all from direct source inspection, line numbers cited
- Recommended approaches: HIGH — based on existing patterns in the codebase
- Pitfall assessments: HIGH — derived from analyzing actual interactions between components
- API call count: HIGH — counted directly from code (1 generation + 5×5 probe = 26)
- Memory impact estimate: MEDIUM — estimated from typical HTML page sizes, not measured

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable codebase, no fast-moving dependencies)
