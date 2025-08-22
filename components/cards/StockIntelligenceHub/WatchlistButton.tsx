"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useStockStore } from "@/components/store/stockStore";

export default function WatchlistButton() {
  const [show, setShow] = useState(true);
  const ticker = useStockStore((s) => s.selectedTicker);
  const add = useStockStore((s) => s.addToWatchlist);

  useEffect(() => {
    setShow(true);
  }, []);

  if (!show) return null;
  return (
    <button
      aria-label="Add to watchlist"
      onClick={() => add(ticker)}
      className="absolute right-3 top-3 z-10 rounded-full bg-zinc-800 border border-zinc-700 p-2 hover:bg-zinc-700"
    >
      <Plus className="w-4 h-4" />
    </button>
  );
}


