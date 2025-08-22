"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type Quote = { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number }; // finnhub quote
type Profile = { name?: string; ticker?: string; marketCapitalization?: number; shareOutstanding?: number; industry?: string };
type Metrics = { metric?: Record<string, number | string | null> };
type Earnings = Array<{ period: string; actual?: number | null; estimate?: number | null }>;
type Recommendation = Array<{ period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }>;

export type Candle = { t: number[]; c: number[]; o: number[]; h: number[]; l: number[]; s: string };

export type FinnhubBundle = {
  quote?: Quote;
  profile?: Profile;
  metrics?: Metrics;
  earnings?: Earnings;
  recommendation?: Recommendation;
};

function buildRange(range: string) {
  const nowSec = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;
  switch (range) {
    case "1D":
      return { from: nowSec - day, to: nowSec, resolution: "5" };
    case "5D":
      return { from: nowSec - 5 * day, to: nowSec, resolution: "15" };
    case "1M":
      return { from: nowSec - 30 * day, to: nowSec, resolution: "60" };
    case "3M":
      return { from: nowSec - 90 * day, to: nowSec, resolution: "D" };
    case "6M":
      return { from: nowSec - 180 * day, to: nowSec, resolution: "D" };
    case "YTD": {
      const start = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
      return { from: Math.floor(start), to: nowSec, resolution: "D" };
    }
    case "1Y":
      return { from: nowSec - 365 * day, to: nowSec, resolution: "D" };
    case "5Y":
      return { from: nowSec - 5 * 365 * day, to: nowSec, resolution: "W" };
    default:
      return { from: nowSec - 20 * 365 * day, to: nowSec, resolution: "M" };
  }
}

export function useFinnhub(ticker: string, range: string) {
  const { from, to, resolution } = useMemo(() => buildRange(range), [range]);

  const quote = useQuery<Quote>({
    queryKey: ["fh", "quote", ticker],
    queryFn: () => fetch(`/api/finnhub?path=/quote&symbol=${ticker}`).then((r) => r.json()),
    staleTime: 30_000
  });

  const profile = useQuery<Profile>({
    queryKey: ["fh", "profile", ticker],
    queryFn: () => fetch(`/api/finnhub?path=/stock/profile2&symbol=${ticker}`).then((r) => r.json()),
    staleTime: 60 * 60 * 1000
  });

  const metrics = useQuery<Metrics>({
    queryKey: ["fh", "metrics", ticker],
    queryFn: () => fetch(`/api/finnhub?path=/stock/metric&symbol=${ticker}&metric=all`).then((r) => r.json()),
    staleTime: 10 * 60 * 1000
  });

  const candles = useQuery<Candle>({
    queryKey: ["fh", "candle", ticker, resolution, from, to],
    queryFn: () =>
      fetch(`/api/finnhub?path=/stock/candle&symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}`).then((r) => r.json()),
    staleTime: 30_000
  });

  const earnings = useQuery<Earnings>({
    queryKey: ["fh", "earnings", ticker],
    queryFn: () => fetch(`/api/finnhub?path=/stock/earnings&symbol=${ticker}`).then((r) => r.json()),
    staleTime: 6 * 60 * 60 * 1000
  });

  const recommendation = useQuery<Recommendation>({
    queryKey: ["fh", "rec", ticker],
    queryFn: () => fetch(`/api/finnhub?path=/stock/recommendation?symbol=${ticker}`).then((r) => r.json()),
    staleTime: 6 * 60 * 60 * 1000
  });

  return { quote, profile, metrics, candles, earnings, recommendation };
}














