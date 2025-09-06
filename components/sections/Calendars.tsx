"use client";

import { useQuery } from "@tanstack/react-query";
import { MagicBentoCard } from "@/components/ui/MagicBento";

type CalItem = {
  kind: 'EARN' | 'FDA';
  date: string;
  ts?: string;
  symbol?: string;
  title: string;
  subtitle?: string;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CalCard({ title, items }: { title: string; items: CalItem[] }) {
  const limited = items.slice(0, 10);
  const extra = items.length - limited.length;
  return (
    <MagicBentoCard
      enableStars={false}
      enableSpotlight={false}
      enableBorderGlow={true}
      glowColor="255, 255, 255"
      className="rounded-xl bg-zinc-900/95 p-4 text-white min-h-[640px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">{title}</div>
      </div>
      {limited.length === 0 ? (
        <div className="text-sm text-zinc-400">No items</div>
      ) : (
        <ul>
          {limited.map((item, idx) => (
            <li key={idx} className="py-2 border-b border-zinc-800 last:border-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    item.kind === 'EARN' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-violet-900/40 text-violet-300'
                  }`}
                >
                  {item.kind}
                </span>
                <span className="font-medium text-sm text-zinc-100">{item.title}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs text-zinc-400">
                <span className="truncate">{item.subtitle ?? ''}</span>
                <span className="ml-2 shrink-0 text-zinc-500">{formatDate(item.date)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {extra > 0 && (
        <div className="mt-2 text-xs text-zinc-500">+ {extra} more this week</div>
      )}
    </MagicBentoCard>
  );
}

export default function Calendars() {
  const { data } = useQuery<{ updated: string; today: CalItem[]; week: CalItem[]; month: CalItem[] }>(
    {
      queryKey: ['calendars'],
      queryFn: () => fetch('/api/calendars').then(r => r.json()),
      staleTime: 600_000,
      refetchInterval: 600_000,
    }
  );

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300">Calendars</h2>
      <p className="text-xs text-zinc-500">Earnings shown: market cap ≥ $1B</p>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <CalCard title="Today" items={data?.today ?? []} />
        <CalCard title="This Week" items={data?.week ?? []} />
        <CalCard title="This Month" items={data?.month ?? []} />
      </div>
    </section>
  );
}


