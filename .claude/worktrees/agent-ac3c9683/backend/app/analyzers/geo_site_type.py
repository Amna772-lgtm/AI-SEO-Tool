"""
Agent 1 — Website Type Detection
Classifies the site into a type so downstream agents can adapt their analysis.
Pure heuristic: no external API calls.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

# Patterns keyed by site type (checked in priority order)
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

_SCHEMA_TYPE_MAP: dict[str, str] = {
    "Product": "ecommerce",
    "Offer": "ecommerce",
    "ShoppingAction": "ecommerce",
    "BlogPosting": "blog",
    "NewsArticle": "news",
    "Article": "blog",
    "LocalBusiness": "local_business",
    "Restaurant": "local_business",
    "SoftwareApplication": "saas",
    "WebApplication": "saas",
}


def detect_site_type(page_urls: list[str], homepage_html: str = "", schema_types: list[str] | None = None) -> dict:
    """
    Detect the site type from crawled URL patterns, homepage HTML, and schema types.

    Returns:
        {
            "site_type": str,
            "confidence": float (0-1),
            "signals": list[str]
        }
    """
    scores: dict[str, float] = {}
    signals: list[str] = []

    # 1. Score based on URL patterns across all crawled pages
    url_text = " ".join(page_urls).lower()
    for site_type, patterns in _TYPE_PATTERNS:
        matched = [p for p in patterns if re.search(p, url_text)]
        if matched:
            score = min(len(matched) * 0.25, 0.75)
            scores[site_type] = scores.get(site_type, 0) + score
            signals.append(f"URL pattern match ({site_type}): {matched[0]}")

    # 2. Boost from schema types detected
    for stype in (schema_types or []):
        mapped = _SCHEMA_TYPE_MAP.get(stype)
        if mapped:
            scores[mapped] = scores.get(mapped, 0) + 0.4
            signals.append(f"Schema type '{stype}' → {mapped}")

    # 3. Homepage HTML keyword signals
    html_lower = homepage_html.lower()
    ecommerce_kw = ["add to cart", "add to bag", "buy now", "free shipping", "checkout"]
    blog_kw = ["published on", "posted by", "read more", "comments", "tags:", "categories:"]
    saas_kw = ["free trial", "start for free", "14-day", "monthly plan", "per month", "per user"]
    news_kw = ["breaking news", "latest news", "subscribe to newsletter", "press release"]

    for kw in ecommerce_kw:
        if kw in html_lower:
            scores["ecommerce"] = scores.get("ecommerce", 0) + 0.15
            signals.append(f"Homepage keyword: '{kw}'")
            break
    for kw in blog_kw:
        if kw in html_lower:
            scores["blog"] = scores.get("blog", 0) + 0.1
            signals.append(f"Homepage keyword: '{kw}'")
            break
    for kw in saas_kw:
        if kw in html_lower:
            scores["saas"] = scores.get("saas", 0) + 0.15
            signals.append(f"Homepage keyword: '{kw}'")
            break
    for kw in news_kw:
        if kw in html_lower:
            scores["news"] = scores.get("news", 0) + 0.15
            signals.append(f"Homepage keyword: '{kw}'")
            break

    # 4. Pick winner
    if not scores:
        return {"site_type": "informational", "confidence": 0.3, "signals": ["No strong type signals detected"]}

    winner = max(scores, key=lambda k: scores[k])
    confidence = min(scores[winner], 1.0)

    return {
        "site_type": winner,
        "confidence": round(confidence, 2),
        "signals": signals[:8],  # cap at 8 for readability
    }
