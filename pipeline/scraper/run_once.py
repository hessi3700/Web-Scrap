"""One-off ETL run (e.g. from CLI or cron without Celery)."""
import sys

# Ensure pipeline root is on path when run as python -m scraper.run_once
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from etl import run_extract_load

if __name__ == "__main__":
    processed, synced = run_extract_load(sync_to_api=True)
    print(f"Processed {processed} listings, synced {synced} to API.")
    sys.exit(0 if processed >= 0 else 1)
