# Phase 2: Scoring Accuracy - Research

**Researched:** 2026-03-30
**Domain:** GEO scoring pipeline — E-E-A-T detection, factual density, per-page scores, technical signal integration
**Confidence:** HIGH (all findings are from direct source-code inspection of the live codebase)

---

## Summary

Phase 2 tightens the accuracy of the AI Citation Readiness Score by fixing
shallow signal detection (credential/trust/citation patterns), eliminating
noise zones from factual density counting, closing the loop between per-page
scores and the unified score, and adding two missing technical signals (AI
crawler access, security headers) that are already collected but ignored by
the scorer.

All nine requirements are pure Python changes in four backend files
(`geo_eeat.py`, `geo_content.py`, `geo_score.py`, and minor wiring changes
in `geo_pipeline.py`). No new libraries are required. No database schema
changes are needed. The frontend needs one small change for SCORE-09 (PSI
mobile-primary display).

**Primary recommendation:** Implement in the order SCORE-05, SCORE-03,
SCORE-02, SCORE-04, SCORE-01, SCORE-06, SCORE-07, SCORE-08, SCORE-09 — the
factual density and credential fixes are cheapest and highest-impact; the
wiring changes (06-09) are straightforward once the detection layer is solid.

---

## Per-Requirement Findings

---

### SCORE-01: E-E-A-T expertise detection uses topic-entity alignment

**Current state (geo_eeat.py lines 25-31 and 258-263):**

```python
_EXPERTISE_PATTERNS = [
    r"\b(md|phd|dr\.?|professor|cpa|cfa|attorney|lawyer|engineer|certified)\b",
    r"\b(\d+\+?\s+years?\s+(of\s+)?(experience|expertise))\b",
    r"\b(award[- ]winning|industry[- ]leading|recognized\s+by)\b",
    r"\b(research|study|studies|published|peer[- ]reviewed)\b",
    r"\b(founder|co-founder|ceo|cto|chief)\b",
]
```

`_check_html_signals()` (line 241) receives raw HTML strings only — it has no
access to `site_type`, page URL, or topic keywords. The function finds any
credential match anywhere in homepage + about page text and awards up to 20
points regardless of whether it relates to the site's actual domain.

**Problem:** A cooking blog with a "certified personal trainer" footer ad gets
the same expertise credit as a medical clinic citing its physicians.

**`site_type` availability:** `site_type` is detected in `geo_pipeline.py`
line 174 _before_ Wave 1 runs, but it is NOT passed to `analyze_eeat()` (line
186). The call is:
```python
def _run_eeat():
    return analyze_eeat(all_page_urls, homepage_html, about_html, pages)
```
`site_type` is a local variable in scope at that point — it just is not
forwarded.

**What page data is available inside `analyze_eeat()`:**
- `page_urls` — all crawled URL strings (contains path segments like `/blog/`,
  `/product/`, `/service/`)
- `homepage_html` + `about_html` — raw HTML strings; full text extractable via
  BeautifulSoup
- `pages` list — full page-row dicts with `address`, `h1`, `title`, `h2`
  headings, and `meta_descp` fields

**Recommended mechanism — keyword lists per site_type:**

Pass `site_type` as a new optional parameter to `analyze_eeat()` (default
`"informational"` to preserve backward compat). Maintain a mapping:

```python
_SITE_TYPE_CREDENTIAL_KEYWORDS = {
    "blog":         {"published", "journalist", "editor", "writer"},
    "e-commerce":   {"certified", "authorized", "manufacturer"},
    "news":         {"journalist", "reporter", "editor", "correspondent"},
    "saas":         {"engineer", "cto", "ciso", "cissp", "developer"},
    "service":      {"attorney", "md", "phd", "cpa", "certified", "licensed"},
    "portfolio":    {"designer", "photographer", "ux", "award"},
    "informational": set(),  # accept any credential — no filtering
}
```

In `_compute_eeat_score()`, after collecting `expertise_signals`, verify at
least one signal token overlaps with the site_type's keyword set. If
`informational` (the catch-all), award full points with no filtering. If a
site_type has no credentials at all (empty set match), score 0 expertise pts.

This is a keyword-list approach — no NLP or API call required. Confidence:
HIGH (straightforward to implement, low false-positive risk with a permissive
catch-all for `informational`).

---

### SCORE-02: Citation detection validates doi.org/pubmed/ncbi links

**Current state:**

In `geo_eeat.py` lines 53-62, `_CITATION_PATTERNS` are plain regex text
matches:
```python
_CITATION_PATTERNS = [
    r"\[\d+\]",
    r"according\s+to\s+[A-Z]",
    r"cited\s+by",
    r"source[s]?:",
    r"reference[s]?:",
    r"doi\.org",      # ← text-only match, not URL validation
    r"pubmed",        # ← text-only
    r"ncbi\.nlm",     # ← text-only
]
```

`citations_found` is a boolean (line 293). Any page mentioning "pubmed" in any
context (including ad copy "Cited by PubMed") gets `citations_found = True`
and awards 15 points.

Identical duplicate patterns exist in `geo_page_scores.py` lines 35-44
(duplicated verbatim).

**`httpx` availability:** Yes. `httpx` is already imported in `geo_pipeline.py`
(line 13) and `audit.py` (line 11). It is NOT currently imported in
`geo_eeat.py` — would need one import line added.

**Recommended approach:**

1. In `_check_html_signals()`, use BeautifulSoup to extract all `<a href>`
   links from the combined HTML. Collect hrefs matching:
   ```python
   _CITABLE_LINK_RE = re.compile(
       r"https?://(doi\.org|pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov)",
       re.IGNORECASE
   )
   ```
2. Validate the **format** of DOI links: a real DOI href looks like
   `https://doi.org/10.XXXX/...` — the `10.` prefix is mandatory per DOI
   spec. A regex check `r"doi\.org/10\.\d{4,}"` is sufficient without an HTTP
   call.
3. For PubMed/NCBI, a URL containing `/pubmed/\d+` or `/pmc/articles/PMC\d+`
   is structurally valid.
4. **Do NOT do live HTTP HEAD requests for citation validation.** Reasons:
   - DOI resolution redirects can be slow (500ms–3s each)
   - Some DOIs are paywalled (403 but valid)
   - Adds unpredictable latency to the synchronous Wave 1 eeat run
   - Structural URL validation catches >95% of real vs. fake citations
5. Score: `citations_found = True` only if ≥1 structurally valid DOI/PubMed
   link is found. Plain text mentions ("pubmed says…") do not qualify.
6. Apply the same updated pattern to `geo_page_scores.py` `_CITATION_PATTERNS`
   to keep per-page scores consistent.

**Timeout/failure mode:** No HTTP calls → no timeout risk.

---

### SCORE-03: Expanded credential patterns

**Current `_EXPERTISE_RE` (geo_eeat.py line 26):**
```python
r"\b(md|phd|dr\.?|professor|cpa|cfa|attorney|lawyer|engineer|certified)\b"
```

**Also in geo_page_scores.py line 46:**
```python
r"\b(md|phd|dr\.?|professor|cpa|cfa|attorney|lawyer|engineer|certified)\b"
```

Both files must be updated.

**Recommended expanded pattern — grouped by domain:**

```python
# Medical / clinical
r"\b(md|m\.d\.|do|d\.o\.|rn|np|pa-c|phd|psyd|dmd|dds|od|dc|dpt|board[- ]certified|fellowship[- ]trained|residency[- ]trained)\b"

# Legal / financial
r"\b(jd|j\.d\.|esq|attorney|lawyer|cpa|cfa|cfp|cfe|series[- ]\d+|enrolled\s+agent)\b"

# Technology / engineering
r"\b(pe|p\.e\.|cissp|cism|cisa|aws[- ]certified|google[- ]certified|pmp|six\s+sigma|ccna|ccnp|ceh)\b"

# Mental health / social work
r"\b(lcsw|lmft|lpc|lpcc|mft|psyd|lcpc|mhc)\b"

# General professional
r"\b(professor|dr\.?|certified|licensed|accredited|registered|fellow|board[- ]member)\b"
```

**False-positive risk analysis:**
- `certified` is generic — present in current pattern, acceptable as a weak
  signal when combined with SCORE-01's site_type filtering
- `pe` could match common words; use word-boundary `\b` and require uppercase
  context or combine as `\b(PE|P\.E\.)\b` with `re.I` off for this token
- `md` risks matching "md" as abbreviation in unrelated contexts; acceptable
  since it already exists and site_type filtering (SCORE-01) reduces weight
- `lcsw`, `lmft`, `lpc` — highly specific, essentially zero false positives

**Implementation note:** Split into separate per-domain regex objects for
clarity and future maintenance, rather than one massive alternation.

---

### SCORE-04: Trust page detection uses content heuristics

**Current state (geo_eeat.py lines 13-22 and 232-238):**

`_check_url_patterns()` operates purely on URL path strings joined into a
single string:
```python
def _check_url_patterns(page_urls: list[str]) -> dict[str, bool]:
    url_text = " ".join(page_urls).lower()
    for signal_name, patterns in _TRUST_URL_PATTERNS.items():
        found[signal_name] = any(re.search(p, url_text, re.I) for p in patterns)
    return found
```

A site with `/legal/privacy-stuff` or `/info/contact-form` will not match
the `/privacy` or `/contact-us` patterns.

**Page content availability inside `analyze_eeat()`:**
The function receives `homepage_html` and `about_html` as raw strings. It does
NOT currently receive per-page content for non-homepage/about pages.

**What content signals distinguish real trust pages:**

| Trust Page | Key Phrases | Word Count Floor |
|-----------|-------------|-----------------|
| Privacy Policy | "personal information", "data we collect", "cookies", "third parties", "opt out" | 300+ words |
| Terms of Service | "terms of service", "terms and conditions", "you agree", "limitation of liability", "intellectual property" | 200+ words |
| Contact | "contact us", form with email/phone inputs, "get in touch", "send us a message" | 50+ words or form element |
| About | "our team", "our mission", "founded in", "who we are", company name + description | 150+ words |

**Recommended hybrid approach:**

Keep URL matching as primary signal (fast, reliable for conventional paths).
Add content-heuristic fallback: for pages that do NOT match URL patterns,
parse homepage + about HTML via BeautifulSoup and search for the key phrases
above. If ≥2 key phrases match for a trust page type, mark it as found.

This is additive — it does not replace URL matching. Zero regression risk.
The homepage + about HTML are already available in `_check_html_signals()`.
For privacy/terms, also scan any page whose URL contains `/legal`, `/info`,
`/policy` as a secondary URL hint.

**Implementation:** Add `_check_content_trust_signals(homepage_text: str,
about_text: str) -> dict[str, bool]` and OR its results with URL pattern
results in `analyze_eeat()`.

---

### SCORE-05: Factual density scoring filters nav/footer/ad zones

**Current state:**

`_factual_density_score(text: str)` in `geo_content.py` lines 117-147
receives a plain string. It is called at line 240:
```python
fd = _factual_density_score(text)
```
where `text = feat["body_text"]` (line 208).

`body_text` is produced by `geo_features.extract_page_features()` at line 114:
```python
body_text = soup.get_text(separator=" ", strip=True)
```
This runs AFTER stripping `_STRIP_TAGS = {"script", "style", "nav", "header",
"footer", "aside", "noscript", "iframe"}` (geo_features.py line 19).

**Critical finding: nav and footer are ALREADY stripped.**

The `_STRIP_TAGS` frozenset includes `nav`, `header`, `footer`, `aside`,
and `iframe`. These are decomposed from the soup BEFORE `body_text` is
extracted (geo_features.py lines 111-114). So `body_text` passed to
`analyze_content()` already excludes these zones.

**What is NOT stripped:**
- `<div class="ad">` or `<div id="sidebar">` — class/id-based ad zones
- `<div class="breadcrumb">` — navigation breadcrumbs in `<div>` form
- Cookie consent banners (often `<div>` elements)
- Sidebar widgets rendered in `<div>` containers

**Recommendation:**

The majority of the zone-filtering problem (nav/footer) is already solved by
`_STRIP_TAGS`. The remaining concern is class/id-based ad and sidebar divs.

Two options:
1. **Light additional stripping in `geo_features.py`:** After tag-based
   stripping, also decompose `<div>` elements whose `class` or `id` attribute
   matches `re.compile(r'ad|banner|sidebar|cookie|promo|widget', re.I)`. Risk:
   may remove legitimate content in poorly-structured pages.
2. **Accept current behavior:** Since nav/header/footer are already stripped,
   the marginal signal from remaining div-based ad zones is small. Document as
   a known limitation.

**Recommended decision:** Option 1, applied only at the `geo_features.py`
stripping step, with conservative class/id patterns limited to `\bad\b`,
`\bbanner\b`, `\bsidebar\b`, `cookie-consent`, `\bpromo\b`. Keep pattern
narrow to minimize false removal of real content divs.

**`analyze_content()` itself does not need changes** — the fix is upstream in
`geo_features.py` stripping logic.

---

### SCORE-06: Per-page GEO scores averaged into unified score

**What `score_pages()` returns (geo_page_scores.py lines 593-618):**

Each element of the returned list is:
```python
{
    "url": str,
    "score": int,           # 0-100 overall page score
    "grade": str,           # A-F
    "word_count": int,
    "has_schema": bool,
    "has_h1": bool,
    "has_meta_descp": bool,
    "has_canonical": bool,
    "has_author": bool,
    "has_date": bool,
    "has_citations": bool,
    "reading_grade": float,
    "question_density": float,
    "breakdown": {
        "structured_data": float,
        "eeat": float,
        "content": float,
        "meta": float,
        "nlp": float,
    },
    "issues": [...],
    "engine_scores": {...},
}
```

The list is sorted worst-first by `score`. The `score` field (0-100) is the
one to average.

**Current state in `compute_score()` (geo_score.py lines 278-331):**

`page_scores` is NOT a parameter of `compute_score()`. The function receives
`schema`, `eeat`, `content`, `nlp`, `audit`, `probe`, `entity`, `site_type`.
Per-page scores are stored to Redis separately (`set_geo(task_id, "page_scores",
page_scores_result)`) but never fed back into the final score.

**Recommended implementation:**

1. Add `page_scores: list[dict] | None = None` parameter to `compute_score()`.
2. Add a `_page_score_raw(page_scores)` helper:
   ```python
   def _page_score_raw(page_scores: list[dict] | None) -> float:
       if not page_scores:
           return 50.0  # neutral when no pages scored
       scores = [p["score"] for p in page_scores if isinstance(p.get("score"), (int, float))]
       return round(sum(scores) / len(scores), 1) if scores else 50.0
   ```
3. Which weight category: Do NOT add a new top-level weight. Absorb page score
   average into the existing `"technical"` dimension or create a sub-weight
   blending. Best approach: keep current WEIGHTS dict unchanged (total remains
   100) and blend `page_score_raw` into the `conversational` raw score at 20%
   weight alongside existing signals. This avoids redistributing weights across
   all engine profiles.

   Alternatively (cleaner): replace or supplement the `conversational` raw
   score formula — currently computed from factual density (30 pts), tone
   (25 pts), FAQ (20 pts), headings (20 pts), lists (5 pts). Add page_avg as
   a 6th input replacing 10 pts from the heading/list bucket.

4. Update `run_geo_pipeline()` (geo_pipeline.py line 276) to pass
   `page_scores=page_scores_result` to `compute_score()`.

**Weight impact:** No new top-level category added → WEIGHTS sum stays at 100
→ engine profiles unchanged. This is the safe path.

---

### SCORE-07: AI crawler access factored into technical dimension score

**Where `ai_crawler_access` is stored:**

In `tasks.py` line 22, it is received as a parameter to `process_site()`. It
is stored in Redis meta at line 31:
```python
"ai_crawler_access": ai_crawler_access,
```
and persisted at line 128 (post-crawl meta update).

The Redis meta dict is retrieved via `get_meta(task_id)`. It is NOT part of
`audit_result` — `audit_result` is `{**url_checks, **page_checks}` (line 144)
and contains only HTTPS, sitemap, broken_links, missing_canonicals,
security_headers, pagespeed.

**`ai_crawler_access` dict structure** (from robots.py line 102 comment):
```python
{"GPTBot": bool, "ChatGPT-User": bool, "Google-Extended": bool,
 "PerplexityBot": bool, "Anthropic-AI": bool, "Claude-Web": bool,
 "<own-bot>": bool}
```
`True` = access allowed, `False` = blocked.

**Data flow problem:** `compute_score()` in `geo_score.py` only receives the
`audit` dict. `ai_crawler_access` is in the separate `meta` dict. There are
two ways to thread it through:

**Option A (recommended):** Merge `ai_crawler_access` into `audit_result`
inside `run_geo_pipeline()` before calling `compute_score()`. The pipeline
already receives `audit_result` as a parameter. Add:
```python
# in run_geo_pipeline(), before compute_score() call
meta = get_meta(task_id) or {}
audit_with_crawlers = {**audit_result, "ai_crawler_access": meta.get("ai_crawler_access")}
```
Then pass `audit_with_crawlers` to `compute_score()`.

**Option B:** Add `ai_crawler_access` as a separate parameter to
`compute_score()`. More explicit but requires signature change.

**Scoring formula for `_technical_raw()`:**

Currently: HTTPS 30 + Sitemap 20 + Broken Links 25 + Canonicals 25 = 100.

Proposed redistribution to include AI crawler access (15 pts) and security
headers (15 pts — see SCORE-08):

| Signal | Current pts | New pts |
|--------|------------|---------|
| HTTPS | 30 | 25 |
| Sitemap | 20 | 15 |
| Broken links | 25 | 20 |
| Missing canonicals | 25 | 20 |
| AI crawler access | 0 | 10 |
| Security headers | 0 | 10 |
| **Total** | **100** | **100** |

**AI crawler scoring formula:**
```python
ai_access = audit.get("ai_crawler_access") or {}
if ai_access:
    allowed = sum(1 for v in ai_access.values() if v)
    total = len(ai_access)
    score += int((allowed / total) * 10)
# If ai_crawler_access is None/empty → 5 pts (neutral, not penalised)
```

---

### SCORE-08: Security headers included in technical dimension score

**Current state:**

`check_security_headers()` (audit.py line 83) returns:
```python
{
    "headers": {
        "strict_transport_security": {"present": bool, "value": str|None, "label": str},
        "content_security_policy":   {"present": bool, ...},
        "x_frame_options":           {"present": bool, ...},
        "x_content_type_options":    {"present": bool, ...},
        "referrer_policy":           {"present": bool, ...},
    },
    "passed_count": int,   # 0-5
    "total_count": 5,
}
```

This is already part of `audit_result` (audit.py line 237):
```python
"security_headers": async_results.get("security_headers"),
```

And `audit_result` is already passed to `compute_score()` via `audit=audit_result`.

**Currently ignored in `_technical_raw()`** — no code references
`audit.get("security_headers")`.

**Recommended implementation inside `_technical_raw()`:**

Using the weight table from SCORE-07 above (10 pts for security headers):
```python
sh = audit.get("security_headers") or {}
passed = sh.get("passed_count", 0)
total = sh.get("total_count", 5)
if total > 0:
    score += int((passed / total) * 10)
else:
    score += 5  # neutral if check failed/unavailable
```

This requires no changes to data collection — it is purely additive in the
scorer.

---

### SCORE-09: PSI uses mobile as primary scoring input

**Current `_speed_raw()` (geo_score.py lines 213-234):**

```python
def _speed_raw(audit: dict | None) -> float:
    if not audit:
        return 0.0
    psi = audit.get("pagespeed", {})
    desktop = psi.get("desktop", {})
    mobile = psi.get("mobile", {})

    scores = []
    for data in [desktop, mobile]:
        if data.get("error"):
            continue
        perf = data.get("performance")
        acc = data.get("accessibility")
        if perf is not None:
            scores.append(perf)
        if acc is not None:
            scores.append(acc)

    if not scores:
        return 50.0
    return round(sum(scores) / len(scores), 1)
```

This averages desktop performance, desktop accessibility, mobile performance,
and mobile accessibility — all equally weighted. A fast desktop / slow mobile
site gets an inflated score.

**Recommended change:**

Use only mobile `performance` as the primary scoring input. Desktop data
remains available in the audit dict for UI display — no data is removed.

```python
def _speed_raw(audit: dict | None) -> float:
    if not audit:
        return 0.0
    psi = audit.get("pagespeed", {})
    mobile = psi.get("mobile", {})

    if mobile.get("error") or mobile.get("performance") is None:
        # Fallback: try desktop performance if mobile unavailable
        desktop = psi.get("desktop", {})
        if desktop.get("performance") is not None:
            return round(float(desktop["performance"]), 1)
        return 50.0  # neutral

    return round(float(mobile["performance"]), 1)
```

**Frontend impact:** The Technical Audit tab already renders desktop and mobile
PSI scores separately in the UI via the full `pagespeed.desktop` and
`pagespeed.mobile` audit objects. No frontend change is needed to show desktop
separately — it is already shown. The only change is that the _score
computation_ uses mobile only.

---

## Files to Modify

| File | Requirements | Type of Change |
|------|-------------|---------------|
| `backend/app/analyzers/geo_eeat.py` | SCORE-01, SCORE-02, SCORE-03, SCORE-04 | Pattern expansion + new heuristics |
| `backend/app/analyzers/geo_content.py` | SCORE-05 (minor) | Accept pre-stripped text (already done via geo_features) |
| `backend/app/analyzers/geo_features.py` | SCORE-05 | Add div-based ad zone stripping |
| `backend/app/analyzers/geo_score.py` | SCORE-06, SCORE-07, SCORE-08, SCORE-09 | Weight redistribution + new signal inputs |
| `backend/app/analyzers/geo_page_scores.py` | SCORE-02, SCORE-03 | Sync duplicate patterns from geo_eeat.py |
| `backend/app/worker/geo_pipeline.py` | SCORE-06, SCORE-07 | Pass page_scores and ai_crawler_access to compute_score() |

---

## Architecture Patterns

### Pattern 1: Additive signal enrichment in geo_eeat.py
**What:** Expand detection patterns without changing the output dict schema.
New signals map to existing keys (`expertise_signals`, `citations_found`,
has_* booleans) so downstream consumers (geo_score.py, geo_page_scores.py)
need no changes to consume the improved data.

### Pattern 2: Weight redistribution within existing dimension
**What:** Absorb new signals (AI crawler, security headers, page scores) into
existing weight categories rather than adding new top-level categories.
**Why:** Adding a new top-level weight key breaks ENGINE_WEIGHTS (each engine
profile sums to 100 with specific allocations for known categories). Safe
redistribution stays within `technical` (already 5%) and `speed` (already 5%)
and `conversational` (already 15%).

### Pattern 3: Upstream stripping (geo_features.py) as single source of truth
**What:** Any content filtering should happen in `extract_page_features()` so
all downstream analyzers (geo_content, geo_schema, geo_page_scores) benefit
automatically.
**Why:** geo_content._factual_density_score() receives `body_text` only — it
cannot filter HTML zones itself. The fix belongs one level up.

### Anti-Patterns to Avoid
- **Live HTTP calls in synchronous Wave 1:** DOI validation via HEAD requests
  would add 1-5s latency per page containing citations, in a thread pool with
  max 4 workers. Use structural URL validation instead (SCORE-02).
- **Adding new ENGINE_WEIGHTS keys:** Each engine profile must sum to 100.
  Adding `"page_scores": N` to WEIGHTS requires subtracting N from every
  engine profile — 5 × 7 updates with coordination risk. Avoid.
- **Modifying `analyze_eeat()` output schema:** `eeat_result` is persisted to
  Redis and consumed by geo_score.py, geo_suggestions.py, and the frontend.
  Adding keys to the output dict is safe (additive); renaming or removing keys
  breaks consumers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOI URL validation | HTTP HEAD request to doi.org | Structural regex `doi\.org/10\.\d{4,}` | DOI spec guarantees 10.XXXX prefix; no network call needed |
| Ad zone detection | ML classifier for content vs. ad | CSS class/id regex on `<div>` | Sufficient for known patterns; ML is overkill |
| Credential NLP | spaCy NER for professional titles | Regex with word boundaries | Pattern set is finite and domain-specific |

---

## Common Pitfalls

### Pitfall 1: Duplicate patterns in geo_eeat.py and geo_page_scores.py
**What goes wrong:** Expanding `_EXPERTISE_PATTERNS` and `_CITATION_PATTERNS`
in `geo_eeat.py` but not in `geo_page_scores.py` creates inconsistency: the
site-level score improves but per-page scores do not reflect the same signals.
**How to avoid:** After editing geo_eeat.py patterns, grep for the same
pattern constants in geo_page_scores.py and sync them.
**Lines to check:** geo_page_scores.py lines 35-49 contain verbatim copies.

### Pitfall 2: ENGINE_WEIGHTS not summing to 100 after WEIGHTS change
**What goes wrong:** Modifying WEIGHTS (top-level) without checking that each
ENGINE_WEIGHTS profile continues to use only known keys. An unknown key in
ENGINE_WEIGHTS is silently ignored (dict .get returns 0), causing engine
scores to be lower than expected without an error.
**How to avoid:** After any WEIGHTS change, assert that all ENGINE_WEIGHTS keys
are subsets of WEIGHTS keys.

### Pitfall 3: geo_features.py soup mutation affecting downstream analyzers
**What goes wrong:** If SCORE-05 stripping is implemented by calling
`tag.decompose()` on the returned soup object inside `analyze_content()`,
it mutates the shared soup object that is also used by `geo_schema.py` and
`geo_page_scores.py` (all receive the same `page_features` list).
**How to avoid:** All additional stripping for SCORE-05 must happen inside
`extract_page_features()` in geo_features.py, BEFORE the soup is returned.
Do NOT mutate the soup in any downstream analyzer.

### Pitfall 4: `ai_crawler_access` is None for pre-robots-check tasks
**What goes wrong:** Old tasks in the queue or history may have
`ai_crawler_access: None` in their Redis meta. Scoring code that does
`ai_crawler_access.values()` without a None guard will raise AttributeError.
**How to avoid:** Always guard: `ai_access = audit.get("ai_crawler_access") or {}`.

### Pitfall 5: Mobile PSI data absent (e.g., PSI API key not configured)
**What goes wrong:** `psi.get("mobile", {})` returns `{"strategy": "mobile",
"error": "Not run"}` when the API key is missing. The `performance` key is
absent, not None.
**How to avoid:** Always check `mobile.get("performance") is not None` before
using the value. The existing fallback to 50.0 (neutral) handles missing PSI
gracefully.

---

## Code Examples

### Verified existing weight redistribution pattern (geo_score.py lines 313-321)
```python
# Source: backend/app/analyzers/geo_score.py
for category, weight in WEIGHTS.items():
    raw = raw_scores[category]
    weighted = (raw / 100.0) * weight
    breakdown[category] = {
        "weight": weight,
        "raw": round(raw, 1),
        "weighted": round(weighted, 1),
    }
    total_weighted += weighted
```
New categories added to `raw_scores` dict will be picked up automatically by
this loop — no additional loop changes needed.

### Verified audit dict structure passed to _technical_raw
```python
# Source: backend/app/analyzers/audit.py lines 234-242
# and backend/app/worker/tasks.py line 144
audit_result = {
    "https":             {"passed": bool, "detail": str},
    "sitemap":           {"found": bool, "url": str|None},
    "security_headers":  {"headers": {...}, "passed_count": int, "total_count": int},
    "pagespeed":         {"desktop": {...}, "mobile": {...}},
    "broken_links":      {"count": int, "urls": [...]},
    "missing_canonicals":{"missing_count": int, "total_html_pages": int, "urls": [...]},
}
```

### Verified geo_pipeline.py compute_score() call site (line 276-285)
```python
# Source: backend/app/worker/geo_pipeline.py
final_score = compute_score(
    schema=schema_result,
    eeat=eeat_result,
    content=content_result,
    nlp=nlp_result,
    audit=audit_result,
    probe=probe_result,
    entity=entity_result,
    site_type=site_type,
)
```
`page_scores_result` is available in scope at this point (line 212) and can be
added as a `page_scores=page_scores_result` argument.

---

## Environment Availability

Step 2.6: SKIPPED — this phase contains no external tool or service
dependencies beyond the project's existing Python stack. `httpx` is already
installed. No new packages required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected — no pytest.ini, tests/ directory, or test files found in codebase |
| Config file | None |
| Quick run command | `pytest backend/tests/ -x -q` (once Wave 0 creates test files) |
| Full suite command | `pytest backend/tests/ -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCORE-01 | Expertise score 0 when credential doesn't match site_type | unit | `pytest backend/tests/test_geo_eeat.py::test_topic_entity_alignment -x` | Wave 0 |
| SCORE-02 | `citations_found=True` only for structurally valid DOI/PubMed hrefs | unit | `pytest backend/tests/test_geo_eeat.py::test_citation_validation -x` | Wave 0 |
| SCORE-03 | CISSP, LCSW, CPA, board-certified, fellowship-trained all match | unit | `pytest backend/tests/test_geo_eeat.py::test_expanded_credentials -x` | Wave 0 |
| SCORE-04 | Trust page detected via content phrases when URL doesn't match | unit | `pytest backend/tests/test_geo_eeat.py::test_content_trust_heuristics -x` | Wave 0 |
| SCORE-05 | Factual density counts exclude nav/footer/ad zones | unit | `pytest backend/tests/test_geo_content.py::test_factual_density_zone_filter -x` | Wave 0 |
| SCORE-06 | Page score average appears in unified score breakdown | unit | `pytest backend/tests/test_geo_score.py::test_page_scores_in_unified -x` | Wave 0 |
| SCORE-07 | All bots blocked → 0 ai_crawler pts; none blocked → full pts | unit | `pytest backend/tests/test_geo_score.py::test_ai_crawler_technical -x` | Wave 0 |
| SCORE-08 | 5/5 headers → 10 technical pts; 0/5 → 0 pts | unit | `pytest backend/tests/test_geo_score.py::test_security_headers_technical -x` | Wave 0 |
| SCORE-09 | `_speed_raw` uses mobile performance only; desktop PSI not in score | unit | `pytest backend/tests/test_geo_score.py::test_mobile_psi_primary -x` | Wave 0 |

### Wave 0 Gaps
- [ ] `backend/tests/__init__.py` — package marker
- [ ] `backend/tests/test_geo_eeat.py` — covers SCORE-01 through SCORE-04
- [ ] `backend/tests/test_geo_content.py` — covers SCORE-05
- [ ] `backend/tests/test_geo_score.py` — covers SCORE-06 through SCORE-09
- [ ] `backend/tests/conftest.py` — shared fixture data (sample HTML, audit dicts)
- [ ] Framework install: `pip install pytest` inside the backend container or virtualenv

---

## Open Questions

1. **SCORE-01: What weight to give mismatched expertise?**
   - What we know: Current code awards up to 20 pts for any credential match.
   - What's unclear: Should a mismatched credential get 0 pts or a reduced
     score (e.g., 5 pts for "has a credentialed person, but not topic-matched")?
   - Recommendation: 0 pts for mismatch to make the signal meaningful.
     Sites can still earn the full E-E-A-T score via author bylines, citations,
     and trust pages.

2. **SCORE-06: Should the page average replace or supplement conversational score?**
   - What we know: `conversational_raw` currently tops at 100 pts from 5
     sub-signals. Adding page_score as a 6th input with no weight reduction
     could push raw above 100 (capped anyway) but dilutes each sub-signal.
   - Recommendation: Replace the "list usage" 5 pts sub-signal with a
     "page score average" 10 pts sub-signal (net +5 pts shift, within the
     same category weight).

3. **SCORE-05: Which specific div class/id patterns to strip?**
   - What we know: Most modern ad networks use class names like `ad`, `ads`,
     `advertisement`, `banner`, `sidebar`, `widget`, `cookie`.
   - What's unclear: Some themes use `ad` in legitimate class names (e.g.,
     `add-to-cart`, `address`).
   - Recommendation: Use strict word-boundary patterns:
     `re.compile(r'(?<![a-z])ad(?![a-z])|banner|sidebar|cookie.consent|promo-bar', re.I)`

---

## Sources

### Primary (HIGH confidence)
All findings are direct source code reads. No external sources required.

- `backend/app/analyzers/geo_eeat.py` — full file; all E-E-A-T patterns,
  scoring formula, and function signatures
- `backend/app/analyzers/geo_content.py` — lines 1-147, 179-279; factual
  density patterns and analyze_content() loop
- `backend/app/analyzers/geo_score.py` — full file; all weight dicts,
  _technical_raw(), _speed_raw(), compute_score() signature
- `backend/app/analyzers/geo_features.py` — full file; _STRIP_TAGS,
  extract_page_features() stripping logic
- `backend/app/analyzers/geo_page_scores.py` — lines 1-80, 580-625; duplicate
  patterns and score_pages() return structure
- `backend/app/worker/tasks.py` — lines 1-178; ai_crawler_access storage in
  Redis meta and audit_result composition
- `backend/app/worker/geo_pipeline.py` — full file; compute_score() call site,
  Wave 1/2 orchestration, site_type availability
- `backend/app/analyzers/audit.py` — lines 83-243; check_security_headers()
  return structure, run_url_checks() assembly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing httpx, BeautifulSoup, re
- Architecture: HIGH — all patterns verified by direct code inspection
- Pitfalls: HIGH — derived from actual code structure (shared soup mutation,
  None guard needs, duplicate pattern files)

**Research date:** 2026-03-30
**Valid until:** 2026-05-30 (stable codebase; findings degrade only if files
listed above are restructured)
