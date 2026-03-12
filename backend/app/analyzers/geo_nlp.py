"""
Agent 4 — NLP & Semantic Analysis
Uses Claude API to assess content intent, question density,
semantic coverage, and AI snippet readiness.
"""
from __future__ import annotations

import json
import os
import re
from bs4 import BeautifulSoup

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "")

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

    Args:
        pages_html: List of (url, html_content) tuples — up to 5 key pages
        site_url: Root URL of the site

    Returns structured NLP analysis dict.
    """
    if not ANTHROPIC_API_KEY:
        return _fallback_analysis(pages_html, site_url)

    try:
        import anthropic

        # Build content string from up to 5 pages, ~600 words each
        content_parts = []
        for page_url, html in pages_html[:5]:
            text = _extract_text(html, max_words=600)
            if text:
                content_parts.append(f"--- {page_url} ---\n{text}")

        if not content_parts:
            return _fallback_analysis(pages_html, site_url)

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
        return result

    except Exception as e:
        result = _fallback_analysis(pages_html, site_url)
        result["error"] = str(e)
        return result
