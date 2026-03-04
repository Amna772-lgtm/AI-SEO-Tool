from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.db.base import Base


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"))

    url = Column(String)
    status_code = Column(Integer)

    title = Column(String)
    meta_description = Column(String)
    h1 = Column(String)

    canonical = Column(String)

    internal_links = Column(Integer)
    external_links = Column(Integer)

    json_ld = Column(Text)  # store as stringified JSON
    raw_html = Column(Text)