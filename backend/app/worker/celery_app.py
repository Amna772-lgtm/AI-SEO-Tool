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

# Celery Beat — periodic task scheduler
celery.conf.timezone = "UTC"
celery.conf.beat_schedule = {
    "check-due-schedules": {
        "task": "app.worker.tasks.check_due_schedules",
        "schedule": 60.0,  # seconds
    },
}
# NOTE: --beat is embedded in the single worker container. If ever scaled to
# multiple workers, extract Beat into its own service to avoid duplicate fires.
