"use client";

import { useStockStore } from "@/components/store/stockStore";
import { useMemo, useState, useEffect } from "react";
import PriceChart from "../../Charts/PriceChart";
import type { RangeStats } from "@/components/hub/LineChart";
import type { PricePoint } from "../../../hooks/usePriceSeries";
import type { RangeKey } from "../../../lib/ranges";

const ranges: Array<{ key: RangeKey; label: string }> = [
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
  const range = useStockStore((s) => s.timeRange) as RangeKey;
  const setRange = useStockStore((s) => s.setTimeRange);
  const livePrice = useStockStore((s) => s.livePrice);
  const setRangeStats = useStockStore((s) => s.setRangeStats);
  
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data when ticker or range changes
  useEffect(() => {
    if (!ticker) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const normRange = range === "1Y" ? "1YR" : range === "5Y" ? "5YR" : range;
        const response = await fetch(`/api/twelvedata/candles/${encodeURIComponent(ticker)}/${normRange}`, { 
          cache: "no-store" 
        });
        const json = await response.json();
        
        if (json.candles && Array.isArray(json.candles)) {
          // Transform data to PricePoint format
          const transformedData: PricePoint[] = json.candles.map((candle: any) => ({
            t: typeof candle.time === 'number' ? candle.time * 1000 : new Date(candle.time.year, candle.time.month - 1, candle.time.day).getTime(),
            c: Number(candle.close)
          }));
          
          setChartData(transformedData);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ticker, range]);

  // Handle stats from PriceChart
  const handleStats = (stats: { oldPrice: number | null; newPrice: number | null; abs: number | null; pct: number | null }) => {
    setRangeStats({
      oldPrice: stats.oldPrice,
      newPrice: stats.newPrice,
      abs: stats.abs,
      pct: stats.pct
    });
  };

  // Validate livePrice specifically for 1D charts to prevent $0.00 data points
  const validatedLivePrice = useMemo(() => {
    if (range === "1D") {
      // For 1D, be strict about live price validation
      if (!livePrice || livePrice <= 0 || !isFinite(livePrice)) {
        console.warn(`Invalid livePrice for 1D chart:`, livePrice);
        return null;
      }
      return livePrice;
    }
    // For other ranges, pass through as before
    return livePrice;
  }, [livePrice, range]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-2 py-1 rounded-md border text-xs ${
              r.key === range 
                ? "bg-zinc-800 border-zinc-600" 
                : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-sm text-zinc-400">Loading chart data...</div>
          </div>
        ) : (
          <PriceChart
            data={chartData}
            range={range}
            livePrice={validatedLivePrice}
            height={320}
            onStats={handleStats}
            enableROI={true}
          />
        )}
      </div>
    </div>
  );
}


