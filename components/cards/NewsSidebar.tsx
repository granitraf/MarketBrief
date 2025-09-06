"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Newspaper, Search } from "lucide-react";
import { MagicBentoCard } from "@/components/ui/MagicBento";

type NewsItem = {
  headline: string;
  source: string;
  url: string;
  datetime: string | null;
};

export default function NewsSidebar() {
  const [ticker, setTicker] = useState<string>("");
  const queryKey = useMemo(() => ["news", ticker.trim().toUpperCase()], [ticker]);
  const endpoint = ticker.trim()
    ? `/api/news?symbol=${encodeURIComponent(ticker.trim().toUpperCase())}`
    : "/api/news";

  const { data, isLoading, error, refetch } = useQuery<{ updated: string; data: NewsItem[] }>(
    {
      queryKey,
      queryFn: () => fetch(endpoint).then((r) => r.json()),
      staleTime: 60_000,
    }
  );

  return (
    <MagicBentoCard
      enableStars={false}
      enableSpotlight={true}
      enableBorderGlow={true}
      glowColor="255, 255, 255"
      className="rounded-xl bg-zinc-900/95 p-4 text-white"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <Newspaper className="h-5 w-5" /> News
        </div>
        <div className="text-xs text-zinc-400">{data?.updated ? `Updated ${new Date(data.updated).toLocaleTimeString()}` : ""}</div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Search ticker (e.g., AAPL)"
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <Search className="h-4 w-4 absolute right-2 top-2.5 text-zinc-400" />
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md hover:bg-zinc-700"
        >
          Go
        </button>
      </div>
      {isLoading && <div className="text-sm text-zinc-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">Could not load news</div>}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <div className="flex gap-4">
            {data?.data?.map((n, idx) => (
              <a
                key={idx}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-[250px] max-w-[320px] bg-zinc-800 rounded-lg p-3 hover:bg-zinc-700 transition"
              >
                <div className="text-sm font-medium line-clamp-3">{n.headline}</div>
                <div className="text-xs text-zinc-400 mt-2">{n.source} {n.datetime ? `• ${new Date(n.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </MagicBentoCard>
  );
}


