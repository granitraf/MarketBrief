"use client";

import { useQuery } from "@tanstack/react-query";
import { LineChart } from "lucide-react";

type YObs = { date: string; value: number | null };
type Yields = { dgs10: YObs[]; dgs2: YObs[] };

export default function BondsAndRatesCard() {
  const { data, isLoading, error } = useQuery<{ updated: string; data: Yields }>(
    {
      queryKey: ["yields"],
      queryFn: () => fetch("/api/yields").then((r) => r.json()),
      staleTime: 60_000,
    }
  );

  const latest10 = getLatestWithDelta(data?.data?.dgs10);
  const latest2 = getLatestWithDelta(data?.data?.dgs2);
  const spread =
    latest10 && latest2 && latest10.value != null && latest2.value != null
      ? (latest10.value - latest2.value)
      : null;

  return (
    <div className="bg-zinc-900 text-white rounded-xl p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <LineChart className="h-5 w-5" /> Bonds & Rates
        </div>
        <div className="text-xs text-zinc-400">{data?.updated ? `Updated ${new Date(data.updated).toLocaleTimeString()}` : ""}</div>
      </div>
      {isLoading && <div className="text-sm text-zinc-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">Could not load data</div>}
      {!isLoading && !error && (
        <div className="space-y-2">
          <RateRow label="US10Y" subtitle="U.S. 10Y Treasury" value={latest10?.value ?? null} delta={latest10?.delta ?? null} />
          <RateRow label="US2Y" subtitle="U.S. 2Y Treasury" value={latest2?.value ?? null} delta={latest2?.delta ?? null} />
          <SpreadRow value={spread} />
        </div>
      )}
    </div>
  );
}

function SpreadRow({ value }: { value: number | null }) {
  return (
    <div className="bubble-pill">
      <div className="flex items-baseline gap-2">
        <span className="ticker-symbol">10Y–2Y Spread</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular-nums text-sm">{value == null ? "–" : `${value.toFixed(2)}%`}</span>
      </div>
    </div>
  );
}

// MOVE index removed per request

function getLatestWithDelta(arr?: YObs[]): { value: number | null; delta: number | null } | null {
  if (!arr || arr.length === 0) return null;
  const vals = arr.filter((o) => o.value !== null);
  if (vals.length === 0) return { value: null, delta: null };
  const last = vals[vals.length - 1].value as number;
  const prev = vals.length > 1 ? (vals[vals.length - 2].value as number) : last;
  const delta = last - prev;
  return { value: last, delta };
}

function RateRow({ label, subtitle, value, delta }: { label: string; subtitle: string; value: number | null; delta: number | null }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="bubble-pill">
      <div className="flex items-baseline gap-2">
        <span className="ticker-symbol">{label}</span>
        <span className="text-xs text-zinc-400">{subtitle}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular-nums text-sm">{value == null ? "–" : `${value.toFixed(2)}%`}</span>
        <span className={(up ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300") + " delta-badge"}>
          {delta == null ? "–" : `${up ? "+" : ""}${delta.toFixed(2)}%`}
        </span>
      </div>
    </div>
  );
}



