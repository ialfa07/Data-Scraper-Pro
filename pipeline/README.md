# Anime Pipeline

Automated anime scraping, downloading, and Telegram distribution system.

## Architecture

```
crawler/ → parser/ → downloader/ → cloud/ → telegram/
                                              ↓
                                         database/ (track status)
```

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
playwright install chromium  # Only if USE_PLAYWRIGHT=true
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run the pipeline

```bash
# Full run (crawl all sites)
python main.py run

# Single episode
python main.py single --anime "Attack on Titan" --season 4 --episode 1 --url "https://example.com/aot-s4-ep1"

# Scheduled mode (every hour)
python main.py schedule --interval 3600
```

## Adding a New Site

1. Create `crawler/my_site.py` extending `BaseCrawler`
2. Override `get_recent_episodes()` to return `List[EpisodeInfo]`
3. Add the site via the dashboard (Sites page) or directly in DB

```python
from crawler.base import BaseCrawler, EpisodeInfo

class MySiteCrawler(BaseCrawler):
    def get_recent_episodes(self):
        soup = self.fetch_page(f"{self.base_url}/recent")
        # ... parse HTML
        return [EpisodeInfo(
            anime_name="My Anime",
            season=1,
            episode=5,
            source_url="https://mysite.com/ep5",
            site_name=self.site_name,
        )]
```

4. Register in `crawler/manager.py`

## Docker

```bash
docker build -t anime-pipeline .
docker run -d --env-file .env anime-pipeline
```

## Google Cloud Run

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/anime-pipeline
gcloud run deploy anime-pipeline \
  --image gcr.io/YOUR_PROJECT/anime-pipeline \
  --region us-central1 \
  --set-env-vars DATABASE_URL=... \
  --set-env-vars TELEGRAM_BOT_TOKEN=...
```

## Scheduled Execution (Cloud Scheduler)

```bash
gcloud scheduler jobs create http anime-pipeline-job \
  --schedule="0 * * * *" \
  --uri="https://YOUR_CLOUD_RUN_URL/run" \
  --http-method=POST
```
