import os
import subprocess
import requests
import time
from typing import Optional
from pathlib import Path
import logging
from config import config

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


def make_filename(anime_name: str, season: int, episode: int) -> str:
    """Generate standardized filename: Anime_Name_S01_E01.mp4"""
    safe_name = anime_name.replace(" ", "_").replace("/", "_")
    return f"{safe_name}_S{season:02d}_E{episode:02d}.mp4"


class VideoDownloader:
    """
    Downloads video files from direct mp4 URLs or HLS m3u8 streams.
    Uses ffmpeg for m3u8 reconstruction.
    """

    def __init__(self):
        self.download_dir = Path(config.DOWNLOAD_DIR)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.max_retries = config.MAX_RETRIES

    def download(
        self,
        video_url: str,
        video_type: str,
        anime_name: str,
        season: int,
        episode: int,
    ) -> Optional[str]:
        """
        Download the video and return local file path, or None on failure.
        """
        filename = make_filename(anime_name, season, episode)
        dest_path = str(self.download_dir / filename)

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Downloading [{attempt}/{self.max_retries}]: {filename}")
                if video_type == "mp4":
                    success = self._download_mp4(video_url, dest_path)
                elif video_type == "m3u8":
                    success = self._download_m3u8(video_url, dest_path)
                else:
                    logger.error(f"Unknown video type: {video_type}")
                    return None

                if success and os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
                    logger.info(f"Download complete: {dest_path} ({os.path.getsize(dest_path) // 1024 // 1024} MB)")
                    return dest_path
                else:
                    logger.warning(f"Download produced empty/missing file, attempt {attempt}")

            except Exception as e:
                logger.error(f"Download attempt {attempt} failed: {e}")
                if attempt < self.max_retries:
                    time.sleep(5 * attempt)

        return None

    def _download_mp4(self, url: str, dest_path: str) -> bool:
        """Stream download a direct mp4 file."""
        try:
            with requests.get(url, headers=HEADERS, stream=True, timeout=60) as resp:
                resp.raise_for_status()
                with open(dest_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
            return True
        except Exception as e:
            logger.error(f"MP4 download failed: {e}")
            return False

    def _download_m3u8(self, url: str, dest_path: str) -> bool:
        """Use ffmpeg to reconstruct an HLS m3u8 stream into mp4."""
        cmd = [
            config.FFMPEG_PATH,
            "-y",
            "-i", url,
            "-c", "copy",
            "-bsf:a", "aac_adtstoasc",
            "-movflags", "+faststart",
            dest_path,
        ]
        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=3600,
            )
            if result.returncode != 0:
                logger.error(f"ffmpeg error: {result.stderr.decode()[-500:]}")
                return False
            return True
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg timed out after 1 hour")
            return False
        except FileNotFoundError:
            logger.error("ffmpeg not found. Install it with: apt-get install ffmpeg")
            return False

    def cleanup(self, file_path: str):
        """Remove a downloaded file."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up: {file_path}")
        except Exception as e:
            logger.error(f"Cleanup failed for {file_path}: {e}")
