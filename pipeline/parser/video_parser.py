import requests
import re
from typing import Optional, Tuple
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


class VideoParser:
    """
    Extracts video URLs (mp4 direct or m3u8 HLS) from episode pages.
    Supports both static HTML and JavaScript-rendered pages.
    """

    def __init__(self, use_playwright: bool = False):
        self.use_playwright = use_playwright

    def get_video_url(self, episode_url: str) -> Optional[Tuple[str, str]]:
        """
        Returns (video_url, video_type) where video_type is 'mp4' or 'm3u8'.
        Returns None if no video found.
        """
        try:
            html = self._fetch_html(episode_url)
            if not html:
                return None

            # Try direct mp4 link
            mp4_url = self._find_mp4(html, episode_url)
            if mp4_url:
                logger.info(f"Found mp4: {mp4_url[:80]}...")
                return (mp4_url, "mp4")

            # Try m3u8 HLS stream
            m3u8_url = self._find_m3u8(html, episode_url)
            if m3u8_url:
                logger.info(f"Found m3u8: {m3u8_url[:80]}...")
                return (m3u8_url, "m3u8")

            # Try iframe/embed extraction
            embed_url = self._find_embed_iframe(html)
            if embed_url:
                logger.info(f"Found embed iframe, recursing into: {embed_url[:80]}...")
                return self.get_video_url(embed_url)

            logger.warning(f"No video found at: {episode_url}")
            return None

        except Exception as e:
            logger.error(f"Error parsing video from {episode_url}: {e}")
            return None

    def _fetch_html(self, url: str) -> Optional[str]:
        if self.use_playwright:
            return self._fetch_with_playwright(url)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            logger.error(f"HTTP fetch failed for {url}: {e}")
            return None

    def _fetch_with_playwright(self, url: str) -> Optional[str]:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, wait_until="networkidle", timeout=30000)
                html = page.content()
                browser.close()
                return html
        except ImportError:
            logger.error("Playwright not installed")
            return None
        except Exception as e:
            logger.error(f"Playwright fetch failed for {url}: {e}")
            return None

    def _find_mp4(self, html: str, base_url: str) -> Optional[str]:
        patterns = [
            r'["\']([^"\']*\.mp4[^"\']*)["\']',
            r'file:\s*["\']([^"\']*\.mp4[^"\']*)["\']',
            r'src:\s*["\']([^"\']*\.mp4[^"\']*)["\']',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith("http"):
                    return match
                elif match.startswith("//"):
                    return f"https:{match}"
        return None

    def _find_m3u8(self, html: str, base_url: str) -> Optional[str]:
        patterns = [
            r'["\']([^"\']*\.m3u8[^"\']*)["\']',
            r'file:\s*["\']([^"\']*\.m3u8[^"\']*)["\']',
            r'src:\s*["\']([^"\']*\.m3u8[^"\']*)["\']',
            r'hls["\']?\s*[:=]\s*["\']([^"\']+)["\']',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith("http"):
                    return match
                elif match.startswith("//"):
                    return f"https:{match}"
        return None

    def _find_embed_iframe(self, html: str) -> Optional[str]:
        soup = BeautifulSoup(html, "html.parser")
        for iframe in soup.find_all("iframe", src=True):
            src = iframe["src"]
            if src and ("embed" in src.lower() or "player" in src.lower() or "video" in src.lower()):
                if src.startswith("//"):
                    return f"https:{src}"
                return src
        return None
