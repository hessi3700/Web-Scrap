"""
Example listing extractor for demo/development.
Parses a minimal HTML structure; replace selectors for a real target.
For production, point SCRAPE_BASE_URL and selectors at an allowed site.
"""
import re
from datetime import date
from typing import List, Optional

from bs4 import BeautifulSoup

from scraper.extractors.base import ListingItem, ListingExtractor


def _parse_price(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    digits = re.sub(r"[^\d.]", "", text)
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


class ExampleListingExtractor(ListingExtractor):
    """
    Extracts listings from HTML that has structure like:
    - .listing (or data-listing) per item
    - .title, .price, .address, .area (or data-area)
    Replace selectors to match your target site.
    """
    source_name = "example_listings"

    def extract_from_html(self, html: str, url: str) -> List[ListingItem]:
        soup = BeautifulSoup(html, "html.parser")
        items: List[ListingItem] = []
        # Flexible: look for [data-listing], .listing, or article
        blocks = (
            soup.select("[data-listing]")
            or soup.select(".listing")
            or soup.select("article.listing")
            or []
        )
        if not blocks:
            # Fallback: single demo row for testing
            return self._demo_listing(url)
        today = date.today()
        for i, block in enumerate(blocks):
            title_el = block.select_one(".title, [data-title], h2, h3")
            price_el = block.select_one(".price, [data-price]")
            addr_el = block.select_one(".address, [data-address]")
            area_el = block.select_one(".area, [data-area], .region")
            link_el = block.select_one("a[href]")
            source_id = block.get("data-id") or block.get("id") or f"item-{i}"
            title = (title_el.get_text(strip=True) if title_el else "") or f"Listing {i}"
            price = _parse_price(price_el.get_text(strip=True) if price_el else None)
            address = addr_el.get_text(strip=True) if addr_el else None
            area = area_el.get_text(strip=True) if area_el else None
            link = link_el.get("href") if link_el else None
            if link and not link.startswith("http"):
                from urllib.parse import urljoin
                link = urljoin(url, link)
            items.append(
                ListingItem(
                    source_id=str(source_id),
                    source=self.source_name,
                    title=title,
                    address=address,
                    area=area,
                    price=price,
                    url=link,
                    scraped_at=today,
                )
            )
        return items

    def _demo_listing(self, url: str) -> List[ListingItem]:
        """Return one demo listing when page has no matching structure (for dev)."""
        return [
            ListingItem(
                source_id="demo-1",
                source=self.source_name,
                title="Sample listing (demo)",
                address="123 Demo St",
                area="Downtown",
                price=350_000.0,
                url=url,
                scraped_at=date.today(),
            ),
        ]
