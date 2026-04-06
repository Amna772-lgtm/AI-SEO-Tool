# Phase 2: Scoring Accuracy — Plan

**Phase:** 2
**Status:** Ready for execution
**Requirements:** SCORE-01 through SCORE-09

---

## Plans

### Plan 1: E-E-A-T & Content Signal Accuracy (SCORE-01 through SCORE-05)

**Objective:** Tighten detection quality in `geo_eeat.py` and `geo_features.py` so expertise credentials, citations, and trust pages are verified by structure and context — not loose text matches.

**Files modified:**
- `backend/app/analyzers/geo_eeat.py`
- `backend/app/analyzers/geo_features.py`
- `backend/app/analyzers/geo_page_scores.py` (sync duplicate patterns)

---

#### Task 1: Expand credential patterns and add topic-entity alignment (SCORE-01, SCORE-03)

**Files:** `backend/app/analyzers/geo_eeat.py`

**Action:**

Replace the single `_EXPERTISE_PATTERNS[0]` regex with five domain-specific constants at module level, then add a `_SITE_TYPE_CREDENTIAL_KEYWORDS` dict to gate scoring:

```python
# Medical / clinical
_CRED_MEDICAL = re.compile(
    r"\b(md|m\.d\.|do|d\.o\.|rn|np|pa-c|phd|psyd|dmd|dds|od|dc|dpt"
    r"|board[- ]certified|fellowship[- ]trained|residency[- ]trained)\b",
    re.IGNORECASE,
)
# Legal / financial
_CRED_LEGAL = re.compile(
    r"\b(jd|j\.d\.|esq|attorney|lawyer|cpa|cfa|cfp|cfe|enrolled\s+agent)\b",
    re.IGNORECASE,
)
# Technology / engineering
_CRED_TECH = re.compile(
    r"\b(cissp|cism|cisa|aws[- ]certified|google[- ]certified|pmp|ccna|ccnp|ceh)\b",
    re.IGNORECASE,
)
# Mental health / social work
_CRED_MENTAL = re.compile(
    r"\b(lcsw|lmft|lpc|lpcc|mft|lcpc|mhc)\b",
    re.IGNORECASE,
)
# General professional (broadest — last resort)
_CRED_GENERAL = re.compile(
    r"\b(professor|dr\.?|certified|licensed|accredited|registered|fellow|board[- ]member)\b",
    re.IGNORECASE,
)
_ALL_CRED_PATTERNS = [_CRED_MEDICAL, _CRED_LEGAL, _CRED_TECH, _CRED_MENTAL, _CRED_GENERAL]

_SITE_TYPE_CREDENTIAL_KEYWORDS: dict[str, set[str]] = {
    "blog":          {"published", "journalist", "editor", "writer"},
    "e-commerce":    {"certified", "authorized", "manufacturer"},
    "news":          {"journalist", "reporter", "editor", "correspondent"},
    "saas":          {"engineer", "cto", "ciso", "cissp", "developer"},
    "service":       {"attorney", "md", "phd", "cpa", "certified", "licensed"},
    "portfolio":     {"designer", "photographer", "ux", "award"},
    "informational": set(),  # accept any credential — no filtering
}
```

In `_check_html_signals()`, replace the old `_EXPERTISE_PATTERNS` loop with:
```python
expertise_signals: list[str] = []
for pat in _ALL_CRED_PATTERNS:
    m = pat.search(text)
    if m:
        expertise_signals.append(m.group(0).strip())
```

Add `site_type: str = "informational"` parameter to `_check_html_signals()` and `analyze_eeat()`.

In `_compute_eeat_score()`, add `site_type: str = "informational"` parameter. After collecting `exp = html_signals["expertise_signals"]`, filter by site_type keyword overlap before awarding points:
```python
allowed_keywords = _SITE_TYPE_CREDENTIAL_KEYWORDS.get(site_type, set())
if allowed_keywords:
    # require at least one signal token to overlap with the site type's vocab
    matched = [s for s in exp if any(kw in s.lower() for kw in allowed_keywords)]
else:
    matched = exp  # informational: accept all
if matched:
    score += min(len(matched) * 7, 20)
    present.append(f"Expertise signals: {matched[0]}")
else:
    missing.append("No expertise signals (credentials, years of experience)")
```

Propagate `site_type` through the call chain: `analyze_eeat()` → `_check_html_signals()` → `_compute_eeat_score()`.

Update the `_run_eeat()` closure in `geo_pipeline.py` line 185 to pass `site_type`:
```python
def _run_eeat():
    return analyze_eeat(all_page_urls, homepage_html, about_html, pages, site_type=site_type)
```

**Keep the remaining `_EXPERTISE_PATTERNS` entries** (years of experience, award-winning, founder/CEO, research/published) intact — these are not credential-specific and remain in the existing list.

**Verify:** `python -m pytest backend/tests/ -x -q 2>/dev/null || python -c "from app.analyzers.geo_eeat import analyze_eeat; r = analyze_eeat(['https://example.com/about'], '<p>Dr. Jane Smith, MD, board-certified cardiologist</p>', '', [], site_type='service'); assert r['eeat_score'] > 0, r"`

**Done:** `_ALL_CRED_PATTERNS` replaces the single credential regex; `analyze_eeat()` accepts `site_type`; a service site with "MD board-certified" gets expertise credit; a cooking blog with "certified personal trainer" in footer ad gets 0 expertise pts when `site_type='blog'` and no blog-domain keywords match.

---

#### Task 2: Structural citation validation and trust page content heuristics (SCORE-02, SCORE-04)

**Files:** `backend/app/analyzers/geo_eeat.py`, `backend/app/analyzers/geo_page_scores.py`

**Action:**

**SCORE-02 — Structural citation validation in `geo_eeat.py`:**

Add a module-level compiled regex:
```python
_DOI_RE = re.compile(r"https?://doi\.org/10\.\d{4,}/\S+", re.IGNORECASE)
_PUBMED_RE = re.compile(r"https?://(?:pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov/pubmed)/\d{4,}", re.IGNORECASE)
_PMC_RE = re.compile(r"https?://www\.ncbi\.nlm\.nih\.gov/pmc/articles/PMC\d+", re.IGNORECASE)
```

In `_check_html_signals()`, after building `soup`, add a structural citation check:
```python
# Structural citation validation — link href must match DOI/PubMed format
citations_found = False
for a in soup.find_all("a", href=True):
    href = a["href"]
    if _DOI_RE.search(href) or _PUBMED_RE.search(href) or _PMC_RE.search(href):
        citations_found = True
        break
# Fallback: keep legacy text patterns for non-link citations (footnotes, inline refs)
if not citations_found:
    for pat in _CITATION_PATTERNS:
        if re.search(pat, text, re.I):
            citations_found = True
            break
```

The legacy `_CITATION_PATTERNS` list (footnote `[1]`, "according to", "source:") remains as a fallback — plain-text scholarly references still count. Only the doi.org/pubmed bare-text matches are upgraded to require structural URL validation.

**SCORE-04 — Trust page content heuristics in `geo_eeat.py`:**

Add a new helper `_check_content_trust_signals(homepage_text: str, about_text: str) -> dict[str, bool]`:
```python
_TRUST_CONTENT_SIGNALS: dict[str, list[str]] = {
    "privacy_policy": [
        "personal information", "data we collect", "cookies", "third parties", "opt out",
    ],
    "terms": [
        "terms of service", "terms and conditions", "you agree",
        "limitation of liability", "intellectual property",
    ],
    "contact": [
        "contact us", "get in touch", "send us a message", "reach us", "email us",
    ],
    "about": [
        "our team", "our mission", "founded in", "who we are",
    ],
}

def _check_content_trust_signals(homepage_text: str, about_text: str) -> dict[str, bool]:
    combined = (homepage_text + " " + about_text).lower()
    result: dict[str, bool] = {}
    for page_type, phrases in _TRUST_CONTENT_SIGNALS.items():
        matches = sum(1 for phrase in phrases if phrase in combined)
        result[page_type] = matches >= 2
    return result
```

In `analyze_eeat()`, call this helper and OR results with URL pattern results:
```python
content_trust = _check_content_trust_signals(
    BeautifulSoup(homepage_html, "html.parser").get_text(separator=" ", strip=True),
    BeautifulSoup(about_html, "html.parser").get_text(separator=" ", strip=True),
)
for key in ["privacy_policy", "terms", "contact", "about"]:
    if content_trust.get(key):
        url_signals[key] = True  # additive — does not override True→False
```

**Sync `geo_page_scores.py`:** The duplicate `_EXPERTISE_RE` and `_CITATION_PATTERNS` in `geo_page_scores.py` (lines 35-50) must be updated to match. Replace the single credential regex with the same five domain-specific patterns from Task 1 (copy the compiled constants or import from `geo_eeat`). For citations, apply the same DOI/PubMed structural check using `<a href>` links from `feat["html_str"]` (which is `str(soup)` after stripping, so links are preserved).

**Verify:** `python -c "from app.analyzers.geo_eeat import analyze_eeat; r = analyze_eeat(['https://example.com/about'], '<p>Visit <a href=\"https://doi.org/10.1000/xyz\">this study</a></p>', ''); assert r['citations_found'] == True, r"`

**Done:** `citations_found = True` requires a structurally valid DOI/PubMed href or a legacy in-text reference; bare "doi.org" or "pubmed" text without a well-formed URL does not qualify. Trust pages missing from URL patterns are detected from homepage/about content when ≥2 key phrases match.

---

#### Task 3: Ad zone stripping for factual density (SCORE-05)

**Files:** `backend/app/analyzers/geo_features.py`

**Action:**

In `extract_page_features()`, after the existing tag-based stripping loop (after `for tag in soup.find_all(_STRIP_TAGS): tag.decompose()`), add a second pass that removes `<div>` and `<section>` elements whose `class` or `id` attribute contains ad/promo/sidebar keywords:

```python
# Strip class/id-based ad zones not caught by tag-name stripping
_AD_ZONE_RE = re.compile(r"\bad\b|\bbanner\b|\bsidebar\b|cookie[- ]consent|\bpromo\b", re.IGNORECASE)

for tag in soup.find_all(["div", "section"]):
    classes = " ".join(tag.get("class") or [])
    tag_id = tag.get("id") or ""
    if _AD_ZONE_RE.search(classes) or _AD_ZONE_RE.search(tag_id):
        tag.decompose()
```

Place `_AD_ZONE_RE` as a module-level compiled constant (not inside the function). The pattern is intentionally conservative: only exact word-boundary `\bad\b` and `\bbanner\b` match to avoid stripping legitimate content in elements like "gradient" or "brand".

No changes needed in `geo_content.py` — `_factual_density_score()` already receives `feat["body_text"]` which is extracted from the soup after this stripping step.

**Verify:** `python -c "
from app.analyzers.geo_features import extract_page_features
html = '<html><body><div class=\"sidebar ad\">Buy now! 50% off promo deal 2024</div><p>Our study found 87% improvement in patient outcomes per Dr. Smith.</p></body></html>'
feat = extract_page_features('https://example.com', html)
assert 'Buy now' not in feat['body_text'], 'Ad zone not stripped'
assert '87%' in feat['body_text'], 'Real content stripped unexpectedly'
print('PASS')
"`

**Done:** `body_text` in `page_features` no longer contains text from `<div class="ad">`, `<div id="sidebar">`, `<div class="cookie-consent">`, or `<div class="promo">` elements. Factual density scores reflect article body content only.

---

**Plan 1 Verification:**

- [ ] `python -c "from app.analyzers.geo_eeat import analyze_eeat; print('import ok')"` exits 0
- [ ] `python -c "from app.analyzers.geo_features import extract_page_features; print('import ok')"` exits 0
- [ ] `python -c "from app.analyzers.geo_page_scores import score_pages; print('import ok')"` exits 0
- [ ] Service site with MD credential gets expertise score > 0 when `site_type='service'`
- [ ] DOI link `https://doi.org/10.1000/xyz123` in `<a href>` sets `citations_found = True`
- [ ] Plain text "pubmed says so" without a valid href does NOT set `citations_found = True`
- [ ] `<div class="ad">` content excluded from `body_text` in `page_features`

---

### Plan 2: Score Integration & Technical Signals (SCORE-06 through SCORE-09)

**Objective:** Wire per-page scores, AI crawler access, and security headers into `compute_score()`, and switch PSI scoring to mobile-primary. All changes in `geo_score.py` and `geo_pipeline.py`.

**Files modified:**
- `backend/app/analyzers/geo_score.py`
- `backend/app/worker/geo_pipeline.py`

---

#### Task 4: Per-page score averaging into unified score (SCORE-06)

**Files:** `backend/app/analyzers/geo_score.py`, `backend/app/worker/geo_pipeline.py`

**Action:**

**In `geo_score.py`:** Add `_page_score_raw()` helper and extend `compute_score()` signature:

```python
def _page_score_raw(page_scores: list[dict] | None) -> float:
    """Average per-page GEO scores to a 0-100 float. Returns 50.0 (neutral) when unavailable."""
    if not page_scores:
        return 50.0
    scores = [p["score"] for p in page_scores if isinstance(p.get("score"), (int, float))]
    return round(sum(scores) / len(scores), 1) if scores else 50.0
```

Add `page_scores: list[dict] | None = None` to `compute_score()` signature (after `entity`, before `site_type` to preserve existing callers).

Inside `compute_score()`, blend `_page_score_raw(page_scores)` into the `conversational` raw score. In `_conversational_raw()`, add a `page_avg` parameter:

Alternatively (cleaner — avoids changing `_conversational_raw` signature), compute the blend in `compute_score()` directly:
```python
page_avg = _page_score_raw(page_scores)
# Blend: 80% existing conversational signal + 20% page average
raw_conversational = _conversational_raw(content)
blended_conversational = round(raw_conversational * 0.8 + page_avg * 0.2, 1)
```

Then assign `raw_scores["conversational"] = blended_conversational` (replacing the direct call).

**In `geo_pipeline.py`:** Pass `page_scores_result` to `compute_score()` at line 276:
```python
final_score = compute_score(
    schema=schema_result,
    eeat=eeat_result,
    content=content_result,
    nlp=nlp_result,
    audit=audit_result,
    probe=probe_result,
    entity=entity_result,
    page_scores=page_scores_result,   # NEW
    site_type=site_type,
)
```

**Verify:** `python -c "
from app.analyzers.geo_score import compute_score
# High page scores should nudge conversational dimension up
result = compute_score(None, None, None, None, None, page_scores=[{'score': 90}, {'score': 85}])
low = compute_score(None, None, None, None, None, page_scores=[{'score': 10}, {'score': 15}])
assert result['overall_score'] > low['overall_score'], 'page_scores not influencing score'
print('PASS', result['overall_score'], '>', low['overall_score'])
"`

**Done:** `compute_score()` accepts `page_scores` list; per-page average is blended at 20% weight into the conversational dimension raw score; `geo_pipeline.py` passes `page_scores_result` to the call. WEIGHTS dict unchanged — no engine profile redistribution required.

---

#### Task 5: Technical dimension — AI crawler access, security headers, mobile PSI (SCORE-07, SCORE-08, SCORE-09)

**Files:** `backend/app/analyzers/geo_score.py`, `backend/app/worker/geo_pipeline.py`

**Action:**

**In `geo_score.py` — rewrite `_technical_raw()`** to include AI crawler access (10 pts) and security headers (10 pts), redistributing existing signals to stay at 100 total:

```python
def _technical_raw(audit: dict | None) -> float:
    """Convert audit result to 0-100 technical score.

    Point allocation (sums to 100):
      HTTPS                25 pts  (was 30)
      Sitemap              15 pts  (was 20)
      Broken links         20 pts  (was 25)
      Missing canonicals   20 pts  (was 25)
      AI crawler access    10 pts  (new — SCORE-07)
      Security headers     10 pts  (new — SCORE-08)
    """
    if not audit:
        return 0.0
    score = 0.0

    # HTTPS (25 pts)
    if audit.get("https", {}).get("passed"):
        score += 25

    # Sitemap (15 pts)
    if audit.get("sitemap", {}).get("found"):
        score += 15

    # Broken links (20 pts)
    bl = audit.get("broken_links", {}).get("count", 0)
    if bl == 0:
        score += 20
    elif bl <= 3:
        score += 12
    elif bl <= 10:
        score += 4

    # Missing canonicals (20 pts)
    mc = audit.get("missing_canonicals", {})
    total = mc.get("total_html_pages", 0)
    missing = mc.get("missing_count", 0)
    if total > 0:
        score += (1.0 - missing / total) * 20
    else:
        score += 20

    # AI crawler access (10 pts — SCORE-07)
    ai_access = audit.get("ai_crawler_access") or {}
    if ai_access:
        allowed = sum(1 for v in ai_access.values() if v)
        total_bots = len(ai_access)
        score += int((allowed / total_bots) * 10)
    else:
        score += 5  # neutral when robots data unavailable

    # Security headers (10 pts — SCORE-08)
    sh = audit.get("security_headers") or {}
    passed = sh.get("passed_count", 0)
    sh_total = sh.get("total_count", 5)
    if sh_total > 0:
        score += int((passed / sh_total) * 10)
    else:
        score += 5  # neutral when check unavailable

    return min(score, 100.0)
```

**In `geo_score.py` — rewrite `_speed_raw()`** to use mobile performance as primary input (SCORE-09):

```python
def _speed_raw(audit: dict | None) -> float:
    """Use mobile performance score as primary PSI input (SCORE-09).
    Desktop data is preserved in the audit dict for UI display — not used here.
    Falls back to desktop performance if mobile is unavailable.
    """
    if not audit:
        return 0.0
    psi = audit.get("pagespeed", {})
    mobile = psi.get("mobile", {})

    if not mobile.get("error") and mobile.get("performance") is not None:
        return round(float(mobile["performance"]), 1)

    # Fallback: desktop performance if mobile unavailable
    desktop = psi.get("desktop", {})
    if not desktop.get("error") and desktop.get("performance") is not None:
        return round(float(desktop["performance"]), 1)

    return 50.0  # neutral when PSI unavailable
```

**In `geo_pipeline.py` — merge `ai_crawler_access` into audit dict (SCORE-07):**

Add `get_meta` to the existing import from `app.store.crawl_store` (it is already imported; verify it exposes `get_meta`). Before the `compute_score()` call at line 276, add:

```python
# SCORE-07: merge ai_crawler_access from Redis meta into audit dict
_meta = get_meta(task_id) or {}
audit_result_with_crawlers = {
    **audit_result,
    "ai_crawler_access": _meta.get("ai_crawler_access"),
}
```

Then pass `audit=audit_result_with_crawlers` to `compute_score()` instead of `audit=audit_result`.

**Verify:**
```bash
python -c "
from app.analyzers.geo_score import _technical_raw, _speed_raw

# Technical: all signals present
audit = {
    'https': {'passed': True},
    'sitemap': {'found': True},
    'broken_links': {'count': 0},
    'missing_canonicals': {'total_html_pages': 10, 'missing_count': 0},
    'ai_crawler_access': {'GPTBot': True, 'PerplexityBot': True, 'Anthropic-AI': True},
    'security_headers': {'passed_count': 5, 'total_count': 5},
}
t = _technical_raw(audit)
assert t == 100.0, f'Expected 100, got {t}'

# Speed: mobile-primary
audit2 = {'pagespeed': {'mobile': {'performance': 72}, 'desktop': {'performance': 95}}}
s = _speed_raw(audit2)
assert s == 72.0, f'Expected 72, got {s}'
print('PASS technical={} speed={}'.format(t, s))
"
```

**Done:** `_technical_raw()` awards up to 10 pts for AI crawler access and 10 pts for security headers within the 100-pt envelope; `_speed_raw()` uses only mobile performance; `geo_pipeline.py` fetches `ai_crawler_access` from Redis meta and merges it into the audit dict before scoring.

---

**Plan 2 Verification:**

- [ ] `python -c "from app.analyzers.geo_score import compute_score; print('import ok')"` exits 0
- [ ] `python -c "from app.analyzers.geo_score import _technical_raw; r = _technical_raw({'https':{'passed':True},'sitemap':{'found':True},'broken_links':{'count':0},'missing_canonicals':{'total_html_pages':5,'missing_count':0},'ai_crawler_access':{'GPTBot':True},'security_headers':{'passed_count':5,'total_count':5}}); assert r == 100.0, r"` passes
- [ ] `python -c "from app.analyzers.geo_score import _speed_raw; r = _speed_raw({'pagespeed':{'mobile':{'performance':60},'desktop':{'performance':90}}}); assert r == 60.0, r"` passes
- [ ] `compute_score()` call in `geo_pipeline.py` passes `page_scores=page_scores_result` and `audit=audit_result_with_crawlers`
- [ ] WEIGHTS dict in `geo_score.py` still sums to 100 (no new top-level keys added)

---

## Execution Order

Plans can run in parallel.

| Plan | Files touched | Can run parallel? |
|------|--------------|-------------------|
| Plan 1 | `geo_eeat.py`, `geo_features.py`, `geo_page_scores.py` | Yes |
| Plan 2 | `geo_score.py`, `geo_pipeline.py` | Yes |

No shared file edits. Each plan owns its file set exclusively.

**Note on geo_pipeline.py:** Plan 1 adds `site_type=site_type` to the `_run_eeat()` call; Plan 2 adds `ai_crawler_access` merge and `page_scores` arg to `compute_score()`. Both touch `geo_pipeline.py`. If running sequentially rather than truly parallel, merge both pipeline changes into whichever plan runs second rather than creating a conflict. The safest execution order if serial: Plan 1 first (eeat/features/page_scores), then Plan 2 (score/pipeline) so Plan 2's executor can apply both pipeline changes at once.

---

## Success Criteria

1. `geo_eeat.py` credential detection covers medical, legal, technology, mental health, and general professional domains; patterns compile without error.
2. `analyze_eeat()` accepts `site_type` parameter; expertise scoring filters credentials through site-type keyword overlap (informational = no filter).
3. `citations_found = True` requires a structurally valid DOI (`doi.org/10.XXXX/`) or PubMed URL in an `<a href>` attribute, not just text mention.
4. Trust page detection falls back to content phrase matching when URL patterns do not match; `has_about_page` can be True even for non-standard paths like `/info/team`.
5. `geo_features.py` strips `<div class="ad">`, `<div id="sidebar">`, `<div class="promo">`, and `<div class="cookie-consent">` before extracting `body_text`; verified by assertion test.
6. `compute_score()` accepts `page_scores` list and blends per-page average (20% weight) into conversational dimension; `geo_pipeline.py` passes `page_scores_result`.
7. `_technical_raw()` awards up to 10 pts for AI crawler access and 10 pts for security headers; existing signals redistributed to sum to 100 pts total.
8. `geo_pipeline.py` fetches `ai_crawler_access` from `get_meta(task_id)` and merges it into `audit_result` before passing to `compute_score()`.
9. `_speed_raw()` uses only `pagespeed.mobile.performance` as scoring input; desktop falls back only when mobile is unavailable; desktop data unchanged in audit dict and UI.
