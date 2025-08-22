export const revalidate = 60;

import { NextResponse } from "next/server";
import { resolveQuote } from "@/lib/quotes";

type Item = { code: string; label: string; price: number | null; changePct: number | null };

export async function GET() {
  const updated = new Date().toISOString();
  try {
    const defs: { code: string; label: string; fh: string[]; yh: string[] }[] = [
      // Use Yahoo futures for robust live pricing; fall back to FX pairs
      { code: "GOLD", label: "Gold", fh: ["OANDA:XAU_USD", "FOREXCOM:XAUUSD"], yh: ["GC=F", "XAUUSD=X"] },
      { code: "XAG", label: "Silver", fh: ["OANDA:XAG_USD", "FOREXCOM:XAGUSD"], yh: ["SI=F", "XAGUSD=X"] },
      { code: "COPPER", label: "Copper", fh: ["MCX:MCXHG1!", "COMEX:HG1!"], yh: ["HG=F"] },
      { code: "WHEAT", label: "Wheat", fh: ["CBOT:ZWA1!", "CBOT:ZW1!"], yh: ["ZW=F"] },
      { code: "BCOM", label: "Bloomberg Commodity", fh: ["INDEX:BCOM"], yh: ["^BCOM", "BCOM"] },
    ];

    const items: Item[] = [];
    for (const d of defs) {
      // Try Yahoo first; if no non-zero price, try Finnhub; then retry Yahoo last
      let r = await resolveQuote({ yh: d.yh, fh: [] });
      if (r.price == null || r.price <= 0) {
        r = await resolveQuote({ yh: [], fh: d.fh });
      }
      if (r.price == null || r.price <= 0) {
        r = await resolveQuote({ yh: d.yh, fh: [] });
      }
      items.push({ code: d.code, label: d.label, price: r.price, changePct: r.changePct });
    }

    const res = NextResponse.json({ updated, items });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (error) {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}


