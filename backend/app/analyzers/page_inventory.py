"""
Hierarchical URL Inventory Engine.

Phase 1: build_inventory()      — fast sitemap parse, builds a full URL list with metadata
Phase 2: hierarchical_select()  — selection strategy depends on sitemap structure:

  Sitemap index (multiple sub-sitemaps detected):
    • Homepage always included (synthesised from origin if absent)
    • Critical pages (about, contact) always included from any sub-sitemap
    • Exactly ONE representative URL selected per sub-sitemap via deterministic scoring
    • Results ordered hierarchically: shallower URLs first, parent before child
    • No link-following; relies strictly on sitemap/sub-sitemap structure
    • Balanced coverage — no sub-sitemap is skipped or over-represented

  Flat sitemap (single sitemap file):
    Level 0 — homepage (always included)
    Level 1 — ALL root pages at depth 1; critical pages (about, contact) guaranteed first
    Level 2 — one best-scored child per root
    Level 3 — one best-scored grandchild per level-2 page

Scoring uses sitemap priority, freshness, path depth, and meaningful keywords.
Tie-breaking is deterministic: score desc → URL length asc → alphabetical → sitemap order.

Strategy selected by tasks.py:
    has_sitemap=True   → hierarchical_select  (no link following)
    has_sitemap=False  → shallow BFS from homepage, depth-1 pages only
"""
from __future__ import annotations

import gzip
import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from statistics import stdev
from urllib.parse import urlparse, urljoin

import httpx

from app.analyzers.crawler import USER_AGENT, _normalize_for_dedupe

# ── Constants ────────────────────────────────────────────────────────────────

_ROBOTS_TIMEOUT = 6.0
_SITEMAP_TIMEOUT = 10.0
_MAX_SUB_SITEMAPS = 50        # parallel sub-sitemap fetch cap
_FETCH_WORKERS = 8
_MAX_CANDIDATES = 4           # robots.txt sitemaps + common fallback paths

_KEYWORD_PATHS = frozenset({
    "about", "team", "contact", "product", "service",
    "faq", "pricing", "blog", "doc", "docs", "guide",
    "feature", "solution", "case-study", "resource", "help", "support",
})

_LOW_VALUE_SECTIONS = frozenset({
    "page", "feed", "rss", "wp-content",
    "wp-includes", "search", "cart", "checkout", "account",
    "login", "register", "sitemap",
})

# Any URL whose path contains one of these segments is excluded from hierarchical selection.
# This matches _LOW_VALUE_SECTIONS but is applied at the URL level (any path segment, not just
# the first), and also rejects URLs that carry query parameters.
_LOW_VALUE_URL_SEGMENTS = _LOW_VALUE_SECTIONS


# ── Data Classes ─────────────────────────────────────────────────────────────

@dataclass
class PageRecord:
    url: str
    priority: float = 0.5
    lastmod: str | None = None   # validated ISO date string, None if invalid
    depth: int = 1               # path segment count
    section: str = ""            # first meaningful path segment
    score: float = 0.0           # computed by hierarchical_select()
    sitemap_name: str = ""       # sub-sitemap label, e.g. "post", "page", "category"


@dataclass
class InventoryResult:
    total: int = 0
    records: list[PageRecord] = field(default_factory=list)
    sections: dict[str, int] = field(default_factory=dict)   # section → count
    has_sitemap: bool = False
    has_sitemap_index: bool = False  # True when sitemap index with sub-sitemaps was found
    priority_useful: bool = False
    lastmod_useful: bool = False
    strategy: str = "bfs"        # "hierarchical" | "bfs"
    sample_size: int = 0         # set after hierarchical_select() is called


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_lastmod(raw: str | None) -> str | None:
    """Return ISO date (YYYY-MM-DD) if valid and in a sensible range, else None."""
    if not raw:
        return None
    try:
        date_part = raw.strip().split("T")[0]
        dt = datetime.fromisoformat(date_part)
        if dt.year < 2000 or dt > datetime.now():
            return None
        return date_part
    except Exception:
        return None


def _extract_section(path: str) -> str:
    """First non-numeric, non-hash path segment — the 'section' of a URL."""
    for seg in path.strip("/").split("/"):
        if seg and not seg.isdigit() and not re.match(r'^[a-f0-9]{8,}$', seg):
            return seg.lower()
    return ""


def _path_depth(path: str) -> int:
    return len([s for s in path.strip("/").split("/") if s])


def _decompress_response(response: httpx.Response) -> str:
    """Return decoded text, decompressing gzip-stored sitemaps if needed."""
    content = response.content
    if content[:2] == b'\x1f\x8b':          # gzip magic bytes
        try:
            content = gzip.decompress(content)
        except Exception:
            pass
    return content.decode("utf-8", errors="replace")


def _parse_sitemap_xml(
    xml_text: str,
    sitemap_url: str,
    base_netloc: str,
    alt_netloc: str,
    max_urls: int,
) -> tuple[list[PageRecord], list[str]]:
    """
    Parse sitemap XML into PageRecords and sub-sitemap URLs.
    Handles: relative URLs, <priority>, <lastmod>, sitemap index files.
    """
    # Guard: reject HTML error pages served with 200 status
    stripped = xml_text.lstrip()
    if stripped.lower().startswith(("<!doctype", "<html")):
        return [], []

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return [], []

    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"

    page_records: list[PageRecord] = []
    sitemap_locs: list[str] = []

    for elem in root.findall(f"{ns}url"):
        if len(page_records) >= max_urls:
            break
        loc_elem = elem.find(f"{ns}loc")
        if loc_elem is None or not (loc_elem.text or "").strip():
            continue

        loc_text = loc_elem.text.strip()
        # Resolve relative URLs (some hand-crafted sitemaps use /path/to/page)
        if not loc_text.startswith(("http://", "https://")):
            loc_text = urljoin(sitemap_url, loc_text)

        norm = _normalize_for_dedupe(loc_text)
        if not norm:
            continue
        nloc = urlparse(norm).netloc.lower()
        if nloc not in (base_netloc, alt_netloc):
            continue

        # <priority>
        priority = 0.5
        prio_elem = elem.find(f"{ns}priority")
        if prio_elem is not None and prio_elem.text:
            try:
                priority = max(0.0, min(1.0, float(prio_elem.text.strip())))
            except (ValueError, TypeError):
                pass

        # <lastmod>
        lastmod = None
        lm_elem = elem.find(f"{ns}lastmod")
        if lm_elem is not None:
            lastmod = _validate_lastmod(lm_elem.text)

        path = urlparse(norm).path or "/"
        page_records.append(PageRecord(
            url=norm,
            priority=priority,
            lastmod=lastmod,
            depth=_path_depth(path),
            section=_extract_section(path),
        ))

    for elem in root.findall(f"{ns}sitemap"):
        loc_elem = elem.find(f"{ns}loc")
        if loc_elem is not None and (loc_elem.text or "").strip():
            loc_text = loc_elem.text.strip()
            if not loc_text.startswith(("http://", "https://")):
                loc_text = urljoin(sitemap_url, loc_text)
            sitemap_locs.append(loc_text)

    return page_records, sitemap_locs


def _sitemap_type_name(sitemap_url: str) -> str:
    """
    Extract a short content-type label from a sub-sitemap URL filename.

    Examples:
        post-sitemap.xml      → "post"
        page-sitemap.xml      → "page"
        category-sitemap.xml  → "category"
        soliloquy-sitemap.xml → "soliloquy"
        sitemap-products.xml  → "products"
        news.xml              → "news"
    """
    filename = sitemap_url.rstrip("/").rsplit("/", 1)[-1].split("?")[0]
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    # Strip common sitemap affixes (with optional dash/underscore separator)
    name = re.sub(r'(?:[-_]sitemap|sitemap[-_])', '', name, flags=re.IGNORECASE)
    name = name.strip("-_")
    return name.lower() if name else "default"


def _fetch_sub_sitemap(
    args: tuple,
) -> list[PageRecord]:
    """
    Worker: fetch one sub-sitemap, stamp every record with its sitemap_name, and return them.
    args = (sub_url, base_netloc, alt_netloc, max_urls, client, sitemap_name)
    """
    sub_url, base_netloc, alt_netloc, max_urls, client, sitemap_name = args
    try:
        resp = client.get(sub_url)
        if resp.status_code >= 400:
            return []
        xml_text = _decompress_response(resp)
        records, _ = _parse_sitemap_xml(xml_text, sub_url, base_netloc, alt_netloc, max_urls)
        for rec in records:
            rec.sitemap_name = sitemap_name
        return records
    except Exception:
        return []


# ── Phase 1: Inventory ────────────────────────────────────────────────────────

def build_inventory(base_url: str, max_urls: int = 10000) -> InventoryResult:
    """
    Build a URL inventory from the site's sitemap(s). Fast (~2-5s typical).
    Does NOT fetch page content — only reads sitemap XML.

    Sets has_sitemap_index=True when a sitemap index file is found (multiple sub-sitemaps).
    Each PageRecord is stamped with sitemap_name so hierarchical_select() can group by type.
    Returns strategy="bfs" when no sitemap is found.
    """
    result = InventoryResult()

    parsed_base = urlparse(base_url)
    origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
    base_netloc = parsed_base.netloc.lower()
    alt_netloc = ("www." + base_netloc) if not base_netloc.startswith("www.") else base_netloc[4:]

    # --- Discover sitemap candidates from robots.txt ---
    candidates: list[str] = []
    try:
        with httpx.Client(timeout=_ROBOTS_TIMEOUT, follow_redirects=True,
                          headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(f"{origin}/robots.txt")
            if resp.status_code == 200:
                for line in resp.text.splitlines():
                    if line.lower().startswith("sitemap:"):
                        ref = line.split(":", 1)[1].strip()
                        if ref:
                            candidates.append(ref)
    except Exception:
        pass

    candidates += [f"{origin}/sitemap_index.xml", f"{origin}/sitemap.xml"]
    candidates = candidates[:_MAX_CANDIDATES]

    # --- Fetch and parse sitemaps ---
    all_records: list[PageRecord] = []
    seen_urls: set[str] = set()
    sitemap_found = False

    try:
        with httpx.Client(timeout=_SITEMAP_TIMEOUT, follow_redirects=True,
                          headers={"User-Agent": USER_AGENT}) as client:
            for candidate in candidates:
                if len(all_records) >= max_urls:
                    break
                try:
                    resp = client.get(candidate)
                    if resp.status_code >= 400:
                        continue

                    xml_text = _decompress_response(resp)
                    records, sub_urls = _parse_sitemap_xml(
                        xml_text, candidate, base_netloc, alt_netloc,
                        max_urls - len(all_records),
                    )

                    if not records and not sub_urls:
                        continue  # not a valid sitemap, try next candidate

                    sitemap_found = True

                    # Flat sitemap records — tag with the sitemap filename as their name
                    flat_name = _sitemap_type_name(candidate)
                    for rec in records:
                        rec.sitemap_name = flat_name
                        if rec.url not in seen_urls:
                            seen_urls.add(rec.url)
                            all_records.append(rec)

                    # Sitemap index: fetch all sub-sitemaps in parallel, tag each by type
                    if sub_urls:
                        result.has_sitemap_index = True
                        to_fetch = sub_urls[:_MAX_SUB_SITEMAPS]
                        with ThreadPoolExecutor(max_workers=_FETCH_WORKERS) as executor:
                            futures = [
                                executor.submit(
                                    _fetch_sub_sitemap,
                                    (su, base_netloc, alt_netloc,
                                     max_urls - len(all_records), client,
                                     _sitemap_type_name(su)),
                                )
                                for su in to_fetch
                            ]
                            for future in as_completed(futures):
                                if len(all_records) >= max_urls:
                                    break
                                try:
                                    for rec in future.result():
                                        if rec.url not in seen_urls and len(all_records) < max_urls:
                                            seen_urls.add(rec.url)
                                            all_records.append(rec)
                                except Exception:
                                    pass

                    break  # valid sitemap found — stop trying candidates

                except Exception:
                    continue
    except Exception:
        pass

    if not all_records:
        result.strategy = "bfs"
        return result

    # --- Section distribution ---
    sections: dict[str, int] = {}
    for rec in all_records:
        sec = rec.section or ""
        if sec:
            sections[sec] = sections.get(sec, 0) + 1
    result.sections = dict(sorted(sections.items(), key=lambda x: -x[1]))

    # --- Is <priority> signal useful? (high stddev across records) ---
    non_default_priorities = [r.priority for r in all_records if r.priority != 0.5]
    if len(non_default_priorities) >= 5:
        try:
            result.priority_useful = stdev(non_default_priorities) >= 0.05
        except Exception:
            pass

    # --- Is <lastmod> signal useful? (diverse dates, not all the same rebuild timestamp) ---
    lastmods = [r.lastmod for r in all_records if r.lastmod]
    if lastmods:
        unique_count = len(set(lastmods))
        result.lastmod_useful = unique_count > 1 and (unique_count / len(lastmods)) > 0.1

    result.total = len(all_records)
    result.records = all_records
    result.has_sitemap = sitemap_found
    result.strategy = "hierarchical"

    return result


# ── Phase 2: Hierarchical Selection ──────────────────────────────────────────


def _is_low_value_url(url: str) -> bool:
    """
    Return True if a URL should be excluded from hierarchical selection.
    Excludes URLs with query parameters and URLs whose path contains any
    low-value segment (tags, categories, utility pages, etc.).
    """
    parsed = urlparse(url)
    if parsed.query:
        return True
    segments = {seg.lower() for seg in parsed.path.strip("/").split("/") if seg}
    return bool(segments & _LOW_VALUE_URL_SEGMENTS)


def _score_record(
    rec: PageRecord,
    priority_useful: bool,
    lastmod_useful: bool,
    now: datetime,
) -> float:
    """
    Score a URL for hierarchical selection priority (higher = more valuable).

    Components (max ~100 pts):
      - Sitemap priority:  0–40 pts  (only when signal has real variance)
      - Freshness:         0–20 pts  (only when lastmods are diverse)
      - Shallower depth:   5–20 pts
      - Keyword in path:   0–20 pts
    Penalty: low-value section multiplier ×0.3 (already guarded by _is_low_value_url,
    kept here as belt-and-suspenders for direct callers).
    """
    score = 0.0

    if priority_useful:
        score += rec.priority * 40.0

    if lastmod_useful and rec.lastmod:
        try:
            dt = datetime.fromisoformat(rec.lastmod)
            age_days = (now - dt).days
            if age_days < 90:
                score += 20.0
            elif age_days < 365:
                score += 10.0
        except Exception:
            pass

    score += max(5.0, 20.0 - (rec.depth - 1) * 5.0)

    path_lower = urlparse(rec.url).path.lower()
    if any(kw in path_lower for kw in _KEYWORD_PATHS):
        score += 20.0

    if rec.section in _LOW_VALUE_SECTIONS:
        score *= 0.3

    return round(score, 2)


def _sort_key(rec: PageRecord, sitemap_index: int) -> tuple:
    """
    Deterministic sort key for child/grandchild selection.
    Tie-breaking order: higher score → shorter URL → alphabetical → sitemap order.
    """
    return (-rec.score, len(rec.url), rec.url, sitemap_index)


def _parent_path(path: str) -> str:
    """Return the parent path one level up (always starts with '/')."""
    path = path.rstrip("/")
    if not path or "/" not in path:
        return "/"
    parent = path.rsplit("/", 1)[0]
    return parent if parent else "/"


def _build_url_tree(
    records: list[PageRecord],
    index_map: dict[str, int],
) -> dict[str, list[tuple[int, PageRecord]]]:
    """
    Group records by their parent path.
    Returns dict: parent_path → list of (sitemap_index, PageRecord) sorted by _sort_key.
    """
    tree: dict[str, list[tuple[int, PageRecord]]] = {}
    for rec in records:
        path = urlparse(rec.url).path.rstrip("/") or "/"
        parent = _parent_path(path)
        idx = index_map.get(rec.url, 0)
        tree.setdefault(parent, []).append((idx, rec))
    for children in tree.values():
        children.sort(key=lambda pair: _sort_key(pair[1], pair[0]))
    return tree


# Depth-1 paths that must never be skipped regardless of score.
# Supports both exact matches and regex patterns (prefixed with "re:").
_MUST_INCLUDE_PATHS: frozenset[str] = frozenset({
    # About — regex catches /about-sigma-square, /about-us, /about-the-company, etc.
    "re:/about(-.*)?$",
    "/our-story", "/who-we-are",
    # Contact — regex catches /contact-us, /contact-form, etc.
    "re:/contact(-.*)?$",
    "/get-in-touch", "/reach-us",
    # Trust / legal
    "re:/privacy(-policy|_policy)?$",
    "re:/terms(-of-service|-and-conditions|_of_service)?$",
    # E-E-A-T signals
    "re:/faq(s)?$", "/frequently-asked-questions",
    "re:/team$", "/our-team", "/meet-the-team",
    "re:/case-stud(y|ies)$",
    "re:/authors?$",
    # Content & site-type signals
    "/blog", "/news",
    "re:/pric(ing|e)$", "/plans",
    # Portfolio
    "/portfolio", "/our-work", "/work", "/projects",
    # Home fallback
    "/home",
})

# Pre-compiled regex patterns extracted from _MUST_INCLUDE_PATHS
_MUST_INCLUDE_EXACT: frozenset[str] = frozenset(
    p for p in _MUST_INCLUDE_PATHS if not p.startswith("re:")
)
_MUST_INCLUDE_REGEX: list[re.Pattern[str]] = [
    re.compile(p[3:], re.IGNORECASE)
    for p in _MUST_INCLUDE_PATHS if p.startswith("re:")
]


def _is_must_include(path: str) -> bool:
    """Return True if the given URL path matches any must-include exact path or regex."""
    normalised = path.rstrip("/").lower() or "/"
    if normalised in _MUST_INCLUDE_EXACT:
        return True
    return any(pat.fullmatch(normalised) for pat in _MUST_INCLUDE_REGEX)


def hierarchical_select(inventory: InventoryResult) -> list[str]:
    """
    Select a representative URL sample from the inventory and return it in
    hierarchical order (suitable for display in a frontend table with one column
    per depth level).

    Sitemap index (has_sitemap_index=True):
      - Homepage always included (synthesised from origin if absent from sitemap)
      - Critical pages (about/contact) always included from any sub-sitemap
      - Exactly ONE best-scored URL selected per sub-sitemap group (deterministic)
      - No sub-sitemap is skipped; coverage is balanced across all content types
      - Output ordered: shallower depth first, parent URL before its children

    Flat sitemap (has_sitemap_index=False):
      - Level 0: Homepage
      - Level 1: ALL root pages (depth 1), critical pages pinned first
      - Level 2: One best child per root page
      - Level 3: One best grandchild per level-2 page

    Scoring tie-breaking: score desc → URL length asc → alphabetical → sitemap order.
    Updates inventory.sample_size in place and returns the ordered URL list.
    """
    if not inventory.records:
        return []

    now = datetime.now()

    # Stable sitemap-order index captured before any filtering
    sitemap_index: dict[str, int] = {rec.url: i for i, rec in enumerate(inventory.records)}

    # Filter low-value URLs and score the rest
    candidates: list[PageRecord] = []
    for rec in inventory.records:
        if not _is_low_value_url(rec.url):
            rec.score = _score_record(rec, inventory.priority_useful, inventory.lastmod_useful, now)
            candidates.append(rec)

    seen: set[str] = set()
    result: list[str] = []

    def _add(url: str) -> None:
        if url not in seen:
            seen.add(url)
            result.append(url)

    # ── Level 0: Homepage ────────────────────────────────────────────────────
    # Find in sitemap records first; if absent, synthesise from the site origin.
    homepage_url: str | None = None
    for rec in candidates:
        if urlparse(rec.url).path.rstrip("/") in ("", "/"):
            homepage_url = rec.url
            break
    if not homepage_url and candidates:
        parsed = urlparse(candidates[0].url)
        homepage_url = _normalize_for_dedupe(f"{parsed.scheme}://{parsed.netloc}/")
    if homepage_url:
        _add(homepage_url)

    if inventory.has_sitemap_index:
        # ── Sitemap Index Strategy ────────────────────────────────────────────
        # 1. Pin critical pages (about/contact) regardless of which sub-sitemap
        #    they belong to, so they are never displaced by subsitemap sampling.
        for rec in sorted(candidates, key=lambda r: _sort_key(r, sitemap_index.get(r.url, 0))):
            if _is_must_include(urlparse(rec.url).path):
                _add(rec.url)

        # 2. Group remaining (unseen) candidates by sub-sitemap name.
        groups: dict[str, list[PageRecord]] = {}
        for rec in candidates:
            if rec.url not in seen:
                groups.setdefault(rec.sitemap_name, []).append(rec)

        # 3. From each group pick the single best-scored representative.
        #    _sort_key is designed so that min() returns the best candidate:
        #    it sorts by (-score, url_len, url, sitemap_order).
        reps: list[PageRecord] = []
        for group_recs in groups.values():
            best = min(group_recs, key=lambda r: _sort_key(r, sitemap_index.get(r.url, 0)))
            reps.append(best)

        # 4. Order representatives hierarchically: shallower URLs (smaller depth)
        #    come first so that parents naturally precede their children in the
        #    output list — enabling the frontend to render aligned hierarchy columns.
        reps.sort(key=lambda r: (r.depth, -r.score, len(r.url), r.url))

        for rep in reps:
            _add(rep.url)

    else:
        # ── Flat Sitemap Strategy: original L0 / L1 / L2 / L3 depth selection ─
        tree = _build_url_tree(candidates, sitemap_index)
        root_paths: list[str] = []

        root_records = sorted(
            [r for r in candidates if r.depth == 1],
            key=lambda r: _sort_key(r, sitemap_index.get(r.url, 0)),
        )

        # Pass 1 — critical paths first (guaranteed presence regardless of score)
        for rec in root_records:
            if _is_must_include(urlparse(rec.url).path):
                _add(rec.url)
                root_paths.append(urlparse(rec.url).path.rstrip("/") or "/")

        # Pass 2 — remaining root pages in score order
        for rec in root_records:
            path = urlparse(rec.url).path.rstrip("/") or "/"
            if rec.url not in seen:
                _add(rec.url)
                root_paths.append(path)

        # Level 2: one best child per root page
        child_paths: list[str] = []
        for root_path in root_paths:
            for _idx, child_rec in tree.get(root_path, []):
                if child_rec.url not in seen:
                    _add(child_rec.url)
                    child_paths.append(urlparse(child_rec.url).path.rstrip("/") or "/")
                    break

        # Level 3: one best grandchild per level-2 page
        for child_path in child_paths:
            for _idx, gc_rec in tree.get(child_path, []):
                if gc_rec.url not in seen:
                    _add(gc_rec.url)
                    break

    inventory.sample_size = len(result)
    return result
