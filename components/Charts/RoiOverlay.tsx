import React from 'react';
import type { PlotBox as BoxType } from '../../lib/roi';
import { precomputePositions, nearestIndexFromPixelX, computeDeltaPct, formatTimeLabel, type PlotBox } from '../../lib/roi';

export type RangeKey = '1D'|'5D'|'1M'|'3M'|'6M'|'YTD'|'1Y'|'5Y'|'MAX';

export default function RoiOverlay({
  series,
  xMode,
  xDomain,
  yDomain,
  plotBox,
  rangeKey,
  tooltipClassName,
  onSuppress
}: {
  series: Array<{ t?: number; x?: number; ts?: number; c: number }>;
  xMode: 'timestamp'|'ordinal';
  xDomain: [number, number];
  yDomain: [number, number];
  plotBox: PlotBox;
  rangeKey: RangeKey;
  tooltipClassName?: string;
  onSuppress?: (s: boolean) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(false);
  const [startIdx, setStartIdx] = React.useState<number|null>(null);
  const [endIdx, setEndIdx] = React.useState<number|null>(null);
  const rafRef = React.useRef<number|undefined>(undefined);
  const [boxOverride, setBoxOverride] = React.useState<PlotBox|null>(null);
  const EDGE_ZONE_WIDTH = 60;
  const [currentZone, setCurrentZone] = React.useState<'left'|'right'|'middle'|null>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number|null>(null);
  const [actualXs, setActualXs] = React.useState<number[]>([]);
  const [actualYs, setActualYs] = React.useState<number[]>([]);
  const DEBUG_MODE = false;

  const getZone = React.useCallback((x:number, box:PlotBox) => {
    // Left edge uses fixed width; right edge respects actual right padding
    const leftZoneEnd = EDGE_ZONE_WIDTH;
    const rightZoneStart = box.width - Math.min(EDGE_ZONE_WIDTH, box.paddingRight);
    if (x < leftZoneEnd) return 'left' as const;
    if (x > rightZoneStart) return 'right' as const;
    return 'middle' as const;
  }, []);

  const computeChartBox = React.useCallback(() => {
    if (!rootRef.current) return;
    const container = rootRef.current.parentElement;
    if (!container) return;

    const wrapper = container.querySelector('.recharts-wrapper');
    const plotArea = wrapper?.querySelector('.recharts-cartesian-grid-bg') as HTMLElement | null;
    const containerRect = container.getBoundingClientRect();

    if (plotArea) {
      const rect = plotArea.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;
      const paddingLeft = rect.left - containerRect.left;
      const paddingTop = rect.top - containerRect.top;
      const paddingRight = containerRect.right - rect.right;
      const paddingBottom = containerRect.bottom - rect.bottom;
      setBoxOverride({ width, height, paddingLeft, paddingRight, paddingTop, paddingBottom });
    } else {
      // Fallback to provided plotBox if we cannot find plot area
      setBoxOverride(plotBox);
    }
  }, [plotBox]);

  React.useLayoutEffect(() => {
    computeChartBox();
    if (!rootRef.current) return;
    const container = rootRef.current.parentElement;
    if (!container) return;
    const ro = new ResizeObserver(() => computeChartBox());
    ro.observe(container);
    return () => ro.disconnect();
  }, [computeChartBox]);

  // Extract actual coordinates from the rendered Recharts line path
  const extractChartPositions = React.useCallback(() => {
    if (!rootRef.current) return { xs: [], ys: [] };
    const container = rootRef.current.parentElement;
    if (!container) return { xs: [], ys: [] };
    const linePath = container.querySelector('.recharts-line-curve') as SVGPathElement | null;
    if (!linePath) return { xs: [], ys: [] };
    const d = linePath.getAttribute('d') || '';
    if (!d) return { xs: [], ys: [] };

    const segments = d.match(/[MLC][^MLC]*/g) || [];
    const points: Array<{ x:number; y:number }> = [];
    for (const seg of segments) {
      const cmd = seg[0];
      const nums = (seg.slice(1).match(/-?\d*\.?\d+/g) || []).map(n => parseFloat(n));
      if (cmd === 'M' || cmd === 'L') {
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const x = nums[i];
          const y = nums[i + 1];
          if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
        }
      } else if (cmd === 'C') {
        // take the end point of each cubic segment as the data point
        for (let i = 0; i + 5 < nums.length; i += 6) {
          const x = nums[i + 4];
          const y = nums[i + 5];
          if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
        }
      }
    }

    return {
      xs: points.map(p => p.x),
      ys: points.map(p => p.y)
    };
  }, []);

  // Observe DOM mutations and update actual positions when Recharts renders/updates
  React.useEffect(() => {
    const update = () => {
      const pts = extractChartPositions();
      if (pts.xs.length && pts.ys.length && pts.xs.length === pts.ys.length) {
        setActualXs(pts.xs);
        setActualYs(pts.ys);
      } else {
        setActualXs([]);
        setActualYs([]);
      }
    };
    update();
    if (!rootRef.current) return;
    const container = rootRef.current.parentElement;
    if (!container) return;
    const mo = new MutationObserver(() => update());
    mo.observe(container, { childList: true, subtree: true });
    const to = setTimeout(update, 120);
    return () => { mo.disconnect(); clearTimeout(to); };
  }, [extractChartPositions, series]);

  // Precompute pixel positions - only when we have valid plotBox dimensions
  const positions = React.useMemo(() => {
    const box = boxOverride || plotBox;
    if (!box || box.width === 0 || box.height === 0) {
      return { xs: [], ys: [] };
    }
    return precomputePositions(series, xMode, xDomain, yDomain, box as BoxType);
  }, [series, xMode, xDomain, yDomain, plotBox, boxOverride]);

  const { xs, ys } = positions;
  const fx = (actualXs.length === series.length) ? actualXs : xs;
  const fy = (actualYs.length === series.length) ? actualYs : ys;

  const withinPlot = React.useCallback((px: number, py: number) => {
    const box = boxOverride || plotBox;
    const { paddingLeft, paddingRight, paddingTop, paddingBottom, width, height } = box;
    const xOk = px >= paddingLeft && px <= (width - paddingRight);
    const yOk = py >= paddingTop && py <= (height - paddingBottom);
    return xOk && yOk;
  }, [plotBox, boxOverride]);

  // Global pointer handlers to avoid blocking Recharts hover when not dragging
  React.useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Prevent text selection and enable drag UX
      if (e.cancelable) e.preventDefault();
      document.body.style.userSelect = 'none';
      // @ts-ignore
      document.body.style.webkitUserSelect = 'none';
      document.body.classList.add('roi-dragging');

      if (!rootRef.current || fx.length === 0) return;
      const rect = rootRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (!withinPlot(px, py)) return;

      // Edge zones disable drag and show fixed tooltip
      const box = (boxOverride || plotBox);
      const zone = getZone(px, box);
      setCurrentZone(zone);
      if (zone === 'left') {
        setHoverIndex(0);
        if (onSuppress) onSuppress(true);
        return;
      }
      if (zone === 'right') {
        setHoverIndex(fx.length - 1);
        if (onSuppress) onSuppress(true);
        return;
      }

      const idx = nearestIndexFromPixelX(px, fx);
      setActive(true);
      setStartIdx(idx);
      setEndIdx(idx);
      if (onSuppress) onSuppress(true);

      const handlePointerMove = (ev: PointerEvent) => {
        if (!rootRef.current) return;
        const r2 = rootRef.current.getBoundingClientRect();
        const px2 = ev.clientX - r2.left;

        // Update zones during drag, but only act on middle
        const z = getZone(px2, (boxOverride || plotBox));
        setCurrentZone(z);
        if (z !== 'middle') {
          // ignore moves in edge zones while dragging
          return;
        }
        const idx2 = nearestIndexFromPixelX(px2, fx);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => setEndIdx(idx2));
      };

      const endDrag = () => {
        setActive(false);
        setStartIdx(null);
        setEndIdx(null);
        if (onSuppress) onSuppress(false);
        // Re-enable selection
        document.body.style.userSelect = '';
        // @ts-ignore
        document.body.style.webkitUserSelect = '';
        document.body.classList.remove('roi-dragging');
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
        window.removeEventListener('pointerleave', endDrag);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      window.addEventListener('pointerleave', endDrag);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [xs, withinPlot, onSuppress, getZone]);

  // Track hover for edge zones and avoid drag when not active
  React.useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!rootRef.current || fx.length === 0) return;
      const rect = rootRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const inside = px >= 0 && px <= rect.width && py >= 0 && py <= rect.height;
      if (!inside) {
        setCurrentZone(null);
        setHoverIndex(null);
        if (!active && onSuppress) onSuppress(false);
        return;
      }
      const zone = getZone(px, (boxOverride || plotBox));
      setCurrentZone(zone);
      if (active) return; // dragging handled elsewhere
      if (zone === 'left') {
        setHoverIndex(0);
        if (onSuppress) onSuppress(true);
        return;
      }
      if (zone === 'right') {
        setHoverIndex(fx.length - 1);
        if (onSuppress) onSuppress(true);
        return;
      }
      // middle area: let Recharts handle hover
      setHoverIndex(null);
      if (onSuppress) onSuppress(false);
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, [fx, active, onSuppress, getZone, boxOverride, plotBox, withinPlot]);

  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { 
      if (active && ev.key === 'Escape') {
        setActive(false);
        setStartIdx(null);
        setEndIdx(null);
        if (onSuppress) onSuppress(false);
        // Re-enable selection on escape cancel
        document.body.style.userSelect = '';
        // @ts-ignore
        document.body.style.webkitUserSelect = '';
        document.body.classList.remove('roi-dragging');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onSuppress]);

  // Cleanup RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (onSuppress) onSuppress(false);
      // Ensure selection is re-enabled on unmount
      document.body.style.userSelect = '';
      // @ts-ignore
      document.body.style.webkitUserSelect = '';
      document.body.classList.remove('roi-dragging');
    };
  }, []);

  // Toggle body class while dragging to prevent selection
  React.useEffect(() => {
    if (active) {
      document.body.classList.add('roi-dragging');
      return () => document.body.classList.remove('roi-dragging');
    }
  }, [active]);

  // Don't render if plotBox dimensions are not ready or no series data
  if (plotBox.width === 0 || plotBox.height === 0 || !series || series.length < 2) {
    return null;
  }

  // Safety check for valid positions
  if (xs.length === 0 || ys.length === 0) {
    return null;
  }

  // Compute ROI info and styling
  const roiInfo = React.useMemo(() => {
    if (!active || startIdx == null || endIdx == null) return null;
    const idxA = startIdx;
    const idxB = endIdx;
    let olderIdx = idxA;
    let newerIdx = idxB;
    if (xMode === 'ordinal') {
      olderIdx = Math.min(idxA, idxB);
      newerIdx = Math.max(idxA, idxB);
    } else {
      const ta = series[idxA].ts ?? series[idxA].t ?? 0;
      const tb = series[idxB].ts ?? series[idxB].t ?? 0;
      if (ta > tb) { olderIdx = idxB; newerIdx = idxA; }
    }

    if (olderIdx < 0 || newerIdx < 0 || olderIdx >= series.length || newerIdx >= series.length) {
      return null;
    }
    const s = series[olderIdx];
    const e = series[newerIdx];
    if (!s || !e || typeof s.c !== 'number' || typeof e.c !== 'number') return null;
    const { delta, pct } = computeDeltaPct(s.c, e.c);
    const isPositive = delta >= 0;
    return {
      olderIdx,
      newerIdx,
      delta,
      pct,
      isPositive,
      fillColor: isPositive ? '#10B981' : '#EF4444',
      textColorClass: isPositive ? 'text-green-500' : 'text-red-500',
      deltaFormatted: `${isPositive ? '+' : ''}${Math.abs(delta).toFixed(2)}`,
      pctFormatted: `${isPositive ? '+' : ''}${Math.abs(pct).toFixed(2)}%`
    };
  }, [active, startIdx, endIdx, series, xMode]);

  let content: React.ReactNode = null;
  if (active && startIdx != null && endIdx != null) {
    try {
      if (!roiInfo) {
        return null;
      }
      const { olderIdx, newerIdx } = roiInfo;
      const s = series[olderIdx];
      const e = series[newerIdx];
      const x1 = fx[olderIdx], y1 = fy[olderIdx];
      const x2 = fx[newerIdx], y2 = fy[newerIdx];

      // Safety check for valid positions
      if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') {
        return null;
      }

      const laterTs = e.ts ?? e.t;
      const earlierTs = s.ts ?? s.t;

      const pill = (
        <div className={tooltipClassName || ''} style={{ position:'absolute', left: x2 + 8, top: Math.min(y1, y2) - 8, transform:'translateY(-100%)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{ fontSize:12, opacity:.8 }}>
              {formatTimeLabel(earlierTs, rangeKey)} — {formatTimeLabel(laterTs, rangeKey)}
            </div>
            <div className={`text-sm font-medium ${roiInfo.textColorClass}`} style={{ fontWeight:600 }}>
              {`$${roiInfo.deltaFormatted} (${roiInfo.pctFormatted})`}
            </div>
          </div>
        </div>
      );

      content = (
        <>
          <svg className="roi-overlay-svg" width={(boxOverride || plotBox).width} height={(boxOverride || plotBox).height} style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
            {/* Vertical lines through start and end points */}
            <line x1={x1} y1={(boxOverride || plotBox).paddingTop} x2={x1} y2={(boxOverride || plotBox).height - (boxOverride || plotBox).paddingBottom} stroke="#4B5563" strokeWidth={1} opacity={0.6} />
            <line x1={x2} y1={(boxOverride || plotBox).paddingTop} x2={x2} y2={(boxOverride || plotBox).height - (boxOverride || plotBox).paddingBottom} stroke="#4B5563" strokeWidth={1} opacity={0.6} />
            {/* ROI connector between endpoints */}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={roiInfo.fillColor} opacity={0.6} strokeWidth={1} />
            {/* Circles matching hover style */}
            <circle cx={x1} cy={y1} r={4} fill="#ffffff" stroke={roiInfo.fillColor} strokeWidth={2} />
            <circle cx={x2} cy={y2} r={4} fill="#ffffff" stroke={roiInfo.fillColor} strokeWidth={2} />
            {DEBUG_MODE && (fx.length === series.length) && fx.map((x, i) => (
              <circle key={i} cx={x} cy={fy[i]} r={2} fill="red" opacity={0.4} />
            ))}
          </svg>
          {pill}
        </>
      );
    } catch (error) {
      console.warn('Error rendering ROI overlay:', error);
      return null;
    }
  }

  return (
    <div
      ref={rootRef}
      style={{ position:'absolute', inset:0, pointerEvents:'none' }}
    >
      {/* Edge zone visual indicators */}
      {currentZone === 'left' && (
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:EDGE_ZONE_WIDTH, background:'rgba(39,39,42,0.10)', pointerEvents:'none' }} />
      )}
      {currentZone === 'right' && (
        (() => {
          const box = (boxOverride || plotBox);
          const zoneW = Math.min(EDGE_ZONE_WIDTH, box.paddingRight);
          return <div style={{ position:'absolute', right:0, top:0, bottom:0, width:zoneW, background:'rgba(39,39,42,0.10)', pointerEvents:'none' }} />
        })()
      )}

      {/* ROI content when dragging */}
      {content}

      {/* Edge zone hover indicator: vertical line and circle at actual data point */}
      {!active && hoverIndex != null && fx[hoverIndex] != null && fy[hoverIndex] != null && (
        (() => {
          const box = (boxOverride || plotBox);
          const x = fx[hoverIndex]!;
          const y = fy[hoverIndex]!;
          const yTop = box.paddingTop;
          const yBottom = box.height - box.paddingBottom;
          return (
            <svg className="roi-overlay-svg" width={box.width} height={box.height} style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
              <line x1={x} y1={yTop} x2={x} y2={yBottom} stroke="#4B5563" strokeWidth={1} opacity={0.5} />
              <circle cx={x} cy={y} r={4} fill="#ffffff" stroke="#10B981" strokeWidth={2} />
            </svg>
          );
        })()
      )}

      {/* Tooltip positioned at the actual point (edge zones or middle when we decide to show) */}
      {!active && hoverIndex != null && fx[hoverIndex] != null && fy[hoverIndex] != null && (
        (() => {
          const box = (boxOverride || plotBox);
          const x = fx[hoverIndex]!;
          const y = fy[hoverIndex]!;
          const approxWidth = 160;
          const approxHeight = 56;
          let left = x;
          let top = y - 70;
          // Clamp horizontally within container
          if (left - approxWidth / 2 < 0) left = approxWidth / 2;
          if (left + approxWidth / 2 > box.width) left = box.width - approxWidth / 2;
          // If above top, place below point
          if (top < 0) top = y + 20;
          const s = series[hoverIndex];
          const ts = s.ts ?? s.t;
          return (
            <div className={tooltipClassName || ''} style={{ position:'absolute', left, top, transform:'translateX(-50%)', pointerEvents:'none', whiteSpace:'nowrap' }}>
              <div style={{ fontSize:12, opacity:.8 }}>
                {formatTimeLabel(ts, rangeKey)}
              </div>
              <div style={{ fontWeight:600 }}>
                ${s.c.toFixed(2)}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
