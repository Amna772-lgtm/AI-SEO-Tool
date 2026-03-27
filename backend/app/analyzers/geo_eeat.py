"""
Agent 5 — E-E-A-T Signals Detection
Detects Experience, Expertise, Authoritativeness, and Trustworthiness signals.
Pure heuristic: URL pattern matching + HTML text analysis.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup

# URL path patterns that indicate trust/authority pages
_TRUST_URL_PATTERNS = {
    "privacy_policy":  [r"/privacy", r"/privacy-policy", r"/data-policy"],
    "terms":           [r"/terms", r"/terms-of-service", r"/terms-and-conditions", r"/tos"],
    "contact":         [r"/contact", r"/contact-us", r"/get-in-touch", r"/reach-us"],
    "about":           [r"/about", r"/about-us", r"/our-story", r"/who-we-are"],
    "author":          [r"/author/", r"/authors/", r"/team/", r"/staff/", r"/people/"],
    "case_studies":    [r"/case-stud", r"/success-stor", r"/client-stor"],
    "blog":            [r"/blog", r"/articles", r"/insights"],
    "faq":             [r"/faq", r"/faqs", r"/frequently-asked"],
}

# HTML text patterns for expertise signals
_EXPERTISE_PATTERNS = [
    r"\b(md|phd|dr\.?|professor|cpa|cfa|attorney|lawyer|engineer|certified)\b",
    r"\b(\d+\+?\s+years?\s+(of\s+)?(experience|expertise))\b",
    r"\b(award[- ]winning|industry[- ]leading|recognized\s+by)\b",
    r"\b(research|study|studies|published|peer[- ]reviewed)\b",
    r"\b(founder|co-founder|ceo|cto|chief)\b",
]

# Trust signal text patterns
_TRUST_TEXT_PATTERNS = [
    r"\b(ssl|secure|encrypted|verified|trusted)\b",
    r"\b(bbb|better business bureau|trustpilot|google partner)\b",
    r"\b(money[- ]back guarantee|refund policy|satisfaction guaranteed)\b",
    r"\b(\+\d[\d\s\-\(\)]{7,})",         # phone number
    r"\b\d{3,5}\s+\w[\w\s]+,\s*\w{2}\b", # street address
]

# Author/byline signals
_AUTHOR_PATTERNS = [
    r"by\s+[A-Z][a-z]+\s+[A-Z][a-z]+",
    r"written\s+by\s+[A-Z]",
    r"author:\s*[A-Z]",
    r'class="[^"]*author[^"]*"',
    r'itemprop="author"',
    r'"@type"\s*:\s*"Person"',
]

# Citation/research patterns
_CITATION_PATTERNS = [
    r"\[\d+\]",                     # [1] footnote style
    r"according\s+to\s+[A-Z]",
    r"cited\s+by",
    r"source[s]?:",
    r"reference[s]?:",
    r"doi\.org",
    r"pubmed",
    r"ncbi\.nlm",
]


# ── Content Freshness ─────────────────────────────────────────────────────

_BLOG_URL_RE = re.compile(
    r"/(blog|news|article|articles|post|posts|insight|insights|press|update|updates)/",
    re.IGNORECASE,
)

_DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%a, %d %b %Y %H:%M:%S GMT",
    "%a, %d %b %Y %H:%M:%S %Z",
    "%d %b %Y",
    "%B %d, %Y",
    "%b %d, %Y",
]


def _parse_date(s: str | None) -> datetime | None:
    """Parse a date string to datetime(UTC). Returns None on failure."""
    if not s:
        return None
    s = s.strip()
    if not s or s in ("-", "—", "N/A", "unknown"):
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s[:26], fmt).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def _analyze_freshness(pages: list[dict]) -> dict:
    """
    Analyse content freshness across crawled internal HTML pages.

    Returns per-bucket page counts (30d/90d/180d/older), blog cadence,
    and a 0-100 freshness_score.
    """
    now = datetime.now(tz=timezone.utc)
    cutoff_30  = now - timedelta(days=30)
    cutoff_90  = now - timedelta(days=90)
    cutoff_180 = now - timedelta(days=180)

    html_pages = [
        p for p in pages
        if p.get("type") == "internal"
        and "text/html" in (p.get("content_type") or "").lower()
    ]
    pages_total = len(html_pages)

    pages_30d = pages_90d = pages_180d = pages_older = 0
    pages_with_dates = 0
    latest_date: datetime | None = None
    blog_dates: list[datetime] = []

    for page in html_pages:
        addr = page.get("address", "")
        dt = _parse_date(page.get("last_modified"))
        if dt is None:
            continue
        pages_with_dates += 1
        if latest_date is None or dt > latest_date:
            latest_date = dt
        if dt >= cutoff_30:
            pages_30d += 1
        elif dt >= cutoff_90:
            pages_90d += 1
        elif dt >= cutoff_180:
            pages_180d += 1
        else:
            pages_older += 1
        if _BLOG_URL_RE.search(addr):
            blog_dates.append(dt)

    # Blog section detection (URL-pattern-based)
    all_urls = " ".join(p.get("address", "") for p in pages)
    has_blog_section = bool(_BLOG_URL_RE.search(all_urls))
    blog_post_count = len([p for p in pages if _BLOG_URL_RE.search(p.get("address", "") or "")])

    # Cadence from sorted publish dates
    blog_cadence = "none"
    if len(blog_dates) >= 2:
        blog_dates_sorted = sorted(blog_dates, reverse=True)
        gaps = [
            (blog_dates_sorted[i] - blog_dates_sorted[i + 1]).days
            for i in range(len(blog_dates_sorted) - 1)
            if (blog_dates_sorted[i] - blog_dates_sorted[i + 1]).days > 0
        ]
        if gaps:
            median_gap = sorted(gaps)[len(gaps) // 2]
            if median_gap <= 3:
                blog_cadence = "daily"
            elif median_gap <= 10:
                blog_cadence = "weekly"
            elif median_gap <= 45:
                blog_cadence = "monthly"
            elif median_gap <= 100:
                blog_cadence = "quarterly"
            else:
                blog_cadence = "irregular"
        else:
            blog_cadence = "irregular"
    elif has_blog_section or blog_post_count > 0:
        blog_cadence = "irregular"

    # Last update label
    if latest_date is None:
        last_update_label = "Unknown"
    elif latest_date >= cutoff_30:
        last_update_label = "< 30 days"
    elif latest_date >= cutoff_90:
        last_update_label = "< 90 days"
    elif latest_date >= cutoff_180:
        last_update_label = "< 180 days"
    else:
        last_update_label = "> 180 days ago"

    # ── Freshness score 0-100 ────────────────────────────────────────────
    score = 0

    # 1. Recency of most recent update (30 pts)
    if pages_30d > 0:
        score += 30
    elif pages_90d > 0:
        score += 20
    elif pages_180d > 0:
        score += 10
    elif pages_older > 0:
        score += 3

    # 2. Volume of recent updates relative to dated pages (25 pts)
    if pages_with_dates > 0:
        recent_ratio = (pages_30d + pages_90d) / pages_with_dates
        score += min(int(recent_ratio * 25), 25)

    # 3. Blog / posting cadence (30 pts)
    cadence_pts = {
        "daily": 30, "weekly": 25, "monthly": 15,
        "quarterly": 8, "irregular": 5, "none": 0,
    }
    score += cadence_pts.get(blog_cadence, 0)

    # 4. Date coverage — % of HTML pages with any date (15 pts)
    if pages_total > 0:
        score += min(int((pages_with_dates / pages_total) * 15), 15)

    return {
        "freshness_score":  min(score, 100),
        "pages_total":      pages_total,
        "pages_with_dates": pages_with_dates,
        "pages_30d":        pages_30d,
        "pages_90d":        pages_90d,
        "pages_180d":       pages_180d,
        "pages_older":      pages_older,
        "has_blog_section": has_blog_section,
        "blog_post_count":  blog_post_count,
        "blog_cadence":     blog_cadence,
        "last_update_label": last_update_label,
    }


def _check_url_patterns(page_urls: list[str]) -> dict[str, bool]:
    """Check which trust/authority pages exist based on URL patterns."""
    found: dict[str, bool] = {}
    url_text = " ".join(page_urls).lower()
    for signal_name, patterns in _TRUST_URL_PATTERNS.items():
        found[signal_name] = any(re.search(p, url_text, re.I) for p in patterns)
    return found


def _check_html_signals(homepage_html: str, about_html: str = "") -> dict:
    """Detect expertise, trust, and author signals in HTML content."""
    combined_html = homepage_html + " " + about_html

    try:
        soup = BeautifulSoup(combined_html, "lxml")
    except Exception:
        soup = BeautifulSoup(combined_html, "html.parser")

    text = soup.get_text(separator=" ", strip=True)
    html_str = str(soup)

    expertise_signals: list[str] = []
    trust_signals: list[str] = []
    author_found = False
    citations_found = False

    # Expertise patterns
    for pat in _EXPERTISE_PATTERNS:
        m = re.search(pat, text, re.I)
        if m:
            expertise_signals.append(m.group(0).strip())

    # Trust text patterns
    for pat in _TRUST_TEXT_PATTERNS:
        m = re.search(pat, text, re.I)
        if m:
            trust_signals.append(m.group(0).strip())

    # Author patterns (check in full HTML for attributes too)
    for pat in _AUTHOR_PATTERNS:
        if re.search(pat, html_str, re.I):
            author_found = True
            break

    # Citation patterns
    for pat in _CITATION_PATTERNS:
        if re.search(pat, text, re.I):
            citations_found = True
            break

    # Content freshness: look for <time> or date patterns
    freshness = False
    if soup.find("time"):
        freshness = True
    elif re.search(r"(updated|published|last\s+modified)\s+\w+\s+\d{1,2},?\s+\d{4}", text, re.I):
        freshness = True

    return {
        "expertise_signals": list(set(expertise_signals))[:5],
        "trust_text_signals": list(set(trust_signals))[:5],
        "author_credentials_found": author_found,
        "citations_found": citations_found,
        "content_freshness": freshness,
    }


def _compute_eeat_score(url_signals: dict[str, bool], html_signals: dict, freshness_score: int = 0) -> tuple[int, list[str], list[str]]:
    """
    Compute E-E-A-T score 0-100 and return present/missing signals.

    Weighting:
    - Trust pages (about, contact, privacy, terms): 30 pts total
    - Author signals: 20 pts
    - Expertise signals: 20 pts
    - Citations/research: 15 pts
    - Content freshness: 10 pts
    - Case studies/FAQ: 5 pts
    """
    score = 0
    present: list[str] = []
    missing: list[str] = []

    # Trust pages (7.5 pts each, 4 pages = 30 pts)
    trust_pages = ["about", "contact", "privacy_policy", "terms"]
    for page in trust_pages:
        if url_signals.get(page):
            score += 7
            present.append(f"{page.replace('_', ' ').title()} page")
        else:
            missing.append(f"{page.replace('_', ' ').title()} page missing")

    # Author signals (20 pts)
    if html_signals["author_credentials_found"]:
        score += 20
        present.append("Author/byline detected")
    else:
        missing.append("No author byline found")

    # Expertise signals (20 pts)
    exp = html_signals["expertise_signals"]
    if exp:
        score += min(len(exp) * 7, 20)
        present.append(f"Expertise signals: {exp[0]}")
    else:
        missing.append("No expertise signals (credentials, years of experience)")

    # Citations (15 pts)
    if html_signals["citations_found"]:
        score += 15
        present.append("Research citations / references found")
    else:
        missing.append("No research citations found")

    # Content freshness (10 pts) — uses granular freshness_score when available
    freshness_pts = int(freshness_score / 100 * 10) if freshness_score > 0 else (
        10 if html_signals["content_freshness"] else 0
    )
    score += freshness_pts
    if freshness_pts >= 7:
        present.append("Content freshness: active / recently updated")
    elif freshness_pts >= 3:
        present.append("Content freshness: partially dated")
    else:
        missing.append("No content freshness dates found")

    # Case studies + FAQ (5 pts)
    if url_signals.get("case_studies"):
        score += 3
        present.append("Case studies page found")
    if url_signals.get("faq"):
        score += 2
        present.append("FAQ page found")

    return min(score, 100), present, missing


def analyze_eeat(
    page_urls: list[str],
    homepage_html: str = "",
    about_html: str = "",
    pages: list[dict] | None = None,
) -> dict:
    """
    Analyze E-E-A-T signals for a site.

    Args:
        page_urls: All crawled URLs
        homepage_html: Raw HTML of homepage
        about_html: Raw HTML of about/team page (if found)
        pages: Full page-row dicts from Redis (for freshness analysis)

    Returns structured E-E-A-T analysis dict.
    """
    url_signals = _check_url_patterns(page_urls)
    html_signals = _check_html_signals(homepage_html, about_html)
    freshness = _analyze_freshness(pages or [])
    score, present_signals, missing_signals = _compute_eeat_score(
        url_signals, html_signals, freshness["freshness_score"]
    )

    return {
        "eeat_score": score,
        "has_about_page": url_signals.get("about", False),
        "has_contact_page": url_signals.get("contact", False),
        "has_privacy_policy": url_signals.get("privacy_policy", False),
        "has_author_pages": url_signals.get("author", False),
        "has_case_studies": url_signals.get("case_studies", False),
        "has_faq_page": url_signals.get("faq", False),
        "author_credentials_found": html_signals["author_credentials_found"],
        "citations_found": html_signals["citations_found"],
        "content_freshness": html_signals["content_freshness"],
        "expertise_signals": html_signals["expertise_signals"],
        "trust_signals": present_signals,
        "missing_signals": missing_signals,
        "freshness": freshness,
    }
