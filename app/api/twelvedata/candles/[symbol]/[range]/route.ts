import { NextResponse } from "next/server";
import { td, toBizFromISO, toUnixFromISO } from "@/lib/twelvedata";

// Simple in-memory cache to smooth over rate limits
const CACHE_TTL_MS = 60_000; // 60s
const cache = new Map<string, { t:number; candles:any[]; range:string }>();

const EX_TZ = "America/New_York";

type RangeKey = "1D"|"5D"|"1M"|"3M"|"6M"|"YTD"|"1YR"|"5YR"|"MAX";

function atMidnightTZ(d: Date) { const z = new Date(d); z.setUTCHours(0,0,0,0); return z; }
function daysAgo(n: number) { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return atMidnightTZ(d); }
function startOfToday() { return atMidnightTZ(new Date()); }

// Get current time in America/New_York timezone as epoch ms
function getNowET(): number {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  return nyTime.getTime();
}

// Get cache key that includes time-based components to avoid "yesterday lock-in"
function getCacheKey(symbol: string, range: RangeKey, interval: string): string {
  const nowET = getNowET();
  const intervalMs = getIntervalMs(interval);
  const timeSlot = Math.floor(nowET / intervalMs);
  return `${symbol}|${range}|${interval}|${timeSlot}`;
}

// Get interval duration in milliseconds
function getIntervalMs(interval: string): number {
  switch (interval) {
    case "1min": return 60 * 1000;
    case "15min": return 15 * 60 * 1000;
    case "1day": return 24 * 60 * 60 * 1000;
    case "1week": return 7 * 24 * 60 * 60 * 1000;
    case "1month": return 30 * 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

function cfgFor(range: RangeKey) {
  const y = new Date().getUTCFullYear();
  const now = new Date();
  
  switch (range) {
    case "1D":  return { interval:"1min",   start: startOfToday(),            end: now, intraday:true } as const;
    case "5D":  return { interval:"15min",  start: daysAgo(7),                end: now, intraday:true } as const;
    case "1M":  return { interval:"1day",   start: daysAgo(35),               end: now, intraday:false } as const;
    case "3M":  return { interval:"1day",   start: daysAgo(100),              intraday:false } as const;
    case "6M":  return { interval:"1day",   start: daysAgo(200),              intraday:false } as const;
    case "YTD": return { interval:"1day",   start: new Date(Date.UTC(y,0,1)), intraday:false } as const;
    case "1YR": return { interval:"1day",   start: daysAgo(380),              intraday:false } as const;
    case "5YR": return { interval:"1week",  start: daysAgo(5*365+30),         intraday:false } as const;
    case "MAX": return { interval:"1month", start: daysAgo(20*365),           intraday:false } as const;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ symbol:string; range:string }>}) {
  const { symbol: rawSymbol, range: rawRange } = await ctx.params;
  const symbol = (rawSymbol || "").toUpperCase().trim();
  const rk = (rawRange || "").toUpperCase() as RangeKey;
  const cfg = cfgFor(rk);
  if (!symbol || !cfg) return NextResponse.json({ error:"bad params", candles:[] }, { status:400 });
  
  // Use time-based cache key to avoid "yesterday lock-in"
  const cacheKey = getCacheKey(symbol, rk, cfg.interval);

  try {
    const end = cfg.end as Date;
    const start = cfg.start as Date;
    
    // For intraday ranges, use full timestamps to preserve today's partial data
    // For daily ranges, extend end date by 24h to ensure today's data is included
    const endDate = cfg.intraday ? end : new Date(end.getTime() + 24 * 60 * 60 * 1000);
    
    const params:any = {
      symbol,
      interval: cfg.interval,
      start_date: start.toISOString().slice(0,10),
      end_date: endDate.toISOString().slice(0,10),
      timezone: EX_TZ,
      order: "ASC",
      outputsize: 5000
    };
    
    let j = await td("/time_series", params, 60);
    let values = Array.isArray((j as any)?.values) ? (j as any).values : [];
    values.sort((a:any,b:any)=> new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    values = values.filter((v:any, i:number)=> i===0 || v.datetime !== values[i-1].datetime);
    
    // Don't filter by start cutoff for intraday ranges to preserve today's partial data
    if (!cfg.intraday) {
      const cutoffMs = start.getTime();
      values = values.filter((v:any)=> new Date(v.datetime).getTime() >= cutoffMs);
    }

    // For 5D, restrict to the last 5 distinct trading session dates (in exchange timezone)
    if (rk === "5D" && values.length) {
      const dates: string[] = [];
      for (let i = values.length - 1; i >= 0 && dates.length < 5; i--) {
        const d = String(values[i].datetime).slice(0, 10); // YYYY-MM-DD in EX_TZ
        if (dates[dates.length - 1] !== d) dates.push(d);
      }
      const last5 = new Set(dates);
      values = values.filter((v:any) => last5.has(String(v.datetime).slice(0,10)));
    }

    let candles = values.map((v:any)=>({
      time: cfg.intraday ? toUnixFromISO(v.datetime) : toBizFromISO(v.datetime),
      open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close),
      volume: v.volume!=null ? Number(v.volume) : 0
    })).filter((c:any) => [c.open,c.high,c.low,c.close].every(Number.isFinite));

    if (candles.length === 0 && rk === "1D") {
      const j2 = await td("/time_series", { symbol, interval:"1min", start_date: params.start_date, end_date: params.end_date, timezone: EX_TZ, order:"ASC", outputsize:2000 }, 60);
      const v2 = Array.isArray((j2 as any)?.values) ? (j2 as any).values : [];
      v2.sort((a:any,b:any)=> new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
      const cutoff = start.getTime();
      candles = v2.filter((v:any)=> new Date(v.datetime).getTime() >= cutoff).map((v:any)=>({
        time: toUnixFromISO(v.datetime),
        open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close),
        volume: v.volume!=null ? Number(v.volume) : 0
      })).filter((c:any) => [c.open,c.high,c.low,c.close].every(Number.isFinite));
    }

    // cache successful response with time-based cache key
    cache.set(cacheKey, { t: Date.now(), candles, range: rk });
    return NextResponse.json({ range: rk, candles, updated: Date.now() }, {
      headers:{ "Cache-Control":"s-maxage=30, stale-while-revalidate=150" }
    });
  } catch (e:any) {
    // Fallback: Yahoo Finance if Twelve Data fails (e.g., rate limit)
    try {
      const ym = (rk:RangeKey) => {
        switch (rk) {
          case "1D":  return { range: "1d",  interval: "1m",  intraday:true  };
          case "5D":  return { range: "5d",  interval: "15m", intraday:true  };
          case "1M":  return { range: "1mo", interval: "1d",  intraday:false };
          case "3M":  return { range: "3mo", interval: "1d",  intraday:false };
          case "6M":  return { range: "6mo", interval: "1d",  intraday:false };
          case "YTD": return { range: "ytd", interval: "1d",  intraday:false };
          case "1YR": return { range: "1y",  interval: "1d",  intraday:false };
          case "5YR": return { range: "5y",  interval: "1wk", intraday:false };
          case "MAX": return { range: "max", interval: "1mo", intraday:false };
        }
      };
      const ycfg = ym(rk)!;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${ycfg.range}&interval=${ycfg.interval}&includePrePost=false&events=capitalGain,div,split`;
      const r = await fetch(url, { headers: { "User-Agent": "MarketBrief/1.0" }});
      const j = await r.json().catch(()=> ({} as any));
      if (r.ok && !(j as any)?.chart?.error) {
        const res0 = (j as any)?.chart?.result?.[0];
        const ts: number[] = res0?.timestamp || [];
        const q = res0?.indicators?.quote?.[0] || {};
        const O = q.open || [], H = q.high || [], L = q.low || [], C = q.close || [], V = q.volume || [];
        const candles = ts.map((t:number,i:number)=>({
          time: ycfg.intraday ? t : toBizFromISO(new Date(t*1000).toISOString()),
          open: Number(O[i] || 0), high: Number(H[i] || 0), low: Number(L[i] || 0), close: Number(C[i] || 0),
          volume: Number(V[i] || 0)
        })).filter((c:any) => [c.open,c.high,c.low,c.close].every(Number.isFinite));
        cache.set(cacheKey, { t: Date.now(), candles, range: rk });
        return NextResponse.json({ provider: "yahoo", range: rk, candles, updated: Date.now() }, { headers:{ "Cache-Control":"s-maxage=30" }});
      }
    } catch {}
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
      return NextResponse.json({ range: hit.range, candles: hit.candles, cached: true, error: e?.message }, {
        headers:{ "Cache-Control":"s-maxage=30" }
      });
    }
    return NextResponse.json({ candles:[], error: e?.message||"td candles error" }, { status:502 });
  }
}


