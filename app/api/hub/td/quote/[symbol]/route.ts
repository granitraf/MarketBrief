import { NextRequest, NextResponse } from "next/server";
import { getQuoteTD } from "@/lib/hub/twelvedata";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params;
    const symbol = rawSymbol?.toUpperCase();
    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const quote = await getQuoteTD(symbol);
    
    const live = Number.isFinite(quote.price) ? quote.price : null;
    const abs = Number.isFinite(quote.change) ? quote.change : null;
    const pct = Number.isFinite(quote.percent_change) ? quote.percent_change : null;
    const prev = Number.isFinite(quote.previous_close) ? quote.previous_close : null;
    const open = Number.isFinite(quote.open) ? quote.open : null;
    const high = Number.isFinite(quote.high) ? quote.high : null;
    const low = Number.isFinite(quote.low) ? quote.low : null;
    const volume = quote.volume;

    return NextResponse.json({
      provider: "twelvedata",
      symbol: symbol,
      live,                               // number
      change: abs,
      changePercent: pct,
      open, high, low,
      previousClose: prev,                // <-- ensure this key exists
      volume
    }, { headers: { "Cache-Control": "s-maxage=5" } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch quote" },
      { status: 502 }
    );
  }
}