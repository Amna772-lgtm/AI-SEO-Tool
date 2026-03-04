from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.site import Site
from app.schemas.analysis import AnalyzeRequest
from app.worker.tasks import process_site
from urllib.parse import urlparse
from datetime import datetime

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def analyze_site(request: AnalyzeRequest, db: Session = Depends(get_db)):

    # Check if URL already exists
    existing_site = db.query(Site).filter(Site.url == request.url).first()

    if existing_site:
        existing_site.status = "queued"
        db.commit()
        db.refresh(existing_site)

        process_site.delay(existing_site.id)

        return {
            "message": "Existing site re-queued for analysis",
            "site_id": existing_site.id,
            "status": existing_site.status
        }

    # Otherwise create new
    new_site = Site(url=request.url, status="queued")
    db.add(new_site)
    db.commit()
    db.refresh(new_site)

    process_site.delay(new_site.id)

    return {
        "message": "New site added for analysis",
        "site_id": new_site.id,
        "status": new_site.status
    }