"use client";
import { useEffect, useRef } from "react";
import { useScreener, type HubRange } from "../hooks/useScreener";

export default function HubAreaChart({ symbol, range, height=320 }:{
  symbol:string; range:HubRange; height?:number;
}){
  const ref = useRef<HTMLDivElement|null>(null);
  const { data, loading, error } = useScreener(symbol, range);

  useEffect(()=>{
    let disposed = false;
    (async () => {
      if (!ref.current) return;
      const mod = await import("lightweight-charts");
      if (!ref.current || disposed) return;
      const chart = mod.createChart(ref.current, {
        height,
        layout: { 
          background: { type: mod.ColorType.Solid, color: "transparent" },
          textColor: "#d4d4d8",
          fontFamily: "system-ui"
        },
        grid: { vertLines: { visible:false }, horzLines: { visible:false } },
        rightPriceScale: { borderVisible:false },
        timeScale: { 
          borderVisible:false,
          fixLeftEdge: true,
          fixRightEdge: true,
          lockVisibleTimeRangeOnResize: true
        },
      });
      let series: any = null;
      if (typeof (chart as any).addAreaSeries === "function") {
        series = (chart as any).addAreaSeries({
          lineWidth: 2,
          lineColor: "#10b981",
          topColor: "rgba(16,185,129,0.25)",
          bottomColor: "rgba(16,185,129,0.00)",
        });
      } else if (typeof (chart as any).addLineSeries === "function") {
        series = (chart as any).addLineSeries({ color: "#10b981", lineWidth: 2 });
      }
      (ref.current as any).__chart = chart;
      (ref.current as any).__series = series;

      const onResize = () => {
        if (!ref.current) return;
        chart.applyOptions({ width: ref.current.clientWidth, height });
        chart.timeScale().fitContent();
      };
      onResize();
      window.addEventListener("resize", onResize);
      return () => { window.removeEventListener("resize", onResize); };
    })();
    return ()=>{
      disposed = true;
      if (ref.current && (ref.current as any).__unsubscribeRange) {
        (ref.current as any).__unsubscribeRange();
      }
      const chart = (ref.current as any)?.__chart;
      if (chart) chart.remove();
      if (ref.current) { 
        (ref.current as any).__chart = null; 
        (ref.current as any).__series = null;
        (ref.current as any).__fullRange = null;
        (ref.current as any).__unsubscribeRange = null;
      }
    };
  },[height, symbol]);

  useEffect(()=>{
    if (!ref.current || !data) return;
    const chart = (ref.current as any).__chart;
    const area  = (ref.current as any).__series;
    if (!chart || !area) return;
    
    // Clean up previous subscription
    if ((ref.current as any).__unsubscribeRange) {
      (ref.current as any).__unsubscribeRange();
      (ref.current as any).__unsubscribeRange = null;
    }
    
    const series = (data.candles||[]).map((d:any)=>({ time:d.time, value:d.close }));
    area.setData(series);
    chart.timeScale().fitContent();
    
    // Store the full range as the zoom-out limit
    if (series.length > 1) {
      const firstTime = series[0].time;
      const lastTime = series[series.length - 1].time;
      
      // Store reference to the full range
      (ref.current as any).__fullRange = { from: firstTime, to: lastTime };
      
      // Subscribe to visible range changes to enforce zoom-out limit
      const handleVisibleRangeChange = () => {
        const timeScale = chart.timeScale();
        const currentRange = timeScale.getVisibleRange();
        const fullRange = (ref.current as any).__fullRange;
        
        if (currentRange && fullRange) {
          let needsUpdate = false;
          let newRange = { ...currentRange };
          
          // Don't allow zooming out beyond the full data range
          if (currentRange.from < fullRange.from) {
            newRange.from = fullRange.from;
            needsUpdate = true;
          }
          if (currentRange.to > fullRange.to) {
            newRange.to = fullRange.to;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            timeScale.setVisibleRange(newRange);
          }
        }
      };
      
      // Subscribe to visible range changes
      chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleRangeChange);
      
      // Store the unsubscribe function
      (ref.current as any).__unsubscribeRange = () => {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
      };
    }
  },[data, range]);

  return (
    <div className="w-full">
      <div ref={ref} style={{ width:"100%", height }} />
      {loading && <div className="text-sm opacity-70 mt-2">Loading…</div>}
      {error && <div className="text-sm text-red-600 mt-2">Error: {error}</div>}
      {data && Array.isArray(data.candles) && data.candles.length===0 && !loading && !error && (
        <div className="text-sm opacity-70 mt-2">No data for this range.</div>
      )}
    </div>
  );
}


