"""
ETL: Extract (scraper) -> Transform (extractor) -> Load (PostgreSQL + optional API sync).
"""
from datetime import date
from typing import List

from scraper.config import DEFAULT_BASE_URL
from scraper.extractors import ExampleListingExtractor
from scraper.fetcher import Fetcher
from models import Listing, ListingPriceHistory, get_session
from sqlalchemy import select
from sqlalchemy.orm import Session


def run_extract_load(
    base_url: str = DEFAULT_BASE_URL,
    sync_to_api: bool = True,
) -> tuple[int, int]:
    """
    Run one ETL cycle: fetch page, extract listings, upsert into DB, record prices, optionally sync to Worker API.
    Returns (listings_processed, api_synced).
    """
    fetcher = Fetcher()
    extractor = ExampleListingExtractor()
    html = fetcher.get_html(base_url)
    if not html:
        return 0, 0
    items = extractor.extract_from_html(html, base_url)
    if not items:
        return 0, 0
    session = get_session()
    try:
        today = date.today()
        for item in items:
            _upsert_listing(session, item, today)
        session.commit()
        if sync_to_api:
            synced = _sync_to_api(session, today)
        else:
            synced = 0
        return len(items), synced
    finally:
        session.close()


def _upsert_listing(session: Session, item, recorded_at: date) -> None:
    stmt = select(Listing).where(
        Listing.source_id == item.source_id,
        Listing.source == item.source,
    )
    row = session.execute(stmt).scalars().one_or_none()
    if row:
        row.title = item.title
        row.address = item.address
        row.area = item.area
        row.url = item.url
        row.updated_at = recorded_at
        listing_id = row.id
    else:
        listing = Listing(
            source_id=item.source_id,
            source=item.source,
            title=item.title,
            address=item.address,
            area=item.area,
            url=item.url,
            first_seen_at=recorded_at,
            updated_at=recorded_at,
        )
        session.add(listing)
        session.flush()
        listing_id = listing.id
    # Record price for trend
    existing = session.execute(
        select(ListingPriceHistory).where(
            ListingPriceHistory.listing_id == listing_id,
            ListingPriceHistory.recorded_at == recorded_at,
        )
    ).scalars().one_or_none()
    if not existing and item.price is not None:
        session.add(
            ListingPriceHistory(listing_id=listing_id, price=item.price, recorded_at=recorded_at)
        )


def _sync_to_api(session: Session, recorded_at: date) -> int:
    """Export listing + price snapshot to Cloudflare Worker API. Returns count sent."""
    import httpx
    from scraper.config import API_INGEST_URL, API_INGEST_SECRET
    if not API_INGEST_URL:
        return 0
    stmt = (
        select(Listing, ListingPriceHistory.price)
        .join(ListingPriceHistory, Listing.id == ListingPriceHistory.listing_id)
        .where(ListingPriceHistory.recorded_at == recorded_at)
    )
    rows = list(session.execute(stmt).all())
    payload = {
        "recorded_at": recorded_at.isoformat(),
        "listings": [
            {
                "source_id": r[0].source_id,
                "source": r[0].source,
                "title": r[0].title,
                "address": r[0].address,
                "area": r[0].area,
                "url": r[0].url,
                "price": r[1],
            }
            for r in rows
        ],
    }
    headers = {"Content-Type": "application/json"}
    if API_INGEST_SECRET:
        headers["X-Ingest-Secret"] = API_INGEST_SECRET
    ingest_url = f"{API_INGEST_URL.rstrip('/')}/api/ingest" if not API_INGEST_URL.rstrip("/").endswith("ingest") else API_INGEST_URL.rstrip("/")
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(ingest_url, json=payload, headers=headers)
            resp.raise_for_status()
        return len(payload["listings"])
    except Exception:
        return 0
