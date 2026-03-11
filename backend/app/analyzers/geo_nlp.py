"""
Agent 4 — NLP & Semantic Analysis
Uses OpenAI API to assess content intent, question density,
semantic coverage, and AI snippet readiness.
"""
from __future__ import annotations

import json
import os
import re
from bs4 import BeautifulSoup

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

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
  "reasoning": "<2-3 sentence explanation>"
}
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
    """Rule-based fallback when OpenAI API is unavailable."""
    combined_text = " ".join(_extract_text(html) for _, html in pages_html[:3])
    words = re.findall(r"\b\w+\b", combined_text)
    questions = re.findall(r"\b(how|what|why|when|where|who|which)\b.{5,80}\?", combined_text, re.I)
    q_density = round((len(questions) / max(len(words), 1)) * 100, 2)
    return {
        "primary_intent": "informational",
        "secondary_intents": [],
        "question_density": q_density,
        "answer_blocks_detected": len(questions),
        "key_topics": [],
        "entity_types": [],
        "ai_snippet_readiness": "Medium" if q_density > 0.5 else "Low",
        "reasoning": "Analysis performed using rule-based fallback (OpenAI API unavailable).",
        "source": "fallback",
    }


def analyze_nlp(pages_html: list[tuple[str, str]], site_url: str) -> dict:
    """
    Analyze content using OpenAI API for NLP and semantic assessment.

    Args:
        pages_html: List of (url, html_content) tuples — up to 5 key pages
        site_url: Root URL of the site

    Returns structured NLP analysis dict.
    """
    if not OPENAI_API_KEY:
        return _fallback_analysis(pages_html, site_url)

    try:
        from openai import OpenAI

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

        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": _USER_TEMPLATE.format(url=site_url, content=combined)},
            ],
        )

        response_text = response.choices[0].message.content.strip()

        # Extract JSON even if wrapped in markdown code blocks
        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group(0))
        else:
            result = json.loads(response_text)

        result["source"] = "openai"
        return result

    except Exception as e:
        result = _fallback_analysis(pages_html, site_url)
        result["error"] = str(e)
        return result
