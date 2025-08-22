export type HubRange = "1D"|"5D"|"1M"|"6M"|"1Y"|"YTD"|"5Y"|"MAX";

export type Candle = {
  time: number | { year:number; month:number; day:number };
  open:number; high:number; low:number; close:number; volume?:number;
};

const BASE = "https://api.twelvedata.com";
const KEY  = process.env.TWELVEDATA_API_KEY as string | undefined;
if (!KEY) {
  // eslint-disable-next-line no-console
  console.warn("TWELVEDATA_API_KEY is missing in env");
}

const MEMO: Record<string,{t:number;v:any}> = {};
const TTL  = 60_000; // 60s cache

function cacheGet(k:string){ const h=MEMO[k]; return h && (Date.now()-h.t<TTL) ? h.v : null; }
function cacheSet(k:string,v:any){ MEMO[k]={t:Date.now(),v}; }

function toBizDay(isoOrTs:string|number){
  const d = typeof isoOrTs === "number" ? new Date(isoOrTs*1000) : new Date(isoOrTs);
  return { year:d.getUTCFullYear(), month:d.getUTCMonth()+1, day:d.getUTCDate() };
}

function mapRange(range: HubRange){
  switch(range){
    case "1D":  return { interval:"5min",  outputsize: 120,  granularity:"intraday" as const };
    case "5D":  return { interval:"15min", outputsize: 200,  granularity:"intraday" as const };
    case "1M":  return { interval:"1day",  outputsize: 35,   granularity:"daily"    as const };
    case "6M":  return { interval:"1day",  outputsize: 200,  granularity:"daily"    as const };
    case "1Y":  return { interval:"1day",  outputsize: 400,  granularity:"daily"    as const };
    case "YTD": return { interval:"1day",  start_ytd: true,  granularity:"daily"    as const };
    case "5Y":  return { interval:"1week", outputsize: 300,  granularity:"daily"    as const };
    case "MAX": return { interval:"1month",outputsize: 5000, granularity:"daily"    as const };
  }
}

async function td(path:string, params:Record<string,string>): Promise<any> {
  if (!KEY) throw new Error("Missing TWELVEDATA_API_KEY");
  const usp = new URLSearchParams({ ...params, apikey: KEY });
  const url = `${BASE}/${path}?${usp.toString()}`;
  const cacheKey = `TD:${url}`;
  const hit = cacheGet(cacheKey); if (hit) return hit;

  let resp = await fetch(url);
  if (resp.status === 429) { await new Promise(r=>setTimeout(r,200)); resp = await fetch(url); }
  const json = await resp.json().catch(()=> ({}));
  if (!resp.ok || (json && json.status === "error")) {
    const msg = json?.message || `TwelveData HTTP ${resp.status}`;
    throw new Error(msg);
  }
  cacheSet(cacheKey, json);
  return json;
}

function symbolCandidates(sym:string): string[] {
  const s = String(sym).trim().toUpperCase();
  const bases = [s];
  const exchanges = ["NASDAQ", "NYSE", "AMEX", "ARCA"];
  for (const ex of exchanges) bases.push(`${ex}:${s}`);
  return Array.from(new Set(bases));
}

export async function getCandlesTD(symbolRaw:string, range:HubRange){
  if (!KEY) throw new Error("Missing TWELVEDATA_API_KEY");
  const candidates = symbolCandidates(symbolRaw);
  const cfg = mapRange(range)!;

  for (const sym of candidates) {
    try {
      const params: Record<string,string> = {
        symbol: sym,
        interval: (cfg as any).interval,
        timezone: "America/New_York",
      };
      if ("outputsize" in (cfg as any)) params.outputsize = String((cfg as any).outputsize);
      if ("start_ytd" in (cfg as any) && (cfg as any).start_ytd) {
        const y = new Date().getFullYear();
        params.start_date = `${y}-01-01`;
      }
      const j = await td("time_series", params);
      const values = Array.isArray(j?.values) ? j.values : [];
      if (!values.length) continue;
      const asc = [...values].reverse();
      const data = asc.map((v:any) => {
        const o=Number(v.open), h=Number(v.high), l=Number(v.low), c=Number(v.close);
        if (![o,h,l,c].every(Number.isFinite)) return null;
        const tISO = v.datetime;
        const time = (cfg as any).granularity === "intraday"
          ? Math.floor(new Date(`${tISO}Z`).getTime()/1000)
          : toBizDay(tISO);
        const vol = v.volume !== undefined ? Number(v.volume) : undefined;
        return { time, open:o, high:h, low:l, close:c, volume: Number.isFinite(vol!) ? vol : undefined };
      }).filter(Boolean);
      if ((data as Candle[]).length) return data as Candle[];
    } catch {
      // try next candidate
    }
  }
  return [] as Candle[];
}

export async function getQuoteTD(symbolRaw:string){
  if (!KEY) throw new Error("Missing TWELVEDATA_API_KEY");
  const candidates = symbolCandidates(symbolRaw);
  for (const sym of candidates) {
    try {
      const q = await td("quote", { symbol: sym });
      const res = {
        symbol: sym,
        price: Number(q?.price),
        change: Number(q?.change),
        percent_change: Number(q?.percent_change),
        previous_close: Number(q?.previous_close),
        open: Number(q?.open),
        high: Number(q?.high),
        low: Number(q?.low),
        volume: q?.volume ? Number(q.volume) : undefined,
        currency: q?.currency || "USD",
        timestamp: q?.timestamp ? Number(q.timestamp) : undefined,
      };
      if (
        [res.price, res.open, res.high, res.low, res.previous_close]
          .some((v) => typeof v === "number" && Number.isFinite(v as number))
      ) {
        return res;
      }
    } catch {
      // try next candidate
    }
  }
  // fallback empty
  return {
    symbol: String(symbolRaw).trim().toUpperCase(),
    price: NaN,
    change: NaN,
    percent_change: NaN,
    previous_close: NaN,
    open: NaN,
    high: NaN,
    low: NaN,
    volume: undefined,
    currency: "USD",
    timestamp: undefined,
  };
}


