from fastapi import FastAPI
from app.api.routes import analyze, sites, geo, history, schedules, auth, subscriptions
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

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(analyze.router, prefix="/analyze")
app.include_router(sites.router, prefix="/sites", tags=["sites"])
app.include_router(geo.router, prefix="/sites", tags=["geo"])
app.include_router(history.router, prefix="/history", tags=["history"])
app.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
app.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(subscriptions.webhook_router, prefix="/webhooks", tags=["webhooks"])

@app.get("/")
def root():
    return {"status": "AI SEO backend running"}

@app.get("/health")
def health():
    return {"status": "ok"}