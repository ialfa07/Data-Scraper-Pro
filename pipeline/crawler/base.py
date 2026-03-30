from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class EpisodeInfo:
    anime_name: str
    season: int
    episode: int
    source_url: str
    site_name: str


class BaseCrawler(ABC):
    """Base class for all anime site crawlers."""

    def __init__(self, base_url: str, site_name: str):
        self.base_url = base_url.rstrip("/")
        self.site_name = site_name
        self.logger = logging.getLogger(f"{__name__}.{site_name}")

    @abstractmethod
    def get_recent_episodes(self) -> List[EpisodeInfo]:
        """Fetch the list of recently released episodes."""
        pass

    def normalize_anime_name(self, raw_name: str) -> str:
        """Clean and normalize anime name for file system use."""
        import re
        name = re.sub(r"[^\w\s-]", "", raw_name)
        name = re.sub(r"\s+", "_", name.strip())
        return name

    def parse_episode_number(self, text: str) -> Optional[int]:
        """Extract episode number from a string."""
        import re
        match = re.search(r"(?:ep|episode|e)[\s\-_]?(\d+)", text.lower())
        if match:
            return int(match.group(1))
        match = re.search(r"(\d+)$", text.strip())
        if match:
            return int(match.group(1))
        return None

    def parse_season_number(self, text: str) -> int:
        """Extract season number from a string, defaulting to 1."""
        import re
        match = re.search(r"(?:s|season|saison)[\s\-_]?(\d+)", text.lower())
        return int(match.group(1)) if match else 1
