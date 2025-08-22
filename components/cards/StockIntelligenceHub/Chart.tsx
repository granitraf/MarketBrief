"use client";

import { useStockStore } from "@/components/store/stockStore";
import LineChart from "@/components/hub/LineChart";
import type { RangeStats } from "@/components/hub/LineChart";

const ranges: Array<{ key: any; label: string }> = [
  { key: "1D", label: "1D" },
  { key: "5D", label: "5D" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "YTD", label: "YTD" },
  { key: "1Y", label: "1Y" },
  { key: "5Y", label: "5Y" },
  { key: "MAX", label: "MAX" }
];

export default function Chart() {
  const ticker = useStockStore((s) => s.selectedTicker);
  const range = useStockStore((s) => s.timeRange) as any;
  const setRange = useStockStore((s) => s.setTimeRange);
  const livePrice = useStockStore((s) => s.livePrice);
  const setRangeStats = useStockStore((s) => s.setRangeStats);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key as any)}
            className={`px-2 py-1 rounded-md border text-xs ${r.key === range ? "bg-zinc-800 border-zinc-600" : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
        <LineChart
          symbol={ticker}
          range={range}
          livePrice={livePrice}
          onStats={(s: RangeStats) => setRangeStats(s)}
        />
      </div>
    </div>
  );
}


