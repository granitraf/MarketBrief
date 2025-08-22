"use client";

import SearchBar from "./SearchBar";
import PriceOverview, { PriceHeader } from "./PriceOverview";
import Chart from "./Chart";
import { useStockStore } from "@/components/store/stockStore";

export default function StockIntelligenceHub() {
  const ticker = useStockStore((s) => s.selectedTicker);
  return (
    <div className="relative bg-zinc-900 text-white rounded-xl p-4 shadow">
      <div className="mb-4">
        <div className="font-semibold text-sm mb-3">Stock Intelligence Hub</div>
        <div className="w-72"><SearchBar /></div>
      </div>

      <div className="space-y-6">
        <PriceHeader />
        <Chart />
        <PriceOverview />
      </div>
    </div>
  );
}


