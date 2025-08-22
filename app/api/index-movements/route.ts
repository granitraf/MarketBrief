export const revalidate = 60;

import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET() {
  const updated = new Date().toISOString();
  try {
    const symbols = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"] as const;
    const quotes = await Promise.all(symbols.map((s) => yahooFinance.quote(s)));

    const data = quotes.map((q) => ({
      symbol: q.symbol,
      price: q.regularMarketPrice ?? null,
      changePct: q.regularMarketChangePercent ?? null,
    }));

    return NextResponse.json({ updated, data });
  } catch (error) {
    return NextResponse.json(
      { updated, error: "Failed to fetch index movements" },
      { status: 500 }
    );
  }
}


