from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies.auth import get_current_user
from app.store.crawl_store import get_meta, get_all_pages, get_pages_paginated

router = APIRouter()


def _get_meta_for_user(task_id: str, user_id: str) -> dict:
    meta = get_meta(task_id)
    if not meta or meta.get("user_id") != user_id:
        # Return 404 (not 403) so we don't leak existence to other users
        raise HTTPException(status_code=404, detail="Crawl not found")
    return meta


def _content_type_label(ct: str) -> str:
    ct_lower = (ct or "").lower()
    if "text/html" in ct_lower:
        return "HTML"
    if "javascript" in ct_lower:
        return "JavaScript"
    if "css" in ct_lower:
        return "CSS"
    if "image" in ct_lower:
        return "Images"
    if "font" in ct_lower or "woff" in ct_lower:
        return "Fonts"
    if "xml" in ct_lower:
        return "XML"
    if "pdf" in ct_lower:
        return "PDF"
    if "json" in ct_lower:
        return "JSON"
    if ct_lower in ("unknown", ""):
        return "Unknown"
    return "Other"


@router.get("/{task_id}")
def get_site(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    meta = _get_meta_for_user(task_id, current_user["id"])
    return {
        "id": meta.get("id", task_id),
        "url": meta.get("url"),
        "status": meta.get("status"),
        "created_at": None,
        "robots_allowed": meta.get("robots_allowed", True),
        "ai_crawler_access": meta.get("ai_crawler_access"),
        "disallowed_paths": meta.get("disallowed_paths", []),
        "audit_status": meta.get("audit_status", "pending"),
        "geo_status": meta.get("geo_status", "pending"),
        "inventory_total": meta.get("inventory_total"),
        "inventory_sections": meta.get("inventory_sections"),
        "inventory_strategy": meta.get("inventory_strategy"),
        "inventory_sample_size": meta.get("inventory_sample_size"),
        "cloudflare_protected": meta.get("cloudflare_protected", False),
    }


@router.get("/{task_id}/pages")
def list_pages(
    task_id: str,
    type_filter: str | None = Query(None, alias="type"),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100000),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    meta = _get_meta_for_user(task_id, current_user["id"])

    if type_filter or search:
        # Filtered/search queries: load all, then slice (necessary for correctness)
        pages = get_all_pages(task_id)
        if type_filter:
            pages = [p for p in pages if (p.get("type") or "internal") == type_filter]
        if search:
            search_lower = search.lower()
            pages = [
                p for p in pages
                if search_lower in (p.get("address") or "").lower()
                or search_lower in (p.get("title") or "").lower()
                or search_lower in (p.get("h1") or "").lower()
            ]
        total = len(pages)
        slice_pages = pages[skip : skip + limit]
    else:
        # Unfiltered: use Redis-level LRANGE pagination (O(limit) not O(total))
        slice_pages, total = get_pages_paginated(task_id, skip=skip, limit=limit)

    def to_row(i: int, p: dict) -> dict:
        return {
            "id": skip + i + 1,
            "address": p.get("address"),
            "type": p.get("type") or "internal",
            "content_type": p.get("content_type"),
            "status_code": p.get("status_code"),
            "status": p.get("status"),
            "indexability": p.get("indexability"),
            "indexability_status": p.get("indexability_status"),
            "title": p.get("title"),
            "title_length": p.get("title_length"),
            "meta_descp": p.get("meta_descp"),
            "h1": p.get("h1"),
            "h2s": p.get("h2s", []),
            "h3s": p.get("h3s", []),
            "canonical": p.get("canonical"),
            "crawl_depth": p.get("crawl_depth"),
            "response_time": p.get("response_time"),
            "language": p.get("language"),
            "last_modified": p.get("last_modified"),
            "redirect_url": p.get("redirect_url"),
            "http_version": p.get("http_version"),
            "readability": p.get("readability"),
            "alt_text": p.get("alt_text"),
        }

    return {
        "site_id": task_id,
        "total": total,
        "pages": [to_row(i, p) for i, p in enumerate(slice_pages)],
    }


@router.get("/{task_id}/audit")
def get_site_audit(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    meta = _get_meta_for_user(task_id, current_user["id"])
    return {
        "site_id": task_id,
        "audit_status": meta.get("audit_status", "pending"),
        "audit": meta.get("audit"),
    }


@router.get("/{task_id}/overview")
def get_site_overview(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    meta = _get_meta_for_user(task_id, current_user["id"])

    pages = get_all_pages(task_id)
    total = len(pages)
    from collections import Counter
    ct_counts = Counter(p.get("content_type") or "Unknown" for p in pages)
    # Group by normalized label so "HTML", "Images", etc. appear once each
    label_counts: dict[str, int] = {}
    label_example_ct: dict[str, str] = {}
    for ct, count in ct_counts.items():
        label = _content_type_label(ct)
        label_counts[label] = label_counts.get(label, 0) + count
        if label not in label_example_ct:
            label_example_ct[label] = ct
    by_type = [
        {
            "label": label,
            "content_type": label_example_ct[label],
            "count": count,
            "percent": round((count / total * 100), 2) if total else 0,
        }
        for label, count in sorted(label_counts.items(), key=lambda x: -x[1])
    ]

    ok_count = sum(1 for p in pages if p.get("status_code") == 200)
    redirect_count = sum(1 for p in pages if p.get("status_code") and 300 <= p["status_code"] < 400)
    error_4xx_count = sum(1 for p in pages if p.get("status_code") and 400 <= p["status_code"] < 500)
    error_5xx_count = sum(1 for p in pages if p.get("status_code") and p["status_code"] >= 500)

    indexable_count = 0
    non_indexable_count = 0
    external_count = 0
    for p in pages:
        if p.get("type") == "external":
            external_count += 1
        else:
            # Mirror the Spider table filter: skip images, CSS, JS, fonts
            ct = (p.get("content_type") or "").lower()
            is_asset = (
                ct.startswith("image/")
                or "css" in ct
                or "javascript" in ct
                or "font" in ct
                or "woff" in ct
            )
            if is_asset:
                continue
            if p.get("indexability") == "Indexable":
                indexable_count += 1
            else:
                non_indexable_count += 1

    return {
        "site_id": task_id,
        "total_urls": total,
        "by_type": by_type,
        "indexability_counts": {
            "indexable": indexable_count,
            "non_indexable": non_indexable_count,
            "external": external_count,
        },
        "status_counts": {
            "ok": ok_count,
            "redirect": redirect_count,
            "error_4xx": error_4xx_count,
            "error_5xx": error_5xx_count,
        },
        "images_total": meta.get("images_total", 0),
        "images_missing_alt": meta.get("images_missing_alt", 0),
        "images_optimized": meta.get("images_optimized", 0),
    }
