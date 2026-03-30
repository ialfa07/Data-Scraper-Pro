from typing import List
import logging
from .base import BaseCrawler, EpisodeInfo

logger = logging.getLogger(__name__)


class PlaywrightCrawler(BaseCrawler):
    """
    Crawler for JavaScript-heavy sites using Playwright.
    Install: pip install playwright && playwright install chromium
    """

    def __init__(self, base_url: str, site_name: str, episode_list_path: str = "/"):
        super().__init__(base_url, site_name)
        self.episode_list_path = episode_list_path

    def get_recent_episodes(self) -> List[EpisodeInfo]:
        try:
            from playwright.sync_api import sync_playwright
            from bs4 import BeautifulSoup

            url = f"{self.base_url}{self.episode_list_path}"
            episodes = []

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.set_extra_http_headers({
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                })
                page.goto(url, wait_until="networkidle", timeout=30000)
                html = page.content()
                browser.close()

            soup = BeautifulSoup(html, "html.parser")
            return self.parse_episodes(soup)

        except ImportError:
            self.logger.error("Playwright not installed. Run: pip install playwright && playwright install chromium")
            return []
        except Exception as e:
            self.logger.error(f"Playwright error for {self.site_name}: {e}")
            return []

    def parse_episodes(self, soup) -> List[EpisodeInfo]:
        """Override this for site-specific JS parsing."""
        episodes = []
        from bs4 import BeautifulSoup

        for link in soup.find_all("a", href=True):
            href = link["href"]
            text = link.get_text(strip=True)
            if "episode" in href.lower() or "ep" in href.lower():
                episode_num = self.parse_episode_number(href) or self.parse_episode_number(text)
                if episode_num:
                    full_url = href if href.startswith("http") else f"{self.base_url}{href}"
                    anime_name = self.normalize_anime_name(text.split("Episode")[0].strip() if "Episode" in text else text)
                    if anime_name:
                        episodes.append(EpisodeInfo(
                            anime_name=anime_name,
                            season=self.parse_season_number(text),
                            episode=episode_num,
                            source_url=full_url,
                            site_name=self.site_name,
                        ))
        return episodes[:50]
