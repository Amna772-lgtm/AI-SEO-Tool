"""
Agent 9 — Per-Page GEO Scoring

Scores each fetched page on a 5-category model that mirrors the site-level
geo_score.py weights, using only HTML-extractable signals (no API calls):

  Structured Data  (25%) — JSON-LD / Microdata presence, @type, field completeness
  E-E-A-T          (25%) — Author byline, publication date, citations, expertise
  Content Quality  (20%) — Word count, headings, FAQ, lists, Flesch-Kincaid grade
  Meta Completeness(15%) — Title, H1, meta description, canonical tag
  NLP / Semantic   (15%) — Conversational tone, question density, how-to/what-is patterns

Returns an array of page results sorted by score ascending (worst first).
"""
from __future__ import annotations

import re
from app.analyzers.geo_features import _flesch_kincaid_grade as _compute_fk_grade
from app.analyzers.geo_schema import _SCHEMA_REQUIRED_FIELDS

# ── Grade thresholds ──────────────────────────────────────────────────────────

_GRADE_THRESHOLDS = [(90, "A"), (80, "B"), (65, "C"), (50, "D"), (0, "F")]

# ── E-E-A-T per-page patterns (ported from geo_eeat.py) ──────────────────────

_AUTHOR_PATTERNS = [
    r"by\s+[A-Z][a-z]+\s+[A-Z][a-z]+",
    r"written\s+by\s+[A-Z]",
    r"author:\s*[A-Z]",
    r'class="[^"]*author[^"]*"',
    r'itemprop="author"',
    r'"@type"\s*:\s*"Person"',
]
_CITATION_PATTERNS = [
    r"\[\d+\]",
    r"according\s+to\s+[A-Z]",
    r"cited\s+by",
    r"source[s]?:",
    r"reference[s]?:",
    r"doi\.org",
    r"pubmed",
    r"ncbi\.nlm",
]
_EXPERTISE_PATTERNS = [
    r"\b(md|phd|dr\.?|professor|cpa|cfa|attorney|lawyer|engineer|certified)\b",
    r"\b(\d+\+?\s+years?\s+(of\s+)?(experience|expertise))\b",
    r"\b(research|study|studies|published|peer[- ]reviewed)\b",
]

# ── NLP / Semantic patterns (ported from geo_nlp.py / geo_content.py) ─────────

_FAQ_PATTERN = re.compile(
    r"\b(how|what|why|when|where|who|which|can|should|do|does|is|are)\b.{5,120}\?",
    re.IGNORECASE,
)
_SECOND_PERSON_RE = re.compile(
    r"\b(you|your|you're|you'll|you've|yourself)\b", re.IGNORECASE
)
_HOWTO_RE = re.compile(
    r"\bhow\s+to\b|step\s+\d+\b|^\d+\.\s+\w", re.IGNORECASE | re.MULTILINE
)
_WHATIS_RE = re.compile(
    r"\bwhat\s+is\b|\bwhat\s+are\b|\bis\s+defined\s+as\b|\bmeans\s+that\b",
    re.IGNORECASE,
)
_COMPARISON_RE = re.compile(
    r"\bvs\.?\b|\bversus\b|\bcompared\s+to\b|\bcomparison\b", re.IGNORECASE
)
_ANSWER_BLOCK_RE = re.compile(
    r"^(yes|no|the\s|this\s|to\s|it\s|in\s|a\s|an\s)", re.IGNORECASE
)

_HIGH_VALUE_SCHEMA_TYPES = {
    "Article", "BlogPosting", "NewsArticle",
    "FAQPage", "Product", "HowTo", "LocalBusiness",
}

# ── Helpers ───────────────────────────────────────────────────────────────────


def _grade(score: int) -> str:
    for threshold, letter in _GRADE_THRESHOLDS:
        if score >= threshold:
            return letter
    return "F"


# ── Feature extraction ────────────────────────────────────────────────────────


def _extract_page_features_from_feat(feat: dict) -> dict:
    """Extract all scoring signals from a pre-parsed feature dict (from geo_features)."""
    soup = feat["soup"]
    body_text = feat["body_text"]
    html_str = feat["html_str"]  # used for author pattern matching (class names, itemprop)

    # ── Basic signals ─────────────────────────────────────────────────────────

    word_count = len(body_text.split())

    has_h1 = bool(soup.find("h1"))
    has_h2 = bool(soup.find("h2"))
    has_h3 = bool(soup.find("h3"))
    h1_text = (soup.find("h1") or {}).get_text(strip=True) if has_h1 else ""

    meta_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_descp = (meta_tag.get("content") or "").strip() if meta_tag else ""

    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    canonical_tag = soup.find("link", attrs={"rel": re.compile(r"^canonical$", re.I)})
    canonical = (canonical_tag.get("href") or "").strip() if canonical_tag else ""

    has_lists = bool(soup.find(["ul", "ol"]))

    faq_matches = _FAQ_PATTERN.findall(body_text)
    has_faq = len(faq_matches) >= 2

    # ── Schema signals ────────────────────────────────────────────────────────

    # Use pre-extracted JSON-LD from feat (extracted before tag stripping in geo_features)
    json_ld_blocks = feat["raw_json_ld"]
    has_json_ld = bool(json_ld_blocks)
    schema_types: list[str] = []
    schema_completeness_score = 0.0

    if json_ld_blocks:
        completeness_ratios: list[float] = []
        for item in json_ld_blocks:
            if not isinstance(item, dict):
                continue
            t = item.get("@type")
            if not t:
                continue
            type_str = t if isinstance(t, str) else str(t)
            schema_types.append(type_str)
            required = _SCHEMA_REQUIRED_FIELDS.get(type_str, [])
            if required:
                present = sum(1 for f in required if f in item)
                completeness_ratios.append(present / len(required))
            else:
                completeness_ratios.append(1.0)
        if completeness_ratios:
            schema_completeness_score = sum(completeness_ratios) / len(completeness_ratios)

    has_microdata = bool(soup.find(attrs={"itemtype": True}))
    has_schema = has_json_ld or has_microdata

    # ── E-E-A-T per-page signals ──────────────────────────────────────────────

    has_author = any(re.search(p, html_str, re.I) for p in _AUTHOR_PATTERNS)

    has_date = bool(soup.find("time"))
    if not has_date:
        has_date = bool(re.search(
            r"(updated|published|last\s+modified|posted)\s+\w+\s+\d{1,2},?\s+\d{4}",
            body_text, re.IGNORECASE,
        ))

    has_citations = any(re.search(p, body_text, re.I) for p in _CITATION_PATTERNS)
    has_expertise = any(re.search(p, body_text, re.I) for p in _EXPERTISE_PATTERNS)

    # ── Content quality signals ───────────────────────────────────────────────

    fk_grade = feat["fk_grade"] if word_count >= 50 else 8.0

    # ── NLP / Semantic signals ────────────────────────────────────────────────

    num_words = max(word_count, 1)
    sp_count = len(_SECOND_PERSON_RE.findall(body_text))
    q_count = len(_FAQ_PATTERN.findall(body_text))

    sp_density = (sp_count / num_words) * 100
    q_density_for_conv = (q_count / num_words) * 100
    conversational_score = (
        min(sp_density / 5.0, 1.0) * 0.6
        + min(q_density_for_conv / 2.0, 1.0) * 0.4
    )

    question_density = round((q_count / num_words) * 100, 2)

    answer_blocks = sum(
        1 for p in soup.find_all("p")
        if _ANSWER_BLOCK_RE.match(p.get_text(strip=True))
    )

    has_howto = bool(_HOWTO_RE.search(body_text))
    has_whatis = bool(_WHATIS_RE.search(body_text))
    has_comparison = bool(_COMPARISON_RE.search(body_text))

    return {
        # Basic
        "word_count": word_count,
        "has_h1": has_h1,
        "h1_text": h1_text,
        "has_h2": has_h2,
        "has_h3": has_h3,
        "title": title,
        "meta_descp": meta_descp,
        "canonical": canonical,
        "has_lists": has_lists,
        "has_faq": has_faq,
        # Schema
        "has_schema": has_schema,
        "has_json_ld": has_json_ld,
        "has_microdata": has_microdata,
        "schema_types": schema_types,
        "schema_completeness": schema_completeness_score,
        # E-E-A-T
        "has_author": has_author,
        "has_date": has_date,
        "has_citations": has_citations,
        "has_expertise": has_expertise,
        # Content quality
        "fk_grade": fk_grade,
        # NLP / Semantic
        "conversational_score": conversational_score,
        "question_density": question_density,
        "answer_blocks": answer_blocks,
        "has_howto": has_howto,
        "has_whatis": has_whatis,
        "has_comparison": has_comparison,
    }


# ── Scoring functions — 5 categories ─────────────────────────────────────────


def _score_structured_data(f: dict) -> int:
    """Score 0-100 for structured data presence and completeness (weight: 25%)."""
    if not f["has_schema"]:
        return 0

    score = 40  # base: schema present

    if f["schema_types"]:
        score += 20  # @type defined

        # Bonus for high-value schema types
        if any(t in _HIGH_VALUE_SCHEMA_TYPES for t in f["schema_types"]):
            score += 10

    # Completeness tier
    c = f["schema_completeness"]
    if c >= 0.75:
        score += 20
    elif c >= 0.50:
        score += 10
    elif c >= 0.25:
        score += 5

    # Cap Microdata-only pages (no JSON-LD) at 70
    if not f["has_json_ld"]:
        score = min(score, 70)

    return min(score, 100)


def _score_eeat(f: dict) -> int:
    """Score 0-100 for per-page E-E-A-T signals (weight: 25%)."""
    score = 0
    if f["has_author"]:    score += 30
    if f["has_date"]:      score += 25
    if f["has_citations"]: score += 25
    if f["has_expertise"]: score += 20
    return min(score, 100)


def _score_content_quality(f: dict) -> int:
    """Score 0-100 for content richness and readability (weight: 20%)."""
    score = 0
    wc = f["word_count"]

    # Word count tiers
    if wc >= 600:
        score += 40
    elif wc >= 300:
        score += 25
    elif wc >= 150:
        score += 10

    # Headings
    if f["has_h2"]: score += 15
    if f["has_h3"]: score += 5

    # FAQ and lists
    if f["has_faq"]:   score += 15
    if f["has_lists"]: score += 5

    # Flesch-Kincaid reading grade bonus/penalty
    fk = f["fk_grade"]
    if fk <= 9.0:
        score += 10   # ideal for AI snippets
    elif fk <= 12.0:
        score += 5    # acceptable
    elif fk > 16.0:
        score -= 5    # very dense academic prose

    return max(0, min(score, 100))


def _score_meta(f: dict) -> int:
    """Score 0-100 for metadata completeness (weight: 15%)."""
    score = 0
    if len(f["title"]) >= 20:
        score += 30
    elif f["title"]:
        score += 15
    if f["has_h1"]:
        score += 25
    if len(f["meta_descp"]) >= 50:
        score += 25
    elif f["meta_descp"]:
        score += 12
    if f["canonical"]:
        score += 20
    return min(score, 100)


def _score_nlp_semantic(f: dict) -> int:
    """Score 0-100 for NLP/semantic signals (weight: 15%)."""
    score = 0

    # Conversational tone
    cs = f["conversational_score"]
    if cs >= 0.6:
        score += 25
    elif cs >= 0.3:
        score += 15

    # Question density
    qd = f["question_density"]
    if qd >= 2.0:
        score += 20
    elif qd >= 0.5:
        score += 10

    # Answer blocks
    ab = f["answer_blocks"]
    if ab >= 5:
        score += 20
    elif ab >= 2:
        score += 10

    # Intent patterns
    if f["has_howto"]:     score += 15
    if f["has_whatis"]:    score += 10
    if f["has_comparison"]: score += 5

    return min(score, 100)


# ── Engine citation scores ────────────────────────────────────────────────────


def _score_engine_citations(f: dict) -> dict:
    """
    Estimate per-engine citation likelihood (0-100) from page features.
    All heuristic — no API calls.
    """
    wc = f["word_count"]
    c = f["schema_completeness"]

    # Claude: structured data quality + metadata + authorship
    claude = 0
    if f["has_schema"]:              claude += 30
    if c >= 0.75:                    claude += 10   # completeness bonus
    if f["canonical"]:               claude += 15
    if f["has_h1"]:                  claude += 10
    if len(f["meta_descp"]) >= 50:   claude += 15
    if f["has_h2"]:                  claude += 10
    if wc >= 300:                    claude += 5
    if f["has_author"]:              claude += 5
    if f["has_date"]:                claude += 5   # freshness signal

    # ChatGPT: FAQ + lists + instructional content
    chatgpt = 0
    if f["has_faq"]:    chatgpt += 30
    if f["has_lists"]:  chatgpt += 20
    if wc >= 300:       chatgpt += 20
    if f["has_h2"]:     chatgpt += 10
    if f["has_h1"]:     chatgpt += 10
    if f["has_howto"]:  chatgpt += 10   # how-to content is ChatGPT's sweet spot

    # Gemini: comprehensiveness + heading depth + expertise + meta quality
    gemini = 0
    if wc >= 500:                    gemini += 25
    elif wc >= 300:                  gemini += 15
    if f["has_h2"]:                  gemini += 15
    if f["has_h3"]:                  gemini += 10
    if len(f["meta_descp"]) >= 50:   gemini += 15
    if f["has_h1"]:                  gemini += 10
    if f["has_expertise"]:           gemini += 10   # Gemini weights authority
    if f["has_date"]:                gemini += 5

    # Grok: concise H1-driven + lists + definitional content
    grok = 0
    if f["has_h1"]:                       grok += 30
    if 150 <= wc <= 800:                  grok += 20   # prefers concise
    elif wc > 800:                        grok += 10
    if f["has_lists"]:                    grok += 15
    if f["has_h2"]:                       grok += 15
    if f["has_faq"]:                      grok += 10
    if f["has_whatis"]:                   grok += 5    # definitional answers
    if f["has_comparison"]:               grok += 5

    # Perplexity: source-credibility — citations, schema, lists, canonical
    perplexity = 0
    if f["has_schema"]:    perplexity += 25
    if f["has_citations"]: perplexity += 20   # citations are core to Perplexity's model
    if f["has_lists"]:     perplexity += 20
    if f["has_faq"]:       perplexity += 15
    if f["canonical"]:     perplexity += 10
    if wc >= 300:          perplexity += 10

    return {
        "claude":     min(claude, 100),
        "chatgpt":    min(chatgpt, 100),
        "gemini":     min(gemini, 100),
        "grok":       min(grok, 100),
        "perplexity": min(perplexity, 100),
    }


# ── Issue generation ──────────────────────────────────────────────────────────


def _build_issues(
    f: dict,
    structured_data_raw: int,
    eeat_raw: int,
    content_raw: int,
    meta_raw: int,
    nlp_raw: int,
) -> list[dict]:
    """Generate prioritized issue list (max 6) for this page."""
    issues: list[dict] = []
    wc = f["word_count"]

    # ── Critical ──────────────────────────────────────────────────────────────
    if wc < 150:
        issues.append({
            "priority": "critical",
            "message": f"Very thin content ({wc} words). AI engines require at least 300 words to cite a page.",
        })
    elif wc < 300:
        issues.append({
            "priority": "critical",
            "message": f"Thin content ({wc} words). Expand to 300+ words to improve AI citation likelihood.",
        })

    if not f["has_schema"]:
        issues.append({
            "priority": "critical",
            "message": "No structured data found. Add JSON-LD schema (Article, Product, FAQPage, etc.) to this page.",
        })

    # ── Important ─────────────────────────────────────────────────────────────
    if not f["has_author"]:
        issues.append({
            "priority": "important",
            "message": "No author byline detected. Add a visible author name — AI engines use authorship as a trust signal.",
        })

    if not f["has_h1"]:
        issues.append({
            "priority": "important",
            "message": "Missing H1 heading. Every page needs one clear H1 that signals the page topic to AI engines.",
        })

    if not f["meta_descp"]:
        issues.append({
            "priority": "important",
            "message": "No meta description. Add a 120–160 character summary — AI engines use this for context.",
        })

    if not f["has_date"]:
        issues.append({
            "priority": "important",
            "message": "No publication or update date found. Add a <time> tag or visible date — AI engines prefer fresh, dated content.",
        })

    if not f["has_citations"]:
        issues.append({
            "priority": "important",
            "message": "No external citations detected. Linking to authoritative sources improves E-E-A-T and AI citation likelihood.",
        })

    if not f["canonical"]:
        issues.append({
            "priority": "important",
            "message": "No canonical tag. Add <link rel='canonical'> to prevent duplicate-content confusion.",
        })

    if f["has_schema"] and f["schema_completeness"] < 0.5:
        issues.append({
            "priority": "important",
            "message": "Incomplete structured data: schema type found but required fields are missing (e.g., Article needs author + datePublished).",
        })

    # ── Optional ──────────────────────────────────────────────────────────────
    if not f["has_h2"]:
        issues.append({
            "priority": "optional",
            "message": "No H2 subheadings. Add topic-focused H2s to improve content structure and scannability.",
        })

    if not f["has_faq"]:
        issues.append({
            "priority": "optional",
            "message": "No FAQ section detected. Q&A format significantly improves AI snippet and citation likelihood.",
        })

    if not f["has_lists"]:
        issues.append({
            "priority": "optional",
            "message": "No bullet or numbered lists. Lists make content easier for AI engines to parse and cite.",
        })

    if f["fk_grade"] > 14.0:
        issues.append({
            "priority": "optional",
            "message": f"Reading grade level is very high ({f['fk_grade']:.1f}). Simplify language to High School level for better AI snippet extraction.",
        })

    if not f["has_howto"] and not f["has_whatis"]:
        issues.append({
            "priority": "optional",
            "message": "No how-to or definitional content detected. Adding instructional or explanatory sections improves NLP/semantic scoring.",
        })

    return issues[:6]


# ── Main entry point ──────────────────────────────────────────────────────────


def score_pages(page_features: list[dict]) -> list[dict]:
    """
    Score each fetched page and return results sorted by score ascending (worst first).

    Args:
        page_features: List of feature dicts from geo_features.extract_page_features().

    Returns:
        List of per-page score dicts.
    """
    results = []

    for feat in page_features:
        url = feat["url"]
        if not feat["body_text"] and not feat["raw_json_ld"]:
            continue
        try:
            f = _extract_page_features_from_feat(feat)

            structured_data_raw = _score_structured_data(f)
            eeat_raw             = _score_eeat(f)
            content_raw          = _score_content_quality(f)
            meta_raw             = _score_meta(f)
            nlp_raw              = _score_nlp_semantic(f)

            # Weighted total: SD 25%, EEAT 25%, content 20%, meta 15%, NLP 15%
            overall = int(round(
                structured_data_raw * 0.25
                + eeat_raw          * 0.25
                + content_raw       * 0.20
                + meta_raw          * 0.15
                + nlp_raw           * 0.15
            ))

            issues = _build_issues(f, structured_data_raw, eeat_raw, content_raw, meta_raw, nlp_raw)
            engine_scores = _score_engine_citations(f)

            results.append({
                "url": url,
                "score": overall,
                "grade": _grade(overall),
                "word_count": f["word_count"],
                "has_schema": f["has_schema"],
                "has_h1": f["has_h1"],
                "has_meta_descp": bool(f["meta_descp"]),
                "has_canonical": bool(f["canonical"]),
                # New top-level E-E-A-T signals
                "has_author": f["has_author"],
                "has_date": f["has_date"],
                "has_citations": f["has_citations"],
                "reading_grade": f["fk_grade"],
                "question_density": f["question_density"],
                # 5-category breakdown
                "breakdown": {
                    "structured_data": structured_data_raw,
                    "eeat":            eeat_raw,
                    "content":         content_raw,
                    "meta":            meta_raw,
                    "nlp":             nlp_raw,
                },
                "issues": issues,
                "engine_scores": engine_scores,
            })
        except Exception:
            continue

    # Sort worst pages first so users know where to focus
    results.sort(key=lambda x: x["score"])
    return results
