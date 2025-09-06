"use client";

import { useQuery } from "@tanstack/react-query";
import { Box } from "lucide-react";
import { MagicBentoCard } from "@/components/ui/MagicBento";
type Item = { code: string; label: string; price: number | null; changePct: number | null };

export default function CommoditiesCard() {
  const { data, isLoading, error } = useQuery<{ updated: string; items: Item[] }>(
    {
      queryKey: ["commodities"],
      queryFn: () => fetch("/api/commodities").then((r) => r.json()),
      staleTime: 60_000,
      refetchInterval: 60_000,
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
          <Box className="h-5 w-5" /> Commodities
        </div>
        <div className="text-xs text-zinc-400">{data?.updated ? `Updated ${new Date(data.updated).toLocaleTimeString()}` : ""}</div>
      </div>
      {isLoading && <div className="text-sm text-zinc-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">Could not load data</div>}
      {!isLoading && !error && (
        <div className="bubble-list">
          {data?.items?.map(({ code, label, price, changePct }) => {
            const up = (changePct ?? 0) >= 0;
            return (
              <div key={code} className="row-pill">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="ticker-symbol">{code}</span>
                  <span className="text-xs text-zinc-400">{label}</span>
                </div>
                <div className="flex items-center row-gap">
                  <div className="price-value">{price == null ? "–" : price.toFixed(2)}</div>
                  <span className={(changePct == null ? "bg-zinc-800 text-zinc-300" : up ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300") + " pct-badge shrink-0"}>
                    {changePct == null ? "–" : `${changePct.toFixed(2)}%`}
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

function formatPct(v: number | null, withSign = false) {
  if (v === null || v === undefined) return "–";
  const sign = withSign && v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}


