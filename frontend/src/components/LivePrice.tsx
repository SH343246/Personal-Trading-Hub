import React from "react";
import Card from "./Card";

type Props = {
  symbol: string;
  price?: number;
  change?: number;
  changePct?: number;
  sparkline?: React.ReactNode;
};

export default function LivePrice({ symbol, price, change, changePct, sparkline }: Props) {
  const p = price ?? 0;
  const ch = change ?? 0;
  const cp = changePct ?? 0;

  return (
    <Card
      title={symbol}
      right={<span className={`badge ${ch >= 0 ? "badge-success" : "badge-error"}`}>{ch >= 0 ? "+" : ""}{ch.toFixed(2)} ({cp.toFixed(2)}%)</span>}
      className="h-full"
    >
      <div className="text-3xl font-semibold">${p.toFixed(2)}</div>
      {sparkline && <div className="mt-3">{sparkline}</div>}
    </Card>
  );
}
