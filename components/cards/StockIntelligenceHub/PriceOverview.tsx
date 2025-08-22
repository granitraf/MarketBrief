"use client";

import * as React from "react";
import { useStockStore } from "@/components/store/stockStore";
import { useFinnhub } from "@/components/hooks/useFinnhub";
import { useScreener } from "@/features/stock-hub/hooks/useScreener";
import { computeRangeChange } from "@/lib/rangeChange";

function formatNumberCompact(v?: number | null) {
  if (v == null) return "–";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

function formatCompactUSD(v?: number | null) {
  if (v == null) return "–";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(v);
}

// ADD helper
function computeOneDayPct(live?: number | null, prevClose?: number | null) {
  if (!Number.isFinite(live as number) || !Number.isFinite(prevClose as number)) return null;
  const lp = Number(live), pc = Number(prevClose);
  if (pc === 0) return null;
  return ((lp - pc) / pc) * 100;
}

export function PriceHeader() {
  const ticker = useStockStore((s) => s.selectedTicker);
  const range = useStockStore((s) => s.timeRange);
  const rangeStats = useStockStore((s) => s.rangeStats);
  const setLivePrice = useStockStore((s) => s.setLivePrice);
  // Keep Finnhub for profile/metrics, but prefer Twelve Data for live price/percent
  const { quote, profile } = useFinnhub(ticker, range);
  const td = useScreener(ticker, range as any);

  // Use Finnhub data for 1D calculation since it's working and accurate
  const finnhubLive = Number.isFinite(quote.data?.c as number) ? (quote.data?.c as number) : null;
  const finnhubPrevClose = Number.isFinite(quote.data?.pc as number) ? (quote.data?.pc as number) : null;
  const finnhubDailyPct = Number.isFinite(quote.data?.dp as number) ? (quote.data?.dp as number) : null;

  // For 1D, use Finnhub's calculated daily percent directly (most accurate), 
  // otherwise fall back to our calculation
  const oneDayPct = React.useMemo(() => {
    if (finnhubDailyPct !== null) return finnhubDailyPct;
    return computeOneDayPct(finnhubLive, finnhubPrevClose);
  }, [finnhubDailyPct, finnhubLive, finnhubPrevClose]);

  const tdCandles = td.data?.candles as any[] | undefined;
  const lastClose = tdCandles && tdCandles.length ? tdCandles[tdCandles.length - 1]?.close : undefined;
  // Use Finnhub for live price since it's accurate
  const livePrice = finnhubLive ?? (typeof lastClose === 'number' ? lastClose : null);
  
  // expose live price to chart through store
  React.useEffect(() => {
    setLivePrice(typeof livePrice === 'number' ? livePrice : null);
  }, [livePrice, setLivePrice]);
  
  const rangeCandles = Array.isArray(tdCandles) ? tdCandles : [];
  const { pct } = computeRangeChange(rangeCandles as any, livePrice ?? undefined);
  const rangePct = rangeStats?.pct ?? pct ?? null;

  // Final selection
  const pctToShow = range === "1D" ? oneDayPct : rangePct;   // leave others unchanged

  // Add debugging log for 1D
  if (range === "1D") {
    console.debug("1D pct inputs", { 
      live: finnhubLive, 
      previousClose: finnhubPrevClose, 
      finnhubDailyPct, 
      finalPct: oneDayPct,
      quoteData: quote.data 
    });
  }

  const pctClass =
    pctToShow == null ? "text-zinc-400" : pctToShow >= 0 ? "text-emerald-400" : "text-red-400";

  const pctText =
    pctToShow == null ? "—" : `${pctToShow >= 0 ? "+" : ""}${pctToShow.toFixed(2)}%`;

  const name = profile.data?.name ?? ticker;

  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <div className="text-xs text-zinc-400">{name} ({ticker})</div>
        <div className="text-3xl font-bold tracking-tight">{formatNumberCompact(livePrice)}</div>
        <div className={`text-sm ${pctClass}`}>{pctText}{' '}
          <span className="text-zinc-400 ml-2">Last {formatNumberCompact(livePrice)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PriceOverview() {
  const ticker = useStockStore((s) => s.selectedTicker);
  const range = useStockStore((s) => s.timeRange);
  const { quote, profile, metrics } = useFinnhub(ticker, range);

  // Pull selected metrics when available
  const epsTtm = (metrics.data?.metric?.epsTTM as number | undefined) ?? null;
  const pe = (metrics.data?.metric?.peNormalizedAnnual as number | undefined) ?? null;
  const mktCap = (profile.data?.marketCapitalization as number | undefined) ?? null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
      <Metric label="Open" value={formatNumberCompact(quote.data?.o)} />
      <Metric label="Day Low" value={formatNumberCompact(quote.data?.l)} />
      <Metric label="Day High" value={formatNumberCompact(quote.data?.h)} />
      <Metric label="Volume" value={formatNumberCompact((metrics.data?.metric?.volume as any) ?? null)} />
      <Metric label="Market Cap" value={formatCompactUSD(mktCap ? mktCap * 1_000_000 : null)} />
      <Metric label="EPS (TTM)" value={formatNumberCompact(epsTtm)} />
      <Metric label="Year Low" value={formatNumberCompact((metrics.data?.metric?.['52WeekLow'] as any))} />
      <Metric label="Year High" value={formatNumberCompact((metrics.data?.metric?.['52WeekHigh'] as any))} />
      <Metric label="P/E Ratio" value={formatNumberCompact(pe)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-800/40 border border-zinc-700 px-3 py-2">
      <div className="text-zinc-400 text-[11px]">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}