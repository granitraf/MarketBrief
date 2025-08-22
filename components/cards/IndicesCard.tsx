"use client";

import { useQuery } from "@tanstack/react-query";
import { LineChart } from "lucide-react";
import { formatTwoDecimals } from "@/lib/formatters";

type IndexRow = {
  symbol: string;
  price: number | null;
  changePct: number | null;
};

export default function IndicesCard() {
  const { data, isLoading, error } = useQuery<{ updated: string; data: IndexRow[] }>(
    {
      queryKey: ["indices"],
      queryFn: () => fetch("/api/index-movements").then((r) => r.json()),
      staleTime: 60_000,
    }
  );

  return (
    <div className="bg-zinc-900 text-white rounded-xl p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <LineChart className="h-5 w-5" /> Indices
        </div>
        <div className="text-xs text-zinc-400">{data?.updated ? `Updated ${new Date(data.updated).toLocaleTimeString()}` : ""}</div>
      </div>
      {isLoading && <div className="text-sm text-zinc-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">Could not load data</div>}
      {!isLoading && !error && (
        <div className="bubble-list">
          {data?.data?.map((row) => {
            const up = (row.changePct ?? 0) >= 0;
            return (
              <div key={row.symbol} className="row-pill">
                <div className="ticker-symbol">{labelForIndex(row.symbol)}</div>
                <div className="flex items-center row-gap">
                  <div className="price-value">{formatTwoDecimals(row.price)}</div>
                  <span className={(up ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300") + " pct-badge shrink-0"}>
                    {formatPct(row.changePct)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function labelForIndex(symbol: string) {
  if (symbol === "^GSPC") return "S&P 500";
  if (symbol === "^IXIC") return "NASDAQ";
  if (symbol === "^DJI") return "DOW";
  if (symbol === "^RUT") return "RUSSELL 2000";
  if (symbol === "^VIX") return "VIX";
  return symbol;
}

function formatPct(v: number | null, withSign = false) {
  if (v === null || v === undefined) return "–";
  const sign = withSign && v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}



