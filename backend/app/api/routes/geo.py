"""
GEO Analysis API Routes
GET /sites/{task_id}/geo           - All GEO results combined
GET /sites/{task_id}/geo/score     - AI Citation Score
GET /sites/{task_id}/geo/schema    - Structured data analysis
GET /sites/{task_id}/geo/content   - Content & readability
GET /sites/{task_id}/geo/nlp       - NLP & semantic analysis
GET /sites/{task_id}/geo/eeat      - E-E-A-T signals
GET /sites/{task_id}/geo/site-type - Website type detection
GET /sites/{task_id}/geo/suggestions - Prioritized recommendations
GET /sites/{task_id}/geo/export    - PDF/CSV export
"""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.dependencies.auth import get_current_user
from app.store.crawl_store import get_meta, get_geo, get_all_pages

router = APIRouter()


def _get_meta_for_user(task_id: str, user_id: str) -> dict:
    meta = get_meta(task_id)
    if not meta or meta.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Crawl not found")
    return meta


@router.get("/{task_id}/geo")
def get_geo_all(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    """Return all GEO agent results in a single response."""
    meta = _get_meta_for_user(task_id, current_user["id"])
    geo_status = meta.get("geo_status", "pending")

    return {
        "site_id": task_id,
        "geo_status": geo_status,
        "site_type":   get_geo(task_id, "site_type"),
        "schema":      get_geo(task_id, "schema"),
        "content":     get_geo(task_id, "content"),
        "eeat":        get_geo(task_id, "eeat"),
        "nlp":         get_geo(task_id, "nlp"),
        "score":       get_geo(task_id, "score"),
        "suggestions": get_geo(task_id, "suggestions"),
        "probe":       get_geo(task_id, "probe"),
        "entity":      get_geo(task_id, "entity"),
        "page_scores": get_geo(task_id, "page_scores"),
    }


@router.get("/{task_id}/geo/score")
def get_geo_score(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "score")
    if not data:
        raise HTTPException(status_code=404, detail="GEO score not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/schema")
def get_geo_schema(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "schema")
    if not data:
        raise HTTPException(status_code=404, detail="Schema analysis not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/content")
def get_geo_content(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "content")
    if not data:
        raise HTTPException(status_code=404, detail="Content analysis not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/nlp")
def get_geo_nlp(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "nlp")
    if not data:
        raise HTTPException(status_code=404, detail="NLP analysis not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/eeat")
def get_geo_eeat(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "eeat")
    if not data:
        raise HTTPException(status_code=404, detail="E-E-A-T analysis not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/site-type")
def get_geo_site_type(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "site_type")
    if not data:
        raise HTTPException(status_code=404, detail="Site type detection not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/suggestions")
def get_geo_suggestions(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "suggestions")
    if not data:
        raise HTTPException(status_code=404, detail="Suggestions not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/probe")
def get_geo_probe(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "probe")
    if not data:
        raise HTTPException(status_code=404, detail="Probe results not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/entity")
def get_geo_entity(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "entity")
    if not data:
        raise HTTPException(status_code=404, detail="Entity analysis not yet available")
    return {"site_id": task_id, **data}


@router.get("/{task_id}/geo/pages")
def get_geo_page_scores(task_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    _get_meta_for_user(task_id, current_user["id"])
    data = get_geo(task_id, "page_scores")
    if data is None:
        raise HTTPException(status_code=404, detail="Per-page scores not yet available")
    return {"site_id": task_id, "page_scores": data}


@router.get("/{task_id}/geo/export")
def export_geo_report(
    task_id: str,
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Export GEO analysis as CSV or PDF."""
    meta = _get_meta_for_user(task_id, current_user["id"])
    score = get_geo(task_id, "score") or {}
    schema = get_geo(task_id, "schema") or {}
    eeat = get_geo(task_id, "eeat") or {}
    content = get_geo(task_id, "content") or {}
    nlp = get_geo(task_id, "nlp") or {}
    suggestions = get_geo(task_id, "suggestions") or {}
    site_type = get_geo(task_id, "site_type") or {}

    site_url = meta.get("url", "")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "csv":
        return _export_csv(task_id, site_url, score, schema, eeat, content, nlp, suggestions, site_type, timestamp)
    else:
        return _export_pdf(task_id, site_url, score, schema, eeat, content, nlp, suggestions, site_type, timestamp, meta)


def _export_csv(task_id, site_url, score, schema, eeat, content, nlp, suggestions, site_type, timestamp):
    """Generate a comprehensive CSV export."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["AI SEO Tool — GEO Analysis Report"])
    writer.writerow(["Site URL", site_url])
    writer.writerow(["Generated", timestamp])
    writer.writerow([])

    # Score Summary
    writer.writerow(["=== AI CITATION SCORE ==="])
    writer.writerow(["Overall Score", score.get("overall_score", "N/A")])
    writer.writerow(["Grade", score.get("grade", "N/A")])
    writer.writerow(["Site Type", site_type.get("site_type", "N/A")])
    writer.writerow([])

    writer.writerow(["Category", "Weight (%)", "Raw Score", "Weighted Score"])
    for cat, data in score.get("breakdown", {}).items():
        writer.writerow([cat.replace("_", " ").title(), data.get("weight"), data.get("raw"), data.get("weighted")])
    writer.writerow([])

    # Schema
    writer.writerow(["=== STRUCTURED DATA ==="])
    writer.writerow(["Has JSON-LD", schema.get("has_json_ld", False)])
    writer.writerow(["Has Microdata", schema.get("has_microdata", False)])
    writer.writerow(["Coverage (%)", schema.get("coverage_percent", 0)])
    writer.writerow(["Schema Types Found", ", ".join(schema.get("schema_types", []))])
    writer.writerow(["Missing Recommended", ", ".join(schema.get("missing_recommended", []))])
    writer.writerow([])

    # E-E-A-T
    writer.writerow(["=== E-E-A-T SIGNALS ==="])
    writer.writerow(["E-E-A-T Score", eeat.get("eeat_score", 0)])
    writer.writerow(["Has About Page", eeat.get("has_about_page", False)])
    writer.writerow(["Has Contact Page", eeat.get("has_contact_page", False)])
    writer.writerow(["Has Privacy Policy", eeat.get("has_privacy_policy", False)])
    writer.writerow(["Author Credentials", eeat.get("author_credentials_found", False)])
    writer.writerow(["Citations Found", eeat.get("citations_found", False)])
    writer.writerow([])

    # Content
    writer.writerow(["=== CONTENT ANALYSIS ==="])
    writer.writerow(["Avg Word Count", content.get("avg_word_count", 0)])
    writer.writerow(["Reading Level", content.get("reading_level", "N/A")])
    writer.writerow(["FAQ Pages", content.get("pages_with_faq", 0)])
    writer.writerow(["Thin Content Pages", content.get("thin_content_pages", 0)])
    writer.writerow(["Conversational Score", content.get("conversational_tone_score", 0)])
    writer.writerow([])

    # NLP
    writer.writerow(["=== NLP ANALYSIS ==="])
    writer.writerow(["Primary Intent", nlp.get("primary_intent", "N/A")])
    writer.writerow(["AI Snippet Readiness", nlp.get("ai_snippet_readiness", "N/A")])
    writer.writerow(["Question Density", nlp.get("question_density", 0)])
    writer.writerow(["Answer Blocks", nlp.get("answer_blocks_detected", 0)])
    writer.writerow(["Key Topics", ", ".join(nlp.get("key_topics", []))])
    writer.writerow([])

    # Suggestions
    for priority in ["critical", "important", "optional"]:
        items = suggestions.get(priority, [])
        if items:
            writer.writerow([f"=== {priority.upper()} SUGGESTIONS ==="])
            writer.writerow(["Title", "Category", "Description", "Fix"])
            for item in items:
                writer.writerow([
                    item.get("title", ""),
                    item.get("category", ""),
                    item.get("description", ""),
                    item.get("fix", ""),
                ])
            writer.writerow([])

    csv_content = output.getvalue()
    output.close()

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=geo-report-{timestamp}.csv"},
    )


def _esc(text: str) -> str:
    """Escape text for safe use inside ReportLab Paragraph XML."""
    import html
    return html.escape(str(text or ""), quote=False)


def _export_pdf(task_id, site_url, score, schema, eeat, content, nlp, suggestions, site_type, timestamp, meta):
    """Generate a PDF report using reportlab."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        story = []

        # Colors
        accent = colors.HexColor("#166534")
        light_green = colors.HexColor("#dcfce7")
        amber = colors.HexColor("#ca8a04")
        red = colors.HexColor("#dc2626")
        muted_color = colors.HexColor("#6b7280")

        # Custom styles — use unique names to avoid conflicts with getSampleStyleSheet
        geo_title  = ParagraphStyle("GeoTitle",  parent=styles["Normal"], textColor=accent,     fontSize=22, spaceAfter=6,  fontName="Helvetica-Bold")
        geo_h2     = ParagraphStyle("GeoH2",     parent=styles["Normal"], textColor=accent,     fontSize=14, spaceBefore=16, spaceAfter=6, fontName="Helvetica-Bold")
        geo_body   = ParagraphStyle("GeoBody",   parent=styles["Normal"], fontSize=10,          spaceAfter=4)
        geo_bold   = ParagraphStyle("GeoBold",   parent=styles["Normal"], fontSize=10,          spaceAfter=4, fontName="Helvetica-Bold")
        geo_muted  = ParagraphStyle("GeoMuted",  parent=styles["Normal"], fontSize=9,           textColor=muted_color)
        geo_fix    = ParagraphStyle("GeoFix",    parent=styles["Normal"], fontSize=9,           textColor=colors.HexColor("#1d4ed8"), spaceAfter=8)

        # Title — plain text only, no inline XML
        story.append(Paragraph("AI SEO Tool", geo_title))
        story.append(Paragraph("GEO Analysis Report", geo_h2))
        story.append(Paragraph("Site: " + _esc(site_url), geo_muted))
        story.append(Paragraph("Generated: " + _esc(timestamp), geo_muted))
        story.append(HRFlowable(width="100%", thickness=1, color=accent, spaceAfter=12))

        # Score Summary
        overall = score.get("overall_score", 0)
        grade = score.get("grade", "F")
        score_color = accent if overall >= 80 else (amber if overall >= 60 else red)

        story.append(Paragraph("AI Citation Readiness Score", geo_h2))
        score_data = [
            ["Overall Score", _esc(str(overall) + "/100")],
            ["Grade", _esc(str(grade))],
            ["Site Type", _esc(site_type.get("site_type", "N/A").replace("_", " ").title())],
            ["Confidence", str(int(site_type.get("confidence", 0) * 100)) + "%"],
        ]
        score_table = Table(score_data, colWidths=[8*cm, 8*cm])
        score_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (0, -1), light_green),
            ("TEXTCOLOR",    (1, 0), (1, 0),  score_color),
            ("FONTSIZE",     (1, 0), (1, 0),  18),
            ("FONTNAME",     (1, 0), (1, 0),  "Helvetica-Bold"),
            ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("PADDING",      (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ]))
        story.append(score_table)
        story.append(Spacer(1, 12))

        # Score Breakdown
        story.append(Paragraph("Score Breakdown", geo_h2))
        breakdown_header = [["Category", "Weight", "Raw Score", "Contribution"]]
        breakdown_rows = []
        for cat, data in score.get("breakdown", {}).items():
            breakdown_rows.append([
                _esc(cat.replace("_", " ").title()),
                _esc(str(data.get("weight")) + "%"),
                _esc(str(data.get("raw")) + "/100"),
                _esc(str(data.get("weighted")) + "/" + str(data.get("weight"))),
            ])
        breakdown_table = Table(breakdown_header + breakdown_rows, colWidths=[6*cm, 3*cm, 4*cm, 4*cm])
        breakdown_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0), accent),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("PADDING",      (0, 0), (-1, -1), 7),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ]))
        story.append(breakdown_table)
        story.append(Spacer(1, 12))

        # Suggestions — no inline XML tags, use separate styles per line
        for priority in ["critical", "important", "optional"]:
            items = suggestions.get(priority, [])
            if not items:
                continue
            story.append(Paragraph(priority.upper() + " Suggestions", geo_h2))
            for item in items:
                story.append(Paragraph(_esc(item.get("title", "")), geo_bold))
                story.append(Paragraph(_esc(item.get("description", "")), geo_muted))
                story.append(Paragraph("Fix: " + _esc(item.get("fix", "")), geo_fix))
                story.append(Spacer(1, 4))

        doc.build(story)
        buf.seek(0)

        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=geo-report-{timestamp}.pdf"},
        )

    except ImportError:
        raise HTTPException(status_code=501, detail="PDF export requires reportlab. Install it in the backend.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
