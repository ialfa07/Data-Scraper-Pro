import requests
from bs4 import BeautifulSoup
from typing import List
import logging
from .base import BaseCrawler, EpisodeInfo

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


class GenericCrawler(BaseCrawler):
    """
    Generic HTML scraper using BeautifulSoup.
    Extend this class for specific sites by overriding parse_episodes().
    """

    def __init__(self, base_url: str, site_name: str, episode_list_path: str = "/"):
        super().__init__(base_url, site_name)
        self.episode_list_path = episode_list_path

    def fetch_page(self, url: str) -> BeautifulSoup:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")

    def get_recent_episodes(self) -> List[EpisodeInfo]:
        try:
            url = f"{self.base_url}{self.episode_list_path}"
            soup = self.fetch_page(url)
            return self.parse_episodes(soup)
        except Exception as e:
            self.logger.error(f"Error crawling {self.site_name}: {e}")
            return []

    def parse_episodes(self, soup: BeautifulSoup) -> List[EpisodeInfo]:
        """
        Override this method in site-specific crawlers.
        By default, tries common patterns used by anime sites.
        """
        episodes = []

        # Pattern 1: links with "episode" in href
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

        return episodes[:50]  # Limit to 50 most recent
