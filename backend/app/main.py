from fastapi import FastAPI
from app.db.base import Base
from app.db.session import engine
from app.api.routes import analyze
from fastapi.middleware.cors import CORSMiddleware
from app.worker.tasks import process_site

app = FastAPI()

Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/analyze")

@app.get("/")
def root():
    return {"status": "AI SEO backend running"}