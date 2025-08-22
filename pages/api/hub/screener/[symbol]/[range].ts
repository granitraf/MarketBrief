import type { NextApiRequest, NextApiResponse } from "next";
import { getCandlesTD, getQuoteTD, type HubRange } from "@/lib/hub/twelvedata";

const RANGES: HubRange[] = ["1D","5D","1M","6M","1Y","YTD","5Y","MAX"];

export default async function handler(req:NextApiRequest,res:NextApiResponse){
  try{
    if (req.headers["x-stock-hub"] !== "1") {
      return res.status(403).json({ error: "Forbidden: Stock Intelligence Hub only" });
    }
    const symbol = String(req.query.symbol||"").toUpperCase();
    const range  = String(req.query.range||"1Y").toUpperCase() as HubRange;
    if (!symbol || !RANGES.includes(range)) return res.status(400).json({ error:"Bad params" });

    const [candles, quote] = await Promise.all([
      getCandlesTD(symbol, range),
      getQuoteTD(symbol),
    ]);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ provider:"twelvedata", candles, quote });
  } catch (e:any) {
    return res.status(502).json({ error: e?.message || "Upstream error" });
  }
}













