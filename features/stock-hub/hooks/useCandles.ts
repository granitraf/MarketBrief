"use client";

import { useEffect, useState } from "react";

export type HubRange = "1D"|"5D"|"1M"|"3M"|"6M"|"1Y"|"1YR"|"YTD"|"5Y"|"5YR"|"MAX";

export function useCandles(symbol: string, range: HubRange){
  const [data,setData] = useState<any[]|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);

  useEffect(()=>{
    if (!symbol) return;
    let cancelled = false;
    setLoading(true); setError(null);

    // Normalize legacy keys and route to Twelve Data candles API
    const rr = range === "1Y" ? "1YR" : range === "5Y" ? "5YR" : range;
    fetch(`/api/twelvedata/candles/${encodeURIComponent(symbol)}/${rr}`, {
      headers: { "x-stock-hub": "1" },
      cache: "no-store"
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (!j || j.error) {
          // preserve last good data to keep chart visible during brief outages/rate limits
          setError(j?.error || "Unknown error");
          // do not clear data
        } else {
          setData(j.candles || []);
        }
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol, range]);

  return { data, loading, error };
}







