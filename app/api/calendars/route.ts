export const revalidate = 600;

import { NextResponse } from 'next/server';
import { getMarketCapUSD, mapLimit } from '@/lib/marketcap';

const EARNINGS_ENDPOINT = 'https://finnhub.io/api/v1/calendar/earnings';
const FDA_ENDPOINT = 'https://finnhub.io/api/v1/fda-advisory-committee-calendar';

type CalItem = {
  kind: 'EARN' | 'FDA';
  date: string; // yyyy-mm-dd
  ts?: string; // ISO datetime if present
  symbol?: string;
  title: string;
  subtitle?: string;
};

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

async function fetchJson(url: string, timeoutMs = 5000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function clampSubtitle(s?: string, max = 100): string | undefined {
  if (!s) return undefined;
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function toTimeHint(raw?: string | number | null): string | undefined {
  if (!raw && raw !== 0) return undefined;
  const txt = String(raw).toLowerCase();
  if (/(before|bmo)/.test(txt)) return 'BMO';
  if (/(after|amc)/.test(txt)) return 'AMC';
  if (/(during|market)/.test(txt)) return 'DM';
  return undefined;
}

function parseDateSafe(v?: string): string | undefined {
  if (!v) return undefined;
  // accept ISO or yyyy-mm-dd; normalize to yyyy-mm-dd
  const d = new Date(v);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const updated = new Date().toISOString();
  const from = ymd(new Date());
  const to = ymd(addDays(new Date(), 30)); // month horizon

  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
  }

  const earnUrl = `${EARNINGS_ENDPOINT}?from=${from}&to=${to}&token=${token}`;
  const fdaUrl = `${FDA_ENDPOINT}?from=${from}&to=${to}&token=${token}`;

  const [earnRes/*, fdaRes*/] = await Promise.all([
    fetchJson(earnUrl).catch(() => null),
    // FDA currently excluded from cards focused on companies; keep call disabled
    // fetchJson(fdaUrl).catch(() => null)
  ]);

  const items: CalItem[] = [];

  // Earnings normalization (defensive: support various shapes)
  const earnArray: any[] = Array.isArray(earnRes?.earningsCalendar)
    ? earnRes.earningsCalendar
    : Array.isArray(earnRes?.data)
    ? earnRes.data
    : Array.isArray(earnRes)
    ? earnRes
    : [];

  for (const e of earnArray) {
    const date: string | undefined = parseDateSafe(e?.date) || parseDateSafe(e?.startDate) || parseDateSafe(e?.startDateTime);
    if (!date) continue;
    const symbol: string | undefined = e?.symbol || e?.ticker || e?.code;
    const timeHint = toTimeHint(e?.time || e?.hour || e?.period);
    const eps = e?.epsEstimate ?? e?.eps_estimate;
    const rev = e?.revenueEstimate ?? e?.revenue_estimate;
    const ccy = e?.currency || e?.revenueCurrency || '';
    const estLineParts: string[] = [];
    if (eps != null) estLineParts.push(`EPS est $${Number(eps).toFixed(2)}`);
    if (rev != null) {
      const billions = Number(rev) >= 1_000_000_000;
      const revStr = billions ? (Number(rev) / 1_000_000_000).toFixed(1) + 'B' : Number(rev).toLocaleString();
      estLineParts.push(`Rev est ${ccy ? ccy + ' ' : ''}${revStr}`);
    }
    const title = `${symbol ?? 'Earnings'} — Earnings${timeHint ? ` (${timeHint})` : ''}`;
    const subtitle = clampSubtitle(estLineParts.join(', '));
    items.push({ kind: 'EARN', date, symbol, title, subtitle });
  }

  // FDA skipped for this view per latest requirement (companies focus)

  if (items.length === 0) {
    return NextResponse.json({ error: 'cal_fetch_failed' }, { status: 502 });
  }

  // Group into today / week / month (by local date)
  const todayLocal = new Date();
  const toLocalYmd = (s: string) => {
    // interpret as UTC day, show as local YYYY-MM-DD to avoid off-by-one
    const d = new Date(s + 'T00:00:00Z');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const todayStr = toLocalYmd(ymd(todayLocal));
  const weekEndStr = toLocalYmd(ymd(addDays(todayLocal, 7)));
  const monthEndStr = toLocalYmd(ymd(addDays(todayLocal, 30)));

  // placeholders removed; we'll assign arrays after selection

  // Market cap filtering for earnings
  const url = new URL(req.url);
  let minCap = Number(url.searchParams.get('minCap'));
  const minCapBn = Number(url.searchParams.get('minCapBn'));
  if (!Number.isFinite(minCap)) {
    if (Number.isFinite(minCapBn)) minCap = minCapBn * 1e9;
  }
  if (!Number.isFinite(minCap)) minCap = 1e9; // default ≥ $1B

  const earnSymbols = Array.from(new Set(items.filter(i => i.kind === 'EARN' && i.symbol).map(i => i.symbol as string)));
  const caps = await mapLimit(earnSymbols, 8, async (sym) => ({ sym, cap: await getMarketCapUSD(sym) }));
  const capMap = new Map(caps.map(x => [x.sym, x.cap]));

  let filtered: CalItem[] = items.filter((it) => {
    if (it.kind !== 'EARN') return true;
    const cap = capMap.get((it.symbol ?? '').toUpperCase()) ?? null;
    if (cap == null) return false; // exclude if lookup failed
    return cap >= minCap;
  });

  // Partition into day ranges with exclusivity: today, week (next 7 excluding today), month (>7 to 30)
  const withCap = filtered.map((it) => ({ ...it, _cap: it.kind === 'EARN' ? (capMap.get((it.symbol ?? '').toUpperCase()) ?? 0) : 0 }));
  const todayItems = withCap.filter(it => toLocalYmd(it.date) === todayStr && it.kind === 'EARN');
  // Week: > today, <= 7 days
  const weekItems = withCap.filter(it => {
    const d = toLocalYmd(it.date);
    return d > todayStr && d <= weekEndStr && it.kind === 'EARN';
  });
  // Month: > 7 days, <= 30 days
  const monthItems = withCap.filter(it => {
    const d = toLocalYmd(it.date);
    return d > weekEndStr && d <= monthEndStr && it.kind === 'EARN';
  });

  // Select top 10 by market cap for each bucket, then sort by date asc for display
  const pickTopThenSort = (arr: (CalItem & {_cap:number})[]) => arr
      .sort((a,b)=> b._cap - a._cap)
      .slice(0,10)
      .sort((a,b)=> toLocalYmd(a.date).localeCompare(toLocalYmd(b.date)));

  const todayTop = pickTopThenSort(todayItems);
  const weekTop = pickTopThenSort(weekItems);
  // Exclude any symbols already in today from week just in case
  const todaySyms = new Set(todayTop.map(i => (i.symbol ?? '').toUpperCase()));
  const weekTopDedup = weekTop.filter(i => !todaySyms.has((i.symbol ?? '').toUpperCase()));
  const monthTop = pickTopThenSort(monthItems).filter(i => !todaySyms.has((i.symbol ?? '').toUpperCase()) && !new Set(weekTopDedup.map(w=> (w.symbol ?? '').toUpperCase())).has((i.symbol ?? '').toUpperCase()));

  const today: CalItem[] = todayTop;
  const week: CalItem[] = weekTopDedup;
  const month: CalItem[] = monthTop;

  const res = NextResponse.json({ updated, today, week, month });
  res.headers.set('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  return res;
}


