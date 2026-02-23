"""Base extractor interface and listing model."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Any, List, Optional


@dataclass
class ListingItem:
    """Normalized listing record for ETL."""
    source_id: str           # unique id on the source site
    source: str              # e.g. "example_listings"
    title: str
    address: Optional[str] = None
    area: Optional[str] = None   # neighborhood/region
    price: Optional[float] = None
    currency: str = "USD"
    url: Optional[str] = None
    scraped_at: Optional[date] = None
    raw: Optional[dict] = None   # optional extra fields

    def to_dict(self) -> dict:
        return {
            "source_id": self.source_id,
            "source": self.source,
            "title": self.title,
            "address": self.address,
            "area": self.area,
            "price": self.price,
            "currency": self.currency,
            "url": self.url,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "raw": self.raw,
        }


class ListingExtractor(ABC):
    """Abstract extractor: given HTML (or URL), yield ListingItems."""

    source_name: str = "base"

    @abstractmethod
    def extract_from_html(self, html: str, url: str) -> List[ListingItem]:
        """Parse HTML and return list of ListingItem."""
        pass
