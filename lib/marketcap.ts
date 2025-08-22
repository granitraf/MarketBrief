import yahooFinance from 'yahoo-finance2';

// Simple in-memory cache with TTL per symbol
type CacheEntry = { value: number | null; expires: number };
const CAP_CACHE = new Map<string, CacheEntry>();
const TEN_MIN_MS = 10 * 60 * 1000;

export async function fetchJson(url: string, timeoutMs = 4000): Promise<any | null> {
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

export async function getFinnhubMktCapUSD(symbol: string): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const j = await fetchJson(url, 4000);
  const mc = j?.marketCapitalization;
  if (mc == null) return null;
  const capNum = Number(mc);
  if (!Number.isFinite(capNum)) return null;
  // Finnhub usually returns USD; extremely small numbers may be billions
  if (capNum < 1_000_000) return capNum * 1e9; // treat sub-1e6 as billions edge case
  return capNum;
}

export async function getYahooMktCapUSD(symbol: string): Promise<number | null> {
  try {
    const q: any = await yahooFinance.quote(symbol as any);
    const mc = q?.marketCap;
    if (typeof mc === 'number') return mc;
    if (typeof mc?.raw === 'number') return mc.raw;
    return null;
  } catch {
    return null;
  }
}

export async function getMarketCapUSD(symbol: string): Promise<number | null> {
  const now = Date.now();
  const key = symbol.toUpperCase();
  const cached = CAP_CACHE.get(key);
  if (cached && cached.expires > now) return cached.value;

  // Prefer Yahoo for accuracy, then Finnhub as fallback
  let cap = await getYahooMktCapUSD(key);
  if (cap == null) cap = await getFinnhubMktCapUSD(key);

  CAP_CACHE.set(key, { value: cap, expires: now + TEN_MIN_MS });
  return cap;
}

// Simple concurrency limiter
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const ret: R[] = [];
  let i = 0;
  const run = async (): Promise<void> => {
    const idx = i++;
    if (idx >= items.length) return;
    ret[idx] = await fn(items[idx]);
    await run();
  };
  const runners = Array(Math.min(limit, items.length)).fill(0).map(() => run());
  await Promise.all(runners);
  return ret;
}


