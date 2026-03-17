"""
Agent 9 — Per-Page GEO Scoring

Scores each fetched page independently on a simplified 3-category model:
  Content (40%) — word count, headings, FAQ, lists
  Schema  (30%) — JSON-LD / structured data presence on this page
  Meta    (30%) — title, H1, meta description, canonical completeness

Returns an array of page results sorted by score ascending (worst first)
so users immediately see which pages need the most attention.
"""
from __future__ import annotations

import re
from bs4 import BeautifulSoup

_GRADE_THRESHOLDS = [(90, "A"), (80, "B"), (65, "C"), (50, "D"), (0, "F")]

_FAQ_PATTERN = re.compile(
    r"\b(how|what|why|when|where|who|which|can|should|do|does|is|are)\b.{5,120}\?",
    re.IGNORECASE,
)


def _grade(score: int) -> str:
    for threshold, letter in _GRADE_THRESHOLDS:
        if score >= threshold:
            return letter
    return "F"


def _extract_page_features(html: str) -> dict:
    """Parse HTML and extract all features needed for per-page scoring."""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    # Remove noise tags
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    # Word count (body text)
    body_text = soup.get_text(separator=" ", strip=True)
    word_count = len(body_text.split())

    # Heading presence
    has_h1 = bool(soup.find("h1"))
    has_h2 = bool(soup.find("h2"))
    has_h3 = bool(soup.find("h3"))
    h1_text = (soup.find("h1") or {}).get_text(strip=True) if has_h1 else ""

    # Meta description
    meta_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_descp = (meta_tag.get("content") or "").strip() if meta_tag else ""

    # Title
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Canonical
    canonical_tag = soup.find("link", attrs={"rel": re.compile(r"^canonical$", re.I)})
    canonical = (canonical_tag.get("href") or "").strip() if canonical_tag else ""

    # Lists
    has_lists = bool(soup.find(["ul", "ol"]))

    # FAQ patterns
    faq_matches = _FAQ_PATTERN.findall(body_text)
    has_faq = len(faq_matches) >= 2

    # Schema (JSON-LD)
    ld_scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
    has_json_ld = bool(ld_scripts)
    schema_types: list[str] = []
    for script in ld_scripts:
        try:
            import json
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                t = data.get("@type")
                if t:
                    schema_types.append(t if isinstance(t, str) else str(t))
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type"):
                        schema_types.append(str(item["@type"]))
        except Exception:
            pass

    # Microdata
    has_microdata = bool(soup.find(attrs={"itemtype": True}))

    has_schema = has_json_ld or has_microdata

    return {
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
        "has_schema": has_schema,
        "has_json_ld": has_json_ld,
        "schema_types": schema_types,
    }


def _score_content(f: dict) -> int:
    """Score 0-100 for content richness."""
    score = 0
    wc = f["word_count"]
    if wc >= 300:
        score += 35
    elif wc >= 150:
        score += 20
    # Headings
    if f["has_h2"]:
        score += 20
    if f["has_h3"]:
        score += 10
    # FAQ
    if f["has_faq"]:
        score += 20
    # Lists
    if f["has_lists"]:
        score += 15
    return min(score, 100)


def _score_schema(f: dict) -> int:
    """Score 0-100 for structured data presence."""
    if not f["has_schema"]:
        return 0
    score = 70  # JSON-LD or Microdata present
    if f["schema_types"]:
        score += 30  # Has @type defined
    return min(score, 100)


def _score_meta(f: dict) -> int:
    """Score 0-100 for metadata completeness."""
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


def _score_engine_citations(f: dict) -> dict:
    """
    Estimate per-engine citation likelihood (0-100) from page features.
    Each engine has different known preferences — all heuristic, no extra API calls.
    """
    wc = f["word_count"]

    # Claude: structured data, canonical, headings, rich metadata
    claude = 0
    if f["has_schema"]:        claude += 35
    if f["canonical"]:         claude += 15
    if f["has_h1"]:            claude += 15
    if len(f["meta_descp"]) >= 50: claude += 15
    if f["has_h2"]:            claude += 10
    if wc >= 300:              claude += 10

    # ChatGPT: FAQ format, lists, instructional/how-to content
    chatgpt = 0
    if f["has_faq"]:           chatgpt += 30
    if f["has_lists"]:         chatgpt += 20
    if wc >= 300:              chatgpt += 20
    if f["has_h2"]:            chatgpt += 15
    if f["has_h1"]:            chatgpt += 15

    # Gemini: word count / comprehensiveness, heading structure, meta quality
    gemini = 0
    if wc >= 500:              gemini += 30
    elif wc >= 300:            gemini += 20
    if f["has_h2"]:            gemini += 20
    if f["has_h3"]:            gemini += 10
    if len(f["meta_descp"]) >= 50: gemini += 20
    if f["has_h1"]:            gemini += 20

    # Grok: clear H1, direct/concise content, lists
    grok = 0
    if f["has_h1"]:            grok += 30
    if 150 <= wc <= 800:       grok += 25   # concise, not bloated
    elif wc > 800:             grok += 10
    if f["has_lists"]:         grok += 20
    if f["has_h2"]:            grok += 15
    if f["has_faq"]:           grok += 10

    # Perplexity: structured data + lists + FAQ (source-oriented)
    perplexity = 0
    if f["has_schema"]:        perplexity += 30
    if f["has_lists"]:         perplexity += 25
    if f["has_faq"]:           perplexity += 20
    if f["canonical"]:         perplexity += 15
    if wc >= 300:              perplexity += 10

    return {
        "claude":     min(claude, 100),
        "chatgpt":    min(chatgpt, 100),
        "gemini":     min(gemini, 100),
        "grok":       min(grok, 100),
        "perplexity": min(perplexity, 100),
    }


def _build_issues(f: dict, content_score: int, schema_score: int, meta_score: int) -> list[dict]:
    """Generate prioritized issue list for this page."""
    issues = []
    wc = f["word_count"]

    # Critical issues (biggest GEO impact)
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

    # Important issues
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

    if not f["canonical"]:
        issues.append({
            "priority": "important",
            "message": "No canonical tag. Add <link rel='canonical'> to prevent duplicate-content confusion.",
        })

    # Optional improvements
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

    return issues[:6]  # cap at 6 issues per page


def score_pages(
    fetched_pages: list[tuple[str, str]],
) -> list[dict]:
    """
    Score each fetched page and return results sorted by score ascending (worst first).

    Args:
        fetched_pages: List of (url, html) tuples.

    Returns:
        List of per-page score dicts.
    """
    results = []

    for url, html in fetched_pages:
        if not html:
            continue
        try:
            f = _extract_page_features(html)

            content_raw = _score_content(f)
            schema_raw  = _score_schema(f)
            meta_raw    = _score_meta(f)

            # Weighted total: content 40%, schema 30%, meta 30%
            overall = int(round(content_raw * 0.4 + schema_raw * 0.3 + meta_raw * 0.3))
            issues = _build_issues(f, content_raw, schema_raw, meta_raw)
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
                "breakdown": {
                    "content": content_raw,
                    "schema":  schema_raw,
                    "meta":    meta_raw,
                },
                "issues": issues,
                "engine_scores": engine_scores,
            })
        except Exception:
            continue

    # Sort worst pages first so users know where to focus
    results.sort(key=lambda x: x["score"])
    return results
