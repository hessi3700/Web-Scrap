from celery import Celery
from celery.schedules import crontab

from scraper.config import REDIS_URL

app = Celery(
    "web_scrap",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["celery_app.tasks"],
)
app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    beat_schedule={
        "daily-scrape": {
            "task": "celery_app.tasks.run_etl",
            "schedule": crontab(hour=6, minute=0),  # 06:00 UTC daily
        },
    },
)
