"""
Shared HTML feature extraction for GEO Wave 1 analyzers.
Parse each page's HTML exactly once; share results across geo_schema,
geo_content, and geo_page_scores. geo_eeat is excluded — it uses raw
string regex and does not require BeautifulSoup.

CRITICAL: JSON-LD extraction runs BEFORE tag stripping to avoid losing
<script type="application/ld+json"> blocks. After extraction, noise tags
are stripped once for all text-based analyzers.
"""
from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

# Tags stripped before text extraction (same set used by geo_content._clean_text)
_STRIP_TAGS = frozenset({"script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"})


def _count_syllables(word: str) -> int:
    """Approximate syllable count for a word. Canonical implementation."""
    word = word.lower().strip(".,!?;:")
    if not word:
        return 1
    vowels = "aeiouy"
    count, prev_vowel = 0, False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.endswith("e"):
        count = max(1, count - 1)
    return max(1, count)


def _flesch_kincaid_grade(text: str) -> float:
    """
    Flesch-Kincaid Grade Level (0.0–20.0).
    Canonical implementation — imported by geo_content and geo_page_scores.
    """
    words = re.findall(r"\b\w+\b", text)
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    if not words or not sentences:
        return 8.0
    num_words = len(words)
    num_sentences = len(sentences)
    num_syllables = sum(_count_syllables(w) for w in words)
    grade = (0.39 * (num_words / num_sentences)) + (11.8 * (num_syllables / num_words)) - 15.59
    return round(max(0.0, min(grade, 20.0)), 1)


def _extract_raw_json_ld(soup: BeautifulSoup) -> list[dict]:
    """
    Extract JSON-LD blocks from the UNSTRIPPED soup.
    Must be called before any tag.decompose() calls.
    Returns list of parsed JSON-LD dicts (invalid JSON silently skipped).
    """
    blocks = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            raw = tag.string or ""
            data = json.loads(raw.strip())
            if isinstance(data, list):
                blocks.extend(data)
            elif isinstance(data, dict):
                blocks.append(data)
        except Exception:
            pass
    return blocks


def extract_page_features(url: str, html: str) -> dict:
    """
    Parse HTML once and return all signals needed by Wave 1 GEO analyzers.

    Returns a dict with keys:
      url            str    — the page URL
      raw_json_ld    list   — JSON-LD blocks extracted BEFORE stripping
      soup           soup   — BeautifulSoup tree with noise tags STRIPPED
                              (safe for headings, links, meta, lists)
      body_text      str    — clean text for word count, FK, FAQ, NLP patterns
      html_str       str    — str(soup) after stripping (for regex patterns in geo_page_scores)
      fk_grade       float  — pre-computed Flesch-Kincaid grade (0.0–20.0)

    Callers MUST NOT call tag.decompose() on the returned soup — stripping
    is already done here. geo_eeat does not receive this dict; it keeps
    its raw html string interface.
    """
    if not html:
        return {
            "url": url,
            "raw_json_ld": [],
            "soup": BeautifulSoup("", "html.parser"),
            "body_text": "",
            "html_str": "",
            "fk_grade": 8.0,
        }

    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    # Step 1: Extract JSON-LD BEFORE stripping (script tags would be removed otherwise)
    raw_json_ld = _extract_raw_json_ld(soup)

    # Step 2: Strip noise tags once for all text-based analyzers
    for tag in soup.find_all(_STRIP_TAGS):
        tag.decompose()

    body_text = soup.get_text(separator=" ", strip=True)
    html_str = str(soup)
    fk_grade = _flesch_kincaid_grade(body_text)

    return {
        "url": url,
        "raw_json_ld": raw_json_ld,
        "soup": soup,
        "body_text": body_text,
        "html_str": html_str,
        "fk_grade": fk_grade,
    }
