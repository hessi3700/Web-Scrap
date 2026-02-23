from celery_app import app
from etl import run_extract_load


@app.task(name="celery_app.tasks.run_etl", bind=True)
def run_etl(self, sync_to_api: bool = True):
    """Celery task: run one ETL cycle and optionally sync to Worker API."""
    try:
        processed, synced = run_extract_load(sync_to_api=sync_to_api)
        return {"processed": processed, "synced": synced}
    except Exception as e:
        self.retry(exc=e, countdown=60, max_retries=3)
