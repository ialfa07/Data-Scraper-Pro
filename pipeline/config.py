import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    GCS_BUCKET_NAME: str = os.getenv("GCS_BUCKET_NAME", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    DOWNLOAD_DIR: str = os.getenv("DOWNLOAD_DIR", "/tmp/anime_downloads")
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    USE_PLAYWRIGHT: bool = os.getenv("USE_PLAYWRIGHT", "false").lower() == "true"
    CONCURRENT_DOWNLOADS: int = int(os.getenv("CONCURRENT_DOWNLOADS", "2"))
    HEADLESS_BROWSER: bool = os.getenv("HEADLESS_BROWSER", "true").lower() == "true"

config = Config()
