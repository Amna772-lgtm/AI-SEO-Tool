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


def check_robots(origin_url: str) -> dict:
    """
    Fetch and parse robots.txt for the given URL's origin; check crawl permission
    for our bot and for known AI crawlers.

    Returns:
        {
            "crawl_allowed": bool,   # for CRAWLER_USER_AGENT on path "/"
            "ai_crawler_access": { "GPTBot": bool, "ChatGPT-User": bool, ... },
            "robots_fetched": bool   # True if we got a 200 body
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

    return result
