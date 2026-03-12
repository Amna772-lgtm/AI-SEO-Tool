"""
Robots.txt fetch, parse, and crawl-allowed checks.
Uses standard library RobotFileParser semantics; fetch via httpx for consistent timeout/UA.
"""
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
import httpx
from io import StringIO

# Our crawler's user-agent (must match crawler.py)
CRAWLER_USER_AGENT = "AI-SEO-Bot/1.0"

# AI crawlers to report access for (robots.txt check only)
AI_CRAWLER_AGENTS = [
    "GPTBot",           # OpenAI
    "ChatGPT-User",     # OpenAI (browser)
    "Google-Extended",   # Google Bard/AI
    "PerplexityBot",    # Perplexity
    "Anthropic-AI",     # Claude
    "Claude-Web",       # Claude (browser)
]

ROBOTS_TIMEOUT = 8.0


def _robots_url(parsed) -> str:
    return f"{parsed.scheme}://{parsed.netloc}/robots.txt"


def _fetch_robots_txt(origin_url: str) -> str | None:
    """
    Fetch robots.txt for the origin of origin_url.
    Returns body as string, or None on 404/timeout/error (convention: allow all).
    """
    parsed = urlparse(origin_url)
    url = _robots_url(parsed)
    try:
        with httpx.Client(
            timeout=ROBOTS_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": CRAWLER_USER_AGENT},
        ) as client:
            r = client.get(url)
            if r.status_code == 200:
                return r.text
            return None
    except Exception:
        return None


def _parse_robots(robots_body: str) -> RobotFileParser:
    """Parse robots.txt content into a RobotFileParser."""
    rp = RobotFileParser()
    rp.parse(StringIO(robots_body).readlines())
    return rp


def _extract_disallowed_paths(body: str, user_agent: str) -> list[str]:
    """
    Extract Disallow: paths that apply to a specific user-agent from robots.txt body.
    If agent-specific rules exist, returns those; otherwise returns wildcard (*) rules.
    """
    agent_paths: list[str] = []
    wildcard_paths: list[str] = []
    has_agent_section = False

    current_is_agent = False
    current_is_wildcard = False

    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip().lower()
        val = val.strip()
        if key == "user-agent":
            current_is_agent = val.lower() == user_agent.lower()
            current_is_wildcard = val == "*"
            if current_is_agent:
                has_agent_section = True
        elif key == "disallow" and val:
            if current_is_agent:
                agent_paths.append(val)
            elif current_is_wildcard:
                wildcard_paths.append(val)

    result = agent_paths if has_agent_section else wildcard_paths
    return result[:20]  # cap at 20 paths


def check_robots(origin_url: str) -> dict:
    """
    Fetch and parse robots.txt for the given URL's origin; check crawl permission
    for our bot and for known AI crawlers.

    Returns:
        {
            "crawl_allowed": bool,   # for CRAWLER_USER_AGENT on path "/"
            "ai_crawler_access": { "GPTBot": bool, "ChatGPT-User": bool, ... },
            "robots_fetched": bool,  # True if we got a 200 body
            "disallowed_paths": list[str]  # paths blocked for our crawler
        }
    """
    parsed = urlparse(origin_url)
    path = parsed.path.rstrip("/") or "/"
    if not path.startswith("/"):
        path = "/" + path

    body = _fetch_robots_txt(origin_url)
    result = {
        "crawl_allowed": True,
        "ai_crawler_access": {},
        "robots_fetched": body is not None,
        "disallowed_paths": [],
    }

    if body is None:
        # No robots.txt or unreachable → allow by convention
        for agent in AI_CRAWLER_AGENTS:
            result["ai_crawler_access"][agent] = True
        return result

    rp = _parse_robots(body)
    result["crawl_allowed"] = rp.can_fetch(CRAWLER_USER_AGENT, path)
    for agent in AI_CRAWLER_AGENTS:
        result["ai_crawler_access"][agent] = rp.can_fetch(agent, path)
    result["disallowed_paths"] = _extract_disallowed_paths(body, CRAWLER_USER_AGENT)

    return result
