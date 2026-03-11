from fastapi import FastAPI
from app.api.routes import analyze, sites, geo
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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
app.include_router(sites.router, prefix="/sites", tags=["sites"])
app.include_router(geo.router, prefix="/sites", tags=["geo"])

@app.get("/")
def root():
    return {"status": "AI SEO backend running"}