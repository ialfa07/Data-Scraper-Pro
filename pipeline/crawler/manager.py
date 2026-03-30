from typing import List, Dict, Any
import logging
from .base import EpisodeInfo
from .generic import GenericCrawler
from .playwright_crawler import PlaywrightCrawler

logger = logging.getLogger(__name__)


class CrawlerManager:
    """
    Manages multiple site crawlers and aggregates results.
    Add new site-specific crawlers here.
    """

    def __init__(self, sites: List[Dict[str, Any]]):
        self.sites = sites
        self.crawlers = {}
        self._build_crawlers()

    def _build_crawlers(self):
        for site in self.sites:
            site_id = site["id"]
            scraper_type = site.get("scraper_type", "generic")
            requires_js = site.get("requires_js", False)
            base_url = site["base_url"]
            name = site["name"]

            if requires_js:
                self.crawlers[site_id] = PlaywrightCrawler(base_url, name)
            else:
                self.crawlers[site_id] = GenericCrawler(base_url, name)

    def get_all_new_episodes(self, existing_urls: set) -> List[tuple]:
        """
        Returns list of (site_id, EpisodeInfo) tuples for new episodes only.
        """
        all_episodes = []

        for site in self.sites:
            site_id = site["id"]
            crawler = self.crawlers.get(site_id)
            if not crawler:
                continue

            try:
                logger.info(f"Crawling site: {site['name']}")
                episodes = crawler.get_recent_episodes()
                new_episodes = [
                    (site_id, ep) for ep in episodes
                    if ep.source_url not in existing_urls
                ]
                logger.info(f"Found {len(new_episodes)} new episodes on {site['name']}")
                all_episodes.extend(new_episodes)
            except Exception as e:
                logger.error(f"Failed to crawl {site['name']}: {e}")

        return all_episodes
