"""
Agent 5 — E-E-A-T Signals Detection
Detects Experience, Expertise, Authoritativeness, and Trustworthiness signals.
Pure heuristic: URL pattern matching + HTML text analysis.
"""
from __future__ import annotations

import re
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


def _compute_eeat_score(url_signals: dict[str, bool], html_signals: dict) -> tuple[int, list[str], list[str]]:
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

    # Content freshness (10 pts)
    if html_signals["content_freshness"]:
        score += 10
        present.append("Content dates / freshness signals found")
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
) -> dict:
    """
    Analyze E-E-A-T signals for a site.

    Args:
        page_urls: All crawled URLs
        homepage_html: Raw HTML of homepage
        about_html: Raw HTML of about/team page (if found)

    Returns structured E-E-A-T analysis dict.
    """
    url_signals = _check_url_patterns(page_urls)
    html_signals = _check_html_signals(homepage_html, about_html)
    score, present_signals, missing_signals = _compute_eeat_score(url_signals, html_signals)

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
    }
