"""
CI-friendly pipeline: scrape only, then POST to Worker API. No PostgreSQL/Redis.
Use in GitHub Actions; set API_INGEST_URL (and optional API_INGEST_SECRET) as secrets.
"""
import os
import sys
from datetime import date
from pathlib import Path

# Ensure pipeline root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Load env from pipeline/.env or from environment (CI injects secrets)
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from scraper.config import API_INGEST_URL, DEFAULT_BASE_URL
from scraper.extractors import ExampleListingExtractor
from scraper.fetcher import Fetcher


def main() -> int:
    if not API_INGEST_URL:
        print("API_INGEST_URL not set; skipping sync.")
        return 0
    base_url = os.getenv("SCRAPE_BASE_URL", DEFAULT_BASE_URL)
    fetcher = Fetcher()
    extractor = ExampleListingExtractor()
    html = fetcher.get_html(base_url)
    if not html:
        print("No HTML fetched.")
        return 1
    items = extractor.extract_from_html(html, base_url)
    if not items:
        print("No listings extracted.")
        return 1
    today = date.today()
    payload = {
        "recorded_at": today.isoformat(),
        "listings": [
            {
                "source_id": i.source_id,
                "source": i.source,
                "title": i.title,
                "address": i.address,
                "area": i.area,
                "url": i.url,
                "price": i.price,
            }
            for i in items
        ],
    }
    import httpx
    headers = {"Content-Type": "application/json"}
    secret = os.getenv("API_INGEST_SECRET")
    if secret:
        headers["X-Ingest-Secret"] = secret
    ingest_url = f"{API_INGEST_URL.rstrip('/')}/api/ingest"
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(ingest_url, json=payload, headers=headers)
            resp.raise_for_status()
    except Exception as e:
        print(f"Ingest failed: {e}")
        return 1
    print(f"Synced {len(payload['listings'])} listings to {ingest_url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
