"use client";

import * as React from "react";
import { createChart, ColorType } from "lightweight-charts";

type RangeKey = "1D"|"5D"|"1M"|"3M"|"6M"|"YTD"|"1YR"|"5YR"|"MAX";

export interface RangeStats {
  oldPrice: number|null;
  newPrice: number|null;
  abs: number|null;
  pct: number|null;
}

function isIntraday(range: RangeKey) {
  return range === "1D" || range === "5D";
}

function pickOldPrice(candles: any[], intraday: boolean) {
  if (!candles?.length) return null;
  const first = candles[0];
  if (intraday && Number.isFinite(first?.open)) return Number(first.open);
  if (Number.isFinite(first?.close)) return Number(first.close);
  return null;
}
function pickNewPrice(candles: any[], livePrice?: number | null) {
  if (Number.isFinite(livePrice as number)) return Number(livePrice);
  if (!candles?.length) return null;
  const last = candles[candles.length - 1];
  return Number.isFinite(last?.close) ? Number(last.close) : null;
}
function computeRangeChange(candles: any[], intraday: boolean, livePrice?: number|null): RangeStats {
  const oldP = pickOldPrice(candles, intraday);
  const newP = pickNewPrice(candles, livePrice);
  if (!Number.isFinite(oldP as number) || !Number.isFinite(newP as number)) {
    return { oldPrice: oldP ?? null, newPrice: newP ?? null, abs: null, pct: null };
  }
  const abs = (newP as number) - (oldP as number);
  const pct = (oldP as number) !== 0 ? (abs / (oldP as number)) * 100 : null;
  return { oldPrice: oldP, newPrice: newP, abs, pct };
}

interface Props {
  symbol: string;
  range: RangeKey;
  livePrice?: number | null;
  onStats?: (s: RangeStats) => void;
  className?: string;
  height?: number;
}

function inRegularSessionNY(unixSec: number) {
  const ny = new Date(new Date(unixSec * 1000).toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hh = ny.getHours();
  const mm = ny.getMinutes();
  const mins = hh * 60 + mm;
  const open = 9 * 60 + 30;   // 09:30
  const close = 16 * 60;      // 16:00
  return mins >= open && mins <= close;
}

export default function LineChart({ symbol, range, livePrice, onStats, className, height = 360 }: Props) {
  const wrapRef   = React.useRef<HTMLDivElement|null>(null);
  const chartRef  = React.useRef<any>(null);
  const areaRef   = React.useRef<any>(null);
  const unsubRef  = React.useRef<() => void>();

  React.useEffect(() => {
    if (!wrapRef.current) return;
    
    // User timezone formatting
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fmtTimeIntraday = new Intl.DateTimeFormat(undefined, {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: userTZ,
    });
    const fmtDate = new Intl.DateTimeFormat(undefined, {
      month: "short", day: "numeric", timeZone: userTZ,
    });

    const chart = createChart(wrapRef.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" } },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.2 } },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time, tickType, locale) => {
          // time is number (unix seconds) for intraday or {year,month,day} for daily+
          if (typeof time === "number") {
            return fmtTimeIntraday.format(new Date(time * 1000));
          } else {
            const d = new Date(Date.UTC(time.year, time.month - 1, time.day));
            return fmtDate.format(d);
          }
        },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
      handleScale:  { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
    });

    const area = chart.addAreaSeries({
      lineWidth: 2,
      lineType: 0,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    areaRef.current  = area;

    const onResize = () => {
      if (!wrapRef.current) return;
      chart.applyOptions({ width: wrapRef.current.clientWidth, height });
      chart.timeScale().fitContent();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [height]);

  React.useEffect(() => {
    if (!symbol || !chartRef.current) return;
    const intraday = isIntraday(range);

    (async () => {
      const normRange = range === "1Y" ? ("1YR" as RangeKey) : range === "5Y" ? ("5YR" as RangeKey) : range;
      const r = await fetch(`/api/twelvedata/candles/${encodeURIComponent(symbol)}/${normRange}`, { cache: "no-store" });
      const j = await r.json();
      const candles = Array.isArray(j?.candles) ? j.candles : [];

      // Filter intraday ranges to regular US market session (9:30-16:00 ET)
      const isIntradayRange = range === "1D" || range === "5D";
      let filtered = candles;
      if (isIntradayRange) {
        // our intraday times are unix seconds
        filtered = candles.filter(c => typeof c.time === "number" && inRegularSessionNY(c.time));
      }

      // set data from filtered not raw:
      const lineData = filtered.map((c:any) => ({ time: c.time, value: Number(c.close) }));
      areaRef.current?.setData(lineData);

      // Implement clean y-axis with tight scaling and 2-decimal formatting
      const values = lineData.map(p => p.value);
      if (values.length) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const pad = (max - min) * 0.06; // 6% padding
        areaRef.current?.applyOptions({
          priceFormat: { type: "price", precision: 2, minMove: 0.01 },
          autoscaleInfoProvider: () => ({
            priceRange: { minValue: min - pad, maxValue: max + pad }
          }),
        });
      }

      const stats = computeRangeChange(filtered, intraday, livePrice);
      onStats?.(stats);

      const positive = Number.isFinite(stats.pct as number) ? (stats.pct as number) >= 0 : false;
      const topColor    = positive ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)";
      const bottomColor = positive ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)";
      const lineColor   = positive ? "rgba(16,185,129,0.9)"  : "rgba(239,68,68,0.9)";
      areaRef.current?.applyOptions({ topColor, bottomColor, lineColor });

      // adjust timeVisible for intraday vs daily
      chartRef.current?.applyOptions({ timeScale: { timeVisible: isIntradayRange, secondsVisible: false } });
      chartRef.current?.timeScale().fitContent();

      // zoom & pan disabled, no subscription needed
      if (unsubRef.current) unsubRef.current();
      unsubRef.current = undefined;
    })();

    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [symbol, range, livePrice]);

  return <div ref={wrapRef} className={className} style={{ width: "100%", height }} />;
}


