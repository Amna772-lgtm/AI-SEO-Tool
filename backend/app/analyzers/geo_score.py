"""
Agent 6 — AI Citation Readiness Scoring Engine
Aggregates all agent results into a weighted 0-100 score.

Unified weights (AI-citation-optimised, sum to 100):
  NLP Intent        20%  — snippet readiness, question density, direct answers
  Structured Data   20%  — JSON-LD/schema coverage
  E-E-A-T           15%  — trust, authority, expertise signals
  Conversational    15%  — content depth, FAQ, heading structure
  Entity            12%  — Wikipedia, sameAs profiles, org schema completeness
  Probe              8%  — AI engine actual mention rate
  Technical Crawl    5%  — HTTPS, sitemap, broken links, canonicals
  Speed & Access     5%  — AI crawler access; PageSpeed is marginal for AI citation

Per-engine weights reflect each model's known citation priorities.
"""
from __future__ import annotations

WEIGHTS = {
    "nlp":             20,
    "structured_data": 20,
    "eeat":            15,
    "conversational":  15,
    "entity":          12,  # Entity establishment (Wikipedia, sameAs, org schema)
    "probe":            8,  # AI engine actual mention rate
    "technical":        5,
    "speed":            5,
}

# Per-engine weight profiles — each sums to 100
ENGINE_WEIGHTS: dict[str, dict[str, int]] = {
    "perplexity": {
        # Freshness, explicit citations, factual claims, entity recognition
        "eeat": 25, "nlp": 22, "conversational": 18,
        "structured_data": 13, "entity": 14, "technical": 5, "speed": 3,
    },
    "chatgpt": {
        # Authority, E-E-A-T heavy, entity recognition, comprehensive coverage
        "eeat": 28, "structured_data": 22, "conversational": 17,
        "entity": 18, "nlp": 10, "technical": 4, "speed": 1,
    },
    "gemini": {
        # Google SEO signals — schema, technical quality, Knowledge Graph
        "structured_data": 27, "technical": 22, "eeat": 18,
        "entity": 15, "speed": 12, "nlp": 5, "conversational": 1,
    },
    "claude": {
        # Well-reasoned, nuanced content, clear structure, logical flow
        "conversational": 30, "nlp": 30, "eeat": 14,
        "structured_data": 9, "entity": 12, "technical": 3, "speed": 2,
    },
    "grok": {
        # Recency, trending topics, real-time relevance, known entities
        "eeat": 34, "nlp": 22, "conversational": 18,
        "entity": 12, "technical": 8, "structured_data": 4, "speed": 2,
    },
}

ENGINE_META: dict[str, dict[str, str]] = {
    "perplexity": {"label": "Perplexity", "focus": "Freshness · Citations · Factual depth"},
    "chatgpt":    {"label": "ChatGPT",    "focus": "Authority · E-E-A-T · Comprehensive coverage"},
    "gemini":     {"label": "Gemini",     "focus": "Schema · Google signals · Technical quality"},
    "claude":     {"label": "Claude",     "focus": "Structure · Reasoning · Nuanced content"},
    "grok":       {"label": "Grok",       "focus": "Recency · Trending topics · News relevance"},
}

GRADE_THRESHOLDS = [
    (90, "A"),
    (80, "B"),
    (65, "C"),
    (50, "D"),
    (0,  "F"),
]


def _grade(score: int) -> str:
    for threshold, letter in GRADE_THRESHOLDS:
        if score >= threshold:
            return letter
    return "F"


def _schema_raw(schema: dict | None) -> float:
    """Convert schema analysis to 0-100 raw score."""
    if not schema:
        return 0.0
    score = 0.0
    # Has JSON-LD (50 pts)
    if schema.get("has_json_ld"):
        score += 50
    # Coverage % (20 pts)
    coverage = schema.get("coverage_percent", 0.0)
    score += (coverage / 100.0) * 20
    # Schema types present vs. missing recommended (30 pts)
    missing = len(schema.get("missing_recommended", []))
    total_recommended = schema.get("recommended_count", 0)
    if total_recommended > 0:
        found = total_recommended - missing
        score += (found / total_recommended) * 30
    elif schema.get("schema_types"):
        score += 15
    # Microdata/RDFa bonus
    if schema.get("has_microdata"):
        score += 5
    return min(score, 100.0)


def _eeat_raw(eeat: dict | None) -> float:
    """E-E-A-T score is already 0-100."""
    if not eeat:
        return 0.0
    return float(eeat.get("eeat_score", 0))


def _conversational_raw(content: dict | None) -> float:
    """Convert content analysis to 0-100 conversational score."""
    if not content:
        return 0.0
    score = 0.0

    # Factual density (30 pts) — stats, citations, expert mentions, year refs, quotes
    fd = content.get("factual_density") or {}
    fd_score = fd.get("score", 0)
    score += (fd_score / 100.0) * 30

    # Conversational tone (25 pts)
    tone = content.get("conversational_tone_score", 0.0)
    score += tone * 25

    # FAQ presence (20 pts)
    if content.get("pages_with_faq", 0) > 0:
        score += 20

    # Heading structure (20 pts)
    hs = content.get("heading_structure", {})
    pages = max(content.get("pages_analyzed", 1), 1)
    if hs.get("pages_with_h2", 0) / pages > 0.5:
        score += 10
    if hs.get("pages_with_h3", 0) / pages > 0.3:
        score += 10

    # List usage (5 pts)
    avg_lists = content.get("avg_lists_per_page", 0.0)
    score += min(avg_lists * 2.5, 5)

    return min(score, 100.0)


def _technical_raw(audit: dict | None) -> float:
    """Convert existing audit result to 0-100 technical score."""
    if not audit:
        return 0.0
    score = 0.0

    # HTTPS (30 pts)
    if audit.get("https", {}).get("passed"):
        score += 30

    # Sitemap (20 pts)
    if audit.get("sitemap", {}).get("found"):
        score += 20

    # Broken links (25 pts)
    bl = audit.get("broken_links", {}).get("count", 0)
    if bl == 0:
        score += 25
    elif bl <= 3:
        score += 15
    elif bl <= 10:
        score += 5

    # Missing canonicals (25 pts)
    mc = audit.get("missing_canonicals", {})
    total = mc.get("total_html_pages", 0)
    missing = mc.get("missing_count", 0)
    if total > 0:
        ratio = 1.0 - (missing / total)
        score += ratio * 25
    else:
        score += 25

    return min(score, 100.0)


def _nlp_raw(nlp: dict | None) -> float:
    """Convert NLP analysis to 0-100 score."""
    if not nlp:
        return 0.0
    score = 0.0

    # AI Snippet Readiness — holistic Claude assessment (40 pts)
    readiness = nlp.get("ai_snippet_readiness", "Low")
    if readiness == "High":
        score += 40
    elif readiness == "Medium":
        score += 25
    else:
        score += 8

    # Answer block quality — BLUF, length, self-containment, confident language (35 pts)
    aq = nlp.get("answer_quality") or {}
    aq_score = aq.get("score", 0)
    score += (aq_score / 100.0) * 35

    # Question density — questions per 100 words (15 pts)
    qd = nlp.get("question_density", 0.0)
    score += min(qd * 10, 15)

    # Answer block count — raw count signal (10 pts)
    ab = nlp.get("answer_blocks_detected", 0)
    score += min(ab * 2, 10)

    return min(score, 100.0)


def _speed_raw(audit: dict | None) -> float:
    """Convert PageSpeed scores to 0-100 speed+accessibility score."""
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
        return 50.0  # neutral if PSI unavailable
    return round(sum(scores) / len(scores), 1)


def _entity_raw(entity: dict | None) -> float:
    """Entity establishment score is already 0-100."""
    if not entity:
        return 0.0
    return float(entity.get("entity_score", 0))


def _probe_raw(probe: dict | None) -> float:
    """
    Convert AI Visibility Probe results to a 0-100 score.
    overall_mention_rate is already 0-100 (average % across engines) — do NOT multiply.
    Returns 50 (neutral) when probe has not been run or errored, so missing probe
    data neither rewards nor penalises the site.
    """
    if not probe or probe.get("source") == "error":
        return 50.0
    mention_rate = probe.get("overall_mention_rate")
    if mention_rate is None:
        return 50.0
    return min(round(float(mention_rate), 1), 100.0)


def _compute_engine_scores(raw_scores: dict[str, float]) -> dict[str, dict]:
    """
    Compute per-AI-engine citation scores using engine-specific weight profiles.
    raw_scores: {category: 0-100 float} — the same raw category scores used for the
    unified score, re-weighted per engine's known citation priorities.
    """
    result = {}
    for engine, weights in ENGINE_WEIGHTS.items():
        total = sum((raw_scores.get(cat, 0.0) / 100.0) * w for cat, w in weights.items())
        score = min(int(round(total)), 100)
        result[engine] = {
            "label": ENGINE_META[engine]["label"],
            "focus": ENGINE_META[engine]["focus"],
            "score": score,
            "grade": _grade(score),
        }
    return result


def compute_score(
    schema: dict | None,
    eeat: dict | None,
    content: dict | None,
    nlp: dict | None,
    audit: dict | None,
    probe: dict | None = None,
    entity: dict | None = None,
    site_type: str = "informational",
) -> dict:
    """
    Compute the final AI Citation Readiness Score.

    Returns:
        {
            "overall_score": int (0-100),
            "grade": str ("A"-"F"),
            "breakdown": {category: {weight, raw, weighted}},
            "engine_scores": {engine: {label, focus, score, grade}}
        }
    """
    raw_scores = {
        "structured_data": _schema_raw(schema),
        "eeat":            _eeat_raw(eeat),
        "conversational":  _conversational_raw(content),
        "technical":       _technical_raw(audit),
        "nlp":             _nlp_raw(nlp),
        "speed":           _speed_raw(audit),
        "probe":           _probe_raw(probe),
        "entity":          _entity_raw(entity),
    }

    breakdown = {}
    total_weighted = 0.0

    for category, weight in WEIGHTS.items():
        raw = raw_scores[category]
        weighted = (raw / 100.0) * weight
        breakdown[category] = {
            "weight": weight,
            "raw": round(raw, 1),
            "weighted": round(weighted, 1),
        }
        total_weighted += weighted

    overall = min(int(round(total_weighted)), 100)

    return {
        "overall_score": overall,
        "grade": _grade(overall),
        "breakdown": breakdown,
        "site_type_modifier": site_type,
        "engine_scores": _compute_engine_scores(raw_scores),
    }
