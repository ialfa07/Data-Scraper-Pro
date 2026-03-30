import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging
from config import config

logger = logging.getLogger(__name__)


class Database:
    def __init__(self):
        self.conn_string = config.DATABASE_URL
        self._conn = None

    def connect(self):
        if not self._conn or self._conn.closed:
            self._conn = psycopg2.connect(self.conn_string)
            self._conn.autocommit = False
        return self._conn

    def _cursor(self):
        return self.connect().cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def close(self):
        if self._conn and not self._conn.closed:
            self._conn.close()

    def episode_exists(self, source_url: str) -> bool:
        with self._cursor() as cur:
            cur.execute("SELECT id FROM episodes WHERE source_url = %s", (source_url,))
            return cur.fetchone() is not None

    def insert_episode(
        self, anime_name: str, season: int, episode: int, source_url: str,
        quality: Optional[str] = None, priority: int = 0
    ) -> Optional[int]:
        try:
            with self._cursor() as cur:
                cur.execute(
                    """INSERT INTO episodes (anime_name, season, episode, source_url, status, quality, priority)
                       VALUES (%s, %s, %s, %s, 'pending', %s, %s)
                       ON CONFLICT (source_url) DO NOTHING
                       RETURNING id""",
                    (anime_name, season, episode, source_url, quality, priority)
                )
                row = cur.fetchone()
                self._conn.commit()
                return row["id"] if row else None
        except Exception as e:
            self._conn.rollback()
            logger.error(f"Erreur insertion épisode: {e}")
            return None

    def update_episode_status(
        self, episode_id: int, status: str,
        video_url: Optional[str] = None, file_path: Optional[str] = None,
        telegram_message_id: Optional[str] = None, error_message: Optional[str] = None,
    ):
        try:
            with self._cursor() as cur:
                cur.execute(
                    """UPDATE episodes SET
                       status = %s,
                       video_url = COALESCE(%s, video_url),
                       file_path = COALESCE(%s, file_path),
                       telegram_message_id = COALESCE(%s, telegram_message_id),
                       error_message = %s,
                       updated_at = NOW()
                       WHERE id = %s""",
                    (status, video_url, file_path, telegram_message_id, error_message, episode_id)
                )
                self._conn.commit()
        except Exception as e:
            self._conn.rollback()
            logger.error(f"Erreur mise à jour épisode {episode_id}: {e}")

    def get_pending_episodes(self) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                "SELECT * FROM episodes WHERE status = 'pending' ORDER BY priority DESC, created_at ASC"
            )
            return [dict(r) for r in cur.fetchall()]

    def get_episode(self, episode_id: int) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM episodes WHERE id = %s", (episode_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def log(self, level: str, message: str, details: Optional[str] = None, episode_id: Optional[int] = None):
        try:
            with self._cursor() as cur:
                cur.execute(
                    """INSERT INTO pipeline_logs (level, message, details, episode_id)
                       VALUES (%s, %s, %s, %s)""",
                    (level, message, details, episode_id)
                )
                self._conn.commit()
        except Exception as e:
            logger.error(f"Erreur écriture log: {e}")

    def get_enabled_sites(self) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM anime_sites WHERE enabled = true ORDER BY name")
            return [dict(r) for r in cur.fetchall()]

    def update_site_last_scraped(self, site_id: int):
        try:
            with self._cursor() as cur:
                cur.execute("UPDATE anime_sites SET last_scraped_at = NOW() WHERE id = %s", (site_id,))
                self._conn.commit()
        except Exception as e:
            self._conn.rollback()
            logger.error(f"Erreur update site: {e}")

    # --- Runs ---
    def create_run(self, trigger: str = "manual") -> Optional[int]:
        try:
            with self._cursor() as cur:
                cur.execute(
                    """INSERT INTO pipeline_runs (started_at, status, trigger, episodes_found, episodes_downloaded, episodes_failed)
                       VALUES (NOW(), 'running', %s, 0, 0, 0) RETURNING id""",
                    (trigger,)
                )
                row = cur.fetchone()
                self._conn.commit()
                return row["id"] if row else None
        except Exception as e:
            self._conn.rollback()
            logger.error(f"Erreur création run: {e}")
            return None

    def finish_run(self, run_id: int, found: int, downloaded: int, failed: int, status: str, duration_seconds: int):
        try:
            with self._cursor() as cur:
                cur.execute(
                    """UPDATE pipeline_runs SET
                       ended_at = NOW(), status = %s,
                       episodes_found = %s, episodes_downloaded = %s, episodes_failed = %s,
                       duration_seconds = %s
                       WHERE id = %s""",
                    (status, found, downloaded, failed, duration_seconds, run_id)
                )
                self._conn.commit()
        except Exception as e:
            self._conn.rollback()
            logger.error(f"Erreur finalisation run: {e}")

    # --- Scheduler ---
    def get_scheduler_config(self) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM scheduler_config ORDER BY id LIMIT 1")
            row = cur.fetchone()
            return dict(row) if row else None

    # --- Whitelist ---
    def get_whitelist(self) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM anime_whitelist ORDER BY priority DESC, anime_name")
            return [dict(r) for r in cur.fetchall()]
