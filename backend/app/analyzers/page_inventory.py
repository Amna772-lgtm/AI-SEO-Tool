"""
Two-Phase URL Inventory Engine.

Phase 1: build_inventory() — fast sitemap parse, builds a full URL list with metadata
Phase 2: smart_sample()    — score & select a representative subset for crawling

Strategy selected by tasks.py:
    has_sitemap=False or total<100  → BFS (crawl_site, unchanged behaviour)
    has_sitemap=True, total<50      → "hybrid" (sitemap seeds + BFS)
    has_sitemap=True, total>=100    → "sitemap" (Two-Phase: sample + crawl_sampled)
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
    "tag", "tags", "author", "authors", "category", "categories",
    "page", "archive", "archives", "feed", "rss", "wp-content",
    "wp-includes", "search", "cart", "checkout", "account",
    "login", "register", "sitemap",
})


# ── Data Classes ─────────────────────────────────────────────────────────────

@dataclass
class PageRecord:
    url: str
    priority: float = 0.5
    lastmod: str | None = None   # validated ISO date string, None if invalid
    depth: int = 1               # path segment count
    section: str = ""            # first meaningful path segment
    score: float = 0.0           # computed by smart_sample()


@dataclass
class InventoryResult:
    total: int = 0
    records: list[PageRecord] = field(default_factory=list)
    sections: dict[str, int] = field(default_factory=dict)   # section → count
    has_sitemap: bool = False
    priority_useful: bool = False
    lastmod_useful: bool = False
    strategy: str = "bfs"        # "sitemap" | "hybrid" | "bfs"
    sample_size: int = 0         # set after smart_sample() is called


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


def _fetch_sub_sitemap(
    args: tuple,
) -> list[PageRecord]:
    """Worker: fetch one sub-sitemap and return its PageRecords."""
    sub_url, base_netloc, alt_netloc, max_urls, client = args
    try:
        resp = client.get(sub_url)
        if resp.status_code >= 400:
            return []
        xml_text = _decompress_response(resp)
        records, _ = _parse_sitemap_xml(xml_text, sub_url, base_netloc, alt_netloc, max_urls)
        return records
    except Exception:
        return []


# ── Phase 1: Inventory ────────────────────────────────────────────────────────

def build_inventory(base_url: str, max_urls: int = 10000) -> InventoryResult:
    """
    Build a URL inventory from the site's sitemap(s). Fast (~2-5s typical).
    Does NOT fetch page content — only reads sitemap XML.

    Returns InventoryResult with:
        strategy="sitemap"  → ≥100 URLs found, use Two-Phase
        strategy="hybrid"   → <50 URLs found, BFS should supplement
        strategy="bfs"      → no sitemap, caller should use BFS
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

                    for rec in records:
                        if rec.url not in seen_urls:
                            seen_urls.add(rec.url)
                            all_records.append(rec)

                    # Sitemap index: fetch sub-sitemaps in parallel
                    if sub_urls:
                        to_fetch = sub_urls[:_MAX_SUB_SITEMAPS]
                        with ThreadPoolExecutor(max_workers=_FETCH_WORKERS) as executor:
                            futures = [
                                executor.submit(
                                    _fetch_sub_sitemap,
                                    (su, base_netloc, alt_netloc,
                                     max_urls - len(all_records), client),
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
    result.strategy = "sitemap" if len(all_records) >= 100 else "hybrid"

    return result


# ── Phase 2: Smart Sampling ───────────────────────────────────────────────────

def _adaptive_target(total: int) -> int:
    """Return ideal sample size based on inventory total."""
    if total <= 100:
        return total
    if total <= 500:
        return min(total, int(total * 0.8))
    if total <= 2000:
        return 250
    if total <= 5000:
        return 350
    return 500


def _score_record(
    rec: PageRecord,
    priority_useful: bool,
    lastmod_useful: bool,
    now: datetime,
) -> float:
    """Score a URL 0-100 for sampling priority. Higher = more valuable to analyze."""
    score = 0.0

    # Priority score: 0-40 pts (only when signal has real variance)
    if priority_useful:
        score += rec.priority * 40.0

    # Freshness score: 0-20 pts (only when lastmods are diverse)
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

    # Depth score: 5-20 pts (prefer shallower pages)
    score += max(5.0, 20.0 - (rec.depth - 1) * 5.0)

    # Keyword score: 0-20 pts (semantically meaningful pages)
    path_lower = urlparse(rec.url).path.lower()
    if any(kw in path_lower for kw in _KEYWORD_PATHS):
        score += 20.0

    # Penalise low-value sections (tags, authors, archives, etc.)
    if rec.section in _LOW_VALUE_SECTIONS:
        score *= 0.3

    return round(score, 2)


def smart_sample(inventory: InventoryResult, target: int | None = None) -> list[str]:
    """
    Select a representative sample of URLs from the inventory.
    Returns list of URLs to crawl — homepage first, then section-balanced selection.

    Allocation strategy:
    1. Always include: homepage + best URL per section (up to 6 sections)
    2. Remaining budget split proportionally across sections (capped at 25% per section)
    3. Fill any remaining slots with highest-score unselected URLs
    """
    if not inventory.records:
        return []

    if target is None:
        target = _adaptive_target(inventory.total)

    # If inventory fits within target, crawl everything
    if inventory.total <= target:
        inventory.sample_size = inventory.total
        return [r.url for r in inventory.records]

    now = datetime.now()

    # Score all records in place
    for rec in inventory.records:
        rec.score = _score_record(rec, inventory.priority_useful, inventory.lastmod_useful, now)

    seen: set[str] = set()
    must_include: list[str] = []

    # 1. Always include homepage (depth=0 or root path)
    homepage_url = None
    for rec in inventory.records:
        if urlparse(rec.url).path.rstrip("/") in ("", "/"):
            homepage_url = rec.url
            break
    if homepage_url:
        must_include.append(homepage_url)
        seen.add(homepage_url)

    # 2. Group remaining records by section
    section_records: dict[str, list[PageRecord]] = {}
    for rec in inventory.records:
        if rec.url in seen:
            continue
        sec = rec.section or "__root__"
        section_records.setdefault(sec, []).append(rec)

    for sec in section_records:
        section_records[sec].sort(key=lambda r: r.score, reverse=True)

    # 3. Must-include: top URL from each meaningful section (up to 6)
    meaningful_sections = [
        sec for sec in section_records
        if sec not in _LOW_VALUE_SECTIONS and sec != "__root__"
    ]
    for sec in meaningful_sections[:6]:
        recs = section_records[sec]
        if recs and recs[0].url not in seen:
            must_include.append(recs[0].url)
            seen.add(recs[0].url)

    remaining_budget = target - len(must_include)
    if remaining_budget <= 0:
        inventory.sample_size = len(must_include)
        return must_include

    # 4. Per-section proportional budget
    total_remaining = sum(len(v) for v in section_records.values())
    max_per_section = max(1, remaining_budget // 4)  # no section > 25% of budget
    section_budget: dict[str, int] = {}
    for sec, recs in section_records.items():
        if total_remaining == 0:
            section_budget[sec] = 0
        else:
            prop = len(recs) / total_remaining
            budget = max(2, round(remaining_budget * prop))
            section_budget[sec] = min(budget, max_per_section)

    # 5. Sample from each section
    sampled: list[str] = []
    for sec, recs in section_records.items():
        budget = section_budget.get(sec, 2)
        count = 0
        for rec in recs:
            if count >= budget:
                break
            if len(must_include) + len(sampled) >= target:
                break
            if rec.url not in seen:
                sampled.append(rec.url)
                seen.add(rec.url)
                count += 1

    # 6. Fill remaining with highest-score unselected
    if len(must_include) + len(sampled) < target:
        leftover = sorted(
            [r for r in inventory.records if r.url not in seen],
            key=lambda r: r.score,
            reverse=True,
        )
        for rec in leftover:
            if len(must_include) + len(sampled) >= target:
                break
            sampled.append(rec.url)
            seen.add(rec.url)

    result = must_include + sampled
    inventory.sample_size = len(result)
    return result
