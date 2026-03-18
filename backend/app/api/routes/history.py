"""
History API Routes
GET    /history                — list analyses (optional ?domain= ?limit= ?offset=)
GET    /history/{id}           — single analysis with full geo_data blob
DELETE /history/{id}           — remove a record
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.store.history_store import list_analyses, get_analysis, delete_analysis, count_analyses

router = APIRouter()


@router.get("/")
def get_history(
    domain: str | None = Query(None, description="Filter by domain (e.g. example.com)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    items = list_analyses(domain=domain, limit=limit, offset=offset)
    total = count_analyses(domain=domain)
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{analysis_id}")
def get_history_item(analysis_id: str):
    record = get_analysis(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found in history")
    return record


@router.delete("/{analysis_id}", status_code=204)
def delete_history_item(analysis_id: str):
    deleted = delete_analysis(analysis_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis not found in history")
