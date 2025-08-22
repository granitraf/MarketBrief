export function computeRangeChange(candles: Array<{ close:number }>, livePrice?: number|null) {
  if (!Array.isArray(candles) || candles.length === 0) return { abs: 0, pct: 0 };
  const start = candles[0].close;
  const current = (typeof livePrice === "number" && isFinite(livePrice)) ? livePrice : candles[candles.length - 1].close;
  const abs = current - start;
  const pct = start ? (abs / start) * 100 : 0;
  return { abs, pct };
}





