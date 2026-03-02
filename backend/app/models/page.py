from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base

class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True)
    site_id = Column(Integer, ForeignKey("sites.id"))
    url = Column(String)
    title = Column(String)