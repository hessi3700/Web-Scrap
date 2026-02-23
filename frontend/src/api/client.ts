const API_BASE = ((import.meta.env.VITE_API_BASE as string) || "").replace(/\/+$/, "");

/** True if the app was built without an API URL (requests would hit same origin and 404). */
export const isApiConfigured = () => Boolean(API_BASE.trim());

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let msg = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* use text as-is */
    }
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface ListingRow {
  id: number;
  source_id: string;
  source: string;
  title: string;
  address: string | null;
  area: string | null;
  url: string | null;
  price: number | null;
  currency: string;
  recorded_at: string;
  created_at?: string;
}

export interface TrendPoint {
  date: string;
  area: string | null;
  avg_price: number;
  count: number;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  listings: (params?: { recorded_at?: string; area?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.recorded_at) sp.set("recorded_at", params.recorded_at);
    if (params?.area) sp.set("area", params.area);
    if (params?.limit) sp.set("limit", String(params.limit));
    const q = sp.toString();
    return request<{ data: ListingRow[] }>(`/api/listings${q ? `?${q}` : ""}`);
  },
  trends: (params?: { area?: string; days?: number }) => {
    const sp = new URLSearchParams();
    if (params?.area) sp.set("area", params.area);
    if (params?.days) sp.set("days", String(params.days));
    const q = sp.toString();
    return request<{ data: TrendPoint[] }>(`/api/trends${q ? `?${q}` : ""}`);
  },
  areas: () => request<{ data: string[] }>("/api/areas"),
};
