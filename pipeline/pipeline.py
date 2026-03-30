"""
Main pipeline orchestrator.
Flow: crawler → parser → downloader → upload → telegram → delete
"""
import os
import sys
import logging
from typing import Optional

from config import config
from database import Database
from crawler import CrawlerManager
from parser import VideoParser
from downloader import VideoDownloader
from cloud import CloudStorage
from telegram import TelegramSender

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pipeline")


class AnimePipeline:
    def __init__(self):
        self.db = Database()
        self.parser = VideoParser(use_playwright=config.USE_PLAYWRIGHT)
        self.downloader = VideoDownloader()
        self.cloud = CloudStorage()
        self.telegram = TelegramSender()

    def run(self):
        """Execute the full pipeline."""
        logger.info("=== Anime Pipeline Started ===")
        self.db.log("info", "Pipeline started")

        try:
            # Step 1: Crawl all enabled sites
            sites = self.db.get_enabled_sites()
            if not sites:
                logger.warning("No enabled sites configured")
                self.db.log("warning", "No enabled sites configured")
                return

            logger.info(f"Crawling {len(sites)} sites...")

            existing_episodes = self.db.connect().cursor()
            existing_episodes.execute("SELECT source_url FROM episodes")
            existing_urls = {row[0] for row in existing_episodes.fetchall()}

            manager = CrawlerManager(sites)
            new_episodes = manager.get_all_new_episodes(existing_urls)

            logger.info(f"Found {len(new_episodes)} new episodes")
            self.db.log("info", f"Crawl complete: found {len(new_episodes)} new episodes")

            # Update last_scraped_at for all sites
            for site in sites:
                self.db.update_site_last_scraped(site["id"])

            # Step 2: Insert new episodes into DB
            episode_records = []
            for _site_id, ep in new_episodes:
                ep_id = self.db.insert_episode(
                    ep.anime_name, ep.season, ep.episode, ep.source_url
                )
                if ep_id:
                    episode_records.append((ep_id, ep))

            # Step 3: Process each episode
            for ep_id, ep in episode_records:
                self._process_episode(ep_id, ep.source_url, ep.anime_name, ep.season, ep.episode)

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            self.db.log("error", f"Pipeline error: {e}")
        finally:
            self.db.close()
            logger.info("=== Pipeline Complete ===")

    def _process_episode(
        self, ep_id: int, source_url: str, anime_name: str, season: int, episode: int
    ):
        """Process a single episode through the full pipeline."""
        label = f"{anime_name} S{season:02d}E{episode:02d}"
        logger.info(f"Processing: {label}")

        # Step 1: Parse video URL
        self.db.update_episode_status(ep_id, "downloading")
        video_result = self.parser.get_video_url(source_url)

        if not video_result:
            err = "Could not find video URL on episode page"
            logger.error(f"{label}: {err}")
            self.db.update_episode_status(ep_id, "failed", error_message=err)
            self.db.log("error", f"No video found for {label}", episode_id=ep_id)
            return

        video_url, video_type = video_result
        self.db.update_episode_status(ep_id, "downloading", video_url=video_url)
        self.db.log("info", f"Video URL found ({video_type}): {label}", episode_id=ep_id)

        # Step 2: Download video
        file_path = self.downloader.download(video_url, video_type, anime_name, season, episode)

        if not file_path:
            err = "Download failed after retries"
            logger.error(f"{label}: {err}")
            self.db.update_episode_status(ep_id, "failed", error_message=err)
            self.db.log("error", f"Download failed: {label}", episode_id=ep_id)
            return

        self.db.update_episode_status(ep_id, "downloaded", file_path=file_path)
        self.db.log("success", f"Downloaded: {label}", episode_id=ep_id)

        # Step 3: Upload to GCS (optional, if configured)
        gcs_uri = None
        if config.GCS_BUCKET_NAME:
            gcs_uri = self.cloud.upload(file_path)
            if gcs_uri:
                self.db.log("info", f"Uploaded to GCS: {gcs_uri}", episode_id=ep_id)

        # Step 4: Send to Telegram
        self.db.update_episode_status(ep_id, "sending")
        msg_id = self.telegram.send_video(file_path, anime_name, season, episode)

        if not msg_id:
            err = "Telegram send failed"
            logger.error(f"{label}: {err}")
            self.db.update_episode_status(ep_id, "failed", error_message=err)
            self.db.log("error", f"Telegram send failed: {label}", episode_id=ep_id)
            # Still clean up local file
            self.downloader.cleanup(file_path)
            return

        # Step 5: Mark sent, clean up GCS
        self.db.update_episode_status(ep_id, "sent", telegram_message_id=msg_id)
        self.db.log("success", f"Sent to Telegram: {label} (msg {msg_id})", episode_id=ep_id)

        if gcs_uri:
            blob_name = os.path.basename(file_path)
            self.cloud.delete(blob_name)

        # Clean up local file
        self.downloader.cleanup(file_path)
        logger.info(f"Done: {label}")


def run_single(anime_name: str, season: int, episode: int, source_url: str):
    """Run the pipeline for a single manually-specified episode."""
    pipeline = AnimePipeline()
    ep_id = pipeline.db.insert_episode(anime_name, season, episode, source_url)
    if ep_id:
        pipeline._process_episode(ep_id, source_url, anime_name, season, episode)
    pipeline.db.close()


if __name__ == "__main__":
    pipeline = AnimePipeline()
    pipeline.run()
