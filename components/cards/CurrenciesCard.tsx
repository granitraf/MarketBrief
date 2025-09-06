"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Banknote } from "lucide-react";
import { MagicBentoCard } from "@/components/ui/MagicBento";

type Row = { pair: string; price: number | null; changePct: number | null };

export default function CurrenciesCard() {
  const { data, isLoading, error } = useQuery<{ updated: string; data: Row[] }>(
    {
      queryKey: ["currencies"],
      queryFn: () => fetch("/api/currencies").then((r) => r.json()),
      staleTime: 60_000,
    }
  );

  return (
    <MagicBentoCard
      enableStars={false}
      enableSpotlight={false}
      enableBorderGlow={true}
      glowColor="255, 255, 255"
      className="rounded-xl bg-zinc-900/95 p-4 text-white min-h-[320px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <Banknote className="h-5 w-5" /> Currencies
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
              <div key={row.pair} className="row-pill">
                <div className="ticker-symbol">{row.pair}</div>
                <div className="flex items-center row-gap">
                  <div className="price-value">{formatNumber(row.price)}</div>
                  <span className={(up ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300") + " pct-badge shrink-0"}>
                    {formatPct(row.changePct)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MagicBentoCard>
  );
}

function formatPct(v: number | null) {
  if (v === null || v === undefined) return "–";
  return `${v.toFixed(2)}%`;
}

function formatNumber(v: number | null) {
  if (v === null || v === undefined) return "–";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}


