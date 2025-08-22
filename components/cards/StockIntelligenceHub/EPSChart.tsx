"use client";

import React, { useMemo, useRef, useState } from "react";
import { useStockStore } from "@/components/store/stockStore";
import { useFinnhub } from "@/components/hooks/useFinnhub";

type FinnhubEarnings = { actual: number | null; estimate: number | null; period: string };

function beatLabel(a: number | null, e: number | null) {
  if (a == null || e == null) return { text: "", color: "#9CA3AF" };
  const diff = +(a - e).toFixed(2);
  if (diff > 0) return { text: `Beat: ${diff.toFixed(2)}`, color: "#10B981" };
  if (diff < 0) return { text: `Missed: ${Math.abs(diff).toFixed(2)}`, color: "#EF4444" };
  return { text: "Beat: 0", color: "#F59E0B" };
}

export default function EPSChart() {
  const ticker = useStockStore((s) => s.selectedTicker);
  const range = useStockStore((s) => s.timeRange);
  const { earnings } = useFinnhub(ticker, range);

  // Hooks must be declared unconditionally to avoid hook-order violations during different renders
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const fmt = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(2) : "—");

  const rows = (earnings.data ?? []).slice(-5) as FinnhubEarnings[];
  const data = useMemo(() => [...rows].sort((a, b) => a.period.localeCompare(b.period)), [rows]);

  const values = data
    .flatMap((d) => [d.actual ?? undefined, d.estimate ?? undefined])
    .filter((v): v is number => typeof v === "number");
  const hasValues = values.length > 0;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 0.2;
  const yMin = Math.max(0, Math.floor(min - pad));
  const yMax = Math.ceil(max + pad);

  const width = 900;
  const height = 320;
  // Generous side margins so edge points/labels don't clip and labels can be centered
  const margin = { top: 30, right: 110, bottom: 46, left: 110 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Evenly distribute points across the drawable width to better center labels under circles
  const xStep = innerW / Math.max(1, data.length - 1);
  const yScale = (v: number) => margin.top + (yMax - v) * (innerH / (yMax - yMin));

  const xPos = (i: number) => margin.left + i * xStep;

  // If no values, render fallback but AFTER hooks have been declared
  if (!hasValues) {
    return (
      <div ref={containerRef} className="relative h-80 w-full flex items-center justify-center text-sm text-zinc-400">
        Earnings data unavailable
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-80 w-full max-w-[900px] overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid */}
        {[0, 1, 2, 3].map((i) => {
          const y = margin.top + (i * innerH) / 3;
          const value = (yMax - (i * (yMax - yMin)) / 3).toFixed(1);
          return (
            <g key={i}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#2a2a2a" strokeDasharray="3 3" />
              <text x={margin.left - 10} y={y + 4} fontSize="12" fill="#D1D5DB" textAnchor="end">
                {value}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#3a3a3a" />

        {/* No connecting lines per request */}

        {/* Dots and x-labels */}
        {data.map((d, i) => {
          const x = xPos(i);
          const tickY = height - margin.bottom;
          const { text, color } = beatLabel(d.actual, d.estimate);
          return (
            <g key={d.period}>
              {/* x tick */}
              <text x={x} y={tickY + 16} fontSize="12" fill="#D1D5DB" textAnchor="middle">
                {d.period}
              </text>
              <text x={x} y={tickY + 32} fontSize="12" fill={color} textAnchor="middle">
                {text}
              </text>

              {/* points */}
              {typeof d.estimate === "number" && (
                <circle
                  cx={x}
                  cy={yScale(d.estimate)}
                  r={16}
                  fill="#38BDF8"
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHover({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHover({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              )}
              {typeof d.actual === "number" && (
                <circle
                  cx={x}
                  cy={yScale(d.actual)}
                  r={16}
                  fill="#34D399"
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHover({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHover({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-3 rounded-md bg-zinc-800/95 px-3 py-2 text-xs text-zinc-100 shadow ring-1 ring-zinc-700"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="mb-1 text-zinc-300">{data[hover.idx].period}</div>
          <div>
            Estimated: <span className="text-sky-400">{fmt(data[hover.idx].estimate)}</span>
          </div>
          <div>
            Actual: <span className="text-emerald-400">{fmt(data[hover.idx].actual)}</span>
          </div>
        </div>
      )}
    </div>
  );
}


