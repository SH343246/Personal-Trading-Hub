import React from "react";
import Card from "./Card";

type Item = { symbol: string; price: number; changePct: number };
//todo: use or remove

export default function WatchlistPanel({ items }: { items: Item[] }) {
  return (
    <Card title="Watchlist" className="h-full">
      <ul className="menu w-full">
        {items.map(x => (
          <li key={x.symbol} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge badge-neutral">{x.symbol}</span>
            </div>
            <div className="text-sm">{x.price.toFixed(2)}</div>
            <div className={`text-xs ${x.changePct >= 0 ? "text-success" : "text-error"}`}>
              {x.changePct >= 0 ? "+" : ""}{x.changePct.toFixed(2)}%
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
