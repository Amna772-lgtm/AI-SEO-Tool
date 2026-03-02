from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.site import Site

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def analyze_site(url: str, db: Session = Depends(get_db)):
    site = Site(url=url, status="queued")
    db.add(site)
    db.commit()
    db.refresh(site)

    return {
        "message": "Site added for analysis",
        "site_id": site.id
    }