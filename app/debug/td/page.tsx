"use client";
import * as React from "react";
import { createChart, ColorType } from "lightweight-charts";

export default function TDChartDebug() {
  const [log, setLog] = React.useState<any>(null);
  const divRef = React.useRef<HTMLDivElement|null>(null);
  const chartRef = React.useRef<any>(null);
  const priceRef = React.useRef<any>(null);
  const volRef = React.useRef<any>(null);

  React.useEffect(()=>{
    if (!divRef.current) return;
    const chart = createChart(divRef.current, {
      height: 360,
      layout:{ background:{ type: ColorType.Solid, color:"transparent" }},
      grid:{ vertLines:{ visible:false }, horzLines:{ visible:false }},
      rightPriceScale:{ borderVisible:false },
      timeScale:{ borderVisible:false }
    });
    const cs = (chart as any).addCandlestickSeries({
      upColor:'#10b981', downColor:'#ef4444',
      borderUpColor:'#10b981', borderDownColor:'#ef4444',
      wickUpColor:'#10b981', wickDownColor:'#ef4444'
    });
    const vs = (chart as any).addHistogramSeries({ priceFormat:{ type:"volume" }, priceScaleId:"" });
    try { (vs as any)?.priceScale?.()?.applyOptions?.({ scaleMargins:{ top:0.8, bottom:0 }}); } catch {}
    chartRef.current = chart; priceRef.current = cs; volRef.current = vs;

    const onResize = ()=>{
      if (!divRef.current) return;
      chart.applyOptions({ width: divRef.current.clientWidth, height: 360 });
      chart.timeScale().fitContent();
    };
    onResize(); window.addEventListener("resize", onResize);
    return ()=>{ window.removeEventListener("resize", onResize); chart.remove(); };
  },[]);

  React.useEffect(()=>{
    (async ()=>{
      const r = await fetch("/api/twelvedata/candles/AAPL/1M", { cache:"no-store" });
      const j = await r.json();
      setLog(j);
      const candles = Array.isArray(j?.candles) ? j.candles : [];
      if (candles.length===0) return;
      priceRef.current?.setData(candles);
      volRef.current?.setData(candles.map((c:any)=>({ time:c.time, value:c.volume ?? 0 })));
      chartRef.current?.timeScale?.().fitContent?.();
    })();
  },[]);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">TD Debug — AAPL / 1M</h1>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div ref={divRef} style={{ width:"100%", height:360 }} />
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs">
        <div className="font-medium mb-2">API response (first 1k chars):</div>
        <pre className="overflow-auto">{JSON.stringify(log, null, 2)?.slice(0, 1000)}</pre>
      </div>
    </main>
  );
}





