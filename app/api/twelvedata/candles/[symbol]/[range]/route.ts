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

function cfgFor(range: RangeKey) {
  const y = new Date().getUTCFullYear();
  switch (range) {
    case "1D":  return { interval:"5min",   start: startOfToday(),            intraday:true } as const;
    case "5D":  return { interval:"15min",  start: daysAgo(14),               intraday:true } as const;
    case "1M":  return { interval:"1day",   start: daysAgo(45),               intraday:false } as const;
    case "3M":  return { interval:"1day",   start: daysAgo(110),              intraday:false } as const;
    case "6M":  return { interval:"1day",   start: daysAgo(220),              intraday:false } as const;
    case "YTD": return { interval:"1day",   start: new Date(Date.UTC(y,0,1)), intraday:false } as const;
    case "1YR": return { interval:"1day",   start: daysAgo(400),              intraday:false } as const;
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
  const cacheKey = `${symbol}|${rk}`;

  try {
    const end = new Date();
    const start = cfg.start as Date;
    const params:any = {
      symbol,
      interval: cfg.interval,
      start_date: start.toISOString().slice(0,10),
      end_date: end.toISOString().slice(0,10),
      timezone: EX_TZ,
      order: "ASC",
      outputsize: 5000
    };
    let j = await td("/time_series", params, 60);
    let values = Array.isArray((j as any)?.values) ? (j as any).values : [];
    values.sort((a:any,b:any)=> new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    values = values.filter((v:any, i:number)=> i===0 || v.datetime !== values[i-1].datetime);
    const cutoffMs = start.getTime();
    values = values.filter((v:any)=> new Date(v.datetime).getTime() >= cutoffMs);

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
      const j2 = await td("/time_series", { symbol, interval:"15min", start_date: params.start_date, end_date: params.end_date, timezone: EX_TZ, order:"ASC", outputsize:2000 }, 60);
      const v2 = Array.isArray((j2 as any)?.values) ? (j2 as any).values : [];
      v2.sort((a:any,b:any)=> new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
      const cutoff = start.getTime();
      candles = v2.filter((v:any)=> new Date(v.datetime).getTime() >= cutoff).map((v:any)=>({
        time: toUnixFromISO(v.datetime),
        open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close),
        volume: v.volume!=null ? Number(v.volume) : 0
      })).filter((c:any) => [c.open,c.high,c.low,c.close].every(Number.isFinite));
    }

    // cache successful response
    cache.set(cacheKey, { t: Date.now(), candles, range: rk });
    return NextResponse.json({ range: rk, candles }, {
      headers:{ "Cache-Control":"s-maxage=60, stale-while-revalidate=300" }
    });
  } catch (e:any) {
    // Fallback: Yahoo Finance if Twelve Data fails (e.g., rate limit)
    try {
      const ym = (rk:RangeKey) => {
        switch (rk) {
          case "1D":  return { range: "1d",  interval: "5m",  intraday:true  };
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
          open: O[i], high: H[i], low: L[i], close: C[i], volume: V[i]
        })).filter((c:any) => [c.open,c.high,c.low,c.close].every(Number.isFinite));
        cache.set(cacheKey, { t: Date.now(), candles, range: rk });
        return NextResponse.json({ provider: "yahoo", range: rk, candles }, { headers:{ "Cache-Control":"s-maxage=30" }});
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


