import { useState } from "react";
import { useQuery } from "react-query";
import { api, type ListingRow } from "../api/client";

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function Listings() {
  const [area, setArea] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["listings", area, recordedAt],
    queryFn: () => api.listings({ area: area || undefined, recorded_at: recordedAt || undefined, limit: 200 }),
  });
  const { data: areasRes } = useQuery({ queryKey: ["areas"], queryFn: () => api.areas() });
  const areas = areasRes?.data ?? [];
  const listings: ListingRow[] = data?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-surface-100 tracking-tight">Listings</h1>
        <p className="mt-1 text-surface-400">Scraped listings with price history</p>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <label className="filter-label">
          <span>Area</span>
          <select value={area} onChange={(e) => setArea(e.target.value)} className="select-field min-w-[180px]">
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="filter-label">
          <span>Recorded date</span>
          <input
            type="date"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="date-field min-w-[160px]"
          />
        </label>
      </div>

      {isLoading && (
        <div className="card p-8 text-center text-surface-500">Loading listings…</div>
      )}
      {isError && (
        <div className="card p-8 text-center text-red-400">
          {error instanceof Error ? error.message : "Failed to load"}
        </div>
      )}
      {!isLoading && !isError && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-700 text-surface-400 text-sm">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Recorded</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                      No listings. Run the ETL pipeline to ingest data.
                    </td>
                  </tr>
                ) : (
                  listings.map((row) => (
                    <tr key={`${row.source_id}-${row.recorded_at}-${row.id}`} className="border-b border-surface-700/60 hover:bg-surface-700/30 transition-colors">
                      <td className="px-4 py-3">
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline truncate max-w-[240px] block">
                            {row.title}
                          </a>
                        ) : (
                          <span className="text-surface-100 truncate max-w-[240px] block">{row.title}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-surface-300">{row.area ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-surface-100">{formatPrice(row.price)}</td>
                      <td className="px-4 py-3 text-surface-400 text-sm">{row.recorded_at}</td>
                      <td className="px-4 py-3 text-surface-500 text-sm">{row.source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
