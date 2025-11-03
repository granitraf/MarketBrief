export const revalidate = 60;

import { NextResponse } from "next/server";
import { resolveQuote } from "@/lib/quotes";

type Item = { code: string; label: string; price: number | null; changePct: number | null };

export async function GET() {
  const updated = new Date().toISOString();
  try {
    const items: Item[] = [];

    // Fetch all commodities from Yahoo Finance
    const defs: { code: string; label: string; fh: string[]; yh: string[] }[] = [
      // Gold futures (GC=F) reflects current spot gold pricing accurately
      { code: "GOLD", label: "Gold", fh: [], yh: ["GC=F"] },
      { code: "XAG", label: "Silver", fh: [], yh: ["SI=F"] },
      { code: "COPPER", label: "Copper", fh: [], yh: ["HG=F"] },
      { code: "WHEAT", label: "Wheat", fh: [], yh: ["ZW=F"] },
      { code: "BCOM", label: "Bloomberg Commodity", fh: [], yh: ["^BCOM"] },
    ];

    for (const d of defs) {
      let r = await resolveQuote({ yh: d.yh, fh: d.fh });
      items.push({ code: d.code, label: d.label, price: r.price, changePct: r.changePct });
    }

    const res = NextResponse.json({ updated, items });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (error) {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}


