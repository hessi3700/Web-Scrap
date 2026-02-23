export interface Env {
  DB: D1Database;
  INGEST_SECRET?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Ingest-Secret",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...headers },
  });
}

function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return corsPreflight();

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/ingest" && request.method === "POST") {
        return await handleIngest(request, env);
      }
      if (path === "/api/listings" && request.method === "GET") {
        return await handleListings(env.DB, url.searchParams);
      }
      if (path === "/api/trends" && request.method === "GET") {
        return await handleTrends(env.DB, url.searchParams);
      }
      if (path === "/api/areas" && request.method === "GET") {
        return await handleAreas(env.DB);
      }
      if (path === "/api/health" && request.method === "GET") {
        return jsonResponse({ ok: true, service: "web-scrap-api" });
      }
      return jsonResponse({ error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },
};

async function handleIngest(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get("X-Ingest-Secret");
  if (env.INGEST_SECRET && secret !== env.INGEST_SECRET) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const body = (await request.json()) as {
    recorded_at?: string;
    listings?: Array<{
      source_id: string;
      source: string;
      title: string;
      address?: string;
      area?: string;
      url?: string;
      price?: number;
    }>;
  };
  const recorded_at = body?.recorded_at || new Date().toISOString().slice(0, 10);
  const listings = body?.listings || [];
  if (listings.length === 0) return jsonResponse({ ok: true, inserted: 0 });

  const db = env.DB;
  let inserted = 0;
  for (const l of listings) {
    try {
      await db
        .prepare(
          `INSERT INTO listings (source_id, source, title, address, area, url, price, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          l.source_id,
          l.source,
          l.title,
          l.address ?? null,
          l.area ?? null,
          l.url ?? null,
          l.price ?? null,
          recorded_at
        )
        .run();
      await db
        .prepare(
          `INSERT OR REPLACE INTO price_history (source_id, source, area, price, recorded_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(l.source_id, l.source, l.area ?? null, l.price ?? null, recorded_at)
        .run();
      inserted++;
    } catch (_) {
      // skip duplicate or constraint error
    }
  }
  return jsonResponse({ ok: true, inserted });
}

async function handleListings(
  db: D1Database,
  params: URLSearchParams
): Promise<Response> {
  const recorded_at = params.get("recorded_at") || undefined;
  const area = params.get("area") || undefined;
  const limit = Math.min(parseInt(params.get("limit") || "100", 10), 500);

  let query = "SELECT * FROM listings WHERE 1=1";
  const bind: (string | number)[] = [];
  if (recorded_at) {
    query += " AND recorded_at = ?";
    bind.push(recorded_at);
  }
  if (area) {
    query += " AND area = ?";
    bind.push(area);
  }
  query += " ORDER BY recorded_at DESC, id DESC LIMIT ?";
  bind.push(limit);

  const stmt = db.prepare(query);
  const { results } = await stmt.bind(...bind).all<Record<string, unknown>>();
  return jsonResponse({ data: results });
}

async function handleTrends(
  db: D1Database,
  params: URLSearchParams
): Promise<Response> {
  const area = params.get("area") || undefined;
  const days = Math.min(parseInt(params.get("days") || "30", 10), 365);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().slice(0, 10);

  let query = `
    SELECT recorded_at as date, area, AVG(price) as avg_price, COUNT(*) as count
    FROM price_history
    WHERE recorded_at >= ? AND price IS NOT NULL
  `;
  const bind: (string | number)[] = [start];
  if (area) {
    query += " AND area = ?";
    bind.push(area);
  }
  query += " GROUP BY recorded_at, area ORDER BY recorded_at ASC";

  const { results } = await db
    .prepare(query)
    .bind(...bind)
    .all<{ date: string; area: string | null; avg_price: number; count: number }>();
  return jsonResponse({ data: results });
}

async function handleAreas(db: D1Database): Promise<Response> {
  const { results } = await db
    .prepare(
      "SELECT DISTINCT area FROM listings WHERE area IS NOT NULL AND area != '' ORDER BY area"
    )
    .all<{ area: string }>();
  const areas = (results || []).map((r) => r.area);
  return jsonResponse({ data: areas });
}
