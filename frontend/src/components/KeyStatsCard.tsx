import { useEffect, useState } from "react";
import { Card, Group, Text, Stack, Skeleton } from "@mantine/core";

interface Stats {
  market_cap: string | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  previous_close: number | null;
  last_volume: number | null;
  avg_volume_3m: number | null;
}

function StatRow({ label, value }: { label: string; value: string | null }) {
  return (
    <Group justify="space-between">
      <Text c="dimmed" fz="xs">{label}</Text>
      {value ? (
        <Text fw={600} fz="sm">{value}</Text>
      ) : (
        <Skeleton height={14} width={60} radius="sm" />
      )}
    </Group>
  );
}

export function KeyStatsCard({ symbol }: { symbol: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setStats(null); // reset on symbol change
    const base = import.meta.env?.VITE_API_URL ?? "http://localhost:8001";
    fetch(`${base}/api/stats/${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, [symbol]);

  const fmtVol = (n: number | null) =>
    n ? n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n.toLocaleString() : null;

  const volVsAvg = () => {
    if (!stats?.last_volume || !stats?.avg_volume_3m) return null;
    const ratio = stats.last_volume / stats.avg_volume_3m;
    return `${fmtVol(stats.last_volume)} (${ratio.toFixed(1)}× avg)`;
  };

  return (
    <Card radius="md" withBorder h="100%">
      <Text fw={600} fz="sm" mb="xs">Key Stats</Text>
      <Stack gap={6}>
        <StatRow label="Market Cap"    value={stats?.market_cap ?? null} />
        <StatRow label="52-Wk High"    value={stats ? (stats.fifty_two_week_high ? `$${stats.fifty_two_week_high}` : "—") : null} />
        <StatRow label="52-Wk Low"     value={stats ? (stats.fifty_two_week_low  ? `$${stats.fifty_two_week_low}`  : "—") : null} />
        <StatRow label="Prev Close"    value={stats ? (stats.previous_close      ? `$${stats.previous_close}`      : "—") : null} />
        <StatRow label="Volume"        value={stats ? (volVsAvg() ?? "—") : null} />
      </Stack>
    </Card>
  );
}
