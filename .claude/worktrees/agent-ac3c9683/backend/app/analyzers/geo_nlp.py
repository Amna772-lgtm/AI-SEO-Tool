"""
Agent 4 — NLP & Semantic Analysis
Uses Claude API to assess content intent, question density,
semantic coverage, and AI snippet readiness.
"""
from __future__ import annotations

import json
import os
import re
from bs4 import BeautifulSoup, Tag

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "")

# ── Answer quality heuristics ────────────────────────────────────────────────

# Question-like headings
_Q_HEADING_RE = re.compile(
    r"\?$|\b(how|what|why|when|where|who|which|can|does|is|are|will|should|do)\b",
    re.IGNORECASE,
)

# Hedging language — reduces confidence of declarative statements
_HEDGE_RE = re.compile(
    r"\b(might|could|possibly|perhaps|maybe|may be|it'?s possible|in some cases|"
    r"sometimes|generally|often|typically|usually|tend to|appears to|seems to)\b",
    re.IGNORECASE,
)

# Context-referencing pronoun at sentence start (reduces self-containment)
_PRONOUN_START_RE = re.compile(r"^(this|that|it|they|these|those|he|she|we)\b", re.IGNORECASE)


def _analyze_answer_quality(pages_html: list[tuple[str, str]]) -> dict:
    """
    Heuristic evaluation of direct answer block quality across pages.
    Measures four signals AI models use when choosing citation snippets:
      - BLUF: answer starts immediately in the first sentence (≤30 words)
      - Optimal length: answer block is 40-120 words
      - Self-contained: doesn't open with a context-referencing pronoun
      - Confident language: low hedge-word density (<2 per 100 words)
    Returns a 0-100 quality score and per-signal ratios.
    """
    bluf_count = 0
    optimal_count = 0
    self_contained_count = 0
    confident_count = 0
    answer_lengths: list[int] = []

    for _url, html in pages_html[:5]:
        if not html:
            continue
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")

        for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()

        for heading in soup.find_all(["h2", "h3", "h4"]):
            if not _Q_HEADING_RE.search(heading.get_text(strip=True)):
                continue

            # Collect first substantial paragraph following this heading
            for sibling in heading.next_siblings:
                if not isinstance(sibling, Tag):
                    continue
                if sibling.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                    break  # hit next section
                if sibling.name not in ("p", "div", "ul", "ol", "li"):
                    continue

                answer_text = sibling.get_text(separator=" ", strip=True)
                words = answer_text.split()
                if len(words) < 8:
                    continue  # too short to be an answer

                word_count = len(words)
                answer_lengths.append(word_count)

                # BLUF: first sentence ≤ 30 words and doesn't start with a filler phrase
                sentences = re.split(r"(?<=[.!?])\s+", answer_text)
                first_words = sentences[0].split() if sentences else []
                if 5 <= len(first_words) <= 30:
                    bluf_count += 1

                # Optimal length: 40-120 words
                if 40 <= word_count <= 120:
                    optimal_count += 1

                # Self-contained: doesn't open with a context pronoun
                if not _PRONOUN_START_RE.match(answer_text.strip()):
                    self_contained_count += 1

                # Confident: hedge density < 2 per 100 words
                hedge_density = len(_HEDGE_RE.findall(answer_text)) / word_count * 100
                if hedge_density < 2.0:
                    confident_count += 1

                break  # one answer per question heading

    total = len(answer_lengths)
    if total == 0:
        return {
            "score": 20,
            "bluf_ratio": 0.0,
            "avg_answer_length": 0,
            "self_contained_ratio": 0.0,
            "confident_ratio": 0.0,
            "quality_label": "Poor",
        }

    bluf_ratio          = round(bluf_count / total, 2)
    optimal_ratio       = round(optimal_count / total, 2)
    self_contained_ratio = round(self_contained_count / total, 2)
    confident_ratio     = round(confident_count / total, 2)
    avg_length          = int(sum(answer_lengths) / total)

    score = int(round(
        bluf_ratio          * 30 +
        optimal_ratio       * 25 +
        self_contained_ratio * 25 +
        confident_ratio     * 20
    ))

    if score >= 70:
        quality_label = "Excellent"
    elif score >= 50:
        quality_label = "Good"
    elif score >= 30:
        quality_label = "Fair"
    else:
        quality_label = "Poor"

    return {
        "score": score,
        "bluf_ratio": bluf_ratio,
        "avg_answer_length": avg_length,
        "self_contained_ratio": self_contained_ratio,
        "confident_ratio": confident_ratio,
        "quality_label": quality_label,
    }


_SYSTEM_PROMPT = """You are an expert in SEO content analysis and Generative Engine Optimization (GEO).
Analyze the provided website content and return a JSON object with exactly this structure:
{
  "primary_intent": "informational|commercial|transactional|navigational",
  "secondary_intents": ["..."],
  "question_density": <float 0-5, questions per 100 words>,
  "answer_blocks_detected": <int, paragraphs that directly answer a question>,
  "key_topics": ["topic1", "topic2", ...up to 8],
  "entity_types": ["Person", "Organization", "Product", ...],
  "ai_snippet_readiness": "High|Medium|Low",
  "synonym_richness": "High|Medium|Low",
  "query_patterns": {
    "how_to": <bool, content answers how-to questions>,
    "what_is": <bool, content defines or explains concepts>,
    "why": <bool, content explains reasons or causes>,
    "best": <bool, content recommends or ranks options>,
    "comparison": <bool, content compares alternatives>
  },
  "reasoning": "<2-3 sentence explanation>"
}
For synonym_richness: High = diverse vocabulary with many synonyms and related terms, Medium = some variety, Low = repetitive or narrow vocabulary.
Return ONLY valid JSON. No markdown, no explanation outside JSON."""

_USER_TEMPLATE = """Website URL: {url}

Content from key pages (truncated to 3000 words):
{content}

Analyze this content for AI snippet readiness and semantic coverage."""


def _extract_text(html: str, max_words: int = 600) -> str:
    """Extract clean text from HTML, limited to max_words."""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    words = text.split()
    return " ".join(words[:max_words])


def _fallback_analysis(pages_html: list[tuple[str, str]], url: str) -> dict:
    """Rule-based fallback when Claude API is unavailable."""
    combined_text = " ".join(_extract_text(html) for _, html in pages_html[:3])
    words = re.findall(r"\b\w+\b", combined_text)
    questions = re.findall(r"\b(how|what|why|when|where|who|which)\b.{5,80}\?", combined_text, re.I)
    q_density = round((len(questions) / max(len(words), 1)) * 100, 2)

    has_how_to = bool(re.search(r"\bhow\s+to\b", combined_text, re.I))
    has_what_is = bool(re.search(r"\bwhat\s+is\b|\bwhat\s+are\b", combined_text, re.I))
    has_why = bool(re.search(r"\bwhy\b.{3,60}\?", combined_text, re.I))
    has_best = bool(re.search(r"\b(best|top\s+\d|recommended)\b", combined_text, re.I))
    has_comparison = bool(re.search(r"\b(vs\.?|versus|compared\s+to|comparison)\b", combined_text, re.I))

    # Rough synonym richness via unique-word ratio
    unique_ratio = len(set(w.lower() for w in words)) / max(len(words), 1)
    synonym_richness = "High" if unique_ratio > 0.6 else "Medium" if unique_ratio > 0.4 else "Low"

    return {
        "primary_intent": "informational",
        "secondary_intents": [],
        "question_density": q_density,
        "answer_blocks_detected": len(questions),
        "key_topics": [],
        "entity_types": [],
        "ai_snippet_readiness": "Medium" if q_density > 0.5 else "Low",
        "synonym_richness": synonym_richness,
        "query_patterns": {
            "how_to": has_how_to,
            "what_is": has_what_is,
            "why": has_why,
            "best": has_best,
            "comparison": has_comparison,
        },
        "reasoning": "Analysis performed using rule-based fallback (Claude API unavailable).",
        "source": "fallback",
    }


def analyze_nlp(pages_html: list[tuple[str, str]], site_url: str) -> dict:
    """
    Analyze content using Claude API for NLP and semantic assessment.
    Answer quality is always computed heuristically and merged into the result.

    Args:
        pages_html: List of (url, html_content) tuples — up to 5 key pages
        site_url: Root URL of the site

    Returns structured NLP analysis dict.
    """
    # Answer quality runs always — it's heuristic, fast, and independent of Claude
    answer_quality = _analyze_answer_quality(pages_html)

    if not ANTHROPIC_API_KEY:
        result = _fallback_analysis(pages_html, site_url)
        result["answer_quality"] = answer_quality
        return result

    try:
        import anthropic

        # Build content string from up to 5 pages, ~600 words each
        content_parts = []
        for page_url, html in pages_html[:5]:
            text = _extract_text(html, max_words=600)
            if text:
                content_parts.append(f"--- {page_url} ---\n{text}")

        if not content_parts:
            result = _fallback_analysis(pages_html, site_url)
            result["answer_quality"] = answer_quality
            return result

        combined = "\n\n".join(content_parts)
        # Trim to ~3000 words total
        words = combined.split()
        combined = " ".join(words[:3000])

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": _USER_TEMPLATE.format(url=site_url, content=combined)},
            ],
        )

        response_text = message.content[0].text.strip()

        # Extract JSON even if wrapped in markdown code blocks
        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group(0))
        else:
            result = json.loads(response_text)

        result["source"] = "claude"
        result["answer_quality"] = answer_quality
        return result

    except Exception as e:
        result = _fallback_analysis(pages_html, site_url)
        result["answer_quality"] = answer_quality
        result["error"] = str(e)
        return result
