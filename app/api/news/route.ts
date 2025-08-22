export const revalidate = 60;

import { NextRequest, NextResponse } from "next/server";

function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  const toStr = to.toISOString().slice(0, 10);
  const fromStr = from.toISOString().slice(0, 10);
  return { fromStr, toStr };
}

export async function GET(req: NextRequest) {
  const updated = new Date().toISOString();
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { updated, error: "Missing FINNHUB_API_KEY" },
      { status: 500 }
    );
  }

  try {
    let url: string;
    if (symbol) {
      const { fromStr, toStr } = getDateRange(5);
      url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
        symbol
      )}&from=${fromStr}&to=${toStr}&token=${apiKey}`;
    } else {
      url = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { updated, error: `Finnhub error: ${res.status}` },
        { status: 500 }
      );
    }
    const raw: any[] = await res.json();

    const trimmed = (raw || [])
      .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0))
      .slice(0, 8)
      .map((n) => ({
        headline: n.headline,
        source: n.source,
        url: n.url,
        datetime: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
      }));

    return NextResponse.json({ updated, data: trimmed });
  } catch (error) {
    return NextResponse.json(
      { updated, error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}


