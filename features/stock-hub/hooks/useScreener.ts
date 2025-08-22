"use client";

import { useEffect, useState } from "react";

export type HubRange = "1D"|"5D"|"1M"|"6M"|"1Y"|"YTD"|"5Y"|"MAX";

export function useScreener(symbol:string, range:HubRange){
  const [data,setData] = useState<{candles:any[];quote:any}|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);

  useEffect(()=>{
    if (!symbol) return;
    let cancelled=false; setLoading(true); setError(null);
    fetch(`/api/hub/screener/${encodeURIComponent(symbol)}/${range}`, {
      headers: { "x-stock-hub": "1" }
    })
      .then(r=>r.json())
      .then(j=>{
        if (cancelled) return;
        if (j?.error) { setError(j.error); setData(null); }
        else setData({ candles: j.candles||[], quote: j.quote||null });
      })
      .catch(e=>{ if(!cancelled) setError(e.message); })
      .finally(()=>{ if(!cancelled) setLoading(false); });
    return ()=>{ cancelled=true; };
  },[symbol,range]);

  return { data, loading, error };
}













