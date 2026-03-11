"""
Agent 3 — Content Structure & Readability Analysis
Analyzes word count, reading level, FAQ presence, heading structure,
list usage, and conversational tone across crawled HTML pages.
Pure Python + BeautifulSoup — no external API.
"""
from __future__ import annotations

import re
from bs4 import BeautifulSoup, Tag

# Tags to strip before text extraction (navigation, scripts, etc.)
_STRIP_TAGS = {"script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"}

# Question-intent patterns for FAQ detection
_QUESTION_RE = re.compile(
    r"\b(how|what|why|when|where|who|which|can|does|is|are|will|should|do)\b.{5,80}\?",
    re.IGNORECASE,
)

# Second-person pronouns (conversational indicators)
_SECOND_PERSON_RE = re.compile(r"\b(you|your|you're|you'll|you've|yourself)\b", re.IGNORECASE)


def _clean_text(html: str) -> str:
    """Extract clean body text from HTML, stripping nav/footer/scripts."""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(_STRIP_TAGS):
        tag.decompose()

    return soup.get_text(separator=" ", strip=True)


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def _flesch_kincaid_grade(text: str) -> float:
    """
    Flesch-Kincaid Grade Level formula.
    FK Grade = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    """
    words = re.findall(r"\b\w+\b", text)
    sentences = re.split(r"[.!?]+", text)
    sentences = [s for s in sentences if s.strip()]

    if not words or not sentences:
        return 8.0

    num_words = len(words)
    num_sentences = len(sentences)
    num_syllables = sum(_count_syllables(w) for w in words)

    grade = (0.39 * (num_words / num_sentences)) + (11.8 * (num_syllables / num_words)) - 15.59
    return round(max(0.0, min(grade, 20.0)), 1)


def _count_syllables(word: str) -> int:
    """Approximate syllable count for a word."""
    word = word.lower().strip(".,!?;:")
    if not word:
        return 1
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.endswith("e"):
        count = max(1, count - 1)
    return max(1, count)


def _grade_to_label(grade: float) -> str:
    if grade <= 6:
        return "Elementary"
    if grade <= 9:
        return "Middle School"
    if grade <= 12:
        return "High School"
    return "College"


def _extract_headings(html: str) -> dict:
    """Count H1/H2/H3 headings and extract text samples."""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    h1 = [t.get_text(strip=True) for t in soup.find_all("h1")]
    h2 = [t.get_text(strip=True) for t in soup.find_all("h2")]
    h3 = [t.get_text(strip=True) for t in soup.find_all("h3")]
    return {"h1": h1, "h2": h2, "h3": h3}


def _detect_faq(html: str) -> tuple[bool, list[str]]:
    """Detect FAQ-style question-answer blocks."""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    questions: list[str] = []

    # Check for FAQ schema markup
    for tag in soup.find_all(attrs={"itemtype": re.compile(r"FAQPage|Question", re.I)}):
        questions.append("FAQ schema detected")

    # Check headings for question patterns
    for tag in soup.find_all(["h2", "h3", "h4", "dt"]):
        text = tag.get_text(strip=True)
        if _QUESTION_RE.search(text):
            questions.append(text)

    # Check bold text for question patterns
    for tag in soup.find_all(["strong", "b"]):
        text = tag.get_text(strip=True)
        if _QUESTION_RE.search(text) and len(text) < 100:
            questions.append(text)

    questions = list(dict.fromkeys(questions))  # deduplicate
    return len(questions) > 0, questions[:10]


def _count_lists(html: str) -> int:
    """Count <ul> and <ol> list blocks."""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")
    return len(soup.find_all(["ul", "ol"]))


def _conversational_score(text: str) -> float:
    """
    Score 0-1 for conversational tone.
    Based on: second-person pronouns density + question density.
    """
    words = re.findall(r"\b\w+\b", text)
    if not words:
        return 0.0

    num_words = len(words)
    second_person = len(_SECOND_PERSON_RE.findall(text))
    questions = len(_QUESTION_RE.findall(text))

    # Normalize per 100 words
    sp_density = (second_person / num_words) * 100
    q_density = (questions / num_words) * 100

    # Score: 5%+ second-person → max SP contribution; 2%+ questions → max Q contribution
    sp_score = min(sp_density / 5.0, 1.0) * 0.6
    q_score = min(q_density / 2.0, 1.0) * 0.4

    return round(sp_score + q_score, 2)


def analyze_content(pages_html: list[tuple[str, str]]) -> dict:
    """
    Analyze content structure and readability across a sample of HTML pages.

    Args:
        pages_html: List of (url, html_content) tuples (HTML pages only)

    Returns structured content analysis dict.
    """
    word_counts: list[int] = []
    fk_grades: list[float] = []
    all_faq_questions: list[str] = []
    pages_with_faq = 0
    pages_with_h2 = 0
    pages_with_h3 = 0
    total_headings = 0
    total_lists = 0
    conv_scores: list[float] = []
    thin_pages = 0
    pages_analyzed = 0

    for _url, html in pages_html:
        if not html:
            continue
        pages_analyzed += 1

        text = _clean_text(html)
        wc = _word_count(text)
        word_counts.append(wc)

        if wc < 300:
            thin_pages += 1

        if wc >= 50:
            fk_grades.append(_flesch_kincaid_grade(text))
            conv_scores.append(_conversational_score(text))

        headings = _extract_headings(html)
        if headings["h2"]:
            pages_with_h2 += 1
        if headings["h3"]:
            pages_with_h3 += 1
        total_headings += len(headings["h2"]) + len(headings["h3"])

        total_lists += _count_lists(html)

        has_faq, faq_qs = _detect_faq(html)
        if has_faq:
            pages_with_faq += 1
            all_faq_questions.extend(faq_qs)

    if not word_counts:
        return {
            "avg_word_count": 0,
            "median_word_count": 0,
            "reading_level": "Unknown",
            "flesch_kincaid_grade": 0.0,
            "pages_with_faq": 0,
            "faq_questions": [],
            "heading_structure": {"pages_with_h2": 0, "pages_with_h3": 0, "avg_headings_per_page": 0.0},
            "conversational_tone_score": 0.0,
            "thin_content_pages": 0,
            "pages_analyzed": 0,
            "avg_lists_per_page": 0.0,
        }

    word_counts.sort()
    avg_wc = int(sum(word_counts) / len(word_counts))
    median_wc = word_counts[len(word_counts) // 2]
    avg_fk = round(sum(fk_grades) / len(fk_grades), 1) if fk_grades else 8.0
    avg_conv = round(sum(conv_scores) / len(conv_scores), 2) if conv_scores else 0.0
    avg_headings = round(total_headings / pages_analyzed, 1) if pages_analyzed else 0.0
    avg_lists = round(total_lists / pages_analyzed, 1) if pages_analyzed else 0.0

    # Deduplicate FAQ questions
    unique_faqs = list(dict.fromkeys(all_faq_questions))

    return {
        "avg_word_count": avg_wc,
        "median_word_count": median_wc,
        "reading_level": _grade_to_label(avg_fk),
        "flesch_kincaid_grade": avg_fk,
        "pages_with_faq": pages_with_faq,
        "faq_questions": unique_faqs[:10],
        "heading_structure": {
            "pages_with_h2": pages_with_h2,
            "pages_with_h3": pages_with_h3,
            "avg_headings_per_page": avg_headings,
        },
        "conversational_tone_score": avg_conv,
        "thin_content_pages": thin_pages,
        "pages_analyzed": pages_analyzed,
        "avg_lists_per_page": avg_lists,
    }
