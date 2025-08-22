"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

type Row = { symbol: string; price: number | null; changePct: number | null };

export default function Mag7Card() {
  const { data, isLoading, error } = useQuery<{ updated: string; data: Row[] }>(
    {
      queryKey: ["mag7"],
      queryFn: () => fetch("/api/mag7").then((r) => r.json()),
      staleTime: 60_000,
    }
  );

  return (
    <div className="bg-zinc-900 text-white rounded-xl p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5" /> MAG 7
        </div>
        <div className="text-xs text-zinc-400">{data?.updated ? `Updated ${new Date(data.updated).toLocaleTimeString()}` : ""}</div>
      </div>
      {isLoading && <div className="text-sm text-zinc-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">Could not load data</div>}
      {!isLoading && !error && (
        <div className="bubble-list sm:grid-cols-2">
          {data?.data?.map((row) => {
            const up = (row.changePct ?? 0) >= 0;
            return (
              <div
                key={row.symbol}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-2 bubble-pill"
              >
                {/* Ticker */}
                <span className="ticker-symbol">{row.symbol}</span>
                {/* Price (grow area, right aligned) */}
                <span className="justify-self-end text-sm text-zinc-200 tabular-nums tracking-tight whitespace-nowrap">
                  {formatNumber(row.price)}
                </span>
                {/* Percent change (right, compact badge) */}
                <span
                  className={
                    (up ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300") +
                    " delta-badge justify-self-end"
                  }
                >
                  {formatPct(row.changePct)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatPct(v: number | null, withSign = false) {
  if (v === null || v === undefined) return "–";
  const sign = withSign && v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function formatNumber(v: number | null) {
  if (v === null || v === undefined) return "–";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}


