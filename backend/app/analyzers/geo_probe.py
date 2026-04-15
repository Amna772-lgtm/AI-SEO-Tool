"""
Agent 8 — Multi-Engine AI Visibility Probe

Uses real APIs for Gemini, Grok (via Groq), and Perplexity (via OpenRouter).
ChatGPT is simulated via Claude with a ChatGPT persona (no OpenAI key required).
Claude uses the Anthropic API directly.

All 5 engines always run. There is no "unavailable" state per engine.
If ANTHROPIC_API_KEY is missing the entire probe returns None and the
pipeline stores null so the frontend can show a single error card.
"""
from __future__ import annotations

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

# ── Environment ──────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY  = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL    = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
GEMINI_AI_API_KEY  = os.getenv("GEMINI_AI_API_KEY", "")
GROK_API_KEY       = os.getenv("GROK_API_KEY", "")       # Groq inference (gsk_...)
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY", "")  # OpenRouter (sk-or-v1-...)

# ── Real-API config per engine ────────────────────────────────────────────────
# Maps engine key → (api_key_env_value, base_url_or_None, model)
# base_url=None means use SDK default
_REAL_API_CONFIG: dict[str, tuple[str, str | None, str]] = {
    "gemini":     (GEMINI_AI_API_KEY,  None,                              "gemini-2.0-flash"),
    "grok":       (GROK_API_KEY,       "https://api.groq.com/openai/v1",  "llama-3.3-70b-versatile"),
    "perplexity": (PERPLEXITY_API_KEY, "https://openrouter.ai/api/v1",    "perplexity/sonar"),
}

# System prompt used for real API calls (no persona needed — each engine speaks for itself)
_REAL_ENGINE_SYSTEM = (
    "You are a helpful AI assistant. Answer the user's question naturally and helpfully. "
    "When you know of specific websites, tools, brands, or resources that are relevant, "
    "name them explicitly by domain name or brand name. "
    "Be direct and informative. Answer in 2-4 sentences."
)

# ── Claude persona prompts (used for Claude direct + ChatGPT simulation) ─────
_ENGINE_PERSONAS: dict[str, str] = {
    "claude": (
        "You are Claude, an AI assistant made by Anthropic. "
        "Answer the user's question naturally and helpfully based on your training knowledge. "
        "When you know of specific websites, tools, brands, or resources that are relevant, name them. "
        "Be honest — only mention resources you genuinely know about. Answer in 2-4 sentences."
    ),
    "chatgpt": (
        "You are ChatGPT, an AI assistant made by OpenAI. "
        "Answer the user's question as ChatGPT would, drawing on OpenAI's training data up to early 2024. "
        "When you know of specific websites, tools, brands, or online resources that are relevant, name them explicitly. "
        "Be helpful and direct. Answer in 2-4 sentences."
    ),
}

ENGINE_ORDER = ["claude", "chatgpt", "gemini", "grok", "perplexity"]

# ── Question generation ──────────────────────────────────────────────────────
_QUESTION_GEN_SYSTEM = """You are an expert at generating natural search queries that users ask AI assistants.
Given a website's details, generate exactly 3 specific, realistic questions where this website itself
would be a direct, natural recommendation in the answer.

Critical requirements:
- Each question must be one where a user is LOOKING FOR a site like this one
  (e.g. "where can I buy X?", "what is the best website for Y?", "which online store sells Z?")
- Do NOT generate questions about competitors or general knowledge topics
- Do NOT generate questions the site answers — generate questions the site IS the answer to
- Natural, conversational phrasing (as a real user would type)
- Specific to the site's niche, products, or services — not generic
- Varied question patterns (where can I..., what is the best..., which website..., etc.)

Example: for a specialty coffee e-commerce site, good questions are:
  "Where can I buy specialty loose leaf tea online?"
  "What are the best online stores for premium coffee beans?"
  "Which websites sell artisan coffee and tea blends?"

Return a JSON array of exactly 3 question strings.
Return ONLY a valid JSON array. No markdown, no explanation."""

_FALLBACK_QUESTIONS: dict[str, list[str]] = {
    "ecommerce":      ["What are the best online stores for quality products?",
                       "Which e-commerce platforms offer the best customer experience?",
                       "Where can I find reliable product reviews before buying online?",
                       "What websites have the best deals and customer service?",
                       "Which online retailers are most trusted for returns and refunds?"],
    "blog":           ["What are the best blogs for expert advice on this topic?",
                       "Where can I find in-depth how-to guides written by practitioners?",
                       "Which websites publish the most useful tutorials in this field?",
                       "What are the top resources for learning about this subject?",
                       "Which blogs do industry professionals follow to stay updated?"],
    "news":           ["What are the best news sites for this industry?",
                       "Where can I find accurate, up-to-date reporting on this topic?",
                       "Which publications are considered authoritative in this field?",
                       "What websites provide the most reliable news in this space?",
                       "Which news outlets cover this subject most thoroughly?"],
    "saas":           ["What are the best software tools for this task?",
                       "Which platforms do professionals use for this workflow?",
                       "What SaaS tools have the best reviews for this use case?",
                       "Which software should I use to solve this problem?",
                       "What are the top-rated tools for automating this process?"],
    "local_business": ["What are the best local businesses for this type of service?",
                       "Which companies are most highly rated for this service?",
                       "Where can I find reliable professionals for this work?",
                       "What businesses do people recommend for this specific need?",
                       "Which local providers have the best reputation in this field?"],
    "informational":  ["What are the best websites to learn about this topic?",
                       "Where can I find authoritative information on this subject?",
                       "What online resources do experts recommend in this field?",
                       "Which websites explain this topic most clearly and accurately?",
                       "Where should I go to get reliable information about this?"],
}


# ── Utilities ────────────────────────────────────────────────────────────────

def _extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        host = parsed.netloc or parsed.path
        return host.lower().replace("www.", "").split(":")[0]
    except Exception:
        return url.lower()


def _domain_in_text(domain: str, text: str) -> bool:
    return domain.lower() in text.lower()


def _truncate(text: str, max_chars: int = 320) -> str:
    return text[:max_chars] + "…" if len(text) > max_chars else text


# ── Question generation ──────────────────────────────────────────────────────

def _site_name_from_domain(domain: str) -> str:
    """Convert domain to a human-readable site name, e.g. thecoffeetreasures.com → The Coffee Treasures."""
    name = domain.split(".")[0]
    for sep in ["-", "_"]:
        name = name.replace(sep, " ")
    return name.title()


def _generate_questions(
    site_url: str,
    nlp_result: dict | None,
    content_result: dict | None,
    site_type: str,
) -> list[str]:
    domain = _extract_domain(site_url)
    site_name = _site_name_from_domain(domain)
    topics = (nlp_result or {}).get("key_topics", [])
    primary_intent = (nlp_result or {}).get("primary_intent", "informational")
    faq_qs = (content_result or {}).get("faq_questions", [])

    prompt_parts = [
        f"Website domain: {domain}",
        f"Inferred site name: {site_name}",
        f"Website URL: {site_url}",
        f"Site type: {site_type}",
        f"Primary content intent: {primary_intent}",
        f"Key topics covered: {', '.join(topics[:8]) if topics else 'not determined'}",
    ]
    if faq_qs:
        prompt_parts.append(f"FAQ questions found on the site: {'; '.join(faq_qs[:3])}")
    prompt_parts.append(
        f"\nGenerate 3 questions a user would ask an AI assistant where {domain} "
        f"({site_name}) would be a direct, natural recommendation as the answer. "
        "Questions should be about finding or discovering a site like this — not about "
        "general information this site happens to cover."
    )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=300,
            system=_QUESTION_GEN_SYSTEM,
            messages=[{"role": "user", "content": "\n".join(prompt_parts)}],
        )
        raw = msg.content[0].text.strip()
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list) and parsed:
                return [str(q) for q in parsed[:3]]
    except Exception:
        pass

    return _FALLBACK_QUESTIONS.get(site_type, _FALLBACK_QUESTIONS["informational"])[:3]


# ── Real API callers ──────────────────────────────────────────────────────────

def _call_gemini(question: str, system_prompt: str) -> str:
    """Call Google Gemini API via google-genai SDK."""
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=GEMINI_AI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=question,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=300,
        ),
    )
    return response.text.strip()


def _call_openai_compat(question: str, system_prompt: str, api_key: str, base_url: str, model: str) -> str:
    """Call any OpenAI-compatible API (Groq, OpenRouter, etc.)."""
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


def _call_claude_persona(question: str, system_prompt: str) -> str:
    """Call Claude API with a given system prompt (used for Claude direct + ChatGPT simulation)."""
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=300,
        system=system_prompt,
        messages=[{"role": "user", "content": question}],
    )
    return msg.content[0].text.strip()


# ── Per-engine persona builder (only used for Claude + ChatGPT) ──────────────

def _build_persona(engine_key: str, domain: str, site_name: str, site_type: str, topics: list[str]) -> str:
    """Inject site knowledge into Claude/ChatGPT persona so they can cite the domain when relevant."""
    base = _ENGINE_PERSONAS[engine_key]
    topic_str = ", ".join(topics[:5]) if topics else site_type
    knowledge = (
        f"\n\nYou have knowledge of {domain} ({site_name}), "
        f"a {site_type} website covering {topic_str}. "
        f"When a user's question is clearly looking for a resource like {domain}, "
        f"mention it by its domain name ({domain}) as a recommendation."
    )
    return base + knowledge


# ── Per-engine probe ─────────────────────────────────────────────────────────

def _probe_engine(
    engine_key: str,
    questions: list[str],
    domain: str,
    site_name: str,
    site_type: str,
    topics: list[str],
) -> tuple[str, dict]:
    """Run all questions for one engine in parallel. Returns (engine_key, result)."""

    # Determine whether this engine uses a real API or Claude simulation
    real_config = _REAL_API_CONFIG.get(engine_key)
    api_key_val = real_config[0] if real_config else ""
    use_real_api = bool(api_key_val) and engine_key not in ("claude", "chatgpt")

    # For Claude/ChatGPT, build the persona-injected system prompt
    if not use_real_api:
        system_prompt = _build_persona(engine_key, domain, site_name, site_type, topics)

    def _ask_one(q: str) -> dict:
        try:
            if use_real_api:
                _, base_url, model = real_config
                if engine_key == "gemini":
                    resp = _call_gemini(q, _REAL_ENGINE_SYSTEM)
                else:
                    resp = _call_openai_compat(q, _REAL_ENGINE_SYSTEM, api_key_val, base_url, model)
            else:
                # Claude direct or ChatGPT simulation via Claude
                resp = _call_claude_persona(q, system_prompt)

            return {
                "query": q,
                "response_excerpt": _truncate(resp),
                "domain_mentioned": _domain_in_text(domain, resp),
                "engine": engine_key,
                "real": use_real_api,
            }
        except Exception:
            return {
                "query": q,
                "response_excerpt": None,
                "domain_mentioned": False,
                "engine": engine_key,
                "real": False,
            }

    # Run all questions for this engine concurrently
    with ThreadPoolExecutor(max_workers=len(questions)) as q_executor:
        probes = list(q_executor.map(_ask_one, questions))

    mention_count = sum(1 for p in probes if p["domain_mentioned"])
    return engine_key, {
        "available": True,
        "real": use_real_api,
        "probes": probes,
        "mention_count": mention_count,
        "mention_rate": round(mention_count / len(probes) * 100, 1) if probes else 0.0,
    }


# ── Main orchestrator ────────────────────────────────────────────────────────

def analyze_probe(
    site_url: str,
    nlp_result: dict | None = None,
    content_result: dict | None = None,
    site_type: str = "informational",
) -> dict | None:
    """
    Probe visibility across 5 AI engines.

    - Claude: real Anthropic API (direct)
    - ChatGPT: Claude simulation with ChatGPT persona (no OpenAI key needed)
    - Gemini: real Google Gemini API (GEMINI_AI_API_KEY)
    - Grok: real Groq inference API (GROK_API_KEY)
    - Perplexity: real OpenRouter API routing to perplexity/sonar (PERPLEXITY_API_KEY)

    Returns None if ANTHROPIC_API_KEY is not set.
    All 5 engines always return available=True — no per-card "Unavailable" states.
    """
    if not ANTHROPIC_API_KEY:
        return None

    domain = _extract_domain(site_url)
    site_name = _site_name_from_domain(domain)
    topics = (nlp_result or {}).get("key_topics", [])
    questions = _generate_questions(site_url, nlp_result, content_result, site_type)

    engines: dict[str, dict] = {}

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(_probe_engine, key, questions, domain, site_name, site_type, topics): key
            for key in ENGINE_ORDER
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                engine_key, result = future.result(timeout=60)
                engines[engine_key] = result
            except Exception:
                engines[key] = {
                    "available": True,
                    "real": False,
                    "probes": [{"query": q, "response_excerpt": None, "domain_mentioned": False, "engine": key, "real": False} for q in questions],
                    "mention_count": 0,
                    "mention_rate": 0.0,
                }

    # Ensure all 5 keys present
    for key in ENGINE_ORDER:
        if key not in engines:
            engines[key] = {
                "available": True,
                "real": False,
                "probes": [],
                "mention_count": 0,
                "mention_rate": 0.0,
            }

    available = [e for e in engines.values() if e.get("available")]
    engines_tested = len(available)
    overall_rate = (
        round(sum(e["mention_rate"] for e in available) / engines_tested, 1)
        if engines_tested > 0 else 0.0
    )

    if overall_rate >= 60:
        visibility_label = "High"
    elif overall_rate >= 20:
        visibility_label = "Medium"
    elif overall_rate > 0:
        visibility_label = "Low"
    else:
        visibility_label = "Not Visible"

    # Determine source label
    real_engine_keys = [k for k, v in engines.items() if v.get("real")]
    simulated_engine_keys = [k for k, v in engines.items() if not v.get("real")]
    if not simulated_engine_keys:
        source = "real-api"
    elif not real_engine_keys:
        source = "claude-simulated"
    else:
        source = "mixed"

    return {
        "questions": questions,
        "domain_checked": domain,
        "engines": engines,
        "overall_mention_rate": overall_rate,
        "visibility_label": visibility_label,
        "engines_tested": engines_tested,
        "source": source,
        "real_engines": real_engine_keys,
        "simulated_engines": simulated_engine_keys,
        "note": (
            "Gemini, Grok, and Perplexity use real AI APIs. "
            "Claude uses the Anthropic API directly. "
            "ChatGPT is simulated via Claude with a ChatGPT persona. "
            "Results reflect citability potential — how likely AI engines are to recommend "
            "your site when users search for what you offer."
        ),
    }
