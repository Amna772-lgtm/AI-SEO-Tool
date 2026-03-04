from celery import Celery
import os

celery = Celery(
    "ai_seo_worker",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL")
)

celery.autodiscover_tasks(["app.worker"])
