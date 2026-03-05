from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.db.base import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Step 1: robots.txt result (set at analysis request time)
    robots_allowed = Column(Boolean, default=True)
    ai_crawler_access = Column(JSONB)  # {"GPTBot": true, "ChatGPT-User": false, ...}