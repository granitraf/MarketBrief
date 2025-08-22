"use client";

import { useQuery } from "@tanstack/react-query";

type Item = { code: string; label: string; price: number | null; changePct: number | null };

export default function EnergyCard() {
  const { data, isLoading, error } = useQuery<{ updated: string; items: Item[] }>({
    queryKey: ["energy"],
    queryFn: () => fetch("/api/energy").then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="bg-zinc-900 text-white rounded-xl p-4 shadow">
      <div className="flex items-center justify-between mb-3 font-semibold">Energy</div>
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
    </div>
  );
}


