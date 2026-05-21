import { useState, useEffect } from "react";
import { Card, Text, Group, Badge, Stack, Divider } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

// NYSE session boundaries in minutes-since-midnight ET
const PRE_OPEN  = 4  * 60;       // 4:00 AM  — pre-market starts
const OPEN      = 9  * 60 + 30;  // 9:30 AM  — regular session
const CLOSE     = 16 * 60;       // 4:00 PM  — regular session ends
const AH_END    = 20 * 60;       // 8:00 PM  — after-hours ends

type Status = "pre-market" | "open" | "after-hours" | "closed";

interface MarketState {
  status: Status;
  timeET: string;       // e.g. "02:34:10 PM"
  countdown: string;    // e.g. "Opens in 1h 23m"
}

function getNYParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour:    "2-digit",
    minute:  "2-digit",
    second:  "2-digit",
    hour12:  false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const h = parseInt(get("hour")) % 24;
  const m = parseInt(get("minute"));
  const s = parseInt(get("second"));
  const weekday = get("weekday");

  return { h, m, s, weekday, totalMin: h * 60 + m };
}

function fmtCountdown(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function computeState(now: Date): MarketState {
  const { h, m, s, weekday, totalMin } = getNYParts(now);

  // Display time in 12-h format
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const timeET = `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${period} ET`;

  const isWeekend = weekday === "Sat" || weekday === "Sun";

  if (isWeekend) {
    return { status: "closed", timeET, countdown: "Market closed (weekend)" };
  }

  if (totalMin < PRE_OPEN) {
    const mins = PRE_OPEN - totalMin;
    return { status: "closed", timeET, countdown: `Pre-market in ${fmtCountdown(mins)}` };
  }
  if (totalMin < OPEN) {
    const mins = OPEN - totalMin;
    return { status: "pre-market", timeET, countdown: `Opens in ${fmtCountdown(mins)}` };
  }
  if (totalMin < CLOSE) {
    const mins = CLOSE - totalMin;
    return { status: "open", timeET, countdown: `Closes in ${fmtCountdown(mins)}` };
  }
  if (totalMin < AH_END) {
    const mins = AH_END - totalMin;
    return { status: "after-hours", timeET, countdown: `After-hours ends in ${fmtCountdown(mins)}` };
  }

  return { status: "closed", timeET, countdown: "Pre-market opens at 4:00 AM ET" };
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  "open":         { label: "MARKET OPEN",   color: "green"  },
  "pre-market":   { label: "PRE-MARKET",    color: "yellow" },
  "after-hours":  { label: "AFTER-HOURS",   color: "orange" },
  "closed":       { label: "MARKET CLOSED", color: "gray"   },
};

export function MarketClock() {
  const [state, setState] = useState<MarketState>(() => computeState(new Date()));

  useEffect(() => {
    const id = setInterval(() => setState(computeState(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const meta = STATUS_META[state.status];

  return (
    <Card radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={600} fz="sm">Market</Text>
        <IconClock size={14} color="var(--mantine-color-dimmed)" />
      </Group>

      <Stack gap={6}>
        <Badge color={meta.color} variant="light" size="sm" radius="sm">
          {meta.label}
        </Badge>

        <Text fz="xs" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
          {state.timeET}
        </Text>

        <Divider />

        <Text c="dimmed" fz="xs">{state.countdown}</Text>
      </Stack>
    </Card>
  );
}
