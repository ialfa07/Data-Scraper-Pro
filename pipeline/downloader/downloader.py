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

QUALITY_MAP = {
    "best": "bestvideo+bestaudio/best",
    "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
    "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]",
    "worst": "worstvideo+worstaudio/worst",
}


def make_filename(anime_name: str, season: int, episode: int) -> str:
    """Génère un nom de fichier normalisé : Anime_Name_S01_E01.mp4"""
    safe_name = anime_name.replace(" ", "_").replace("/", "_")
    return f"{safe_name}_S{season:02d}_E{episode:02d}.mp4"


class VideoDownloader:
    """
    Télécharge des fichiers vidéo depuis des URLs mp4 directes ou des flux HLS m3u8.
    Supporte la sélection de qualité vidéo.
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
        quality: str = "best",
    ) -> Optional[str]:
        """Télécharge la vidéo et retourne le chemin local, ou None en cas d'échec."""
        filename = make_filename(anime_name, season, episode)
        dest_path = str(self.download_dir / filename)

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Téléchargement [{attempt}/{self.max_retries}] (qualité: {quality}): {filename}")

                if video_type == "mp4":
                    success = self._download_mp4(video_url, dest_path)
                elif video_type == "m3u8":
                    success = self._download_m3u8(video_url, dest_path, quality)
                else:
                    logger.error(f"Type vidéo inconnu: {video_type}")
                    return None

                if success and os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
                    size_mb = os.path.getsize(dest_path) / 1024 / 1024
                    logger.info(f"Téléchargement terminé: {dest_path} ({size_mb:.1f} Mo)")
                    return dest_path
                else:
                    logger.warning(f"Fichier vide ou manquant, tentative {attempt}")

            except Exception as e:
                logger.error(f"Tentative {attempt} échouée: {e}")
                if attempt < self.max_retries:
                    time.sleep(5 * attempt)

        return None

    def _download_mp4(self, url: str, dest_path: str) -> bool:
        """Téléchargement en streaming d'un fichier mp4 direct."""
        try:
            with requests.get(url, headers=HEADERS, stream=True, timeout=60) as resp:
                resp.raise_for_status()
                with open(dest_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
            return True
        except Exception as e:
            logger.error(f"Erreur téléchargement mp4: {e}")
            return False

    def _download_m3u8(self, url: str, dest_path: str, quality: str = "best") -> bool:
        """
        Utilise ffmpeg pour reconstituer un flux HLS m3u8 en mp4.
        Tente d'abord yt-dlp pour la sélection de qualité si disponible.
        """
        # Essayer yt-dlp d'abord (meilleure gestion qualité)
        if self._try_ytdlp(url, dest_path, quality):
            return True
        # Fallback ffmpeg
        return self._ffmpeg_download(url, dest_path)

    def _try_ytdlp(self, url: str, dest_path: str, quality: str = "best") -> bool:
        """Télécharge avec yt-dlp si disponible (meilleure gestion de la qualité)."""
        format_str = QUALITY_MAP.get(quality, QUALITY_MAP["best"])
        cmd = [
            "yt-dlp",
            "-f", format_str,
            "-o", dest_path,
            "--no-playlist",
            "--merge-output-format", "mp4",
            url,
        ]
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=3600)
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def _ffmpeg_download(self, url: str, dest_path: str) -> bool:
        """Télécharge avec ffmpeg (fallback)."""
        cmd = [
            config.FFMPEG_PATH, "-y",
            "-i", url,
            "-c", "copy",
            "-bsf:a", "aac_adtstoasc",
            "-movflags", "+faststart",
            dest_path,
        ]
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=3600)
            if result.returncode != 0:
                logger.error(f"Erreur ffmpeg: {result.stderr.decode()[-500:]}")
                return False
            return True
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg timeout après 1 heure")
            return False
        except FileNotFoundError:
            logger.error("ffmpeg introuvable. Installez-le : apt-get install ffmpeg")
            return False

    def cleanup(self, file_path: str):
        """Supprime un fichier téléchargé."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Nettoyé: {file_path}")
        except Exception as e:
            logger.error(f"Erreur nettoyage {file_path}: {e}")
