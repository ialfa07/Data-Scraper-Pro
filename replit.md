# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
This project is an **Anime Pipeline System** — automated scraping, downloading, and Telegram distribution of anime episodes, with a full monitoring dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (anime-dashboard artifact)
- **Python pipeline**: Python 3.11+ (in `/pipeline/`)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── anime-dashboard/    # React dashboard (monitoring UI)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── pipeline/               # Python pipeline system
│   ├── crawler/            # Multi-site anime crawlers
│   ├── parser/             # Video URL extractor (mp4/m3u8)
│   ├── downloader/         # Video downloader (ffmpeg + direct)
│   ├── cloud/              # Google Cloud Storage integration
│   ├── telegram/           # Telegram Bot API sender
│   ├── database/           # PostgreSQL connection (psycopg2)
│   ├── pipeline.py         # Main orchestrator
│   ├── main.py             # CLI entry point
│   ├── config.py           # Environment config
│   └── requirements.txt    # Python dependencies
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Database Schema

- **episodes** — Tracks each anime episode (status: pending/downloading/downloaded/sending/sent/failed)
- **anime_sites** — Configured scraping sites (enabled/disabled, scraper type)
- **pipeline_logs** — Audit log of pipeline activity

## API Routes

- `GET /api/episodes` — List episodes (filter by status, animeName)
- `GET /api/episodes/:id` — Get single episode
- `DELETE /api/episodes/:id` — Delete episode record
- `POST /api/episodes/:id/retry` — Reset failed episode to pending
- `GET /api/pipeline/status` — Check if pipeline is running
- `POST /api/pipeline/run` — Trigger full pipeline run
- `POST /api/pipeline/download` — Queue manual download
- `GET /api/pipeline/stats` — Dashboard statistics
- `GET /api/sites` — List configured sites
- `POST /api/sites` — Add new site
- `PATCH /api/sites/:id` — Update site
- `DELETE /api/sites/:id` — Remove site
- `GET /api/logs` — Pipeline logs (filter by level)

## Python Pipeline Usage

```bash
cd pipeline
pip install -r requirements.txt
cp .env.example .env  # Fill in your credentials

# Full crawl pipeline
python main.py run

# Single episode
python main.py single --anime "Attack on Titan" --season 4 --episode 1 --url "https://..."

# Scheduled mode
python main.py schedule --interval 3600
```

## Environment Variables Required (for Python pipeline)

- `DATABASE_URL` — PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` — From @BotFather
- `TELEGRAM_CHAT_ID` — Target chat/channel ID
- `GCS_BUCKET_NAME` — Google Cloud Storage bucket (optional)
- `GOOGLE_APPLICATION_CREDENTIALS` — GCS service account JSON path (optional)
- `FFMPEG_PATH` — Path to ffmpeg binary (default: `ffmpeg`)
