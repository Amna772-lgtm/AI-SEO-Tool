"""
Agent 3 — Content Structure & Readability Analysis
Analyzes word count, reading level, FAQ presence, heading structure,
list usage, and conversational tone across crawled HTML pages.
Pure Python + BeautifulSoup — no external API.
"""
from __future__ import annotations

import re
from bs4 import BeautifulSoup, Tag

from app.analyzers.geo_features import _flesch_kincaid_grade

# Tags to strip before text extraction (navigation, scripts, etc.)
_STRIP_TAGS = {"script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"}

# Question-intent patterns for FAQ detection
_QUESTION_RE = re.compile(
    r"\b(how|what|why|when|where|who|which|can|does|is|are|will|should|do)\b.{5,80}\?",
    re.IGNORECASE,
)

# Second-person pronouns (conversational indicators)
_SECOND_PERSON_RE = re.compile(r"\b(you|your|you're|you'll|you've|yourself)\b", re.IGNORECASE)

# ── Factual density patterns ──────────────────────────────────────────────────
# Statistics: numbers with %, currency, large units
_STAT_RE = re.compile(
    r"\b\d+\.?\d*\s*(?:%|percent|million|billion|trillion|thousand|\$|usd|eur|gbp|mph|kg|lb|km|ms)\b",
    re.IGNORECASE,
)
# Source/citation phrases
_CITATION_RE = re.compile(
    r"\b(?:according to|per\b|cited by|study by|report by|survey by|research shows?|data shows?|found that|published in|source:)\b",
    re.IGNORECASE,
)
# Expert/authority credentials
_EXPERT_RE = re.compile(
    r"\b(?:Dr\.|Prof\.|PhD|M\.D\.|CEO|founder|director|researcher|scientist|professor|expert|author)\b",
    re.IGNORECASE,
)
# Specific year references
_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
# Quoted phrases (short quotes indicating cited statements)
_QUOTE_RE = re.compile(r'"[^"]{15,200}"')


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))



def _grade_to_label(grade: float) -> str:
    if grade <= 6:
        return "Elementary"
    if grade <= 9:
        return "Middle School"
    if grade <= 12:
        return "High School"
    return "College"


def _extract_headings(soup: BeautifulSoup) -> dict:
    """Count H1/H2/H3 headings and extract text samples."""
    h1 = [t.get_text(strip=True) for t in soup.find_all("h1")]
    h2 = [t.get_text(strip=True) for t in soup.find_all("h2")]
    h3 = [t.get_text(strip=True) for t in soup.find_all("h3")]
    return {"h1": h1, "h2": h2, "h3": h3}


def _detect_faq(text: str, soup: BeautifulSoup) -> tuple[bool, list[str], list[dict]]:
    """
    Detect FAQ-style question-answer blocks.
    Returns (has_faq, question_list, qa_pairs).
    qa_pairs: list of {"question": str, "answer": str} dicts.
    """
    questions: list[str] = []
    qa_pairs: list[dict] = []

    # Check for FAQ schema markup
    for tag in soup.find_all(attrs={"itemtype": re.compile(r"FAQPage|Question", re.I)}):
        questions.append("FAQ schema detected")

    # Check headings for question patterns and capture following answer text
    for tag in soup.find_all(["h2", "h3", "h4", "dt"]):
        text = tag.get_text(strip=True)
        if _QUESTION_RE.search(text):
            questions.append(text)
            # Extract answer from following sibling elements until next heading
            answer_parts: list[str] = []
            for sibling in tag.next_siblings:
                if not isinstance(sibling, Tag):
                    continue
                if sibling.name in ("h1", "h2", "h3", "h4", "h5", "h6", "dt"):
                    break  # reached next heading
                if sibling.name in ("p", "div", "ul", "ol", "dd", "blockquote"):
                    sibling_text = sibling.get_text(strip=True)
                    if sibling_text:
                        answer_parts.append(sibling_text)
                        if len(" ".join(answer_parts)) > 300:
                            break
            if answer_parts:
                answer = " ".join(answer_parts)[:300]
                qa_pairs.append({"question": text, "answer": answer})

    # Check bold text for question patterns
    for tag in soup.find_all(["strong", "b"]):
        text = tag.get_text(strip=True)
        if _QUESTION_RE.search(text) and len(text) < 100:
            questions.append(text)

    questions = list(dict.fromkeys(questions))  # deduplicate
    return len(questions) > 0, questions[:10], qa_pairs[:10]



def _factual_density_score(text: str) -> dict:
    """
    Count factual signals in a text block and return a 0-100 score.
    Signals: statistics, source citations, expert credentials, year refs, quotes.
    """
    words = len(re.findall(r"\b\w+\b", text))
    if words == 0:
        return {"score": 0, "per_1000_words": 0.0,
                "stats_count": 0, "citations_count": 0,
                "expert_mentions": 0, "year_references": 0, "quotes_count": 0}

    stats    = len(_STAT_RE.findall(text))
    cites    = len(_CITATION_RE.findall(text))
    experts  = len(_EXPERT_RE.findall(text))
    years    = len(_YEAR_RE.findall(text))
    quotes   = len(_QUOTE_RE.findall(text))

    total_signals = stats + cites + experts + years + quotes
    per_1000 = round(total_signals / words * 1000, 2)
    # 8+ signals per 1000 words → score 100; linear below that
    score = int(min(per_1000 / 8.0 * 100, 100))

    return {
        "score": score,
        "per_1000_words": per_1000,
        "stats_count": stats,
        "citations_count": cites,
        "expert_mentions": experts,
        "year_references": years,
        "quotes_count": quotes,
    }


def _count_lists(soup: BeautifulSoup) -> int:
    """Count <ul> and <ol> list blocks."""
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


def analyze_content(page_features: list[dict]) -> dict:
    """
    Analyze content structure and readability across a sample of HTML pages.

    Args:
        page_features: List of feature dicts from geo_features.extract_page_features()

    Returns structured content analysis dict.
    """
    word_counts: list[int] = []
    fk_grades: list[float] = []
    all_faq_questions: list[str] = []
    all_qa_pairs: list[dict] = []
    pages_with_faq = 0
    pages_with_h2 = 0
    pages_with_h3 = 0
    total_headings = 0
    total_lists = 0
    conv_scores: list[float] = []
    thin_pages = 0
    pages_analyzed = 0
    fd_scores: list[int] = []
    fd_stats_total = 0
    fd_citations_total = 0
    fd_experts_total = 0
    fd_years_total = 0
    fd_quotes_total = 0

    for feat in page_features:
        text = feat["body_text"]
        soup = feat["soup"]
        if not text:
            continue
        pages_analyzed += 1

        wc = _word_count(text)
        word_counts.append(wc)

        if wc < 300:
            thin_pages += 1

        if wc >= 50:
            fk_grades.append(_flesch_kincaid_grade(text))
            conv_scores.append(_conversational_score(text))

        headings = _extract_headings(soup)
        if headings["h2"]:
            pages_with_h2 += 1
        if headings["h3"]:
            pages_with_h3 += 1
        total_headings += len(headings["h2"]) + len(headings["h3"])

        total_lists += _count_lists(soup)

        has_faq, faq_qs, qa_pairs = _detect_faq(text, soup)
        if has_faq:
            pages_with_faq += 1
            all_faq_questions.extend(faq_qs)
            all_qa_pairs.extend(qa_pairs)

        if wc >= 50:
            fd = _factual_density_score(text)
            fd_scores.append(fd["score"])
            fd_stats_total     += fd["stats_count"]
            fd_citations_total += fd["citations_count"]
            fd_experts_total   += fd["expert_mentions"]
            fd_years_total     += fd["year_references"]
            fd_quotes_total    += fd["quotes_count"]

    _fd_empty = {"score": 0, "per_1000_words": 0.0, "stats_count": 0,
                 "citations_count": 0, "expert_mentions": 0, "year_references": 0, "quotes_count": 0}

    if not word_counts:
        return {
            "avg_word_count": 0,
            "median_word_count": 0,
            "reading_level": "Unknown",
            "flesch_kincaid_grade": 0.0,
            "pages_with_faq": 0,
            "faq_questions": [],
            "faq_pairs": [],
            "heading_structure": {"pages_with_h2": 0, "pages_with_h3": 0, "avg_headings_per_page": 0.0},
            "conversational_tone_score": 0.0,
            "thin_content_pages": 0,
            "pages_analyzed": 0,
            "avg_lists_per_page": 0.0,
            "factual_density": _fd_empty,
        }

    word_counts.sort()
    avg_wc = int(sum(word_counts) / len(word_counts))
    median_wc = word_counts[len(word_counts) // 2]
    avg_fk = round(sum(fk_grades) / len(fk_grades), 1) if fk_grades else 8.0
    avg_conv = round(sum(conv_scores) / len(conv_scores), 2) if conv_scores else 0.0
    avg_headings = round(total_headings / pages_analyzed, 1) if pages_analyzed else 0.0
    avg_lists = round(total_lists / pages_analyzed, 1) if pages_analyzed else 0.0

    # Deduplicate FAQ questions and Q&A pairs
    unique_faqs = list(dict.fromkeys(all_faq_questions))
    seen_qs: set[str] = set()
    unique_qa_pairs: list[dict] = []
    for pair in all_qa_pairs:
        if pair["question"] not in seen_qs:
            seen_qs.add(pair["question"])
            unique_qa_pairs.append(pair)

    avg_fd_score = int(round(sum(fd_scores) / len(fd_scores))) if fd_scores else 0
    total_fd_signals = fd_stats_total + fd_citations_total + fd_experts_total + fd_years_total + fd_quotes_total
    total_words_analyzed = sum(word_counts)
    avg_fd_per_1000 = round(total_fd_signals / total_words_analyzed * 1000, 2) if total_words_analyzed > 0 else 0.0

    return {
        "avg_word_count": avg_wc,
        "median_word_count": median_wc,
        "reading_level": _grade_to_label(avg_fk),
        "flesch_kincaid_grade": avg_fk,
        "pages_with_faq": pages_with_faq,
        "faq_questions": unique_faqs[:10],
        "faq_pairs": unique_qa_pairs[:10],
        "heading_structure": {
            "pages_with_h2": pages_with_h2,
            "pages_with_h3": pages_with_h3,
            "avg_headings_per_page": avg_headings,
        },
        "conversational_tone_score": avg_conv,
        "thin_content_pages": thin_pages,
        "pages_analyzed": pages_analyzed,
        "avg_lists_per_page": avg_lists,
        "factual_density": {
            "score": avg_fd_score,
            "per_1000_words": avg_fd_per_1000,
            "stats_count": fd_stats_total,
            "citations_count": fd_citations_total,
            "expert_mentions": fd_experts_total,
            "year_references": fd_years_total,
            "quotes_count": fd_quotes_total,
        },
    }
