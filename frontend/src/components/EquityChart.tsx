/**
 * EquityChart
 * -----------
 * Renders the portfolio equity curve from a backtest result.
 * X axis = time, Y axis = portfolio value in dollars.
 */

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import type { EquityPoint } from "../types/backtest";

type Props = {
  data: EquityPoint[];
  initialCash: number;
};

export function EquityChart({ data, initialCash }: Props) {
  // Convert the raw equity curve into something Recharts understands.
  // We also flag each point as "up" or "down" vs starting cash so we can
  // colour the line green/red — but a single AreaChart can only have one
  // colour, so we just use green for profit and red for loss overall.
  const chartData = data.map((point) => ({
    time: new Date(point.time).toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" }),
    equity: parseFloat(point.equity.toFixed(2)),
  }));

  const finalEquity  = data.length > 0 ? data[data.length - 1].equity : initialCash;
  const isProfit     = finalEquity >= initialCash;
  const strokeColor  = isProfit ? "#10b981" : "#ef4444";   // teal or red
  const gradientId   = "equityGradient";

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0}    />
            </linearGradient>
          </defs>

          {/* Only show a few x-axis labels so they don't overlap */}
          <XAxis
            dataKey="time"
            tickLine={false}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />

          <YAxis
            tickLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            width={75}
          />

          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Portfolio"]}
            labelStyle={{ fontSize: 12 }}
          />

          <Area
            type="monotone"
            dataKey="equity"
            stroke={strokeColor}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
