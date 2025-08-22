"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStockStore } from "@/components/store/stockStore";
import { useFinnhub } from "@/components/hooks/useFinnhub";
import { useMemo } from "react";

export default function RecommendationChart() {
  const ticker = useStockStore((s) => s.selectedTicker);
  const range = useStockStore((s) => s.timeRange);
  const { recommendation } = useFinnhub(ticker, range);

  const data = useMemo(() => {
    return (recommendation.data ?? []).slice(0, 12).reverse().map((r) => ({
      month: r.period,
      strongBuy: r.strongBuy,
      buy: r.buy,
      hold: r.hold,
      sell: r.sell,
      strongSell: r.strongSell
    }));
  }, [recommendation.data]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} stackOffset="expand" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeOpacity={0.1} stroke="#52525b" vertical={false} />
          <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
          <Legend />
          <Bar dataKey="strongBuy" stackId="a" name="Strong Buy" fill="#10b981" />
          <Bar dataKey="buy" stackId="a" name="Buy" fill="#84cc16" />
          <Bar dataKey="hold" stackId="a" name="Hold" fill="#f59e0b" />
          <Bar dataKey="sell" stackId="a" name="Sell" fill="#f97316" />
          <Bar dataKey="strongSell" stackId="a" name="Strong Sell" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}














