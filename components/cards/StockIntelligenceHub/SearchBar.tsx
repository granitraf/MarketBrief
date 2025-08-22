"use client";

import { useStockStore } from "@/components/store/stockStore";
import TickerSearchInput from "@/components/TickerSearchInput";

type SearchResult = { symbol: string; description: string };

export default function SearchBar() {
  const setTicker = useStockStore((s) => s.setTicker);

  const fetchSuggestions = async (q: string) => {
    try {
      const response = await fetch(`/api/finnhub?path=/search&q=${encodeURIComponent(q)}`);
      const data: { count: number; result: SearchResult[] } = await response.json();
      
      return (data?.result ?? [])
        .slice(0, 8)
        .map((r) => ({
          ticker: r.symbol,
          name: r.description
        }));
    } catch {
      return [];
    }
  };

  return (
    <TickerSearchInput
      onSelect={(ticker) => setTicker(ticker)}
      fetchSuggestions={fetchSuggestions}
      placeholder="Search ticker (e.g., AAPL)"
    />
  );
}