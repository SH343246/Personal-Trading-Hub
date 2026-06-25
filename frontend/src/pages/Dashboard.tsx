import {
  Grid, Card, Group, Text, Badge, Table, Stack, Tabs, Divider,
  TextInput, ActionIcon, Loader, CloseButton,
} from "@mantine/core";
import { IconArrowUpRight, IconArrowDownRight, IconTrendingUp, IconTrendingDown, IconPlus } from "@tabler/icons-react";
import { CandlestickChart } from "../components/CandlestickChart";
import { useState } from "react";
import { useCandles, getSessionOpen } from "../hooks/useCandles";
import { useTicker } from "../hooks/useTicker";
import { useWatchlist } from "../hooks/useWatchlist";
import type { Candle, Tick } from "../types/types";
import { KeyStatsCard } from "../components/KeyStatsCard";
import { NewsCard } from "../components/NewsCard";
import { MarketClock } from "../components/MarketClock";


// DisplayTF = what the tab shows. apiTf = what we actually query.
// 1W / 1M / 1Y all use daily bars, just different limits.
type DisplayTF = "1m" | "5m" | "1h" | "1W" | "1M" | "1Y" | "Max";
type ApiTF     = "1m" | "5m" | "1h" | "1d";

interface TFConfig { apiTf: ApiTF; limit: number; label: string }

const TF_CONFIG: Record<DisplayTF, TFConfig> = {
  "1m":  { apiTf: "1m", limit: 300,  label: "1-minute bars"       },
  "5m":  { apiTf: "5m", limit: 300,  label: "5-minute bars"       },
  "1h":  { apiTf: "1h", limit: 168,  label: "1-hour bars"         },
  "1W":  { apiTf: "1d", limit: 7,    label: "Daily bars"          },
  "1M":  { apiTf: "1d", limit: 30,   label: "Daily bars"          },
  "1Y":  { apiTf: "1d", limit: 365,  label: "Daily bars"          },
  "Max": { apiTf: "1d", limit: 2000, label: "All available data"  },
};

function OHLVCard({ candles, tick }: { candles: Candle[]; tick: Tick | null }) {
  const open  = candles.length > 0 ? candles[0].open : null;
  const high  = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : null;
  const low   = candles.length > 0 ? Math.min(...candles.map((c) => c.low))  : null;
  const close = tick?.price ?? (candles.length > 0 ? candles[candles.length - 1].close : null);
  const totalVol = candles.reduce((sum, c) => (c.volume != null ? sum + c.volume : sum), 0);
  const hasVol = candles.some((c) => c.volume != null && c.volume > 0);

  const fmt = (v: number | null) => (v != null ? v.toFixed(2) : "—");

  const items: { label: string; value: string; color?: string }[] = [
    { label: "Open",  value: fmt(open) },
    { label: "High",  value: fmt(high),  color: "teal" },
    { label: "Low",   value: fmt(low),   color: "red" },
    { label: "Close", value: fmt(close) },
    { label: "Volume", value: hasVol && totalVol > 0 ? totalVol.toLocaleString() : "—" },
  ];

  return (
    <Card radius="md" withBorder h="100%">
      <Text fw={600} fz="sm" mb="xs">Session OHLV</Text>
      <Stack gap={6}>
        {items.map((item) => (
          <Group key={item.label} justify="space-between">
            <Text c="dimmed" fz="xs">{item.label}</Text>
            <Text fw={600} fz="sm" c={item.color}>{item.value}</Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function SessionRangeCard({ candles, tick }: { candles: Candle[]; tick: Tick | null }) {
  const sessionHigh  = candles.length > 0 ? Math.max(...candles.map((c) => c.high))  : null;
  const sessionLow   = candles.length > 0 ? Math.min(...candles.map((c) => c.low))   : null;
  const sessionOpen  = candles.length > 0 ? candles[0].open : null;
  const current      = tick?.price ?? null;

  // position of current price within the session range (0–100 %)
  const rangePct =
    sessionHigh != null && sessionLow != null && sessionHigh !== sessionLow && current != null
      ? Math.min(100, Math.max(0, ((current - sessionLow) / (sessionHigh - sessionLow)) * 100))
      : null;

  const changeFromOpen =
    sessionOpen && current ? ((current - sessionOpen) / sessionOpen) * 100 : null;
  const up = changeFromOpen != null ? changeFromOpen >= 0 : null;

  return (
    <Card radius="md" withBorder h="100%">
      <Group justify="space-between" mb="xs">
        <Text fw={600} fz="sm">Session Range</Text>
        {changeFromOpen !== null && (
          <Badge
            leftSection={up ? <IconArrowUpRight size={12} /> : <IconArrowDownRight size={12} />}
            color={up ? "teal" : "red"}
            variant="light"
            size="sm"
          >
            {up ? "+" : ""}{changeFromOpen.toFixed(2)}%
          </Badge>
        )}
      </Group>

      {/* Range bar */}
      <div style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--mantine-color-default-border)", margin: "12px 0" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${rangePct ?? 50}%`,
            borderRadius: 4,
            background: up ? "var(--mantine-color-teal-5)" : "var(--mantine-color-red-5)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <Group justify="space-between">
        <Stack gap={0}>
          <Text c="dimmed" fz={10}>Low</Text>
          <Text fw={600} fz="sm" c="red">{sessionLow != null ? sessionLow.toFixed(2) : "—"}</Text>
        </Stack>
        {rangePct != null && (
          <Text c="dimmed" fz="xs">{rangePct.toFixed(0)}% from low</Text>
        )}
        <Stack gap={0} style={{ textAlign: "right" }}>
          <Text c="dimmed" fz={10}>High</Text>
          <Text fw={600} fz="sm" c="teal">{sessionHigh != null ? sessionHigh.toFixed(2) : "—"}</Text>
        </Stack>
      </Group>

      <Divider my="xs" />
      <Group gap="xs">
        {up !== null ? (
          up ? <IconTrendingUp size={16} color="var(--mantine-color-teal-5)" />
             : <IconTrendingDown size={16} color="var(--mantine-color-red-5)" />
        ) : null}
        <Text c="dimmed" fz="xs">
          {candles.length} candle{candles.length !== 1 ? "s" : ""} in session
        </Text>
      </Group>
    </Card>
  );
}

// Invisible component that runs a full live data pipeline for a non-focused
// symbol — WebSocket tick + candle merging — so its cache stays current.
// When the user switches focus to this symbol, the chart loads instantly
// with up-to-date data instead of a stale snapshot from page load.
function SymbolTracker({ symbol, tf }: { symbol: string; tf: DisplayTF }) {
  const { apiTf, limit } = TF_CONFIG[tf];
  const tick = useTicker(symbol);
  useCandles(symbol, apiTf, limit, tick ?? undefined);
  return null;
}

// Each watchlist row manages its own WebSocket so all symbols show live prices,
// not just the focused one. Putting useTicker inside a component (not a loop)
// is the correct way to call a hook per item.
function WatchlistRow({
  symbol,
  focused,
  onClick,
  onRemove,
}: {
  symbol: string;
  focused: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  const tick = useTicker(symbol);
  const price = typeof tick?.price === "number" ? tick.price : null;
  const sessionOpen = getSessionOpen(symbol, "1m");
  const changePct =
    price !== null && sessionOpen !== null && sessionOpen !== 0
      ? ((price - sessionOpen) / sessionOpen) * 100
      : null;
  const up = changePct !== null ? changePct >= 0 : null;

  return (
    <Group justify="space-between" wrap="nowrap" style={{ cursor: "pointer" }} onClick={onClick}>
      <Text fw={focused ? 700 : 400} style={{ flex: 1 }} fz="sm">{symbol}</Text>
      <Stack gap={0} style={{ alignItems: "flex-end" }}>
        <Text fw={600} fz="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
          {price !== null ? price.toFixed(2) : "—"}
        </Text>
        {changePct !== null && (
          <Text fz={10} c={up ? "teal" : "red"}>
            {up ? "+" : ""}{changePct.toFixed(2)}%
          </Text>
        )}
      </Stack>
      <CloseButton
        size="xs"
        aria-label={`Remove ${symbol}`}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      />
    </Group>
  );
}


export default function Dashboard() {
  const { symbols, addSymbol, removeSymbol, loading: wlLoading, error: wlError, clearError } = useWatchlist();
  const [focusedSymbol, setFocusedSymbol] = useState<string>(symbols[0] ?? "AAPL");
  const [tf, setTf] = useState<DisplayTF>("1m");
  const [searchInput, setSearchInput] = useState("");

  const { apiTf, limit, label: tfLabel } = TF_CONFIG[tf];
  const tick: Tick | null = useTicker(focusedSymbol);
  const { candles, loading: candlesLoading } = useCandles(focusedSymbol, apiTf, limit, tick ?? undefined);

  const priceLabel = typeof tick?.price === "number" ? tick.price.toFixed(2) : "—";

  const sessionOpen =
    candles.length > 0 && typeof candles[0].open === "number" ? candles[0].open : null;
  const livePrice = typeof tick?.price === "number" ? tick.price : null;
  const changePct: number | null =
    sessionOpen && livePrice ? ((livePrice - sessionOpen) / sessionOpen) * 100 : null;

  return (
    <div className=" w-full px-4 lg:px-6 py-6">
      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, xl: 9 }}>
          <Stack gap="md">
            <Card radius="md" withBorder>
              <Group justify="space-between" mb="sm">
                <div>
                  <Text fw={600} fz={18}>{focusedSymbol}</Text>
                  <Text c="dimmed" fz="sm">
                    {priceLabel}{" "}
                    {changePct !== null ? `(${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)` : ""}
                  </Text>
                </div>
                <Tabs
                  value={tf}
                  onChange={(v) => { if (v) setTf(v as DisplayTF); }}
                  radius="md"
                >
                  <Tabs.List>
                    <Tabs.Tab value="1m">1m</Tabs.Tab>
                    <Tabs.Tab value="5m">5m</Tabs.Tab>
                    <Tabs.Tab value="1h">1H</Tabs.Tab>
                    <Tabs.Tab value="1W">1W</Tabs.Tab>
                    <Tabs.Tab value="1M">1M</Tabs.Tab>
                    <Tabs.Tab value="1Y">1Y</Tabs.Tab>
                    <Tabs.Tab value="Max">Max</Tabs.Tab>
                  </Tabs.List>
                </Tabs>
              </Group>

              <Group gap="md" mb="xs">
                <Badge color="blue" variant="light">Live • {focusedSymbol}</Badge>
                {changePct !== null ? (
                  <Badge color={changePct >= 0 ? "green" : "red"} variant="light">
                    {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                  </Badge>
                ) : null}
              </Group>

              {candlesLoading ? (
                <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <Loader size="md" />
                  <Text c="dimmed" fz="sm">Loading chart data…</Text>
                </div>
              ) : candles.length === 0 && apiTf === "1d" ? (
                <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Text c="dimmed" fz="sm" ta="center">
                    Historical data is being loaded in the background.
                  </Text>
                  <Text c="dimmed" fz="xs" ta="center">
                    This can take up to 60 seconds for a newly added symbol. Refresh the page to check.
                  </Text>
                </div>
              ) : (
                <CandlestickChart candles={candles} tick={tick} apiTf={apiTf} height={280} />
              )}
            </Card>

            <Grid gutter="md" align="stretch">
              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                <SessionRangeCard candles={candles} tick={tick} />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                <KeyStatsCard symbol={focusedSymbol} />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 12, lg: 4 }}>
                <OHLVCard candles={candles} tick={tick} />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={{ base: 12 }}>
                <Card radius="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <div>
                      <Text fw={600} fz={16}>Recent Candles — {focusedSymbol}</Text>
                      <Text c="dimmed" fz="sm">{tfLabel}</Text>
                    </div>
                    <Badge color="blue" variant="light">Live • {focusedSymbol}</Badge>
                  </Group>

                  <Table highlightOnHover withRowBorders={false}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Time</Table.Th>
                        <Table.Th ta="right">Open</Table.Th>
                        <Table.Th ta="right">High</Table.Th>
                        <Table.Th ta="right">Low</Table.Th>
                        <Table.Th ta="right">Close</Table.Th>
                        <Table.Th ta="right">Volume</Table.Th>
                        <Table.Th ta="right">Chg</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {candles
                        .filter((c) => c.open != null && c.high != null && c.low != null && c.close != null && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
                        .slice(-10).reverse().map((c) => {
                        const chg = ((c.close - c.open) / c.open) * 100;
                        const up = chg >= 0;
                        return (
                          <Table.Tr key={c.ts}>
                            <Table.Td>
                              <Text fz="xs" c="dimmed">
                                {new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="right"><Text fz="sm">{c.open.toFixed(2)}</Text></Table.Td>
                            <Table.Td ta="right"><Text fz="sm" c="teal">{c.high.toFixed(2)}</Text></Table.Td>
                            <Table.Td ta="right"><Text fz="sm" c="red">{c.low.toFixed(2)}</Text></Table.Td>
                            <Table.Td ta="right"><Text fz="sm" fw={600}>{c.close.toFixed(2)}</Text></Table.Td>
                            <Table.Td ta="right">
                              <Text fz="xs" c="dimmed">
                                {c.volume != null && c.volume > 0 ? c.volume.toLocaleString() : "—"}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="right">
                              <Badge
                                size="sm"
                                color={up ? "teal" : "red"}
                                variant="light"
                              >
                                {up ? "+" : ""}{chg.toFixed(2)}%
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                      {candles.length === 0 && (
                        <Table.Tr>
                          <Table.Td colSpan={7}>
                            <Text c="dimmed" fz="sm" ta="center">No candle data yet.</Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Card>
              </Grid.Col>
            </Grid>

            <NewsCard symbol={focusedSymbol} />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 3 }}>
          <Stack gap="md" style={{ position: "sticky", top: 80 }}>
            <MarketClock />

            <Card radius="md" withBorder>
              <Text fw={600} fz="sm" mb="sm">Watchlist</Text>

              {/* Search / add row */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!searchInput.trim()) return;
                  const result = await addSymbol(searchInput);
                  if (result.ok) {
                    setSearchInput("");
                    // auto-focus newly added symbol
                    setFocusedSymbol(result.symbol);
                  }
                }}
              >
                <Group gap="xs" mb="xs" align="flex-start">
                  <TextInput
                    placeholder="Add symbol…"
                    size="xs"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.currentTarget.value.toUpperCase());
                      clearError();
                    }}
                    style={{ flex: 1 }}
                    disabled={wlLoading}
                    error={wlError ?? undefined}
                    rightSection={wlLoading ? <Loader size={12} /> : null}
                  />
                  <ActionIcon
                    type="submit"
                    variant="light"
                    color="blue"
                    size="sm"
                    style={{ marginTop: 1 }}
                    disabled={wlLoading || !searchInput.trim()}
                  >
                    <IconPlus size={14} />
                  </ActionIcon>
                </Group>
              </form>

              <Stack gap="xs">
                {symbols.map((s) => (
                  <WatchlistRow
                    key={s}
                    symbol={s}
                    focused={s === focusedSymbol}
                    onClick={() => setFocusedSymbol(s)}
                    onRemove={() => {
                      removeSymbol(s);
                      if (focusedSymbol === s) {
                        const remaining = symbols.filter((x) => x !== s);
                        if (remaining.length > 0) setFocusedSymbol(remaining[0]);
                      }
                    }}
                  />
                ))}
                {symbols.length === 0 && (
                  <Text c="dimmed" fz="xs" ta="center">Add a symbol above to get started.</Text>
                )}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
      {/* Live data pipeline for non-focused symbols — keeps their caches current */}
      {symbols
        .filter((s) => s !== focusedSymbol)
        .map((s) => <SymbolTracker key={s} symbol={s} tf={tf} />)}
    </div>
  );
}
