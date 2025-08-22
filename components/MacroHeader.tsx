"use client";

import { useQuery } from "@tanstack/react-query";

export default function MacroHeader() {
  const { data } = useQuery<{ updated: string }>({
    queryKey: ["macrobrief-updated"],
    queryFn: () => fetch("/api/index-movements").then((r) => r.json()),
    staleTime: 60_000,
  });

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div className="text-zinc-300 text-sm">MacroBrief</div>
        <div className="text-xs text-zinc-400">
          {data?.updated ? `Last updated: ${new Date(data.updated).toLocaleTimeString()}` : ""}
        </div>
      </div>
      <div className="text-white text-xl font-semibold">Today’s Line</div>
      <div className="text-zinc-400 text-sm">Tech rallies while yields cool.</div>
    </div>
  );
}


