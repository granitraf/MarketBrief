export const revalidate = 60;

import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET() {
  const updated = new Date().toISOString();
  try {
    // Use Yahoo to avoid Finnhub free-plan pitfalls for crypto quotes
    const symbols = ["BTC-USD", "ETH-USD", "XRP-USD", "SOL-USD"] as const;
    const quotes = await Promise.all(symbols.map((s) => yahooFinance.quote(s)));
    const data = quotes.map((q) => ({
      symbol: q.symbol.replace("-USD", ""),
      price: q.regularMarketPrice ?? null,
      changePct: q.regularMarketChangePercent ?? null,
    }));

    return NextResponse.json({ updated, data });
  } catch (error) {
    return NextResponse.json(
      { updated, error: "Failed to fetch crypto" },
      { status: 500 }
    );
  }
}


