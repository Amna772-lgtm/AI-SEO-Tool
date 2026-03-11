from fastapi import APIRouter, HTTPException, Query

from app.store.crawl_store import get_meta, get_all_pages

router = APIRouter()


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
def get_site(task_id: str):
    meta = get_meta(task_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Crawl not found")
    return {
        "id": meta.get("id", task_id),
        "url": meta.get("url"),
        "status": meta.get("status"),
        "created_at": None,
        "robots_allowed": meta.get("robots_allowed", True),
        "ai_crawler_access": meta.get("ai_crawler_access"),
        "audit_status": meta.get("audit_status", "pending"),
        "geo_status": meta.get("geo_status", "pending"),
    }


@router.get("/{task_id}/pages")
def list_pages(
    task_id: str,
    type_filter: str | None = Query(None, alias="type"),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=100000),
):
    meta = get_meta(task_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Crawl not found")

    pages = get_all_pages(task_id)
    if type_filter:
        pages = [p for p in pages if (p.get("type") or "internal") == type_filter]
    if search:
        search_lower = search.lower()
        pages = [p for p in pages if search_lower in (p.get("address") or "").lower()]

    total = len(pages)
    slice_pages = pages[skip : skip + limit]

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
            "canonical": p.get("canonical"),
            "crawl_depth": p.get("crawl_depth"),
            "response_time": p.get("response_time"),
            "language": p.get("language"),
            "last_modified": p.get("last_modified"),
            "redirect_url": p.get("redirect_url"),
            "redirect_type": p.get("redirect_type"),
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
def get_site_audit(task_id: str):
    meta = get_meta(task_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Crawl not found")
    return {
        "site_id": task_id,
        "audit_status": meta.get("audit_status", "pending"),
        "audit": meta.get("audit"),
    }


@router.get("/{task_id}/overview")
def get_site_overview(task_id: str):
    meta = get_meta(task_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Crawl not found")

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

    image_pages = [p for p in pages if "image" in (p.get("content_type") or "").lower()]
    images_total = len(image_pages)
    images_missing_alt = sum(1 for p in image_pages if not p.get("alt_text"))

    return {
        "site_id": task_id,
        "total_urls": total,
        "images_total": images_total,
        "images_missing_alt": images_missing_alt,
        "by_type": by_type,
    }
