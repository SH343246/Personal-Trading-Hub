/**
 * Settings page
 * -------------
 * Three sections:
 *   1. Paper trading  — portfolio stats + reset
 *   2. Watchlist      — add / remove symbols
 *   3. Appearance     — dark mode toggle
 */

import { useState } from "react";
import {
  Stack, Card, Text, Group, Button, Badge,
  Modal, TextInput, Loader, Alert,
} from "@mantine/core";
import { IconAlertCircle, IconPlus, IconX } from "@tabler/icons-react";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { usePaper } from "../hooks/usePaper";
import { useWatchlist } from "../hooks/useWatchlist";

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <Card radius="md" withBorder>
      <Text fw={600} fz={16} mb={4}>{title}</Text>
      <Text c="dimmed" fz="sm" mb="md">{description}</Text>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Settings() {
  const { portfolio, trades, resetPortfolio } = usePaper();
  const { symbols, addSymbol, removeSymbol, loading, error } = useWatchlist();
  const { toggleColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme("light");
  const isDark = scheme === "dark";

  // Reset modal
  const [resetOpen,  setResetOpen]  = useState(false);
  const [resetting,  setResetting]  = useState(false);

  // Add symbol
  const [newSymbol,  setNewSymbol]  = useState("");
  const [addResult,  setAddResult]  = useState<string | null>(null);

  const returnPct = portfolio
    ? ((portfolio.total_value - portfolio.starting_cash) / portfolio.starting_cash * 100)
    : null;
  const isUp = (returnPct ?? 0) >= 0;

  async function handleReset() {
    setResetting(true);
    await resetPortfolio();
    setResetting(false);
    setResetOpen(false);
  }

  async function handleAddSymbol() {
    if (!newSymbol.trim()) return;
    const result = await addSymbol(newSymbol.trim());
    if (result.ok) {
      setNewSymbol("");
      setAddResult(`✓ Added ${result.symbol} at $${result.price.toFixed(2)}`);
      setTimeout(() => setAddResult(null), 3000);
    }
  }

  return (
    <div className="w-full px-4 lg:px-6 py-6 max-w-2xl">

      {/* Reset modal */}
      <Modal opened={resetOpen} onClose={() => setResetOpen(false)} title="Reset Paper Portfolio" centered size="sm">
        <Text fz="sm" mb="lg">
          This will permanently delete all your trades and reset your cash back to{" "}
          <strong>$100,000</strong>. This cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setResetOpen(false)} disabled={resetting}>Cancel</Button>
          <Button color="red" onClick={handleReset} loading={resetting}>Yes, reset everything</Button>
        </Group>
      </Modal>

      <Stack gap="md">
        <Text fw={700} fz={22}>Settings</Text>

        {/* ── Paper trading ─────────────────────────────────────── */}
        <Section
          title="Paper Trading"
          description="Your simulated portfolio starts with $100,000. Reset at any time to start fresh."
        >
          <Group gap="xl" mb="md">
            <div>
              <Text c="dimmed" fz="xs" mb={2}>Portfolio Value</Text>
              <Text fw={700} fz={20}>
                {portfolio ? `$${portfolio.total_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
              </Text>
            </div>
            <div>
              <Text c="dimmed" fz="xs" mb={2}>Return</Text>
              <Text fw={700} fz={20} c={isUp ? "teal" : "red"}>
                {returnPct != null ? `${isUp ? "+" : ""}${returnPct.toFixed(2)}%` : "—"}
              </Text>
            </div>
            <div>
              <Text c="dimmed" fz="xs" mb={2}>Total Trades</Text>
              <Text fw={700} fz={20}>{trades.length}</Text>
            </div>
            <div>
              <Text c="dimmed" fz="xs" mb={2}>Open Positions</Text>
              <Text fw={700} fz={20}>{portfolio?.positions.length ?? "—"}</Text>
            </div>
          </Group>
          <Button
            color="red"
            variant="light"
            size="sm"
            onClick={() => setResetOpen(true)}
            disabled={trades.length === 0}
          >
            Reset to $100,000
          </Button>
        </Section>

        {/* ── Watchlist ──────────────────────────────────────────── */}
        <Section
          title="Watchlist"
          description="Symbols you're tracking. Prices and charts are fetched for these automatically."
        >
          {/* Current symbols */}
          <Group gap="xs" mb="md" wrap="wrap">
            {symbols.map((sym) => (
              <Badge
                key={sym}
                size="lg"
                radius="md"
                variant="light"
                color="blue"
                rightSection={
                  <IconX
                    size={12}
                    style={{ cursor: "pointer" }}
                    onClick={() => removeSymbol(sym)}
                  />
                }
              >
                {sym}
              </Badge>
            ))}
          </Group>

          {/* Add new */}
          <Group gap="xs" align="flex-end">
            <TextInput
              placeholder="e.g. GOOG"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.currentTarget.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
              size="sm"
              style={{ width: 140 }}
              disabled={loading || symbols.length >= 10}
            />
            <Button
              size="sm"
              leftSection={loading ? <Loader size={14} color="white" /> : <IconPlus size={14} />}
              onClick={handleAddSymbol}
              disabled={loading || !newSymbol.trim() || symbols.length >= 10}
            >
              Add
            </Button>
          </Group>

          {symbols.length >= 10 && (
            <Text c="dimmed" fz="xs" mt="xs">Watchlist is full (max 10 symbols).</Text>
          )}

          {error && (
            <Alert icon={<IconAlertCircle size={14} />} color="red" py="xs" mt="xs">
              {error}
            </Alert>
          )}

          {addResult && (
            <Text c="teal" fz="sm" mt="xs">{addResult}</Text>
          )}
        </Section>

        {/* ── Appearance ─────────────────────────────────────────── */}
        <Section
          title="Appearance"
          description="Choose between light and dark mode."
        >
          <Group gap="sm">
            <Button
              variant={!isDark ? "filled" : "light"}
              color="gray"
              size="sm"
              onClick={() => isDark && toggleColorScheme()}
            >
              ☀ Light
            </Button>
            <Button
              variant={isDark ? "filled" : "light"}
              color="dark"
              size="sm"
              onClick={() => !isDark && toggleColorScheme()}
            >
              ☾ Dark
            </Button>
          </Group>
        </Section>

      </Stack>
    </div>
  );
}
