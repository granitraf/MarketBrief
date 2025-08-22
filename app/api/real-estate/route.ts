export const revalidate = 60;

import { NextResponse } from "next/server";
import { resolveQuote } from "@/lib/quotes";
import { normalizeTicker } from "@/features/real-estate/utils/normalizeTicker";

type Row = { symbol: string; price: number | null; changePct: number | null };

const ITEMS: { symbol: string; label: string }[] = [
  { symbol: "REET", label: "Global Real Estate" },
  { symbol: "VNQ", label: "U.S Real Estate" },
  { symbol: "XRE.TO", label: "Canadian Real Estate" },
];

const SYMBOL_MAP: Record<string, string> = {
  REET: "REET",
  VNQ: "VNQ",
  "XRE.TO": "XRE.TO",
};

export async function GET() {
  const updated = new Date().toISOString();
  try {
    const rows: Row[] = [];
    for (const item of ITEMS) {
      const mapped = normalizeTicker(SYMBOL_MAP[item.symbol] ?? item.symbol);
      let price: number | null = null;
      let changePct: number | null = null;
      const r = await resolveQuote({ yh: [mapped], fh: [mapped] });
      price = r.price ?? null;
      changePct = r.changePct ?? null;
      rows.push({ symbol: mapped, price, changePct });
    }
    return NextResponse.json({ updated, data: rows });
  } catch (e) {
    return NextResponse.json({ updated, error: "Failed to fetch real-estate" }, { status: 500 });
  }
}





