"""
Agent 6 — AI Citation Readiness Scoring Engine
Aggregates all agent results into a weighted 0-100 score.

Weights (from PDF):
  Structured Data   25%
  E-E-A-T           25%
  Conversational    15%
  Technical Crawl   15%
  NLP Intent        10%
  Speed & Access    10%
"""
from __future__ import annotations

WEIGHTS = {
    "structured_data": 25,
    "eeat":            25,
    "conversational":  15,
    "technical":       15,
    "nlp":             10,
    "speed":           10,
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
    total_recommended = missing + len(schema.get("schema_types", []))
    if total_recommended > 0:
        score += ((total_recommended - missing) / total_recommended) * 30
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

    # Conversational tone (40 pts)
    tone = content.get("conversational_tone_score", 0.0)
    score += tone * 40

    # FAQ presence (25 pts)
    if content.get("pages_with_faq", 0) > 0:
        score += 25

    # Heading structure (20 pts)
    hs = content.get("heading_structure", {})
    pages = max(content.get("pages_analyzed", 1), 1)
    if hs.get("pages_with_h2", 0) / pages > 0.5:
        score += 10
    if hs.get("pages_with_h3", 0) / pages > 0.3:
        score += 10

    # List usage (15 pts)
    avg_lists = content.get("avg_lists_per_page", 0.0)
    score += min(avg_lists * 5, 15)

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

    readiness = nlp.get("ai_snippet_readiness", "Low")
    if readiness == "High":
        score += 60
    elif readiness == "Medium":
        score += 35
    else:
        score += 10

    # Question density (20 pts)
    qd = nlp.get("question_density", 0.0)
    score += min(qd * 20, 20)

    # Answer blocks (20 pts)
    ab = nlp.get("answer_blocks_detected", 0)
    score += min(ab * 4, 20)

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


def compute_score(
    schema: dict | None,
    eeat: dict | None,
    content: dict | None,
    nlp: dict | None,
    audit: dict | None,
    site_type: str = "informational",
) -> dict:
    """
    Compute the final AI Citation Readiness Score.

    Returns:
        {
            "overall_score": int (0-100),
            "grade": str ("A"-"F"),
            "breakdown": {category: {weight, raw, weighted}}
        }
    """
    raw_scores = {
        "structured_data": _schema_raw(schema),
        "eeat":            _eeat_raw(eeat),
        "conversational":  _conversational_raw(content),
        "technical":       _technical_raw(audit),
        "nlp":             _nlp_raw(nlp),
        "speed":           _speed_raw(audit),
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

    overall = int(round(total_weighted))

    return {
        "overall_score": overall,
        "grade": _grade(overall),
        "breakdown": breakdown,
        "site_type_modifier": site_type,
    }
