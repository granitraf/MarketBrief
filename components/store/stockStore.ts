"use client";

import { create } from "zustand";

type TimeRange = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

type StockState = {
  selectedTicker: string;
  timeRange: TimeRange;
  watchlist: string[];
  livePrice: number | null;
  rangeStats: { oldPrice: number|null; newPrice: number|null; abs: number|null; pct: number|null } | null;
  setTicker: (t: string) => void;
  setTimeRange: (r: TimeRange) => void;
  addToWatchlist: (t: string) => void;
  removeFromWatchlist: (t: string) => void;
  setLivePrice: (p: number | null) => void;
  setRangeStats: (s: { oldPrice: number|null; newPrice: number|null; abs: number|null; pct: number|null } | null) => void;
};

export const useStockStore = create<StockState>((set, get) => ({
  selectedTicker: "AAPL",
  timeRange: "1D",
  watchlist: [],
  livePrice: null,
  rangeStats: null,
  setTicker: (t) => set({ selectedTicker: t.toUpperCase() }),
  setTimeRange: (r) => set({ timeRange: r }),
  addToWatchlist: (t) => {
    const ticker = t.toUpperCase();
    const exists = get().watchlist.includes(ticker);
    if (!exists) set({ watchlist: [...get().watchlist, ticker] });
  },
  removeFromWatchlist: (t) => {
    const ticker = t.toUpperCase();
    set({ watchlist: get().watchlist.filter((x) => x !== ticker) });
  },
  setLivePrice: (p) => set({ livePrice: p }),
  setRangeStats: (s) => set({ rangeStats: s })
}));




