"use client";

import MarketBentoCard from '@/components/ui/MarketBentoCard';

export default function TestBento() {
  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MarketBentoCard variant="indices">
        <div className="p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Test Indices Card</h3>
          <p className="text-zinc-300">Hover to see purple particles</p>
        </div>
      </MarketBentoCard>

      <MarketBentoCard variant="stocks">
        <div className="p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Test Stocks Card</h3>
          <p className="text-zinc-300">Hover to see green particles</p>
        </div>
      </MarketBentoCard>

      <MarketBentoCard variant="crypto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Test Crypto Card</h3>
          <p className="text-zinc-300">Hover to see orange particles</p>
        </div>
      </MarketBentoCard>
    </div>
  );
}
