export const revalidate = 60;

import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET() {
  const updated = new Date().toISOString();
  try {
    const symbolToLabel: Record<string, string> = {
      "DX-Y.NYB": "DXY",
      "EURUSD=X": "EUR/USD",
      "USDJPY=X": "USD/JPY",
      "GBPUSD=X": "GBP/USD",
      "USDCAD=X": "USD/CAD",
    };
    const symbols = Object.keys(symbolToLabel);
    const quotes = await Promise.all(symbols.map((s) => yahooFinance.quote(s)));

    const data = quotes.map((q) => ({
      pair: symbolToLabel[q.symbol] ?? q.symbol,
      price: q.regularMarketPrice ?? null,
      changePct: q.regularMarketChangePercent ?? null,
    }));

    return NextResponse.json({ updated, data });
  } catch (error) {
    return NextResponse.json(
      { updated, error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}


