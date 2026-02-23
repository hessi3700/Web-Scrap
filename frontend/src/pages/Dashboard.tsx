import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useQuery } from "react-query";
import { api, type TrendPoint } from "../api/client";
import AreaBarChart from "../components/AreaBarChart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: { position: "top" as const },
  },
  scales: {
    x: { grid: { color: "rgba(148, 163, 184, 0.1)" }, ticks: { color: "#94a3b8", maxRotation: 45 } },
    y: {
      grid: { color: "rgba(148, 163, 184, 0.1)" },
      ticks: {
        color: "#94a3b8",
        callback: (v: number | string): string | number =>
          typeof v === "number" ? (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`) : v,
      },
    },
  },
};

function useTrends(area?: string, days = 30) {
  return useQuery({
    queryKey: ["trends", area, days],
    queryFn: () => api.trends({ area, days }),
  });
}

function useAreas() {
  return useQuery({ queryKey: ["areas"], queryFn: () => api.areas() });
}

function buildChartData(data: TrendPoint[]): { labels: string[]; datasets: { label: string; data: (number | null)[]; borderColor: string; backgroundColor: string; fill: boolean }[] } {
  const byDate = new Map<string, Map<string, number>>();
  const areas = new Set<string>();
  for (const p of data) {
    const area = p.area || "Other";
    areas.add(area);
    if (!byDate.has(p.date)) byDate.set(p.date, new Map());
    byDate.get(p.date)!.set(area, p.avg_price);
  }
  const sortedDates = [...byDate.keys()].sort();
  const palette = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"];
  const datasets = [...areas].map((area, i) => ({
    label: area,
    data: sortedDates.map((d) => byDate.get(d)?.get(area) ?? null),
    borderColor: palette[i % palette.length],
    backgroundColor: palette[i % palette.length] + "20",
    fill: true,
  }));
  return { labels: sortedDates, datasets };
}

export default function Dashboard() {
  const [area, setArea] = useState<string>("");
  const [days, setDays] = useState(30);
  const { data: areasRes } = useAreas();
  const { data: listingsRes } = useQuery({
    queryKey: ["listings-for-chart"],
    queryFn: () => api.listings({ limit: 500 }),
  });
  const { data: trendsRes, isLoading, isError, error } = useTrends(area || undefined, days);
  const areas = areasRes?.data ?? [];
  const chartData = useMemo(() => (trendsRes?.data?.length ? buildChartData(trendsRes.data) : null), [trendsRes?.data]);
  const areaCounts = useMemo(() => {
    const list = listingsRes?.data ?? [];
    const map = new Map<string, number>();
    for (const row of list) {
      const a = row.area || "Other";
      map.set(a, (map.get(a) || 0) + 1);
    }
    return [...map.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count);
  }, [listingsRes?.data]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-surface-100 tracking-tight">Overview</h1>
        <p className="mt-1 text-surface-400">Price trends by area from the ETL pipeline</p>
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-6 mb-6">
          <label className="filter-label">
            <span>Area</span>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="select-field min-w-[160px]"
            >
              <option value="">All areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            <span>Period</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="select-field min-w-[130px]"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>
        <div className="h-[320px]">
          {isLoading && (
            <div className="h-full flex items-center justify-center text-surface-500">Loading trends…</div>
          )}
          {isError && (
            <div className="h-full flex items-center justify-center text-red-400">
              {error instanceof Error ? error.message : "Failed to load"}
            </div>
          )}
          {chartData && !isLoading && (
            <Line data={chartData} options={chartOptions} />
          )}
          {!chartData && !isLoading && !isError && (
            <div className="h-full flex items-center justify-center text-surface-500">No trend data yet. Run the pipeline to ingest data.</div>
          )}
        </div>
      </div>

      {areaCounts.length > 0 && (
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Listings by area (D3)</h2>
          <AreaBarChart data={areaCounts} height={220} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-surface-400 text-sm font-medium">Data source</p>
          <p className="mt-1 text-surface-100 font-semibold">ETL Pipeline</p>
          <p className="mt-0.5 text-surface-500 text-sm">PostgreSQL → Worker API</p>
        </div>
        <div className="card p-5">
          <p className="text-surface-400 text-sm font-medium">Schedule</p>
          <p className="mt-1 text-surface-100 font-semibold">Celery Beat</p>
          <p className="mt-0.5 text-surface-500 text-sm">Daily scrape & sync</p>
        </div>
        <div className="card p-5">
          <p className="text-surface-400 text-sm font-medium">Hosting</p>
          <p className="mt-1 text-surface-100 font-semibold">GitHub Pages + Workers</p>
          <p className="mt-0.5 text-surface-500 text-sm">Static + serverless API</p>
        </div>
      </div>
    </div>
  );
}
