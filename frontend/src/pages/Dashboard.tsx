// src/pages/Dashboard.tsx
import {
  Grid,
  Card,
  Group,
  Text,
  Badge,
  Table,
  RingProgress,
  Stack,
  Button,
  Tabs,
} from "@mantine/core";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useMemo } from "react";
import { useCandles } from "../hooks/useCandles";
import { useTicker } from "../hooks/useTicker";
import type { Tick } from "../types/types";
import SymbolSnapshot from "../mosaic/Symbolsnapshotwidget";


type TF = "1m" | "5m";

type Row = {
  user: string;
  email: string;
  code: string;
  status: "Sent" | "Upload" | "Paid";
  color: "blue" | "orange" | "green";
};

const rows: Row[] = [
  { user: "John Doe",   email: "john@mail.doe.com",   code: "INF-001-123456", status: "Sent",   color: "blue" },
  { user: "Dianna Doe", email: "dianna@mail.doe.com", code: "INF-001-123456", status: "Upload", color: "orange" },
  { user: "Bilare Doe", email: "bilare@mail.doe.com", code: "INF-001-123456", status: "Paid",   color: "green" },
];

function StatCard(props: { label: string; value: string; delta: string; up?: boolean }) {
  const { label, value, delta, up } = props;
  return (
    <Card radius="md" withBorder>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">{label}</Text>
        <Badge
          leftSection={up ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
          color={up ? "green" : "red"}
          variant="light"
        >
          {delta}
        </Badge>
      </Group>
      <Text fw={700} fz={24} mt="xs">{value}</Text>
    </Card>
  );
}

export default function Dashboard() {
  const symbols = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"];
  const [focusedSymbol, setFocusedSymbol] = useState<string>(symbols[0]);
  const [tf, setTf] = useState<TF>("1m");

  const tick: Tick | null = useTicker(focusedSymbol);
  const { candles } = useCandles(focusedSymbol, tf, 300, tick ?? undefined);

  const chartPoints = useMemo(
    () =>
      candles.map((c) => ({
        name: new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        y: c.close,
      })),
    [candles]
  );

  const priceLabel = typeof tick?.price === "number" ? `${tick.price}` : "—";

  // Compute change% locally: compare live price to the first candle's open in the current range
  const sessionOpen =
    candles.length > 0 && typeof candles[0].open === "number" ? candles[0].open : null;
  const livePrice = typeof tick?.price === "number" ? tick.price : null;
  const changePct: number | null =
    sessionOpen && livePrice ? ((livePrice - sessionOpen) / sessionOpen) * 100 : null;

  const tabValue: "day" | "weekly" | "month" = tf === "1m" ? "day" : "weekly";

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
                  value={tabValue}
                  onChange={(v) => {
                    if (v === "day") setTf("1m");
                    else setTf("5m");
                  }}
                  radius="md"
                >
                  <Tabs.List>
                    <Tabs.Tab value="month">Monthly</Tabs.Tab>
                    <Tabs.Tab value="weekly">Weekly</Tabs.Tab>
                    <Tabs.Tab value="day">Day</Tabs.Tab>
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

              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints} margin={{ left: -20, right: 10 }}>
                    <defs>
                      <linearGradient id="gradLive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickLine={false} />
                    <ReTooltip />
                    <Area type="monotone" dataKey="y" stroke="#3b82f6" fill="url(#gradLive)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Grid gutter="md" align="stretch">
              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                <Card radius="md" withBorder h="100%">
                  <Text fw={600} fz="sm" mb="xs">Marketing Target</Text>
                  <Group>
                    <RingProgress
                      sections={[{ value: 88, color: "teal" }]}
                      label={<Text fw={700}>88%</Text>}
                      size={120}
                      thickness={12}
                    />
                    <Stack gap={6}>
                      <Text fz="xs" c="dimmed">2,241 / 2,800 target</Text>
                      <Badge color="teal" variant="light">Marketing Sales</Badge>
                      <Group gap="xs" mt="xs">
                        <Badge color="blue" variant="light">Information A</Badge>
                        <Badge color="grape" variant="light">Information B</Badge>
                        <Badge color="cyan" variant="light">Information C</Badge>
                      </Group>
                    </Stack>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                  <SymbolSnapshot symbol={focusedSymbol} timeframe={tf} />

              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 12, lg: 4 }}>
                <Card radius="md" withBorder h="100%">
                  <Text fw={600} fz="sm" mb="xs">Quick Stats</Text>
                  <Grid>
                    <Grid.Col span={6}><StatCard label="Invoice Sent" value="982" delta="+4.2%" up /></Grid.Col>
                    <Grid.Col span={6}><StatCard label="Pending Invoices" value="45" delta="-0.8%" /></Grid.Col>
                    <Grid.Col span={6}><StatCard label="Paid Invoices" value="73" delta="+2.1%" up /></Grid.Col>
                    <Grid.Col span={6}><StatCard label="Unpaid Invoices" value="168" delta="-1.4%" /></Grid.Col>
                  </Grid>
                </Card>
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={{ base: 12 }}>
                <Card radius="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <div>
                      <Text fw={600} fz={16}>Data Performance Company</Text>
                      <Text c="dimmed" fz="sm">Secondary table</Text>
                    </div>
                    <Group gap="xs">
                      <Text c="dimmed" fz="sm">Sort by</Text>
                      <Button size="xs" variant="light">Newest</Button>
                    </Group>
                  </Group>

                  <Table highlightOnHover withRowBorders={false}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>User</Table.Th>
                        <Table.Th>Code Information</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th ta="right">Action</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rows.map((r: Row) => (
                        <Table.Tr key={r.user}>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text fw={500}>{r.user}</Text>
                              <Text c="dimmed" fz="xs">{r.email}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>{r.code}</Table.Td>
                          <Table.Td><Badge color={r.color} variant="light">{r.status}</Badge></Table.Td>
                          <Table.Td ta="right"><Button size="xs" variant="light">Details</Button></Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 3 }}>
          <div style={{ position: "sticky", top: 80 }} className="space-y-16">
            <Card radius="md" withBorder>
              <Text fw={600} fz="sm" mb="sm">Watchlist</Text>
              <Stack gap="xs">
                {symbols.map((s) => (
                  <Group
                    key={s}
                    justify="space-between"
                    onClick={() => setFocusedSymbol(s)}
                    style={{ cursor: "pointer" }}
                  >
                    <Text fw={s === focusedSymbol ? 700 : 400}>{s}</Text>
                    <Text fw={600} className="tabular">
                      {s === focusedSymbol ? priceLabel : "—"}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Card radius="md" withBorder>
              <Text fw={600} fz="sm" mb="sm">News</Text>
              <Text c="dimmed" fz="sm">No news yet.</Text>
            </Card>
          </div>
        </Grid.Col>
      </Grid>
    </div>
  );
}
