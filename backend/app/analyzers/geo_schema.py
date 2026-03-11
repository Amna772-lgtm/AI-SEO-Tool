"""
Agent 2 — Schema & Structured Data Evaluation
Detects JSON-LD, Microdata, and RDFa on crawled pages.
Validates completeness and identifies missing recommended schemas.
Pure BeautifulSoup parsing — no external API.
"""
from __future__ import annotations

import json
import re
from bs4 import BeautifulSoup

# Required fields per schema type (subset of what Google requires)
_SCHEMA_REQUIRED_FIELDS: dict[str, list[str]] = {
    "FAQPage": ["mainEntity"],
    "Question": ["name", "acceptedAnswer"],
    "Answer": ["text"],
    "Article": ["headline", "author", "datePublished"],
    "BlogPosting": ["headline", "author", "datePublished"],
    "NewsArticle": ["headline", "author", "datePublished"],
    "Product": ["name", "offers"],
    "Offer": ["price", "priceCurrency"],
    "Review": ["reviewRating", "author"],
    "Person": ["name"],
    "Organization": ["name"],
    "LocalBusiness": ["name", "address"],
    "BreadcrumbList": ["itemListElement"],
    "HowTo": ["name", "step"],
    "WebSite": ["name", "url"],
    "WebPage": ["name"],
    "SoftwareApplication": ["name", "applicationCategory"],
}

# Schema types recommended by site type
_RECOMMENDED_BY_SITE_TYPE: dict[str, list[str]] = {
    "ecommerce":      ["Product", "Offer", "BreadcrumbList", "Organization", "FAQPage"],
    "blog":           ["Article", "BlogPosting", "Person", "BreadcrumbList", "FAQPage"],
    "news":           ["NewsArticle", "Organization", "BreadcrumbList"],
    "saas":           ["SoftwareApplication", "Organization", "FAQPage", "WebSite"],
    "local_business": ["LocalBusiness", "Organization", "FAQPage"],
    "portfolio":      ["Person", "Organization", "WebSite"],
    "informational":  ["Organization", "WebSite", "FAQPage", "BreadcrumbList"],
}


def _extract_json_ld(soup: BeautifulSoup) -> list[dict]:
    """Extract all JSON-LD blocks from a page."""
    results = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            text = tag.get_text(strip=True)
            if not text:
                continue
            data = json.loads(text)
            if isinstance(data, list):
                results.extend(data)
            else:
                results.append(data)
        except (json.JSONDecodeError, Exception):
            continue
    return results


def _extract_microdata_types(soup: BeautifulSoup) -> list[str]:
    """Extract schema types from Microdata (itemtype attributes)."""
    types = []
    for tag in soup.find_all(attrs={"itemtype": True}):
        itemtype = tag.get("itemtype", "")
        # Normalize: extract type name from URL
        match = re.search(r"schema\.org/(\w+)", itemtype)
        if match:
            types.append(match.group(1))
    return list(set(types))


def _extract_rdfa_types(soup: BeautifulSoup) -> list[str]:
    """Detect RDFa usage (typeof attribute)."""
    types = []
    for tag in soup.find_all(attrs={"typeof": True}):
        typeof = tag.get("typeof", "")
        # Strip namespace if present
        name = typeof.split(":")[-1].strip()
        if name:
            types.append(name)
    return list(set(types))


def _get_type_name(schema_obj: dict) -> str | None:
    """Get @type from a JSON-LD object (handles list types)."""
    t = schema_obj.get("@type")
    if isinstance(t, list):
        return t[0] if t else None
    return t


def _check_completeness(schema_obj: dict, type_name: str) -> list[str]:
    """Return list of missing required fields for this schema type."""
    required = _SCHEMA_REQUIRED_FIELDS.get(type_name, [])
    return [f for f in required if f not in schema_obj]


def analyze_schemas(pages_html: list[tuple[str, str]], site_type: str = "informational") -> dict:
    """
    Analyze structured data across a sample of pages.

    Args:
        pages_html: List of (url, html_content) tuples
        site_type: Detected site type for recommendation context

    Returns structured analysis dict.
    """
    all_schema_types: list[str] = []
    pages_with_schema = 0
    pages_analyzed = len(pages_html)
    has_json_ld = False
    has_microdata = False
    has_rdfa = False
    raw_schemas: list[dict] = []
    completeness_issues: list[dict] = []

    for url, html in pages_html:
        if not html:
            continue
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")

        page_has_schema = False

        # JSON-LD
        json_ld_blocks = _extract_json_ld(soup)
        if json_ld_blocks:
            has_json_ld = True
            page_has_schema = True
            for block in json_ld_blocks:
                t = _get_type_name(block)
                if t:
                    all_schema_types.append(t)
                    missing = _check_completeness(block, t)
                    if missing:
                        completeness_issues.append({
                            "url": url,
                            "type": t,
                            "missing_fields": missing,
                        })
            if len(raw_schemas) < 5:
                raw_schemas.extend(json_ld_blocks[:2])

        # Microdata
        micro_types = _extract_microdata_types(soup)
        if micro_types:
            has_microdata = True
            page_has_schema = True
            all_schema_types.extend(micro_types)

        # RDFa
        rdfa_types = _extract_rdfa_types(soup)
        if rdfa_types:
            has_rdfa = True
            page_has_schema = True
            all_schema_types.extend(rdfa_types)

        if page_has_schema:
            pages_with_schema += 1

    # Deduplicate schema types
    unique_types = list(dict.fromkeys(all_schema_types))

    # Coverage
    coverage = round((pages_with_schema / pages_analyzed * 100), 1) if pages_analyzed else 0.0

    # Missing recommended schemas
    recommended = _RECOMMENDED_BY_SITE_TYPE.get(site_type, _RECOMMENDED_BY_SITE_TYPE["informational"])
    missing_recommended = [r for r in recommended if r not in unique_types]

    return {
        "has_json_ld": has_json_ld,
        "has_microdata": has_microdata,
        "has_rdfa": has_rdfa,
        "schema_types": unique_types,
        "coverage_percent": coverage,
        "pages_with_schema": pages_with_schema,
        "pages_without_schema": pages_analyzed - pages_with_schema,
        "pages_analyzed": pages_analyzed,
        "missing_recommended": missing_recommended,
        "completeness_issues": completeness_issues[:10],
        "raw_schemas": raw_schemas[:5],
    }
