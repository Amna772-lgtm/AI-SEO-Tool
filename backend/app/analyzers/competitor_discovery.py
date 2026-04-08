"""Claude-powered competitor discovery. D-05, D-06 in 07-CONTEXT.md."""
from __future__ import annotations
import json
import os
import re
from typing import Any
from urllib.parse import urlparse

try:
    import anthropic  # type: ignore
except Exception:
    anthropic = None  # type: ignore

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

_SYSTEM_PROMPT = (
    "You are an expert at identifying direct competitors of websites. "
    "Given a primary website's topic and user queries, return 5-8 genuine competitor "
    "domains. Return ONLY a valid JSON array of objects with exactly two keys: "
    '"domain" (bare hostname, no https://) and "reason" (one sentence, max 20 words). '
    "No markdown, no prose, no explanation before or after the JSON."
)


def _normalize_domain(raw: str) -> str:
    """Pitfall 3: strip protocol, path, www. Return bare hostname."""
    raw = (raw or "").strip().lower()
    if not raw:
        return ""
    if "://" not in raw:
        raw = "http://" + raw
    host = urlparse(raw).hostname or ""
    if host.startswith("www."):
        host = host[4:]
    return host


def _build_prompt(
    primary_domain: str,
    site_type: str,
    key_topics: list[str],
    probe_questions: list[str],
    faq_questions: list[str],
) -> str:
    parts = [
        f"Primary website: {primary_domain}",
        f"Site type: {site_type or 'unknown'}",
        f"Key topics: {', '.join(key_topics[:8]) if key_topics else 'not determined'}",
        f"Sample user queries: {'; '.join(probe_questions[:3]) if probe_questions else 'none'}",
        f"Sample FAQ topics: {'; '.join(faq_questions[:3]) if faq_questions else 'none'}",
        "",
        "Generate 5-8 competitor domains that directly compete with this website.",
        "For each competitor, provide a one-sentence reason why they compete.",
        'Return ONLY a JSON array: [{"domain": "competitor.com", "reason": "..."}]',
    ]
    return "\n".join(parts)


def _parse_response(text: str) -> list[dict[str, str]]:
    """Extract JSON array from Claude response. Tolerate leading/trailing prose."""
    if not text:
        return []
    match = re.search(r"\[\s*\{.*?\}\s*\]", text, re.DOTALL)
    if not match:
        return []
    try:
        raw = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        domain = _normalize_domain(str(item.get("domain", "")))
        reason = str(item.get("reason", "")).strip()
        if not domain or domain in seen:
            continue
        seen.add(domain)
        out.append({"domain": domain, "reason": reason})
    return out[:8]


def discover_competitors(
    primary_domain: str,
    site_type: str,
    key_topics: list[str],
    probe_questions: list[str],
    faq_questions: list[str],
) -> list[dict[str, str]] | None:
    """Returns list of {domain, reason} dicts (5-8 items), or None on failure.
    None means: ANTHROPIC_API_KEY missing, SDK not installed, API error, or unparseable response.
    The caller should surface the fallback message: 'Couldn't find suggestions right now.'"""
    if not ANTHROPIC_API_KEY or anthropic is None:
        return None
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        resp = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _build_prompt(
                primary_domain, site_type, key_topics, probe_questions, faq_questions
            )}],
        )
        text = resp.content[0].text if resp.content else ""
        parsed = _parse_response(text)
        return parsed if parsed else None
    except Exception:
        return None
