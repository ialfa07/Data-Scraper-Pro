"""
Orchestrateur principal de la pipeline.
Flow: crawler → parser → downloader → upload → telegram → discord → delete
"""
import os
import time
import logging
from typing import Optional

from config import config
from database import Database
from crawler import CrawlerManager
from parser import VideoParser
from downloader import VideoDownloader
from cloud import CloudStorage
from telegram import TelegramSender
from discord import DiscordSender

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
        self.discord = DiscordSender()
        self._start_time = None
        self._run_id: Optional[int] = None

    def run(self, trigger: str = "manual"):
        """Exécute la pipeline complète."""
        self._start_time = time.time()
        logger.info("=== Pipeline Anime démarrée ===")

        # Créer un enregistrement de run
        self._run_id = self.db.create_run(trigger)
        self.db.log("info", "Pipeline démarrée")

        episodes_found = 0
        episodes_downloaded = 0
        episodes_failed = 0

        try:
            # Étape 1 : Récupérer les sites activés
            sites = self.db.get_enabled_sites()
            if not sites:
                logger.warning("Aucun site activé")
                self.db.log("warning", "Aucun site activé")
                self._finalize_run(0, 0, 0, "completed")
                return

            # Charger la liste blanche si activée
            scheduler = self.db.get_scheduler_config()
            use_whitelist = scheduler.get("use_whitelist", False) if scheduler else config.USE_WHITELIST
            whitelist = None
            if use_whitelist:
                whitelist = {
                    entry["anime_name"].lower(): entry
                    for entry in self.db.get_whitelist()
                    if entry["enabled"]
                }
                if whitelist:
                    logger.info(f"Liste blanche active : {len(whitelist)} anime(s)")
                    self.db.log("info", f"Liste blanche active : {len(whitelist)} anime(s)")

            # Étape 2 : Crawler
            logger.info(f"Exploration de {len(sites)} site(s)...")
            existing_cursor = self.db.connect().cursor()
            existing_cursor.execute("SELECT source_url FROM episodes")
            existing_urls = {row[0] for row in existing_cursor.fetchall()}

            manager = CrawlerManager(sites)
            new_episodes = manager.get_all_new_episodes(existing_urls)

            # Filtrer par liste blanche si activée
            if whitelist is not None:
                new_episodes = [
                    (sid, ep) for sid, ep in new_episodes
                    if ep.anime_name.lower() in whitelist
                ]

            # Trier par priorité (liste blanche)
            if whitelist:
                def priority_key(item):
                    _, ep = item
                    entry = whitelist.get(ep.anime_name.lower(), {})
                    return -(entry.get("priority", 0))
                new_episodes.sort(key=priority_key)

            episodes_found = len(new_episodes)
            logger.info(f"{episodes_found} nouvel(aux) épisode(s) trouvé(s)")
            self.db.log("info", f"Exploration terminée : {episodes_found} épisode(s) détecté(s)")

            for site in sites:
                self.db.update_site_last_scraped(site["id"])

            # Étape 3 : Insérer et traiter
            for _site_id, ep in new_episodes:
                # Récupérer la qualité depuis la liste blanche ou config globale
                quality = config.DEFAULT_QUALITY
                if whitelist and ep.anime_name.lower() in whitelist:
                    quality = whitelist[ep.anime_name.lower()].get("quality_preference", quality)

                ep_id = self.db.insert_episode(
                    ep.anime_name, ep.season, ep.episode, ep.source_url, quality=quality
                )
                if ep_id:
                    success = self._process_episode(
                        ep_id, ep.source_url, ep.anime_name, ep.season, ep.episode, quality
                    )
                    if success:
                        episodes_downloaded += 1
                    else:
                        episodes_failed += 1

            # Résumé Discord
            if self._start_time:
                duration = int(time.time() - self._start_time)
                self.discord.send_pipeline_summary(
                    episodes_found, episodes_downloaded, episodes_failed, duration
                )

            self._finalize_run(episodes_found, episodes_downloaded, episodes_failed, "completed")

        except Exception as e:
            logger.error(f"Erreur pipeline: {e}", exc_info=True)
            self.db.log("error", f"Erreur critique pipeline: {e}")
            self._finalize_run(episodes_found, episodes_downloaded, episodes_failed, "failed")
        finally:
            self.db.close()
            logger.info("=== Pipeline terminée ===")

    def _finalize_run(self, found: int, downloaded: int, failed: int, status: str):
        if self._run_id:
            duration = int(time.time() - self._start_time) if self._start_time else 0
            self.db.finish_run(self._run_id, found, downloaded, failed, status, duration)

    def _process_episode(
        self, ep_id: int, source_url: str, anime_name: str, season: int, episode: int, quality: str = "best"
    ) -> bool:
        """Traite un épisode de A à Z. Retourne True si succès."""
        label = f"{anime_name} S{season:02d}E{episode:02d}"
        logger.info(f"Traitement : {label}")

        # Parser
        self.db.update_episode_status(ep_id, "downloading")
        video_result = self.parser.get_video_url(source_url)

        if not video_result:
            err = "URL vidéo introuvable sur la page de l'épisode"
            logger.error(f"{label}: {err}")
            self.db.update_episode_status(ep_id, "failed", error_message=err)
            self.db.log("error", f"Vidéo introuvable : {label}", episode_id=ep_id)
            self._notify_error(anime_name, season, episode, err)
            return False

        video_url, video_type = video_result
        self.db.update_episode_status(ep_id, "downloading", video_url=video_url)
        self.db.log("info", f"URL vidéo trouvée ({video_type}) : {label}", episode_id=ep_id)

        # Téléchargement
        file_path = self.downloader.download(video_url, video_type, anime_name, season, episode, quality=quality)

        if not file_path:
            err = "Échec du téléchargement après plusieurs tentatives"
            logger.error(f"{label}: {err}")
            self.db.update_episode_status(ep_id, "failed", error_message=err)
            self.db.log("error", f"Téléchargement échoué : {label}", episode_id=ep_id)
            self._notify_error(anime_name, season, episode, err)
            return False

        self.db.update_episode_status(ep_id, "downloaded", file_path=file_path)
        self.db.log("success", f"Téléchargé : {label}", episode_id=ep_id)

        # Upload GCS (optionnel)
        gcs_uri = None
        if config.GCS_BUCKET_NAME:
            gcs_uri = self.cloud.upload(file_path)
            if gcs_uri:
                self.db.log("info", f"Uploadé sur GCS : {gcs_uri}", episode_id=ep_id)

        # Envoi Telegram
        self.db.update_episode_status(ep_id, "sending")
        file_size_mb = os.path.getsize(file_path) / 1024 / 1024
        msg_id = self.telegram.send_video(file_path, anime_name, season, episode)

        if not msg_id:
            err = "Échec de l'envoi Telegram"
            logger.error(f"{label}: {err}")
            self.db.update_episode_status(ep_id, "failed", error_message=err)
            self.db.log("error", f"Envoi Telegram échoué : {label}", episode_id=ep_id)
            self.downloader.cleanup(file_path)
            self._notify_error(anime_name, season, episode, err)
            return False

        # Notification Discord succès
        self.discord.send_episode_notification(anime_name, season, episode, "envoyé", file_size_mb)

        # Finalisation
        self.db.update_episode_status(ep_id, "sent", telegram_message_id=msg_id)
        self.db.log("success", f"Envoyé sur Telegram : {label} (msg {msg_id})", episode_id=ep_id)

        if gcs_uri:
            self.cloud.delete(os.path.basename(file_path))

        self.downloader.cleanup(file_path)
        logger.info(f"Terminé : {label}")
        return True

    def _notify_error(self, anime_name: str, season: int, episode: int, error: str):
        """Notification d'erreur sur Telegram et Discord si activé."""
        scheduler = self.db.get_scheduler_config()
        notify = scheduler.get("notify_on_error", config.NOTIFY_ON_ERROR) if scheduler else config.NOTIFY_ON_ERROR
        if notify:
            self.telegram.send_message(
                f"⚠️ <b>Erreur pipeline</b>\n"
                f"<b>{anime_name}</b> S{season:02d}E{episode:02d}\n"
                f"<code>{error}</code>"
            )
        self.discord.send_error_notification(anime_name, season, episode, error)


def run_single(anime_name: str, season: int, episode: int, source_url: str, quality: str = "best"):
    """Lance la pipeline pour un seul épisode."""
    pipeline = AnimePipeline()
    ep_id = pipeline.db.insert_episode(anime_name, season, episode, source_url, quality=quality)
    if ep_id:
        pipeline._process_episode(ep_id, source_url, anime_name, season, episode, quality)
    pipeline.db.close()


if __name__ == "__main__":
    pipeline = AnimePipeline()
    pipeline.run()
