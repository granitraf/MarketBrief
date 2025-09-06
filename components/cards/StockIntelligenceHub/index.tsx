"use client";

import SearchBar from "./SearchBar";
import PriceOverview, { PriceHeader } from "./PriceOverview";
import Chart from "./Chart";
import { useStockStore } from "@/components/store/stockStore";
import { MagicBentoCard } from "@/components/ui/MagicBento";

export default function StockIntelligenceHub() {
  const ticker = useStockStore((s) => s.selectedTicker);
  return (
    <MagicBentoCard
      enableStars={false}
      enableSpotlight={true}
      enableBorderGlow={true}
      glowColor="255, 255, 255"
      className="rounded-xl bg-zinc-900/95 p-4 text-white"
    >
      <div className="mb-4 relative" style={{ zIndex: 50 }}>
        <div className="font-semibold text-sm mb-3">Stock Intelligence Hub</div>
        <div className="w-72" style={{ pointerEvents:'auto' }}><SearchBar /></div>
      </div>

      <div className="space-y-6">
        <PriceHeader />
        <Chart />
        <PriceOverview />
      </div>
    </MagicBentoCard>
  );
}


