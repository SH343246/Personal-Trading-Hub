import { useState, useMemo } from "react";
import { Card, Group, Text, Badge, SegmentedControl } from "@mantine/core";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useTicker } from "../hooks/useTicker";
import { useCandles, type timeFrame } from "../hooks/useCandles";
import type { Tick } from "../types/types";

type RangeLabel = "1D" | "1W" | "1M" | "6M" | "1Y" | "All";

type Props = {
  symbol: string;
  timeframe: timeFrame; 
  onChangeRange?: (label: RangeLabel) => void;
  title?: string;
  subtitle?: string;
};

export default function ChartCardPro(props: Props) {
  const [range, setRange] = useState<RangeLabel>("1W");

  const tick: Tick | null = useTicker(props.symbol);
  const { candles } = useCandles(props.symbol, props.timeframe, 300, tick ?? undefined);

  const data = useMemo(
    () =>
      candles.map((c) => ({
        x: new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        y: c.close,
      })),
    [candles]
  );

  const priceLabel = typeof tick?.price === "number" ? `${tick.price}` : undefined;

  const sessionOpen =
    candles.length > 0 && typeof candles[0].open === "number" ? candles[0].open : null;
  const livePrice = typeof tick?.price === "number" ? tick.price : null;
  const changePercent =
    sessionOpen && livePrice ? ((livePrice - sessionOpen) / sessionOpen) * 100 : undefined;

  const positive = (changePercent ?? 0) >= 0;

  return (
    <Card withBorder radius="lg" padding="md" className="m-soft-card">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={700}>{props.title ?? props.symbol}</Text>
          {props.subtitle ? <Text size="xs" c="dimmed">{props.subtitle}</Text> : null}
        </div>
        <Group gap="xs">
          {priceLabel ? <Text fw={700}>{priceLabel}</Text> : null}
          {changePercent !== undefined ? (
            <Badge variant="light" color={positive ? "green" : "red"}>
              {positive ? "+" : ""}
              {changePercent.toFixed(2)}%
            </Badge>
          ) : null}
        </Group>
      </Group>

      <Group mb="sm">
        <SegmentedControl
          value={range}
          onChange={(v: string) => {
            const lbl = v as RangeLabel;
            setRange(lbl);
            if (props.onChangeRange) props.onChangeRange(lbl);
          }}
          data={["1D", "1W", "1M"]}
          radius="xl"
          size="xs"
        />
      </Group>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="x" tickMargin={8} />
            <YAxis width={40} />
            <Tooltip />
            <Area type="monotone" dataKey="y" strokeWidth={2} fill="url(#chartFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
