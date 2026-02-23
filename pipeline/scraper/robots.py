"""
Robots.txt compliance: check whether we are allowed to fetch a URL
before making requests. Uses urllib.robotparser.
"""
import urllib.robotparser
from urllib.parse import urljoin, urlparse

from scraper.config import USER_AGENT


def get_robots_parser(base_url: str) -> urllib.robotparser.RobotFileParser:
    """Fetch and parse robots.txt for the given origin."""
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    robots_url = urljoin(origin, "/robots.txt")
    parser = urllib.robotparser.RobotFileParser()
    parser.set_url(robots_url)
    parser.read()
    return parser


def can_fetch(url: str, user_agent: str = USER_AGENT) -> bool:
    """
    Return True if robots.txt allows the given user_agent to fetch the URL.
    If robots.txt is unreachable or invalid, we disallow by default (safe).
    """
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    try:
        parser = get_robots_parser(origin)
        return parser.can_fetch(user_agent, url)
    except Exception:
        return False
