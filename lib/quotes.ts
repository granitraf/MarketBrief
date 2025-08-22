import yahooFinance from 'yahoo-finance2';

export type QuoteResult = {
  price: number | null;
  changePct: number | null;
};

async function fetchYahoo(symbol: string): Promise<QuoteResult | null> {
  try {
    const q: any = await yahooFinance.quote(symbol as any);
    // Prefer regularMarketPrice, but for some FX/metal tickers Yahoo may set 0.
    const candidates = [
      q.regularMarketPrice,
      q.postMarketPrice,
      q.preMarketPrice,
      q.bid,
      q.ask,
      q.regularMarketPreviousClose,
    ];
    let price: number | null = null;
    for (const c of candidates) {
      if (typeof c === 'number' && c > 0) { price = c; break; }
      if (typeof c?.raw === 'number' && c.raw > 0) { price = c.raw; break; }
    }
    let changePct: number | null = null;
    if (typeof q.regularMarketChangePercent === 'number') changePct = q.regularMarketChangePercent;
    else if (price != null) {
      const prev = typeof q.regularMarketPreviousClose === 'number' ? q.regularMarketPreviousClose : (typeof q.regularMarketPreviousClose?.raw === 'number' ? q.regularMarketPreviousClose.raw : null);
      if (prev && prev > 0) changePct = ((price - prev) / prev) * 100;
    }
    if (price == null && changePct == null) return null;
    return { price, changePct };
  } catch {
    return null;
  }
}

async function fetchFinnhub(symbol: string): Promise<QuoteResult | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const url = new URL('https://finnhub.io/api/v1/quote');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('token', apiKey);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json();
    const price = typeof j.c === 'number' ? j.c : null;
    const changePct = typeof j.dp === 'number' ? j.dp : null;
    // Treat zero or negative as invalid for our use-case
    if ((price == null || price <= 0) && changePct == null) return null;
    if (price != null && price <= 0) return null;
    return { price, changePct };
  } catch {
    return null;
  }
}

/**
 * Resolves a live quote by trying Yahoo symbols first, then Finnhub as fallback.
 * Returns { price, changePct } or { null, null } if all candidates fail.
 */
export async function resolveQuote({ yh = [], fh = [] as string[] }: { yh?: string[]; fh?: string[] }): Promise<QuoteResult> {
  // Yahoo first
  for (const s of yh) {
    const r = await fetchYahoo(s);
    if (r) return r;
  }
  // Finnhub fallback
  for (const s of fh) {
    const r = await fetchFinnhub(s);
    if (r) return r;
  }
  return { price: null, changePct: null };
}


