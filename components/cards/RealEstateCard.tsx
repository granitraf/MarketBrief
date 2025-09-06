"use client";

import { useQuery } from "@tanstack/react-query";
import { Home } from "lucide-react";
import { normalizeTicker } from "@/features/real-estate/utils/normalizeTicker";
import { MagicBentoCard } from "@/components/ui/MagicBento";

type QuoteRow = { symbol: string; price: number | null; changePct: number | null };

const ITEMS = [
  { symbol: "REET", label: "Global Real Estate" },
  { symbol: "VNQ", label: "U.S Real Estate" },
  { symbol: "XRE.TO", label: "Canadian Real Estate" },
] as const;

const SYMBOL_MAP: Record<string, string> = {
  REET: "REET",
  VNQ: "VNQ",
  "XRE.TO": "XRE.TO",
};

export default function RealEstateCard() {
  const mapped = ITEMS.map((i) => normalizeTicker(SYMBOL_MAP[i.symbol] ?? i.symbol));
  const { data, isLoading, error } = useQuery<{ updated: string; data: QuoteRow[]}>({
    queryKey: ["real-estate", mapped],
    queryFn: () => fetch(`/api/real-estate`).then(r=>r.json()),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const updated = data?.updated ? new Date(data.updated).toLocaleTimeString() : "";

  return (
    <MagicBentoCard
      enableStars={false}
      enableSpotlight={false}
      enableBorderGlow={true}
      glowColor="255, 255, 255"
      className="rounded-xl bg-zinc-900/95 p-4 text-white min-h-[320px]"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold"><Home className="h-5 w-5" /> Real Estate</div>
        <div className="text-xs text-zinc-400">{updated ? `Updated ${updated}` : ""}</div>
      </div>

      {isLoading && <div className="text-sm text-zinc-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">Could not load data</div>}
      {!isLoading && !error && (
        <div className="bubble-list">
          {ITEMS.map((item) => {
            const cleanSymbol = normalizeTicker(SYMBOL_MAP[item.symbol] ?? item.symbol);
            const row = data?.data?.find((r) => normalizeTicker(r.symbol) === cleanSymbol);
            const price = row?.price;
            const change = row?.changePct;
            const up = (change ?? 0) >= 0;
            return (
              <div key={item.symbol} className="row-pill">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="ticker-symbol">{cleanSymbol}</span>
                  <span className="text-xs text-zinc-400 truncate">{item.label}</span>
                </div>
                <div className="flex items-center row-gap">
                  <span className="price-value">{price == null ? "–" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(price)}</span>
                  <span className={(change == null ? "bg-zinc-800 text-zinc-300" : up ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300") + " pct-badge shrink-0"}>
                    {change == null ? "–" : `${change.toFixed(2)}%`}
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


