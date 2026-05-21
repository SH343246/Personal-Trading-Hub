import React from "react";
import { Card, Group, Text, Badge, Stack } from "@mantine/core";
import type { Candle, Tick } from "../types/types";

type Props = {
  symbol: string;
  candles: Candle[];
  tick: Tick | null;
};

export default function SymbolSnapshot({ symbol: _symbol, candles, tick }: Props) {


  let lastPrice: number | undefined = undefined;
  if (tick && typeof tick.price === "number") {
    lastPrice = tick.price;
  } else if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    lastPrice = lastCandle.close;
  }

  const sessionOpen: number | undefined =
    candles.length > 0 ? candles[0].open : undefined;

  let changePercentage: number | undefined = undefined;
  if (
    typeof lastPrice === "number" &&
    typeof sessionOpen === "number" &&
    sessionOpen !== 0
  ) {
    changePercentage = ((lastPrice - sessionOpen) / sessionOpen) * 100;
  }

  let sessionHigh: number | undefined = undefined;
  let sessionLow: number | undefined = undefined;

  if (candles.length > 0) {
    let highest = candles[0].high;
    let lowest = candles[0].low;

    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      if (c.high > highest) highest = c.high;
      if (c.low < lowest) lowest = c.low;
    }

    sessionHigh = highest;
    sessionLow = lowest;
  }

  function fmt(n: number | undefined, digits = 3): string {
    if (typeof n !== "number" || Number.isNaN(n)) return "—";
    return n.toFixed(digits);
  }

const openPrice: number | undefined = candles.length > 0 ? candles[0].open : undefined;
const candleCount: number = candles.length;

  return (
    <Card radius="md" withBorder h="100%">
      <Text fw={600} fz="sm" mb="xs">
        Symbol Snapshot
      </Text>

      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <Badge>Price</Badge>
            {typeof changePercentage === "number" && (
              <Text
                c="dimmed"
                fz="xs"
                style={{ color: changePercentage >= 0 ? "var(--mantine-color-green-6)" : "var(--mantine-color-red-6)" }}
              >
                {changePercentage >= 0 ? "+" : ""}
                {changePercentage.toFixed(2)}%
              </Text>
            )}
          </Group>
          <Text fw={700}>{fmt(lastPrice)}</Text>
        </Group>

        <Group justify="space-between">
          <Group gap="xs">
            <Badge color="grape">High</Badge>
          </Group>
          <Text fw={700}>{fmt(sessionHigh)}</Text>
        </Group>

        <Group justify="space-between">
          <Group gap="xs">
            <Badge color="cyan">Low</Badge>
          </Group>
          <Text fw={700}>{fmt(sessionLow)}</Text>
        </Group>


        <Group justify="space-between">
  <Group gap="xs">
    <Badge color="gray">Open</Badge>
  </Group>
  <Text fw={700}>{fmt(openPrice)}</Text>
</Group>

<Group justify="space-between">
  <Group gap="xs">
    <Badge color="indigo">Candles</Badge>
  </Group>
  <Text fw={700}>{candleCount}</Text>
</Group>
      </Stack>
    </Card>
  );
}
