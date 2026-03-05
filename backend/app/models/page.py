from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, UniqueConstraint
from app.db.base import Base
from datetime import datetime


class Page(Base):
    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("site_id", "address", name="uq_pages_site_address"),)

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"))

    # Core info
    address = Column(String)                    # requested/resolved URL
    type = Column(String)                       # internal / external
    content_type = Column(String)               # e.g. text/html; charset=UTF-8
    status_code = Column(Integer)
    status = Column(String)                     # e.g. OK, Moved Permanently

    # Indexability (SEO)
    indexability = Column(String)               # Indexable / Non-Indexable
    indexability_status = Column(String)        # Redirected, Indexable, etc.

    # SEO
    title = Column(String)                      # Title 1
    title_length = Column(Integer)              # Title 1 length (chars)
    meta_descp = Column(Text)
    h1 = Column(String)
    canonical = Column(String)
    readability = Column(String)                # placeholder for future NLP

    # Links (counts for future)
    inlink = Column(Integer)
    outlinks = Column(Integer)
    external_outlinks = Column(Integer)

    # Content quality placeholders
    spelling_error = Column(Integer)
    grammar = Column(Integer)

    # Technical / metadata
    crawl_depth = Column(Integer, default=0)
    response_time = Column(Float)
    last_modified = Column(String)              # Last-Modified header
    redirect_url = Column(String)
    redirect_type = Column(String)              # e.g. HTTP Redirect
    http_version = Column(String)               # e.g. 1.1
    cookies = Column(Text)
    language = Column(String)                   # Content-Language or html lang

    # Crawl timestamp
    crawl_timestamp = Column(DateTime, default=datetime.utcnow)