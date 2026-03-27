"""
Entity Establishment Analyzer
Checks whether a brand/organization is recognized as an established entity
by authoritative sources — a key signal AI models use when deciding to cite a source.

Signals scored:
  Wikipedia existence  35 pts — strongest single entity signal
  sameAs link quality  30 pts — consistent authoritative profile links in schema
  Org schema complete  20 pts — machine-readable entity data completeness
  Authority outlinks   15 pts — content linked to from recognized sources
"""
from __future__ import annotations

import re
import urllib.parse
from bs4 import BeautifulSoup

import httpx

# ── Platform authority weights for sameAs scoring ─────────────────────────

_SAMEAS_PLATFORMS: dict[str, tuple[str, int]] = {
    "wikipedia.org":  ("Wikipedia",   15),
    "wikidata.org":   ("Wikidata",    12),
    "linkedin.com":   ("LinkedIn",     5),
    "crunchbase.com": ("Crunchbase",   4),
    "twitter.com":    ("Twitter/X",    3),
    "x.com":          ("Twitter/X",    3),
    "facebook.com":   ("Facebook",     2),
    "instagram.com":  ("Instagram",    2),
    "youtube.com":    ("YouTube",      2),
    "github.com":     ("GitHub",       2),
    "angel.co":       ("AngelList",    2),
    "bloomberg.com":  ("Bloomberg",    3),
    "forbes.com":     ("Forbes",       3),
    "glassdoor.com":  ("Glassdoor",    1),
}

# ── Authoritative outbound domains ─────────────────────────────────────────

_AUTHORITY_DOMAINS: dict[str, int] = {
    "wikipedia.org":       5,
    ".gov":                5,
    ".edu":                4,
    "crunchbase.com":      3,
    "linkedin.com":        2,
    "bloomberg.com":       2,
    "reuters.com":         2,
    "forbes.com":          2,
    "techcrunch.com":      2,
    "bbc.co.uk":           2,
    "bbc.com":             2,
    "nytimes.com":         2,
    "theguardian.com":     2,
    "wsj.com":             2,
    "ft.com":              2,
    "wired.com":           1,
    "venturebeat.com":     1,
}

# ── Organization schema types & completeness fields ────────────────────────

_ORG_SCHEMA_TYPES = frozenset({
    "Organization", "LocalBusiness", "Corporation", "NGO",
    "EducationalOrganization", "MedicalOrganization", "GovernmentOrganization",
})
_ORG_FIELDS = ["name", "url", "logo", "description", "sameAs", "address", "telephone", "foundingDate"]

_TITLE_SEPARATORS = re.compile(r"\s+[\|–—\-:]{1,2}\s+")


# ── Brand name extraction ──────────────────────────────────────────────────

def _extract_brand_name(homepage_html: str, schema_result: dict, site_url: str) -> str:
    """
    Extract the most likely brand name from schema, meta tags, or title.
    Falls back to the domain name.
    """
    # 1. Organization schema name
    for raw in (schema_result.get("raw_schemas") or []):
        if not isinstance(raw, dict):
            continue
        stype = raw.get("@type", "")
        if isinstance(stype, list):
            stype = stype[0] if stype else ""
        if stype in _ORG_SCHEMA_TYPES:
            name = raw.get("name")
            if name and isinstance(name, str) and 1 < len(name) < 100:
                return name.strip()

    if not homepage_html:
        # Fallback: domain without TLD
        host = urllib.parse.urlparse(site_url).netloc.lower()
        return host.replace("www.", "").rsplit(".", 1)[0].replace("-", " ").title()

    try:
        soup = BeautifulSoup(homepage_html, "lxml")
    except Exception:
        soup = BeautifulSoup(homepage_html, "html.parser")

    # 2. og:site_name
    og = soup.find("meta", attrs={"property": "og:site_name"})
    if og and og.get("content", "").strip():
        return og["content"].strip()

    # 3. <title> — first segment before separator
    title_tag = soup.find("title")
    if title_tag:
        text = title_tag.get_text(strip=True)
        parts = _TITLE_SEPARATORS.split(text)
        candidate = parts[0].strip() if parts else text
        if 1 < len(candidate) < 80:
            return candidate

    # 4. Domain
    host = urllib.parse.urlparse(site_url).netloc.lower()
    return host.replace("www.", "").rsplit(".", 1)[0].replace("-", " ").title()


# ── Wikipedia check ───────────────────────────────────────────────────────

def _check_wikipedia(brand_name: str, timeout: float = 6.0) -> tuple[str | None, bool]:
    """
    Check if a Wikipedia article exists for the brand name.
    Uses the REST summary endpoint — returns (wiki_url, found).
    """
    if not brand_name:
        return None, False
    try:
        encoded = urllib.parse.quote(brand_name, safe="")
        api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}"
        resp = httpx.get(
            api_url,
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "AI-SEO-Bot/1.0 (entity-check)"},
        )
        if resp.status_code == 200:
            data = resp.json()
            wiki_url = (
                data.get("content_urls", {}).get("desktop", {}).get("page")
                or api_url
            )
            return wiki_url, True
        return None, False
    except Exception:
        return None, False


# ── sameAs extraction & scoring ────────────────────────────────────────────

def _extract_same_as(schema_result: dict) -> list[str]:
    """Collect all sameAs URLs from raw schema objects."""
    links: list[str] = []
    for raw in (schema_result.get("raw_schemas") or []):
        if not isinstance(raw, dict):
            continue
        sa = raw.get("sameAs")
        if isinstance(sa, str):
            links.append(sa)
        elif isinstance(sa, list):
            links.extend(str(s) for s in sa if s)
    return list(set(links))


def _score_same_as(same_as_links: list[str]) -> tuple[int, dict[str, int]]:
    """
    Score sameAs links by platform authority. Max 30 pts.
    Returns (score, {platform_name: pts_awarded}).
    """
    matched: dict[str, int] = {}
    for link in same_as_links:
        ll = link.lower()
        for domain, (platform, pts) in _SAMEAS_PLATFORMS.items():
            if domain in ll and platform not in matched:
                matched[platform] = pts
    return min(sum(matched.values()), 30), matched


# ── Organization schema completeness ──────────────────────────────────────

def _score_org_schema(schema_result: dict) -> tuple[int, list[str], list[str]]:
    """
    Score how complete the Organization schema is. Max 20 pts.
    Returns (score, present_fields, missing_fields).
    """
    for raw in (schema_result.get("raw_schemas") or []):
        if not isinstance(raw, dict):
            continue
        stype = raw.get("@type", "")
        if isinstance(stype, list):
            stype = stype[0] if stype else ""
        if stype in _ORG_SCHEMA_TYPES:
            present = [f for f in _ORG_FIELDS if raw.get(f)]
            missing = [f for f in _ORG_FIELDS if not raw.get(f)]
            score = int(len(present) / len(_ORG_FIELDS) * 20)
            return score, present, missing
    return 0, [], _ORG_FIELDS


# ── Authority outbound links ───────────────────────────────────────────────

def _find_authority_links(pages_html: list[tuple[str, str]]) -> dict[str, int]:
    """
    Scan up to 5 pages for outbound links to authoritative domains.
    Returns {domain: pts} for each unique authority domain found.
    """
    found: dict[str, int] = {}
    for _url, html in pages_html[:5]:
        if not html:
            continue
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            href = (a.get("href") or "").lower()
            if not href.startswith("http"):
                continue
            for domain, pts in _AUTHORITY_DOMAINS.items():
                if domain in href and domain not in found:
                    found[domain] = pts
    return found


# ── Main entry point ──────────────────────────────────────────────────────

def analyze_entity(
    site_url: str,
    schema_result: dict,
    homepage_html: str,
    pages_html: list[tuple[str, str]],
) -> dict:
    """
    Analyze entity establishment signals.

    Args:
        site_url: Root URL of the site
        schema_result: Output of geo_schema.analyze_schemas()
        homepage_html: Raw HTML of homepage
        pages_html: List of (url, html) for analyzed pages

    Returns structured entity analysis dict with entity_score 0-100.
    """
    brand_name = _extract_brand_name(homepage_html, schema_result, site_url)

    # 1. Wikipedia existence (35 pts)
    wikipedia_url, wikipedia_found = _check_wikipedia(brand_name)
    wikipedia_pts = 35 if wikipedia_found else 0

    # 2. sameAs links (30 pts max)
    same_as_links = _extract_same_as(schema_result)
    same_as_pts, same_as_platforms = _score_same_as(same_as_links)

    # 3. Organization schema completeness (20 pts)
    org_pts, org_present, org_missing = _score_org_schema(schema_result)

    # 4. Authority outbound links (15 pts max)
    authority_links = _find_authority_links(pages_html)
    authority_pts = min(sum(authority_links.values()), 15)

    entity_score = min(wikipedia_pts + same_as_pts + org_pts + authority_pts, 100)

    # Determine establishment level label
    if entity_score >= 70:
        establishment_label = "Established"
    elif entity_score >= 40:
        establishment_label = "Emerging"
    else:
        establishment_label = "Unknown"

    return {
        "entity_score":        entity_score,
        "establishment_label": establishment_label,
        "brand_name":          brand_name,
        # Wikipedia
        "wikipedia_found":     wikipedia_found,
        "wikipedia_url":       wikipedia_url,
        "wikipedia_pts":       wikipedia_pts,
        # sameAs
        "same_as_links":       same_as_links,
        "same_as_platforms":   same_as_platforms,
        "same_as_pts":         same_as_pts,
        # Org schema
        "org_schema_present":  len(org_present) > 0,
        "org_fields_present":  org_present,
        "org_fields_missing":  org_missing,
        "org_pts":             org_pts,
        # Authority links
        "authority_links":     list(authority_links.keys()),
        "authority_pts":       authority_pts,
        # Score breakdown for UI
        "score_breakdown": {
            "wikipedia":      {"pts": wikipedia_pts,  "max": 35},
            "same_as":        {"pts": same_as_pts,    "max": 30},
            "org_schema":     {"pts": org_pts,        "max": 20},
            "authority_links":{"pts": authority_pts,  "max": 15},
        },
    }
