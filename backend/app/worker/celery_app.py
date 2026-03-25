from celery import Celery
import os

celery = Celery(
    "ai_seo_worker",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL")
)

celery.autodiscover_tasks(["app.worker"])

# Worker resource limits — restart after 10 tasks or if memory exceeds 512MB
celery.conf.worker_max_tasks_per_child = 10
celery.conf.worker_max_memory_per_child = 512000
