"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { MagicBentoCard } from "@/components/ui/MagicBento";

type Item = { code: string; label: string; price: number | null; changePct: number | null };

export default function EnergyCard() {
  const { data, isLoading, error } = useQuery<{ updated: string; items: Item[] }>({
    queryKey: ["energy"],
    queryFn: () => fetch("/api/energy").then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

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
          <Flame className="h-5 w-5" /> Energy
        </div>
        <div className="text-xs text-zinc-400">{data?.updated ? `Updated ${new Date(data.updated).toLocaleTimeString()}` : ""}</div>
      </div>
      {isLoading && <div className="text-sm text-zinc-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">Could not load data</div>}
      {!isLoading && !error && (
        <div className="bubble-list">
          {data?.items?.map(({ code, label, price, changePct }) => (
            <div key={code} className="row-pill">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="ticker-symbol">{code}</span>
                <span className="text-xs text-zinc-400">{label}</span>
              </div>
              <div className="flex items-center row-gap">
                <span className="price-value">{price == null ? "–" : price.toFixed(2)}</span>
                <span className={
                  (changePct == null ? "bg-zinc-800 text-zinc-300" : changePct > 0 ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300") +
                  " pct-badge shrink-0"
                }>
                  {changePct == null ? "–" : `${changePct.toFixed(2)}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </MagicBentoCard>
  );
}


