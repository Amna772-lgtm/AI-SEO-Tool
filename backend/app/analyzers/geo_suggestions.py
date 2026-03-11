"""
Agent 7 — Prioritized Suggestion Engine
Generates actionable, prioritized recommendations using OpenAI API.
Falls back to rule-based suggestions if OpenAI is unavailable.
"""
from __future__ import annotations

import json
import os
import re

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

_SYSTEM_PROMPT = """You are an expert in SEO and GEO (Generative Engine Optimization).
Generate prioritized action items based on the site analysis data provided.

Return a JSON object with exactly this structure:
{
  "critical": [
    {
      "title": "Short title",
      "description": "What the issue is",
      "fix": "Specific actionable fix in 1-2 sentences",
      "impact": "High",
      "category": "schema|eeat|technical|content|nlp|speed"
    }
  ],
  "important": [...same structure...],
  "optional": [...same structure...]
}

Rules:
- "critical": Score impact > 10 pts, blocking AI citation readiness
- "important": Score impact 5-10 pts, significant improvements
- "optional": Nice-to-have enhancements
- Max 5 items per priority level
- Be specific and actionable, not generic
- Return ONLY valid JSON."""


def _build_context(
    score_data: dict,
    schema: dict | None,
    eeat: dict | None,
    content: dict | None,
    nlp: dict | None,
    audit: dict | None,
    site_type: str,
) -> str:
    """Build a concise summary of analysis results for Claude."""
    lines = [
        f"Site Type: {site_type}",
        f"Overall AI Citation Score: {score_data.get('overall_score', 0)}/100 (Grade: {score_data.get('grade', 'F')})",
        "",
        "Score Breakdown:",
    ]
    for cat, data in score_data.get("breakdown", {}).items():
        lines.append(f"  {cat}: {data['raw']}/100 (weighted {data['weighted']}/{data['weight']})")

    if schema:
        lines.extend([
            "",
            f"Schema: has_json_ld={schema.get('has_json_ld')}, coverage={schema.get('coverage_percent')}%",
            f"  Types found: {schema.get('schema_types', [])}",
            f"  Missing recommended: {schema.get('missing_recommended', [])}",
            f"  Completeness issues: {len(schema.get('completeness_issues', []))} schemas with missing fields",
        ])

    if eeat:
        lines.extend([
            "",
            f"E-E-A-T Score: {eeat.get('eeat_score')}/100",
            f"  Has about page: {eeat.get('has_about_page')}",
            f"  Has contact page: {eeat.get('has_contact_page')}",
            f"  Has privacy policy: {eeat.get('has_privacy_policy')}",
            f"  Author credentials found: {eeat.get('author_credentials_found')}",
            f"  Citations found: {eeat.get('citations_found')}",
            f"  Missing signals: {eeat.get('missing_signals', [])}",
        ])

    if content:
        lines.extend([
            "",
            f"Content: avg_words={content.get('avg_word_count')}, reading_level={content.get('reading_level')}",
            f"  FAQ pages: {content.get('pages_with_faq')}/{content.get('pages_analyzed')}",
            f"  Thin content pages (<300 words): {content.get('thin_content_pages')}",
            f"  Conversational tone score: {content.get('conversational_tone_score')}/1.0",
        ])

    if nlp:
        lines.extend([
            "",
            f"NLP: intent={nlp.get('primary_intent')}, snippet_readiness={nlp.get('ai_snippet_readiness')}",
            f"  Question density: {nlp.get('question_density')} per 100 words",
            f"  Answer blocks: {nlp.get('answer_blocks_detected')}",
        ])

    if audit:
        https = audit.get("https", {})
        sitemap = audit.get("sitemap", {})
        broken = audit.get("broken_links", {})
        canonicals = audit.get("missing_canonicals", {})
        lines.extend([
            "",
            f"Technical: https={https.get('passed')}, sitemap={sitemap.get('found')}",
            f"  Broken links: {broken.get('count', 0)}",
            f"  Missing canonicals: {canonicals.get('missing_count', 0)}/{canonicals.get('total_html_pages', 0)}",
        ])

    return "\n".join(lines)


def _rule_based_suggestions(
    schema: dict | None,
    eeat: dict | None,
    content: dict | None,
    nlp: dict | None,
    audit: dict | None,
) -> dict:
    """Generate rule-based suggestions when Claude API is unavailable."""
    critical = []
    important = []
    optional = []

    # Schema checks
    if schema:
        if not schema.get("has_json_ld"):
            critical.append({
                "title": "No JSON-LD Structured Data Found",
                "description": "Your site has no JSON-LD schema markup. AI engines rely on structured data to understand and cite your content.",
                "fix": "Add JSON-LD schema to key pages. Start with Organization and WebSite schemas on your homepage, then add page-specific schemas.",
                "impact": "High",
                "category": "schema",
            })
        missing = schema.get("missing_recommended", [])
        if missing:
            important.append({
                "title": f"Add Missing Schema Types: {', '.join(missing[:3])}",
                "description": f"Recommended schemas for your site type are missing: {', '.join(missing)}.",
                "fix": f"Implement {missing[0]} schema on relevant pages using JSON-LD format within a <script type='application/ld+json'> tag.",
                "impact": "High",
                "category": "schema",
            })

    # E-E-A-T checks
    if eeat:
        missing_signals = eeat.get("missing_signals", [])
        if not eeat.get("has_about_page"):
            critical.append({
                "title": "Missing About Page",
                "description": "AI engines and Google's quality raters look for an About page to establish trustworthiness.",
                "fix": "Create an /about page that includes your organization's history, mission, team members, and credentials.",
                "impact": "High",
                "category": "eeat",
            })
        if not eeat.get("author_credentials_found"):
            important.append({
                "title": "Add Author Bylines and Credentials",
                "description": "No author information was detected. E-E-A-T signals require demonstrating human expertise.",
                "fix": "Add author bylines to all content pages with a link to an author bio page. Include credentials and expertise.",
                "impact": "High",
                "category": "eeat",
            })
        if not eeat.get("has_privacy_policy"):
            important.append({
                "title": "Missing Privacy Policy",
                "description": "A privacy policy page is a basic trust signal required by Google and AI citation engines.",
                "fix": "Create a /privacy-policy page. Use a privacy policy generator if needed and link it in your footer.",
                "impact": "Medium",
                "category": "eeat",
            })

    # Content checks
    if content:
        if content.get("pages_with_faq", 0) == 0:
            important.append({
                "title": "Add FAQ Sections to Key Pages",
                "description": "FAQ content is a primary source for AI-generated answers. No FAQ sections were detected.",
                "fix": "Add an FAQ section to your top 5 pages using question-format H2/H3 headings followed by direct answers. Add FAQPage JSON-LD schema.",
                "impact": "High",
                "category": "content",
            })
        if content.get("thin_content_pages", 0) > 0:
            optional.append({
                "title": f"Improve {content.get('thin_content_pages')} Thin Content Pages",
                "description": "Pages with under 300 words are unlikely to be cited by AI engines.",
                "fix": "Expand thin content pages to at least 500 words. Add contextual detail, examples, and relevant FAQs.",
                "impact": "Medium",
                "category": "content",
            })
        if content.get("conversational_tone_score", 0) < 0.3:
            optional.append({
                "title": "Improve Conversational Tone",
                "description": "Content lacks conversational language. AI citation engines favor content that directly addresses user questions.",
                "fix": "Rewrite key paragraphs to use second-person language ('you', 'your'). Structure content as direct answers to questions.",
                "impact": "Medium",
                "category": "content",
            })

    # Technical checks
    if audit:
        if not audit.get("https", {}).get("passed"):
            critical.append({
                "title": "Site Not Served Over HTTPS",
                "description": "Your site is not using HTTPS. This is a critical trust and ranking signal.",
                "fix": "Install an SSL certificate and redirect all HTTP traffic to HTTPS. Most hosting providers offer free SSL via Let's Encrypt.",
                "impact": "High",
                "category": "technical",
            })
        bl = audit.get("broken_links", {}).get("count", 0)
        if bl > 0:
            (critical if bl > 5 else important).append({
                "title": f"Fix {bl} Broken Links",
                "description": f"{bl} broken links (4xx/5xx) were found. These damage trust and crawlability.",
                "fix": "Use the Crawl tab to identify broken links. Either fix the destination URLs or implement 301 redirects to correct pages.",
                "impact": "High" if bl > 5 else "Medium",
                "category": "technical",
            })

    return {"critical": critical[:5], "important": important[:5], "optional": optional[:5]}


def generate_suggestions(
    score_data: dict,
    schema: dict | None,
    eeat: dict | None,
    content: dict | None,
    nlp: dict | None,
    audit: dict | None,
    site_type: str = "informational",
) -> dict:
    """
    Generate prioritized SEO/GEO suggestions.

    Returns:
        {"critical": [...], "important": [...], "optional": [...]}
    """
    if not OPENAI_API_KEY:
        return _rule_based_suggestions(schema, eeat, content, nlp, audit)

    try:
        from openai import OpenAI

        context = _build_context(score_data, schema, eeat, content, nlp, audit, site_type)

        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate prioritized suggestions for this website analysis:\n\n{context}"},
            ],
        )

        response_text = response.choices[0].message.content.strip()
        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group(0))
        else:
            result = json.loads(response_text)

        # Ensure all three priority levels exist
        result.setdefault("critical", [])
        result.setdefault("important", [])
        result.setdefault("optional", [])

        # Cap to 5 per level
        result["critical"] = result["critical"][:5]
        result["important"] = result["important"][:5]
        result["optional"] = result["optional"][:5]

        result["source"] = "openai"
        return result

    except Exception as e:
        result = _rule_based_suggestions(schema, eeat, content, nlp, audit)
        result["error"] = str(e)
        result["source"] = "fallback"
        return result
