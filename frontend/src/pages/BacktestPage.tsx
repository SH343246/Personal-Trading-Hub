/**
 * BacktestPage
 * ------------
 * Left panel  — form to configure and run a backtest
 * Right panel — results: metrics, equity curve, trade history
 */

import {
  Grid, Card, Stack, Group, Text, Badge, Table,
  TextInput, NumberInput, Select, Button, Loader, Alert,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { useState } from "react";
import dayjs from "dayjs";

// ---------------------------------------------------------------------------
// Persist form state in localStorage so settings survive a page refresh
// ---------------------------------------------------------------------------
const LS_KEY = "backtest_form";

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveForm(values: object) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(values)); } catch { /* ignore */ }
}
import { IconAlertCircle, IconArrowUpRight, IconArrowDownRight, IconPlayerPlay } from "@tabler/icons-react";
import { useBacktest } from "../hooks/useBacktest";
import { EquityChart } from "../components/EquityChart";
import type { BacktestRequest } from "../types/backtest";

// ---------------------------------------------------------------------------
// Small helper — one metric card (CAGR, max drawdown, etc.)
// ---------------------------------------------------------------------------
function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card radius="md" withBorder style={{ flex: 1 }}>
      <Text c="dimmed" fz="xs" mb={4}>{label}</Text>
      <Text fw={700} fz={22} c={color}>{value}</Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function BacktestPage() {
  const { result, loading, error, run, reset } = useBacktest();

  // Form state — initialised from localStorage if available, otherwise defaults
  const _saved = loadSaved();
  const [symbol,      setSymbol]      = useState<string>(_saved?.symbol      ?? "AAPL");
  const [startDate,   setStartDate]   = useState<Date | null>(
    _saved?.startDate ? dayjs(_saved.startDate).toDate() : dayjs("2020-01-01").toDate()
  );
  const [endDate,     setEndDate]     = useState<Date | null>(
    _saved?.endDate ? dayjs(_saved.endDate).toDate() : dayjs().toDate()   // today by default
  );
  const [timeframe,   setTimeframe]   = useState<"1d" | "1h" | "5m" | "1m">(_saved?.timeframe   ?? "1d");
  const [fast,        setFast]        = useState<number>(_saved?.fast        ?? 10);
  const [slow,        setSlow]        = useState<number>(_saved?.slow        ?? 50);
  const [initialCash, setInitialCash] = useState<number>(_saved?.initialCash ?? 10000);

  // Save to localStorage whenever any value changes
  function persist(patch: object) {
    saveForm({ symbol, startDate: startDate ? dayjs(startDate).format("YYYY-MM-DD") : null,
      endDate: endDate ? dayjs(endDate).format("YYYY-MM-DD") : null,
      timeframe, fast, slow, initialCash, ...patch });
  }

  function handleRun() {
    if (!startDate || !endDate || !symbol.trim()) return;

    // Format dates as "YYYY-MM-DD" strings — what the backend expects.
    // Use dayjs since Mantine's DatePickerInput returns dayjs objects internally.
    const fmt = (d: Date) => dayjs(d).format("YYYY-MM-DD");

    const request: BacktestRequest = {
      symbol:       symbol.trim().toUpperCase(),
      start:        fmt(startDate),
      end:          fmt(endDate),
      timeframe,
      initial_cash: initialCash,
      strategy: {
        kind: "sma_crossover",
        fast,
        slow,
      },
      save: false,
    };

    run(request);
  }

  // Derived values from result
  const cagrPct     = result ? (result.metrics.cagr * 100).toFixed(2)         : null;
  const drawdownPct = result ? (result.metrics.max_drawdown * 100).toFixed(2) : null;
  const finalEquity = result ? result.equity_curve[result.equity_curve.length - 1]?.equity : null;
  const totalReturn = result && finalEquity
    ? (((finalEquity - result.initial_cash) / result.initial_cash) * 100).toFixed(2)
    : null;
  const cagrUp      = result ? result.metrics.cagr >= 0 : true;

  return (
    <div className="w-full px-4 lg:px-6 py-6">
      <Grid gutter="md" align="flex-start">

        {/* ----------------------------------------------------------------
            LEFT — configuration form
        ---------------------------------------------------------------- */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card radius="md" withBorder>
            <Text fw={600} fz={16} mb="md">Backtest Settings</Text>

            <Stack gap="sm">
              <TextInput
                label="Symbol"
                placeholder="AAPL"
                value={symbol}
                onChange={(e) => { const v = e.currentTarget.value.toUpperCase(); reset(); setSymbol(v); persist({ symbol: v }); }}
              />

              <DatePickerInput
                label="Start date"
                placeholder="Pick start date"
                value={startDate}
                onChange={(d) => { if (d) { reset(); setStartDate(d); persist({ startDate: dayjs(d).format("YYYY-MM-DD") }); } }}
                maxDate={endDate ?? undefined}
              />

              <DatePickerInput
                label="End date"
                placeholder="Pick end date"
                value={endDate}
                onChange={(d) => { if (d) { reset(); setEndDate(d); persist({ endDate: dayjs(d).format("YYYY-MM-DD") }); } }}
                minDate={startDate ?? undefined}
              />

              <Select
                label="Timeframe"
                value={timeframe}
                onChange={(v) => { if (v) { reset(); setTimeframe(v as typeof timeframe); persist({ timeframe: v }); } }}
                data={[
                  { value: "1d", label: "Daily (1d)"     },
                  { value: "1h", label: "Hourly (1h)"    },
                  { value: "5m", label: "5-minute (5m)"  },
                  { value: "1m", label: "1-minute (1m)"  },
                ]}
              />

              <Text fz="sm" fw={500} mt="xs">SMA Crossover</Text>

              <Group grow>
                <NumberInput
                  label="Fast window"
                  value={fast}
                  onChange={(v) => { reset(); setFast(Number(v)); persist({ fast: Number(v) }); }}
                  min={2}
                  max={slow - 1}
                />
                <NumberInput
                  label="Slow window"
                  value={slow}
                  onChange={(v) => { reset(); setSlow(Number(v)); persist({ slow: Number(v) }); }}
                  min={fast + 1}
                />
              </Group>

              <NumberInput
                label="Starting cash ($)"
                value={initialCash}
                onChange={(v) => { reset(); setInitialCash(Number(v)); persist({ initialCash: Number(v) }); }}
                min={100}
                prefix="$"
                thousandSeparator=","
              />

              <Button
                leftSection={loading ? <Loader size={14} color="white" /> : <IconPlayerPlay size={14} />}
                onClick={handleRun}
                disabled={loading || !symbol.trim() || !startDate || !endDate || fast >= slow}
                mt="xs"
                fullWidth
              >
                {loading ? "Running…" : "Run Backtest"}
              </Button>

              {/* Validation hints — show exactly why the button might be blocked */}
              {!startDate && <Text c="red" fz="xs">Start date is required</Text>}
              {!endDate   && <Text c="red" fz="xs">End date is required</Text>}
              {fast >= slow && <Text c="red" fz="xs">Fast window must be smaller than slow window</Text>}
            </Stack>
          </Card>
        </Grid.Col>

        {/* ----------------------------------------------------------------
            RIGHT — results
        ---------------------------------------------------------------- */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Stack gap="md">

            {/* Error */}
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" title="Backtest failed">
                {error}
              </Alert>
            )}

            {/* Empty state — nothing run yet */}
            {!result && !loading && !error && (
              <Card radius="md" withBorder>
                <Stack align="center" py={60} gap="xs">
                  <Text fw={600} fz="lg" c="dimmed">No results yet</Text>
                  <Text fz="sm" c="dimmed">Fill in the settings and hit Run Backtest</Text>
                </Stack>
              </Card>
            )}

            {/* Loading skeleton */}
            {loading && (
              <Card radius="md" withBorder>
                <Stack align="center" py={60} gap="xs">
                  <Loader />
                  <Text fz="sm" c="dimmed">Running simulation…</Text>
                </Stack>
              </Card>
            )}

            {/* Results */}
            {result && (
              <>
                {/* Metrics row */}
                <Group grow gap="md">
                  <MetricCard
                    label="CAGR"
                    value={`${cagrUp ? "+" : ""}${cagrPct}%`}
                    color={cagrUp ? "teal" : "red"}
                  />
                  <MetricCard
                    label="Max Drawdown"
                    value={`${drawdownPct}%`}
                    color="red"
                  />
                  <MetricCard
                    label="Total Return"
                    value={`${Number(totalReturn) >= 0 ? "+" : ""}${totalReturn}%`}
                    color={Number(totalReturn) >= 0 ? "teal" : "red"}
                  />
                  <MetricCard
                    label="Final Equity"
                    value={`$${finalEquity?.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  />
                  <MetricCard
                    label="Trades"
                    value={String(result.trades.length)}
                  />
                </Group>

                {/* Equity curve */}
                <Card radius="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <div>
                      <Text fw={600} fz={16}>Equity Curve — {result.symbol}</Text>
                      <Text c="dimmed" fz="sm">
                        {result.start} → {result.end} · {result.timeframe} bars ·
                        SMA {result.strategy.fast}/{result.strategy.slow}
                      </Text>
                    </div>
                    <Badge
                      color={cagrUp ? "teal" : "red"}
                      variant="light"
                      leftSection={cagrUp ? <IconArrowUpRight size={12} /> : <IconArrowDownRight size={12} />}
                    >
                      {cagrUp ? "+" : ""}{cagrPct}% CAGR
                    </Badge>
                  </Group>

                  <EquityChart data={result.equity_curve} initialCash={result.initial_cash} />
                </Card>

                {/* Trade history */}
                <Card radius="md" withBorder>
                  <Text fw={600} fz={16} mb="sm">
                    Trade History
                    <Text span c="dimmed" fz="sm" fw={400}> — {result.trades.length} trades</Text>
                  </Text>

                  {result.trades.length === 0 ? (
                    <Text c="dimmed" fz="sm">
                      No trades were triggered. Try a shorter date range or smaller SMA windows.
                    </Text>
                  ) : (
                    <Table highlightOnHover withRowBorders={false}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Side</Table.Th>
                          <Table.Th ta="right">Price</Table.Th>
                          <Table.Th ta="right">Qty</Table.Th>
                          <Table.Th ta="right">Equity After</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {result.trades.map((trade, i) => {
                          const isBuy = trade.side === "buy";
                          return (
                            <Table.Tr key={i}>
                              <Table.Td>
                                <Text fz="xs" c="dimmed">
                                  {new Date(trade.time).toLocaleDateString()}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={isBuy ? "teal" : "red"}
                                  variant="light"
                                  size="sm"
                                >
                                  {trade.side.toUpperCase()}
                                </Badge>
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text fz="sm">${trade.price.toFixed(2)}</Text>
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text fz="sm">{trade.qty.toFixed(4)}</Text>
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text fz="sm" fw={600}>
                                  ${trade.equity_after.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  )}
                </Card>
              </>
            )}

          </Stack>
        </Grid.Col>
      </Grid>
    </div>
  );
}
