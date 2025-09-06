"use client";

import { useQuery } from '@tanstack/react-query'
import { MagicBentoCard } from "@/components/ui/MagicBento";

type FGI = { updated: string; value: number | null; label?: string | null; wk?: number | null; mo?: number | null }

// helper: clamp 0..100 and map to angle [-90, +90]
const clamp = (n:number, min=0, max=100) => Math.max(min, Math.min(max, n))
const angleFromValue = (v:number) => -90 + (clamp(v) * 180) / 100

// SVG arc helpers
function polar(cx:number, cy:number, r:number, deg:number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
function arcPath(cx:number, cy:number, r:number, startDeg:number, endDeg:number) {
  const start = polar(cx, cy, r, endDeg)
  const end = polar(cx, cy, r, startDeg)
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export default function FearGreedCard() {
  const { data, isLoading, isError } = useQuery<FGI>({
    queryKey: ['fear-greed'],
    queryFn: () => fetch('/api/fear-greed').then(r => r.json()),
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
  })

  const value = typeof data?.value === 'number' ? clamp(data.value) : null
  const label = data?.label ?? ''
  const updated = data?.updated ? new Date(data.updated) : null
  const angle = value == null ? -90 : angleFromValue(value)

  return (
    <MagicBentoCard
      enableStars={false}
      enableSpotlight={false}
      enableBorderGlow={true}
      glowColor="255, 255, 255"
      className="rounded-xl bg-zinc-900/95 p-4 text-white min-h-[320px]"
    >
      {/* header */}
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">Fear &amp; Greed Index</h3>
        <span className="text-xs text-zinc-400">
          {updated ? `Updated ${updated.toLocaleTimeString()}` : ''}
        </span>
      </div>

      {/* value + label */}
      <div className="mt-2 flex items-end gap-3">
        <div className="text-2xl font-bold tabular-nums">{value ?? '—'}</div>
        <div className="text-xs text-zinc-400">{label}</div>
      </div>

      {/* gauge */}
      <div className="mt-3">
        <svg viewBox="0 0 300 170" className="w-full h-36 md:h-40 max-w-[420px] mx-auto">
          <defs>
            {/* colored arc gradient across the semicircle */}
            <linearGradient id="fgiGradient" x1="30" y1="0" x2="270" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%"  stopColor="#ef4444" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* background track */}
          <path
            d={arcPath(150, 150, 120, 270, 90)}
            stroke="#27272a"
            strokeWidth="30"
            fill="none"
            strokeLinecap="butt"
          />
          {/* colored arc on top */}
          <path
            d={arcPath(150, 150, 120, 270, 90)}
            stroke="url(#fgiGradient)"
            strokeWidth="26"
            fill="none"
            strokeLinecap="butt"
          />

          {/* ticks (light dots) */}
          {Array.from({ length: 6 }).map((_, i) => {
            const a = -90 + i * 36 // 0,20,40,60,80,100
            const p1 = polar(150, 150, 98, a) // move inward toward center
            return <circle key={i} cx={p1.x} cy={p1.y} r="2" fill="#3f3f46" />
          })}

          {/* needle group (animated via transform) */}
          <g
            style={{
              transformOrigin: '150px 150px',
              transform: `rotate(${angle}deg)`,
              transition: 'transform 600ms ease-out',
            }}
          >
            {/* needle */}
            <line x1="150" y1="150" x2="150" y2="30" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
            {/* hub */}
            <circle cx="150" cy="150" r="7" fill="#ef4444" />
            <circle cx="150" cy="150" r="3" fill="#1c1917" />
          </g>
        </svg>

        {/* labels under gauge */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="font-semibold">Extreme Fear</span>
          <span className="font-semibold text-zinc-300">Neutral</span>
          <span className="font-semibold">Extreme Greed</span>
        </div>
      </div>
    </MagicBentoCard>
  )
}
