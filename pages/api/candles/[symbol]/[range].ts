import type { NextApiRequest, NextApiResponse } from "next";

type RangeKey = "1D"|"5D"|"1M"|"6M"|"1Y"|"YTD"|"5Y"|"MAX";

const MAP: Record<RangeKey, { range:string; interval:string; intraday:boolean }> = {
  "1D":  { range: "1d",  interval: "5m",  intraday: true  },
  "5D":  { range: "5d",  interval: "15m", intraday: true  },
  "1M":  { range: "1mo", interval: "1d",  intraday: false },
  "6M":  { range: "6mo", interval: "1d",  intraday: false },
  "1Y":  { range: "1y",  interval: "1d",  intraday: false },
  "YTD": { range: "ytd", interval: "1d",  intraday: false },
  "5Y":  { range: "5y",  interval: "1wk", intraday: false },
  "MAX": { range: "max", interval: "1mo", intraday: false },
};

function toBusinessDay(ts: number){
  const d = new Date(ts*1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth()+1, day: d.getUTCDate() };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const hubHeader = req.headers["x-stock-hub"];
    if (hubHeader !== "1") {
      return res.status(403).json({ error: "Forbidden: candles API restricted to Stock Intelligence Hub" });
    }

    const symbol = String(req.query.symbol || "").trim().toUpperCase();
    const rk = String(req.query.range || "1Y").toUpperCase() as RangeKey;
    const cfg = MAP[rk];
    if (!symbol || !cfg) return res.status(400).json({ error: "Bad params" });

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}&includePrePost=false&events=capitalGain,div,split`;

    const r = await fetch(url, { headers: { "User-Agent": "MarketBrief/1.0" } });
    const j = await r.json().catch(()=> ({} as any));
    if (!r.ok || (j as any)?.chart?.error) {
      const msg = (j as any)?.chart?.error?.description || `Yahoo HTTP ${r.status}`;
      return res.status(502).json({ error: msg });
    }

    const res0 = (j as any)?.chart?.result?.[0];
    const ts: number[] = res0?.timestamp || [];
    const q = res0?.indicators?.quote?.[0] || {};
    const O = q.open || [], H = q.high || [], L = q.low || [], C = q.close || [], V = q.volume || [];

    const candles = ts.map((t:number,i:number)=>({
      time: cfg.intraday ? t : toBusinessDay(t),
      open: O[i], high: H[i], low: L[i], close: C[i], volume: V[i],
    })).filter((c:any) => [c.open,c.high,c.low,c.close].every(Number.isFinite));

    res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json({ provider:"yahoo", candles });
  } catch (e:any) {
    return res.status(502).json({ error: e?.message || "Upstream error" });
  }
}














