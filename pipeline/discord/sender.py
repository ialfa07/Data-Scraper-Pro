import requests
import os
from typing import Optional
import logging
from config import config

logger = logging.getLogger(__name__)


class DiscordSender:
    """
    Envoie des notifications sur Discord via Webhook.
    Configure DISCORD_WEBHOOK_URL dans le .env pour activer.
    """

    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or getattr(config, "DISCORD_WEBHOOK_URL", "")

    def is_configured(self) -> bool:
        return bool(self.webhook_url)

    def send_episode_notification(
        self,
        anime_name: str,
        season: int,
        episode: int,
        status: str = "envoyé",
        file_size_mb: Optional[float] = None,
    ) -> bool:
        """Envoie une notification d'épisode sur Discord."""
        if not self.is_configured():
            return False

        color = 0x00FF88 if status == "envoyé" else 0xFF4444

        embed = {
            "title": f"🎬 {anime_name}",
            "description": f"**Saison {season:02d} — Épisode {episode:02d}**",
            "color": color,
            "fields": [
                {"name": "Statut", "value": status.capitalize(), "inline": True},
            ],
            "footer": {"text": "Anime Pipeline Nexus"},
        }

        if file_size_mb:
            embed["fields"].append(
                {"name": "Taille", "value": f"{file_size_mb:.1f} Mo", "inline": True}
            )

        return self._send({"embeds": [embed]})

    def send_error_notification(
        self,
        anime_name: str,
        season: int,
        episode: int,
        error_message: str,
    ) -> bool:
        """Envoie une alerte d'erreur sur Discord."""
        if not self.is_configured():
            return False

        embed = {
            "title": f"⚠️ Échec — {anime_name}",
            "description": f"**S{season:02d}E{episode:02d}** n'a pas pu être traité.",
            "color": 0xFF4444,
            "fields": [
                {"name": "Erreur", "value": error_message[:1024], "inline": False},
            ],
            "footer": {"text": "Anime Pipeline Nexus"},
        }

        return self._send({"embeds": [embed]})

    def send_pipeline_summary(
        self,
        found: int,
        downloaded: int,
        failed: int,
        duration_seconds: int,
    ) -> bool:
        """Envoie un résumé de fin de pipeline sur Discord."""
        if not self.is_configured():
            return False

        minutes = duration_seconds // 60
        seconds = duration_seconds % 60

        embed = {
            "title": "✅ Pipeline terminée",
            "color": 0x5865F2,
            "fields": [
                {"name": "Détectés", "value": str(found), "inline": True},
                {"name": "Téléchargés", "value": str(downloaded), "inline": True},
                {"name": "Erreurs", "value": str(failed), "inline": True},
                {"name": "Durée", "value": f"{minutes}m {seconds}s", "inline": True},
            ],
            "footer": {"text": "Anime Pipeline Nexus"},
        }

        return self._send({"embeds": [embed]})

    def _send(self, payload: dict) -> bool:
        try:
            resp = requests.post(self.webhook_url, json=payload, timeout=10)
            resp.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Discord webhook error: {e}")
            return False
