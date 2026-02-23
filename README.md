# Web Scraper + Data Analysis Dashboard

**By [HessiKz](https://github.com/HessiKz)**

A full-stack ETL pipeline and dashboard: scrape listing data (with robots.txt compliance), store in PostgreSQL, run scheduled jobs with Celery, and visualize trends. Frontend is hosted on **GitHub Pages** (`gh-pages` branch); API runs on **Cloudflare Workers** with D1.

---

## What This Project Does

- **Scrapes** listing pages (real estate or any configurable source) while respecting `robots.txt`, delays, and a clear User-Agent.
- **Transforms** raw HTML into structured records and **loads** them into PostgreSQL and (optionally) syncs to the Cloudflare API.
- **Schedules** daily (or custom) runs via Celery Beat locally, or **auto-runs in GitHub Actions** (scrape + sync to Worker, no DB).
- **Serves** a REST API from Cloudflare Workers + D1 for listings, areas, and price trends.
- **Visualizes** data in a React dashboard with Chart.js (trends) and D3.js (listings by area).

---

## Architecture

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Python ETL        │      │  Cloudflare Worker  │      │  React Dashboard    │
│   (Scraper +        │ ───► │  (TypeScript + D1)  │ ◄─── │  (Vite + Tailwind)  │
│   Celery + PG)      │      │  REST API          │      │  Chart.js / D3.js   │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
         │                              │                              │
    Redis + PostgreSQL              D1 (SQLite)                 GitHub Pages
    Scheduled tasks                 Serverless                      (gh-pages)
```

---

## Tech Stack

| Layer      | Technologies |
|-----------|----------------|
| Scraping  | Python, BeautifulSoup, Scrapy, `requests`, `urllib.robotparser` |
| Scheduling| Celery, Redis |
| ETL store | PostgreSQL, SQLAlchemy, Alembic |
| API       | Cloudflare Workers (TypeScript), D1 |
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS, Chart.js, D3.js, React Query |
| Hosting   | GitHub Pages (branch: `gh-pages`), Cloudflare Workers |

---

## Project Structure

```
.
├── frontend/          # React dashboard (deployed to GitHub Pages)
├── worker/            # Cloudflare Worker API (deployed to CF Workers)
├── pipeline/          # Python ETL (run locally or on a server)
│   ├── scraper/       # Fetch, robots.txt, extractors
│   ├── models/        # SQLAlchemy models
│   ├── celery_app/    # Celery app and tasks
│   ├── etl.py         # Extract → Transform → Load
│   └── alembic/       # DB migrations
└── .github/workflows/ # CI/CD (deploy pages, run pipeline on schedule)
```

---

## Quick Start (Local)

### 1. API (Cloudflare Worker)

```bash
cd worker
npm install
npx wrangler d1 execute web-scrap-db --local --file=./schema.sql
npx wrangler dev
```

API runs at `http://localhost:8787`. For production deploy see [Deploy to Cloudflare Workers](#deploy-to-cloudflare-workers).

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE=http://localhost:8787
npm install
npm run dev
```

Open `http://localhost:5173`.

### 3. Pipeline (optional, for scraping)

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # DATABASE_URL, REDIS_URL, API_INGEST_URL
docker compose up -d   # PostgreSQL + Redis
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m scraper.run_once   # one-off run
```

For scheduled runs: start Celery worker and beat (see [Pipeline](#pipeline) below).  
**Alternatively**, the pipeline runs automatically in **GitHub Actions** on a schedule (see [Auto-run pipeline in GitHub](#auto-run-pipeline-in-github)).

---

## Deploy commands (from repo root)

After `npm install` at the root (installs `gh-pages` and `cross-env`):

| Command | What it does |
|--------|----------------|
| `npm run deploy` | Deploy **Worker** then **Pages** (build frontend + push to `gh-pages`). Does **not** run the pipeline. |
| `npm run deploy:worker` | Deploy Cloudflare Worker only |
| `npm run deploy:pages` | Build frontend (with `GITHUB_PAGES=1`) and push `frontend/dist` to branch `gh-pages` |
| `npm run build` | Build frontend only |
| `npm run run:pipeline` | Run pipeline **locally**: scrape + POST to Worker (needs `API_INGEST_URL`). Same as what runs in GitHub Actions. |
| `npm run test:pipeline` | Alias for `run:pipeline` (for testing the pipeline before relying on the scheduled run). |

**Does `npm run deploy` run the pipeline?** No. It only deploys the Worker and the frontend. The pipeline runs either (1) **in GitHub Actions** on a schedule (and when you trigger the workflow), or (2) **locally** when you run `npm run run:pipeline` or `python pipeline/run_scrape_and_sync.py`.

**Before running deploy:**
- **Worker:** `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`); D1 created and `database_id` set in `worker/wrangler.toml`.
- **Pages:** Set `VITE_API_BASE` in `frontend/.env` to your Worker URL so the built app talks to your API.

---

## Deployment

### Deploy Frontend to GitHub Pages (separate branch)

The frontend is deployed to the **`gh-pages`** branch via GitHub Actions.

1. **One-time setup**
   - In your GitHub repo: **Settings → Pages → Source**: choose **Deploy from a branch**.
   - Branch: **`gh-pages`**, folder: **`/ (root)**.
   - Add a repository secret: **`VITE_API_BASE`** = your Cloudflare Worker URL (e.g. `https://web-scrap-api.<your-subdomain>.workers.dev`).

2. **Automatic deploy**
   - Push to `main` (or run the workflow manually). The workflow builds the frontend and pushes the built files to the `gh-pages` branch.
   - After the run, the site is available at `https://<username>.github.io/<repo-name>/` (use the same base path in Vite if needed; the workflow sets it for project pages).

3. **Manual build and push (alternative)**
   ```bash
   cd frontend
   npm ci
   GITHUB_PAGES=1 VITE_API_BASE=https://your-worker.workers.dev npm run build
   # Then push contents of dist/ to the gh-pages branch (e.g. via git subtree or a separate clone).
   ```

### Deploy to Cloudflare Workers

1. **Create the D1 database (once)**  
   From the `worker/` directory:
   ```bash
   npx wrangler d1 create web-scrap-db
   ```
   Copy the returned **`database_id`** into `worker/wrangler.toml` under `[[d1_databases]].database_id` (replace the placeholder).

2. **Apply the schema**
   ```bash
   npx wrangler d1 execute web-scrap-db --remote --file=./schema.sql
   ```

3. **Optional: protect the ingest endpoint**
   ```bash
   npx wrangler secret put INGEST_SECRET
   ```
   Set the same value in the pipeline’s `API_INGEST_SECRET` (in `pipeline/.env`).

4. **Deploy the Worker**
   ```bash
   cd worker
   npx wrangler login   # one-time; or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
   npm run deploy
   ```
   See **`worker/DEPLOY.md`** for the full step-by-step.

Your API will be live at `https://web-scrap-api.<your-subdomain>.workers.dev`. Use this URL as `VITE_API_BASE` for the frontend and as `API_INGEST_URL` for the pipeline.

---

## Pipeline (ETL + Celery)

- **One-off run:**  
  `python -m scraper.run_once` (from `pipeline/` with venv activated). Fetches the configured URL, extracts listings, writes to PostgreSQL, and can sync to the Worker ingest endpoint.

- **Scheduled runs:**  
  Start Redis and PostgreSQL (`docker compose up -d`), then:
  ```bash
  celery -A celery_app worker -l info &
  celery -A celery_app beat -l info &
  ```
  Default: daily at 06:00 UTC. Adjust in `celery_app/__init__.py` (`beat_schedule`).

- **Config (`.env`):**  
  `DATABASE_URL`, `REDIS_URL`, `API_INGEST_URL` (Worker base URL). Optional: `API_INGEST_SECRET`, `SCRAPE_DELAY_SECONDS`, `USER_AGENT`, `SCRAPE_BASE_URL`.

### Auto-run pipeline in GitHub

The workflow **Run pipeline** (`.github/workflows/run-pipeline.yml`) runs on a **schedule** (daily at 06:00 UTC) and on **manual trigger** (Actions → Run pipeline → Run workflow). It does **not** use PostgreSQL or Redis: it only scrapes and POSTs results to your Cloudflare Worker.

**Required repo secrets:**
- `API_INGEST_URL` — Your Worker URL (e.g. `https://web-scrap-api.<subdomain>.workers.dev`).

**Optional:**
- `API_INGEST_SECRET` — If you set `INGEST_SECRET` on the Worker, set the same value here.
- Repo **variable** `SCRAPE_BASE_URL` — URL to scrape (defaults to example.com if unset).

The job uses `pipeline/requirements-ci.txt` and runs `pipeline/run_scrape_and_sync.py`.

---

## How to test

### Test deploy (Worker + Pages)

1. **Worker:** From repo root, `npm run deploy:worker`. You must be logged in (`npx wrangler login`) and have D1 set up. Check the printed URL and open `https://<that-url>/api/health`.
2. **Pages:** Set `VITE_API_BASE` in `frontend/.env`, then `npm run deploy:pages`. After push, open your GitHub Pages site and confirm the dashboard loads and talks to the Worker.

### Test the pipeline (scrape → Worker)

The pipeline only **sends** data to the Worker; it doesn’t deploy anything. To test it:

1. **Worker must be reachable** (deployed or local). If local: `cd worker && npx wrangler dev` and use `http://localhost:8787` as the ingest URL.
2. **Set ingest URL** (and optional secret):
   - **Option A – env for one run:**  
     `API_INGEST_URL=https://your-worker.workers.dev npm run run:pipeline`  
     (or `API_INGEST_URL=http://localhost:8787` when testing against local Worker.)
   - **Option B – pipeline `.env`:**  
     In `pipeline/.env` set `API_INGEST_URL=...` and optionally `API_INGEST_SECRET=...`. Then from repo root: `npm run run:pipeline`.
3. **Run:** From repo root, `npm run run:pipeline` (or `npm run test:pipeline`). Requires Python 3 and pip; the script installs `requirements-ci.txt` if needed.
4. **Check:** Open the dashboard (or `GET /api/listings` on the Worker). You should see the ingested listings for today’s date.

### Test pipeline in GitHub Actions

1. In the repo: **Settings → Secrets and variables → Actions**. Add secret **`API_INGEST_URL`** = your Worker URL.
2. **Actions** tab → **Run pipeline** → **Run workflow**. After the run, check the job log and the Worker/dashboard for new data.

---

## API Endpoints (Worker)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/listings` | Listings (query: `recorded_at`, `area`, `limit`) |
| GET | `/api/trends` | Price trends (query: `area`, `days`) |
| GET | `/api/areas` | Distinct areas |
| POST | `/api/ingest` | Ingest payload from pipeline (optional header: `X-Ingest-Secret`) |

---

## License

MIT.

---

**Author:** [HessiKz](https://github.com/HessiKz)
