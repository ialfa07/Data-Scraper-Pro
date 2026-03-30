import os
import requests
import time
from typing import Optional
import logging
from config import config

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot"
MAX_FILE_SIZE_MB = 50  # Telegram direct upload limit


class TelegramSender:
    """
    Sends video files to a Telegram chat via the Bot API.
    Handles large files by splitting or using URL-based approach.
    """

    def __init__(self):
        self.token = config.TELEGRAM_BOT_TOKEN
        self.chat_id = config.TELEGRAM_CHAT_ID
        self.base_url = f"{TELEGRAM_API}{self.token}"

    def send_video(
        self,
        file_path: str,
        anime_name: str,
        season: int,
        episode: int,
        caption: Optional[str] = None,
    ) -> Optional[str]:
        """
        Send a video file to Telegram.
        Returns the message_id string on success, None on failure.
        """
        if not self.token or not self.chat_id:
            logger.warning("Telegram not configured (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing)")
            return None

        file_size_mb = os.path.getsize(file_path) / 1024 / 1024
        default_caption = (
            f"🎬 {anime_name}\n"
            f"📺 Season {season:02d} | Episode {episode:02d}\n"
            f"📦 Size: {file_size_mb:.1f} MB"
        )
        text = caption or default_caption

        if file_size_mb > MAX_FILE_SIZE_MB:
            logger.warning(f"File is {file_size_mb:.1f} MB, exceeding Telegram limit of {MAX_FILE_SIZE_MB} MB")
            return self._send_as_document_chunked(file_path, text)

        return self._send_video_direct(file_path, text)

    def _send_video_direct(self, file_path: str, caption: str) -> Optional[str]:
        """Upload and send video directly to Telegram."""
        try:
            logger.info(f"Sending video to Telegram: {os.path.basename(file_path)}")
            with open(file_path, "rb") as f:
                resp = requests.post(
                    f"{self.base_url}/sendVideo",
                    data={
                        "chat_id": self.chat_id,
                        "caption": caption,
                        "parse_mode": "HTML",
                        "supports_streaming": "true",
                    },
                    files={"video": f},
                    timeout=300,
                )
            resp.raise_for_status()
            result = resp.json()
            if result.get("ok"):
                msg_id = str(result["result"]["message_id"])
                logger.info(f"Sent to Telegram, message_id: {msg_id}")
                return msg_id
            else:
                logger.error(f"Telegram API error: {result}")
                return None
        except Exception as e:
            logger.error(f"Telegram send failed: {e}")
            return None

    def _send_as_document_chunked(self, file_path: str, caption: str) -> Optional[str]:
        """For large files, send as document (less compression, same size limits)."""
        try:
            logger.info(f"Sending as document (large file): {os.path.basename(file_path)}")
            with open(file_path, "rb") as f:
                resp = requests.post(
                    f"{self.base_url}/sendDocument",
                    data={
                        "chat_id": self.chat_id,
                        "caption": caption[:1024],
                        "parse_mode": "HTML",
                    },
                    files={"document": f},
                    timeout=600,
                )
            resp.raise_for_status()
            result = resp.json()
            if result.get("ok"):
                msg_id = str(result["result"]["message_id"])
                logger.info(f"Sent as document to Telegram, message_id: {msg_id}")
                return msg_id
            else:
                logger.error(f"Telegram API error: {result}")
                return None
        except Exception as e:
            logger.error(f"Telegram document send failed: {e}")
            return None

    def send_message(self, text: str) -> bool:
        """Send a plain text message to Telegram."""
        try:
            resp = requests.post(
                f"{self.base_url}/sendMessage",
                json={
                    "chat_id": self.chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                },
                timeout=30,
            )
            return resp.json().get("ok", False)
        except Exception as e:
            logger.error(f"Telegram message failed: {e}")
            return False
