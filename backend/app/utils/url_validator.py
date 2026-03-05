"""
URL validation and normalization for the AI SEO crawler.
- Valid scheme (http/https), format, and netloc.
- Blocks private/localhost for security.
- Single place for max length and normalization rules.
"""
from urllib.parse import urlparse, urlunparse
import ipaddress
import re

# RFC 3986-ish; max length used by common browsers
MAX_URL_LENGTH = 2048

# Private/localhost netlocs to block (no crawling internal infra)
BLOCKED_NETLOC_PATTERNS = (
    re.compile(r"^localhost(\b|$)", re.I),
    re.compile(r"^127\.", re.I),
    re.compile(r"^0\.0\.0\.0(\b|$)", re.I),
    re.compile(r"^\[::1\](\b|$)", re.I),
    re.compile(r"^\[::\](\b|$)", re.I),
)


class URLValidationError(ValueError):
    """Raised when URL fails validation."""
    pass


def _is_private_or_local_host(netloc: str) -> bool:
    """Return True if netloc is localhost or a private IP."""
    for pat in BLOCKED_NETLOC_PATTERNS:
        if pat.match(netloc):
            return True
    # Strip port for IP check
    host = netloc.split(":")[0]
    try:
        addr = ipaddress.ip_address(host)
        return addr.is_private or addr.is_loopback or addr.is_reserved
    except ValueError:
        pass
    return False


def normalize_url(url: str) -> str:
    """
    Normalize URL for consistent storage and crawling.
    - Ensures scheme (default https).
    - Strips trailing slash from path (root stays /).
    - Lowercases scheme and host; leaves path/query/fragment case as-is per RFC.
    """
    if not url or not isinstance(url, str):
        raise URLValidationError("URL must be a non-empty string")
    s = url.strip()
    if not s:
        raise URLValidationError("URL must be a non-empty string")
    if len(s) > MAX_URL_LENGTH:
        raise URLValidationError(f"URL must be at most {MAX_URL_LENGTH} characters")
    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    parsed = urlparse(s)
    if not parsed.netloc:
        raise URLValidationError("URL must have a valid host")
    # Normalize: lowercase scheme and netloc
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    if scheme not in ("http", "https"):
        raise URLValidationError("URL scheme must be http or https")
    path = parsed.path.rstrip("/") or "/"
    # Rebuild without fragment for crawl target (optional: keep query)
    normalized = urlunparse((scheme, netloc, path, parsed.params, parsed.query, ""))
    return normalized


def validate_and_normalize_url(url: str) -> str:
    """
    Validate URL and return normalized form.
    Raises URLValidationError if invalid.
    """
    normalized = normalize_url(url)
    parsed = urlparse(normalized)
    if _is_private_or_local_host(parsed.netloc):
        raise URLValidationError("Private and localhost URLs are not allowed")
    return normalized
