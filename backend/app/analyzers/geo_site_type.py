"""
Agent 1 — Website Type Detection
Classifies the site into a type so downstream agents can adapt their analysis.
Pure heuristic: no external API calls.
Improved version: stronger schema weighting, hybrid detection, better confidence,
negative signals, visible-text keyword scoring.
"""
from __future__ import annotations

import re


# Patterns keyed by site type
_TYPE_PATTERNS: list[tuple[str, list[str]]] = [
    ("ecommerce", [
        r"/cart", r"/checkout", r"/shop", r"/product", r"/products",
        r"/store", r"/buy", r"/order", r"/basket",
    ]),
    ("blog", [
        r"/blog", r"/post", r"/posts", r"/article", r"/articles",
        r"/news/\d", r"\d{4}/\d{2}/\d{2}/",
    ]),
    ("news", [
        r"/news", r"/press", r"/press-release", r"/media",
    ]),
    ("portfolio", [
        r"/work", r"/case-stud", r"/portfolio", r"/project",
    ]),
    ("saas", [
        r"/pricing", r"/signup", r"/sign-up", r"/register",
        r"/dashboard", r"/app/", r"/trial",
    ]),
    ("local_business", [
        r"/contact", r"/location", r"/directions", r"/hours",
        r"/about-us", r"/services",
    ]),
]


# Stronger schema weighting
_SCHEMA_TYPE_MAP: dict[str, tuple[str, float]] = {
    "Product": ("ecommerce", 0.45),
    "Offer": ("ecommerce", 0.45),
    "ShoppingAction": ("ecommerce", 0.40),

    "BlogPosting": ("blog", 0.50),
    "Article": ("blog", 0.30),

    "NewsArticle": ("news", 0.65),

    "LocalBusiness": ("local_business", 0.65),
    "Restaurant": ("local_business", 0.65),

    "SoftwareApplication": ("saas", 0.70),
    "WebApplication": ("saas", 0.70),
}


def _clean_visible_text(html: str) -> str:
    """Remove scripts/styles/comments for better keyword detection."""
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    html = re.sub(r"<script.*?>.*?</script>", " ", html, flags=re.S | re.I)
    html = re.sub(r"<style.*?>.*?</style>", " ", html, flags=re.S | re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    html = re.sub(r"\s+", " ", html)
    return html.lower().strip()


def _apply_negative_signals(scores: dict[str, float]) -> None:
    """Reduce obviously conflicting pure classifications."""
    if scores.get("ecommerce", 0) >= 0.6:
        scores["blog"] = max(scores.get("blog", 0) - 0.10, 0)

    if scores.get("saas", 0) >= 0.6:
        scores["portfolio"] = max(scores.get("portfolio", 0) - 0.10, 0)

    if scores.get("news", 0) >= 0.6:
        scores["portfolio"] = max(scores.get("portfolio", 0) - 0.10, 0)


def detect_site_type(
    page_urls: list[str],
    homepage_html: str = "",
    schema_types: list[str] | None = None
) -> dict:
    """
    Detect the site type from crawled URL patterns, homepage HTML, and schema types.

    Returns:
        {
            "site_type": str,
            "confidence": float (0-1),
            "signals": list[str],
            "secondary_type": str (optional)
        }
    """
    scores: dict[str, float] = {}
    signals: list[str] = []

    # ---------------------------------------------------
    # 1. URL pattern scoring (weaker than schema)
    # ---------------------------------------------------
    url_text = " ".join(page_urls).lower()

    for site_type, patterns in _TYPE_PATTERNS:
        matched = [p for p in patterns if re.search(p, url_text)]
        if matched:
            score = min(len(matched) * 0.18, 0.55)
            scores[site_type] = scores.get(site_type, 0) + score
            signals.append(f"URL pattern match ({site_type}): {matched[0]}")

    # ---------------------------------------------------
    # 2. Schema signals (strongest)
    # ---------------------------------------------------
    for stype in (schema_types or []):
        mapped = _SCHEMA_TYPE_MAP.get(stype)
        if mapped:
            site_type, weight = mapped
            scores[site_type] = scores.get(site_type, 0) + weight
            signals.append(f"Schema type '{stype}' → {site_type}")

    # ---------------------------------------------------
    # 3. Homepage visible-text keyword signals
    # ---------------------------------------------------
    html_lower = _clean_visible_text(homepage_html)

    ecommerce_kw = [
        "add to cart", "add to bag", "buy now",
        "free shipping", "checkout"
    ]
    blog_kw = [
        "published on", "posted by", "read more",
        "comments", "tags:", "categories:"
    ]
    saas_kw = [
        "free trial", "start for free", "14-day",
        "monthly plan", "per month", "per user"
    ]
    news_kw = [
        "breaking news", "latest news",
        "subscribe to newsletter", "press release"
    ]

    for kw in ecommerce_kw:
        if kw in html_lower:
            scores["ecommerce"] = scores.get("ecommerce", 0) + 0.14
            signals.append(f"Homepage keyword: '{kw}'")
            break

    for kw in blog_kw:
        if kw in html_lower:
            scores["blog"] = scores.get("blog", 0) + 0.10
            signals.append(f"Homepage keyword: '{kw}'")
            break

    for kw in saas_kw:
        if kw in html_lower:
            scores["saas"] = scores.get("saas", 0) + 0.16
            signals.append(f"Homepage keyword: '{kw}'")
            break

    for kw in news_kw:
        if kw in html_lower:
            scores["news"] = scores.get("news", 0) + 0.15
            signals.append(f"Homepage keyword: '{kw}'")
            break

    # ---------------------------------------------------
    # 4. If no scores
    # ---------------------------------------------------
    if not scores:
        return {
            "site_type": "informational",
            "confidence": 0.3,
            "signals": ["No strong type signals detected"]
        }

    # ---------------------------------------------------
    # 5. Negative signals / conflict cleanup
    # ---------------------------------------------------
    _apply_negative_signals(scores)

    # ---------------------------------------------------
    # 6. Rank winners
    # ---------------------------------------------------
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    winner, top_score = ranked[0]

    second_type = None
    second_score = 0.0

    if len(ranked) > 1:
        second_type, second_score = ranked[1]

    # ---------------------------------------------------
    # 7. Confidence: blend absolute score + gap + evidence count.
    #    Ensures a single definitive schema signal still yields high confidence.
    # ---------------------------------------------------
    gap = max(top_score - second_score, 0.0)
    evidence_count = min(len(signals) / 5, 1.0)
    confidence = min(top_score * 0.6 + gap * 0.25 + evidence_count * 0.15, 1.0)

    result = {
        "site_type": winner,
        "confidence": round(confidence, 2),
        "signals": signals[:8],
    }

    # Hybrid / secondary type support
    if second_type and second_score >= top_score * 0.72:
        result["secondary_type"] = second_type

    return result
