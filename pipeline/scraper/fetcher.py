"""
HTTP fetcher with robots.txt check, rate limiting, and configurable User-Agent.
"""
import time
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from scraper.config import REQUEST_TIMEOUT, SCRAPE_DELAY_SECONDS, USER_AGENT
from scraper.robots import can_fetch


class Fetcher:
    """Respectful HTTP client: robots.txt, delay, retries, timeout."""

    def __init__(
        self,
        user_agent: str = USER_AGENT,
        delay_seconds: float = SCRAPE_DELAY_SECONDS,
        timeout: int = REQUEST_TIMEOUT,
        respect_robots: bool = True,
    ):
        self.user_agent = user_agent
        self.delay_seconds = delay_seconds
        self.timeout = timeout
        self.respect_robots = respect_robots
        self._last_fetch_time: float = 0
        self._session = requests.Session()
        self._session.headers["User-Agent"] = user_agent
        retry = Retry(total=3, backoff_factor=1, status_forcelist=(502, 503, 504))
        self._session.mount("https://", HTTPAdapter(max_retries=retry))
        self._session.mount("http://", HTTPAdapter(max_retries=retry))

    def _wait_delay(self) -> None:
        elapsed = time.monotonic() - self._last_fetch_time
        if elapsed < self.delay_seconds:
            time.sleep(self.delay_seconds - elapsed)
        self._last_fetch_time = time.monotonic()

    def get(self, url: str) -> requests.Response:
        if self.respect_robots and not can_fetch(url, self.user_agent):
            raise PermissionError(f"robots.txt disallows: {url}")
        self._wait_delay()
        return self._session.get(url, timeout=self.timeout)

    def get_html(self, url: str) -> Optional[str]:
        """Fetch URL and return response text or None on failure."""
        try:
            resp = self.get(url)
            resp.raise_for_status()
            return resp.text
        except Exception:
            return None
