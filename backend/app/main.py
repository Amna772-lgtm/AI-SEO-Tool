from fastapi import FastAPI
from app.db.base import Base
from app.db.session import engine
from app.api.routes import analyze

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(analyze.router, prefix="/analyze")

@app.get("/")
def root():
    return {"status": "AI SEO backend running"}