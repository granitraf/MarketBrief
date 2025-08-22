"use client";
import { useEffect, useRef } from "react";
import { useCandles, type HubRange } from "../hooks/useCandles";

export default function CandleChart({ symbol, range="1Y", height=360 }:{
  symbol: string; range: HubRange; height?: number;
}){
  const ref = useRef<HTMLDivElement|null>(null);
  const chartRef = useRef<any>(null);
  const priceRef = useRef<any>(null);
  const volRef = useRef<any>(null);
  const isAreaRef = useRef<boolean>(false);
  const lineOverlayRef = useRef<any>(null);
  // No zoom/drag clamping; interactions disabled per requirements
  const { data, loading, error } = useCandles(symbol, range);

  useEffect(()=>{
    let disposed = false;
    (async () => {
      if (!ref.current) return;
      const mod = await import("lightweight-charts");
      if (!ref.current || disposed) return;
      const initialWidth = ref.current.clientWidth || 600;
      const chart = mod.createChart(ref.current, {
        width: initialWidth,
        height,
        layout: { background: { type: mod.ColorType.Solid, color: "transparent" }, textColor: "#d4d4d8" },
        grid: { vertLines: { visible:false }, horzLines: { visible:false } },
        rightPriceScale: { borderVisible:false }, timeScale: { borderVisible:false },
        handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
        handleScale:  { mouseWheel: false, pinch: false, axisPressedMouseMove: false }
      });
      // Use a simple line chart for price to improve clarity
      if (typeof (chart as any).addLineSeries === "function") {
        priceRef.current = (chart as any).addLineSeries({ color: "#10b981", lineWidth: 2 });
        isAreaRef.current = true;
      } else if (typeof (chart as any).addAreaSeries === "function") {
        priceRef.current = (chart as any).addAreaSeries({ lineColor: "#10b981", lineWidth: 2, topColor: "rgba(16,185,129,0.12)", bottomColor: "rgba(16,185,129,0.00)" });
        isAreaRef.current = true;
      } else if (typeof (chart as any).addCandlestickSeries === "function") {
        priceRef.current = (chart as any).addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444", wickUpColor: "#10b981", wickDownColor: "#ef4444", borderVisible: false });
        isAreaRef.current = false;
      }

      // Secondary overlay line for visibility (same as price series)
      if (typeof (chart as any).addLineSeries === "function") {
        lineOverlayRef.current = (chart as any).addLineSeries({ color: "#10b981", lineWidth: 1, priceLineVisible:false });
      }
      // Remove volume bars per request (cleaner line-only chart)
      chartRef.current = chart;

      const onResize = () => {
        if (!ref.current || !chartRef.current) return;
        chartRef.current.applyOptions({ width: ref.current.clientWidth, height });
        chartRef.current.timeScale().fitContent();
      };
      onResize();
      window.addEventListener("resize", onResize);

      // If data already loaded before chart was ready, render it now
      try {
        if (!disposed && Array.isArray(data) && data.length && priceRef.current?.setData) {
          const seriesData = isAreaRef.current ? data.map((d:any)=>({ time:d.time, value:d.close })) : data;
          priceRef.current.setData(seriesData);
          if (chartRef.current?.timeScale) chartRef.current.timeScale().fitContent();
        }
        if (!disposed && Array.isArray(data) && volRef.current?.setData) {
          volRef.current.setData(data.map((d:any)=>({ time:d.time, value:d.volume ?? 0, color: "#71717a" })));
        }
        if (!disposed && Array.isArray(data) && lineOverlayRef.current?.setData) {
          lineOverlayRef.current.setData(data.map((d:any)=>({ time:d.time, value:d.close })));
        }
      } catch {}
      return () => { window.removeEventListener("resize", onResize); };
    })();
    return () => {
      disposed = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        priceRef.current = null;
        volRef.current = null;
      }
    };
  }, [height]);

  useEffect(()=>{
    if (!chartRef.current) return;
    const intraday = range === "1D" || range === "5D";
    chartRef.current.applyOptions({ timeScale: { timeVisible: intraday, secondsVisible: intraday } });
  }, [range]);

  useEffect(()=>{
    if (!chartRef.current || !data) return;
    if (priceRef.current?.setData) {
      const seriesData = data.map((d:any)=>({ time:d.time, value: (d.close ?? d.value ?? d.price) }));
      priceRef.current.setData(seriesData);
    }
    if (volRef.current?.setData) volRef.current.setData(data.map((d:any)=>({ time:d.time, value:d.volume ?? 0, color: "#71717a" })));
    if (lineOverlayRef.current?.setData) lineOverlayRef.current.setData(data.map((d:any)=>({ time:d.time, value:d.close })));
    // Fit to data and keep fixed; interactions are disabled
    const ts = chartRef.current.timeScale();
    ts.fitContent();
  }, [data]);
  return (
    <div className="w-full">
      <div ref={ref} style={{ width: "100%", height }} />
      {loading && <div className="text-sm opacity-70 mt-2">Loading…</div>}
      {error && <div className="text-sm text-red-400 mt-2">Error: {error}</div>}
      {Array.isArray(data) && data.length===0 && !loading && !error && (
        <div className="text-sm opacity-70 mt-2">No data for this range.</div>
      )}
    </div>
  );
}


