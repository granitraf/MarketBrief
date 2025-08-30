export type PlotBox = { width:number;height:number;paddingLeft:number;paddingRight:number;paddingTop:number;paddingBottom:number };

export function buildXTimestamp(t:number, domain:[number,number], box:PlotBox):number {
  const [d0, d1] = domain;
  if (d1 === d0) return box.paddingLeft;
  const pct = (t - d0) / (d1 - d0);
  return box.paddingLeft + pct * (box.width - box.paddingLeft - box.paddingRight);
}

export function buildXOrdinal(idx:number, domain:[number,number], box:PlotBox):number {
  const [i0, i1] = domain;
  const n = Math.max(1, i1 - i0);
  const pct = (idx - i0) / n;
  return box.paddingLeft + pct * (box.width - box.paddingLeft - box.paddingRight);
}

export function buildY(price:number, domain:[number,number], box:PlotBox):number {
  const [y0, y1] = domain;
  if (y1 === y0) return box.height - box.paddingBottom;
  const pct = (price - y0) / (y1 - y0);
  // y increases downward in screen coords
  return box.paddingTop + (1 - pct) * (box.height - box.paddingTop - box.paddingBottom);
}

export function precomputePositions(
  series: Array<{ t?: number; x?: number; ts?: number; c: number }>,
  xMode: 'timestamp'|'ordinal',
  xDomain: [number,number],
  yDomain: [number,number],
  box: PlotBox
): { xs:number[]; ys:number[] } {
  const xs:number[] = new Array(series.length);
  const ys:number[] = new Array(series.length);
  for (let i = 0; i < series.length; i++) {
    const s = series[i];
    xs[i] = xMode === 'ordinal'
      ? buildXOrdinal(i, xDomain, box)
      : buildXTimestamp((s.t ?? s.ts ?? 0), xDomain, box);
    ys[i] = buildY(s.c, yDomain, box);
  }
  return { xs, ys };
}

export function nearestIndexFromPixelX(px:number, xs:number[]): number {
  // binary search
  let lo = 0, hi = xs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const x = xs[mid];
    if (x === px) return mid;
    if (x < px) lo = mid + 1; else hi = mid - 1;
  }
  // clamp to nearest between lo and hi
  const cand1 = Math.max(0, Math.min(xs.length - 1, lo));
  const cand2 = Math.max(0, Math.min(xs.length - 1, hi));
  const d1 = Math.abs(xs[cand1] - px);
  const d2 = Math.abs(xs[cand2] - px);
  return d1 <= d2 ? cand1 : cand2;
}

export function computeDeltaPct(startC:number, endC:number): { delta:number; pct:number } {
  const delta = endC - startC;
  const pct = startC !== 0 ? (delta / startC) * 100 : 0;
  return { delta, pct };
}

export function formatTimeLabel(ts:number|undefined, rangeKey:string): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (rangeKey === '1D' || rangeKey === '5D') {
    return d.toLocaleString('en-US', { hour:'numeric', minute:'2-digit' });
  }
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

