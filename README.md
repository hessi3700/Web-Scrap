# Web Scraper + Data Analysis Dashboard

A production-grade ETL pipeline that scrapes listing data (with robots.txt compliance), stores it in PostgreSQL, runs scheduled jobs via Celery/Redis, and exposes a REST API and dashboard. The frontend is hosted on **GitHub Pages** and the API on **Cloudflare Workers**.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Python ETL     │     │  Cloudflare      │     │  React Dashboard │
│  (Scraper +     │────▶│  Worker + D1     │◀────│  (GitHub Pages)  │
│  Celery + PG)   │     │  REST API        │     │  Chart.js / D3   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                          │
   Redis + PostgreSQL              D1 (SQLite)
   Scheduled tasks                 CORS, serverless
```

## Features

- **Respectful scraping**: Honors `robots.txt`, configurable delay, User-Agent
- **ETL pipeline**: Extract (BeautifulSoup/Scrapy) → Transform → Load (PostgreSQL)
- **Async tasks**: Celery beat for daily/scheduled scrapes; Redis broker
- **API**: Cloudflare Worker with D1; ingest endpoint for pipeline, read for dashboard
- **Dashboard**: Reactive UI, price trends, area comparison, filters

## Repositories / Deploy

| Part        | Location        | Deploy                    |
|------------|-----------------|---------------------------|
| Frontend   | `frontend/`     | GitHub Pages (static)     |
| API        | `worker/`       | Cloudflare Workers + D1   |
| Pipeline   | `pipeline/`     | Run locally or cron/VPS   |

## Quick Start

### Pipeline (Python ETL)

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # set DATABASE_URL, REDIS_URL, API_INGEST_URL
docker compose up -d   # PostgreSQL + Redis
alembic upgrade head
celery -A celery_app worker -l info &
celery -A celery_app beat -l info &
python -m scraper.run_once  # optional: one-off scrape
```

### Worker (API)

```bash
cd worker
npm install
npx wrangler d1 create web-scrap-db
# Add the returned database_id to wrangler.toml under [[d1_databases]]
npx wrangler d1 execute web-scrap-db --remote --file=./schema.sql
npm run deploy
```

Optional: set `INGEST_SECRET` for protected ingest: `npx wrangler secret put INGEST_SECRET`

### Frontend (GitHub Pages)

```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE to your Worker URL
npm install
npm run build
```

- **GitHub Actions**: Push to `main`; ensure Pages is set to "GitHub Actions" in repo Settings → Pages. Add secret `VITE_API_BASE` (Worker URL) so the build can call the API.
- **Base path**: For project Pages (`https://<user>.github.io/Web-Scrap/`), the workflow sets `GITHUB_PAGES=1` so `base` is `/Web-Scrap/`. For a user/org site use `base: "/"` in `vite.config.ts`.

## Tech Stack

| Layer     | Tech |
|----------|------|
| Scraping | Python, BeautifulSoup, Scrapy, requests |
| Schedule | Celery, Redis |
| ETL DB   | PostgreSQL, SQLAlchemy, Alembic |
| API      | Cloudflare Workers (TypeScript), D1 |
| Frontend | React, Vite, Chart.js, D3.js, Tailwind |
| Hosting  | GitHub Pages, Cloudflare Workers |

## License

MIT
