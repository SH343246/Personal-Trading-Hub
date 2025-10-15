import React from "react";
import Card from "./Card";

type Holding = { symbol: string; qty: number; price: number; value: number; pnl: number };

type Props = {
  totalEquity: number;
  dayPnl: number;
  holdings: Holding[];
};

export default function PortfolioPanel({ totalEquity, dayPnl, holdings }: Props) {
  return (
    <Card
      title="Portfolio"
      subtitle="Live"
      right={<span className={`badge ${dayPnl >= 0 ? "badge-success" : "badge-error"}`}>{dayPnl >= 0 ? "+$" : "-$"}{Math.abs(dayPnl).toFixed(2)}</span>}
      className="h-full"
    >
      <div className="flex items-end gap-4">
        <div>
          <div className="text-sm opacity-70">Total equity</div>
          <div className="text-2xl font-semibold">${totalEquity.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
        </div>
      </div>
      <div className="divider my-3"></div>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Value</th>
              <th>PnL</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(h => (
              <tr key={h.symbol}>
                <td><span className="badge badge-neutral">{h.symbol}</span></td>
                <td>{h.qty}</td>
                <td>${h.price.toFixed(2)}</td>
                <td>${h.value.toFixed(2)}</td>
                <td className={h.pnl >= 0 ? "text-success" : "text-error"}>{h.pnl >= 0 ? "+" : "-"}${Math.abs(h.pnl).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
