"""Scraper configuration with env and defaults."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://webscrap:webscrap@localhost:5432/web_scrap")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# API (Cloudflare Worker)
API_INGEST_URL = os.getenv("API_INGEST_URL", "").rstrip("/")
API_INGEST_SECRET = os.getenv("API_INGEST_SECRET", "")

# Scraping etiquette
SCRAPE_DELAY_SECONDS = float(os.getenv("SCRAPE_DELAY_SECONDS", "2"))
USER_AGENT = os.getenv(
    "USER_AGENT",
    "WebScrapBot/1.0 (+https://github.com/web-scrap-dashboard)",
)
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "15"))

# Default target (example: a site that allows scraping; replace with your target)
DEFAULT_BASE_URL = os.getenv("SCRAPE_BASE_URL", "https://example.com")
