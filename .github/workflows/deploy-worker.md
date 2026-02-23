# Deploy Cloudflare Worker manually

1. Create D1 database:
   ```bash
   cd worker && npm install
   npx wrangler d1 create web-scrap-db
   ```
2. Put the returned `database_id` into `worker/wrangler.toml` under `[[d1_databases]].database_id`.
3. Apply schema:
   ```bash
   npx wrangler d1 execute web-scrap-db --remote --file=./schema.sql
   ```
4. Set secret (optional):
   ```bash
   npx wrangler secret put INGEST_SECRET
   ```
5. Deploy:
   ```bash
   npm run deploy
   ```
6. In GitHub repo Settings → Secrets, add `VITE_API_BASE` = your Worker URL (e.g. `https://web-scrap-api.<subdomain>.workers.dev`) so the frontend build can call the API.
