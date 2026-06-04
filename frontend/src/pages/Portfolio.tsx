/**
 * Portfolio — Paper Trading Page
 *
 * Layout:
 *   Top row   — summary cards (total value, cash, P&L, positions) — equal height
 *   Middle    — equity curve (portfolio value over time)
 *   Bottom    — order form (left) | open positions table (right)
 *   Footer    — trade history
 */

import {
  Grid, Card, Stack, Group, Text, Badge, Table,
  NumberInput, SegmentedControl, Button, Loader, Alert,
  TextInput, Modal, Skeleton,
} from "@mantine/core";
import {
  IconAlertCircle, IconArrowUpRight, IconArrowDownRight,
  IconTrendingUp, IconTrendingDown,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip,
} from "recharts";
import { usePaper } from "../hooks/usePaper";
import type { EquityPoint } from "../types/paper";
import { API_BASE } from "../config";

// ---------------------------------------------------------------------------
// Live price row — REST-based, works for ANY ticker (not just watchlist)
// ---------------------------------------------------------------------------
function LivePriceRow({ symbol }: { symbol: string }) {
  const [price,   setPrice]   = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) { setPrice(null); return; }

    setPrice(null);      // clear stale value immediately
    setLoading(true);

    // Debounce 450ms so we don't fire on every keystroke
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/prices/${symbol.toUpperCase()}/latest`);
        if (res.ok) {
          const data = await res.json();
          setPrice(data.price);
        } else {
          setPrice(null);
        }
      } catch {
        setPrice(null);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => { clearTimeout(timer); setLoading(false); };
  }, [symbol]);

  return (
    <Group justify="space-between">
      <Text fz="sm" c="dimmed">Live price</Text>
      <Text fw={700} fz="sm">
        {loading
          ? <Loader size={12} />
          : price != null ? `$${price.toFixed(2)}` : "—"}
      </Text>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Summary card — fixed min-height so all four cards stay the same size
// ---------------------------------------------------------------------------
function SummaryCard({ label, value, sub, up }: {
  label: string; value: string; sub?: string; up?: boolean;
}) {
  return (
    <Card radius="md" withBorder style={{ flex: 1, minHeight: 90 }}>
      <Text c="dimmed" fz="xs" mb={4}>{label}</Text>
      <Text fw={700} fz={24}>{value}</Text>
      {sub && (
        <Group gap={4} mt={4}>
          {up !== undefined && (
            up ? <IconArrowUpRight size={14} color="var(--mantine-color-teal-6)" />
               : <IconArrowDownRight size={14} color="var(--mantine-color-red-6)" />
          )}
          <Text fz="xs" c={up === undefined ? "dimmed" : up ? "teal" : "red"}>{sub}</Text>
        </Group>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Portfolio equity curve
// ---------------------------------------------------------------------------
function PortfolioChart({ data, startingCash }: { data: EquityPoint[]; startingCash: number }) {
  if (data.length < 2) {
    return (
      <Text c="dimmed" fz="sm" ta="center" py="xl">
        Place at least two trades to see your equity curve.
      </Text>
    );
  }

  const final    = data[data.length - 1].value;
  const isProfit = final >= startingCash;
  const color    = isProfit ? "#10b981" : "#ef4444";

  const chartData = data.map((pt) => ({
    time: new Date(pt.ts).toLocaleDateString([], {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }),
    value: pt.value,
  }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="paperGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tickLine={false}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
            width={80}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "Portfolio Value"]}
            labelStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill="url(#paperGradient)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Portfolio() {
  const { portfolio, trades, equity, ordering, orderError, placeOrder, resetPortfolio } = usePaper();

  // Order form state
  const [symbol,        setSymbol]        = useState("AAPL");
  const [side,          setSide]          = useState<"buy" | "sell">("buy");
  const [qty,           setQty]           = useState<number>(1);
  const [resetOpen,     setResetOpen]     = useState(false);
  const [resetting,     setResetting]     = useState(false);

  async function handleOrder() {
    const ok = await placeOrder({ symbol: symbol.trim().toUpperCase(), side, qty });
    if (ok) setQty(1);
  }

  async function handleReset() {
    setResetting(true);
    await resetPortfolio();
    setResetting(false);
    setResetOpen(false);
  }

  const pnlUp     = (portfolio?.total_pnl ?? 0) >= 0;
  const returnPct = portfolio
    ? ((portfolio.total_value - portfolio.starting_cash) / portfolio.starting_cash * 100)
    : 0;

  return (
    <div className="w-full px-4 lg:px-6 py-6">

      {/* ── Reset confirmation modal ──────────────────────────────── */}
      <Modal
        opened={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Paper Portfolio"
        centered
        size="sm"
      >
        <Text fz="sm" mb="lg">
          This will permanently delete all your trades and reset your cash back to{" "}
          <strong>$100,000</strong>. This cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setResetOpen(false)} disabled={resetting}>
            Cancel
          </Button>
          <Button color="red" onClick={handleReset} loading={resetting}>
            Yes, reset everything
          </Button>
        </Group>
      </Modal>

      <Stack gap="md">

        {/* ── Page header ───────────────────────────────────────────── */}
        <Group justify="space-between" align="center">
          <Text fw={700} fz={22}>Paper Portfolio</Text>
          <Button
            variant="subtle"
            color="red"
            size="xs"
            onClick={() => setResetOpen(true)}
            disabled={trades.length === 0}
          >
            Reset to $100k
          </Button>
        </Group>

        {/* ── Summary row ───────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--mantine-spacing-md)" }}>
          {!portfolio ? (
            <>
              {[0,1,2,3].map((i) => (
                <Card key={i} radius="md" withBorder style={{ minHeight: 90 }}>
                  <Skeleton height={10} width={80} mb={10} />
                  <Skeleton height={28} width={120} mb={8} />
                  <Skeleton height={10} width={100} />
                </Card>
              ))}
            </>
          ) : (
            <>
              <SummaryCard
                label="Total Value"
                value={`$${portfolio.total_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                sub={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}% return`}
                up={returnPct >= 0}
              />
              <SummaryCard
                label="Cash Available"
                value={`$${portfolio.cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                sub="buying power"
              />
              <SummaryCard
                label="Unrealized P&L"
                value={`${pnlUp ? "+" : ""}$${portfolio.total_pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                sub="across all open positions"
                up={pnlUp}
              />
              <SummaryCard
                label="Open Positions"
                value={String(portfolio.positions.length)}
                sub={portfolio.positions.length === 1 ? "symbol" : "symbols"}
              />
            </>
          )}
        </div>

        {/* ── Equity curve ──────────────────────────────────────────── */}
        <Card radius="md" withBorder>
          <Text fw={600} fz={16} mb="sm">Portfolio Value</Text>
          <PortfolioChart
            data={equity}
            startingCash={portfolio?.starting_cash ?? 100_000}
          />
        </Card>

        <Grid gutter="md" align="flex-start">

          {/* ── Order form ─────────────────────────────────────────── */}
          <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
            <Card radius="md" withBorder>
              <Text fw={600} fz={16} mb="md">Place Order</Text>

              <Stack gap="sm">
                <TextInput
                  label="Symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.currentTarget.value.toUpperCase())}
                  placeholder="AAPL"
                />

                {symbol.trim() && <LivePriceRow symbol={symbol.trim()} />}

                <div>
                  <Text fz="sm" fw={500} mb={6}>Side</Text>
                  <SegmentedControl
                    fullWidth
                    value={side}
                    onChange={(v) => setSide(v as "buy" | "sell")}
                    data={[
                      { label: "Buy",  value: "buy"  },
                      { label: "Sell", value: "sell" },
                    ]}
                    color={side === "buy" ? "teal" : "red"}
                  />
                </div>

                <NumberInput
                  label="Quantity (shares)"
                  value={qty}
                  onChange={(v) => setQty(Number(v))}
                  min={0.0001}
                  step={1}
                  decimalScale={4}
                />

                {orderError && (
                  <Alert icon={<IconAlertCircle size={14} />} color="red" py="xs">
                    {orderError}
                  </Alert>
                )}

                <Button
                  fullWidth
                  color={side === "buy" ? "teal" : "red"}
                  onClick={handleOrder}
                  disabled={ordering || !symbol.trim() || qty <= 0}
                  leftSection={ordering ? <Loader size={14} color="white" /> : null}
                >
                  {ordering ? "Placing…" : `${side === "buy" ? "Buy" : "Sell"} ${symbol || "—"}`}
                </Button>
              </Stack>
            </Card>
          </Grid.Col>

          {/* ── Positions table ────────────────────────────────────── */}
          <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
            <Card radius="md" withBorder>
              <Text fw={600} fz={16} mb="sm">Open Positions</Text>

              {!portfolio || portfolio.positions.length === 0 ? (
                <Text c="dimmed" fz="sm" py="xl" ta="center">
                  No open positions. Place a buy order to get started.
                </Text>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <Table highlightOnHover withRowBorders={false}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Symbol</Table.Th>
                        <Table.Th ta="right">Qty</Table.Th>
                        <Table.Th ta="right" visibleFrom="sm">Avg Cost</Table.Th>
                        <Table.Th ta="right">Price</Table.Th>
                        <Table.Th ta="right" visibleFrom="sm">Mkt Value</Table.Th>
                        <Table.Th ta="right">P&L</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {portfolio.positions.map((pos) => {
                        const up = pos.unrealized_pnl >= 0;
                        return (
                          <Table.Tr key={pos.symbol}>
                            <Table.Td>
                              <Group gap="xs">
                                {up
                                  ? <IconTrendingUp   size={14} color="var(--mantine-color-teal-6)" />
                                  : <IconTrendingDown size={14} color="var(--mantine-color-red-6)"  />
                                }
                                <Text fw={600}>{pos.symbol}</Text>
                              </Group>
                            </Table.Td>
                            <Table.Td ta="right">
                              <Text fz="sm">{pos.qty.toFixed(4)}</Text>
                            </Table.Td>
                            <Table.Td ta="right" visibleFrom="sm">
                              <Text fz="sm">${pos.avg_cost.toFixed(2)}</Text>
                            </Table.Td>
                            <Table.Td ta="right">
                              <Text fz="sm" fw={600}>${pos.current_price.toFixed(2)}</Text>
                            </Table.Td>
                            <Table.Td ta="right" visibleFrom="sm">
                              <Text fz="sm">${pos.market_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                            </Table.Td>
                            <Table.Td ta="right">
                              <Stack gap={0} align="flex-end">
                                <Text fz="sm" fw={600} c={up ? "teal" : "red"}>
                                  {up ? "+" : ""}${pos.unrealized_pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </Text>
                                <Badge size="xs" color={up ? "teal" : "red"} variant="light">
                                  {up ? "+" : ""}{pos.pnl_pct.toFixed(2)}%
                                </Badge>
                              </Stack>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </div>
              )}
            </Card>
          </Grid.Col>
        </Grid>

        {/* ── Trade history ──────────────────────────────────────────── */}
        <Card radius="md" withBorder>
          <Text fw={600} fz={16} mb="sm">
            Trade History
            <Text span c="dimmed" fz="sm" fw={400}> — {trades.length} orders</Text>
          </Text>

          {trades.length === 0 ? (
            <Text c="dimmed" fz="sm" ta="center" py="xl">No trades yet.</Text>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <Table highlightOnHover withRowBorders={false}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th visibleFrom="sm">Date</Table.Th>
                    <Table.Th>Symbol</Table.Th>
                    <Table.Th>Side</Table.Th>
                    <Table.Th ta="right" visibleFrom="sm">Qty</Table.Th>
                    <Table.Th ta="right">Price</Table.Th>
                    <Table.Th ta="right">Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {trades.map((t) => (
                    <Table.Tr key={t.id}>
                      <Table.Td visibleFrom="sm">
                        <Text fz="xs" c="dimmed">
                          {new Date(t.executed_at).toLocaleString([], {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </Table.Td>
                      <Table.Td><Text fw={600} fz="sm">{t.symbol}</Text></Table.Td>
                      <Table.Td>
                        <Badge color={t.side === "buy" ? "teal" : "red"} variant="light" size="sm">
                          {t.side.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right" visibleFrom="sm"><Text fz="sm">{t.qty.toFixed(4)}</Text></Table.Td>
                      <Table.Td ta="right"><Text fz="sm">${t.price.toFixed(2)}</Text></Table.Td>
                      <Table.Td ta="right">
                        <Text fz="sm" fw={600}>
                          ${(t.qty * t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          )}
        </Card>

      </Stack>
    </div>
  );
}
