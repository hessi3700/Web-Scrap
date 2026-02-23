# Deploy Worker to Cloudflare

Run these from the `worker/` directory.

## 1. Log in (one-time)

```bash
npx wrangler login
```

Or set env vars: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (see [Create API Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)).

## 2. Create D1 database (one-time)

```bash
npx wrangler d1 create web-scrap-db
```

Copy the **`database_id`** from the output into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "web-scrap-db"
database_id = "YOUR_RETURNED_UUID"
```

## 3. Apply schema to remote D1

```bash
npx wrangler d1 execute web-scrap-db --remote --file=./schema.sql
```

## 4. Optional: protect ingest

```bash
npx wrangler secret put INGEST_SECRET
```

Use the same value in the pipeline’s `API_INGEST_SECRET` (in `pipeline/.env`).

## 5. Deploy

```bash
npm run deploy
```

Your API URL will be shown in the output (e.g. `https://web-scrap-api.<subdomain>.workers.dev`). Use it as `VITE_API_BASE` for the frontend and `API_INGEST_URL` for the pipeline.
