import { NextRequest, NextResponse } from "next/server";

// Simple proxy to avoid exposing the API key directly in the client. The client supplies
// a "path" query like /search or /quote and any other query params except token, which is injected here.
// Example: /api/finnhub?path=/quote&symbol=AAPL

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing FINNHUB_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
  }

  // Build upstream URL with provided params, injecting token
  const upstream = new URL(`https://finnhub.io/api/v1${path}`);
  searchParams.forEach((value, key) => {
    if (key !== "path") upstream.searchParams.set(key, value);
  });
  upstream.searchParams.set("token", apiKey);

  try {
    const resp = await fetch(upstream.toString(), { cache: "no-store" });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (err) {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}




