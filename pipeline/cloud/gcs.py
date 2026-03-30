import os
from typing import Optional
import logging
from config import config

logger = logging.getLogger(__name__)


class CloudStorage:
    """
    Google Cloud Storage integration for temporary video storage.
    Upload after download, delete after Telegram send.
    """

    def __init__(self):
        self.bucket_name = config.GCS_BUCKET_NAME
        self._client = None
        self._bucket = None

    def _get_client(self):
        if self._client is None:
            try:
                from google.cloud import storage
                self._client = storage.Client()
                self._bucket = self._client.bucket(self.bucket_name)
            except ImportError:
                raise ImportError("google-cloud-storage not installed. Run: pip install google-cloud-storage")
        return self._client, self._bucket

    def upload(self, local_path: str, destination_blob_name: Optional[str] = None) -> Optional[str]:
        """
        Upload a local file to GCS bucket.
        Returns the GCS URI (gs://bucket/blob) or None on failure.
        """
        if not self.bucket_name:
            logger.warning("GCS_BUCKET_NAME not configured, skipping upload")
            return None

        try:
            client, bucket = self._get_client()
            blob_name = destination_blob_name or os.path.basename(local_path)
            blob = bucket.blob(blob_name)

            logger.info(f"Uploading {local_path} to gs://{self.bucket_name}/{blob_name}")
            blob.upload_from_filename(local_path)
            logger.info(f"Upload complete: gs://{self.bucket_name}/{blob_name}")

            return f"gs://{self.bucket_name}/{blob_name}"
        except Exception as e:
            logger.error(f"GCS upload failed: {e}")
            return None

    def download(self, blob_name: str, local_path: str) -> bool:
        """Download a blob from GCS to a local file."""
        if not self.bucket_name:
            return False
        try:
            client, bucket = self._get_client()
            blob = bucket.blob(blob_name)
            blob.download_to_filename(local_path)
            logger.info(f"Downloaded gs://{self.bucket_name}/{blob_name} to {local_path}")
            return True
        except Exception as e:
            logger.error(f"GCS download failed: {e}")
            return False

    def delete(self, blob_name: str) -> bool:
        """Delete a blob from GCS bucket."""
        if not self.bucket_name:
            return False
        try:
            client, bucket = self._get_client()
            blob = bucket.blob(blob_name)
            blob.delete()
            logger.info(f"Deleted gs://{self.bucket_name}/{blob_name}")
            return True
        except Exception as e:
            logger.error(f"GCS delete failed: {e}")
            return False

    def get_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> Optional[str]:
        """Generate a temporary signed URL for a blob."""
        if not self.bucket_name:
            return None
        try:
            from datetime import timedelta
            client, bucket = self._get_client()
            blob = bucket.blob(blob_name)
            url = blob.generate_signed_url(
                expiration=timedelta(minutes=expiration_minutes),
                method="GET",
            )
            return url
        except Exception as e:
            logger.error(f"Signed URL generation failed: {e}")
            return None
