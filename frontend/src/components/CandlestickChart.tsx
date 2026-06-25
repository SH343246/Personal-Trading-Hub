import { useEffect, useRef, useState } from "react";
import { useComputedColorScheme } from "@mantine/core";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type HistogramSeriesOptions,
  type LineSeriesOptions,
  type UTCTimestamp,
  type MouseEventParams,
} from "lightweight-charts";
import type { Candle, Tick } from "../types/types";

type ApiTF = "1m" | "5m" | "1h" | "1d";

interface Props {
  candles: Candle[];
  tick:    Tick | null;
  apiTf:   ApiTF;
  height?: number;
}

// ── Indicator config ──────────────────────────────────────────────────────────
type IndicatorKey = "SMA20" | "SMA50" | "EMA20" | "EMA200";

const INDICATORS: Record<IndicatorKey, { label: string; color: string; period: number; type: "sma" | "ema" }> = {
  SMA20:  { label: "SMA 20",  color: "#f97316", period: 20,  type: "sma" },
  SMA50:  { label: "SMA 50",  color: "#3b82f6", period: 50,  type: "sma" },
  EMA20:  { label: "EMA 20",  color: "#a855f7", period: 20,  type: "ema" },
  EMA200: { label: "EMA 200", color: "#ef4444", period: 200, type: "ema" },
};

// ── OHLCV hover state ─────────────────────────────────────────────────────────
interface OHLCVInfo {
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeSMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

// Returns { upper, mid, lower } arrays — null until enough history exists
function computeBB(closes: number[], period = 20, mult = 2) {
  const sma = computeSMA(closes, period);
  return closes.map((_, i) => {
    if (sma[i] === null) return { upper: null, mid: null, lower: null };
    const mean   = sma[i] as number;
    const slice  = closes.slice(i - period + 1, i + 1);
    const stddev = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { upper: mean + mult * stddev, mid: mean, lower: mean - mult * stddev };
  });
}

function computeEMA(closes: number[], period: number): (number | null)[] {
  const k      = 2 / (period + 1);
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;
  const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = seed;
  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + (result[i - 1] as number) * (1 - k);
  }
  return result;
}

function fmtVol(v: number | null): string {
  if (v == null || v === 0) return "—";
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + "B";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000)         return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

const VOL_UP   = "rgba(34,197,94,0.45)";
const VOL_DOWN = "rgba(239,68,68,0.45)";
function volColor(open: number, close: number) { return close >= open ? VOL_UP : VOL_DOWN; }

function floorToBucket(tsMs: number, tf: ApiTF): number {
  const d = new Date(tsMs);
  if      (tf === "1m") d.setSeconds(0, 0);
  else if (tf === "5m") d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
  else if (tf === "1h") d.setMinutes(0, 0, 0);
  else                  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── OHLCV info bar ────────────────────────────────────────────────────────────
function OHLCVBar({ info }: { info: OHLCVInfo | null }) {
  if (!info) return <div style={{ height: 22 }} />;

  const up  = info.close >= info.open;
  const chg = ((info.close - info.open) / info.open) * 100;

  const items: { label: string; value: string; color?: string }[] = [
    { label: "O", value: info.open.toFixed(2)  },
    { label: "H", value: info.high.toFixed(2),  color: "#22c55e" },
    { label: "L", value: info.low.toFixed(2),   color: "#ef4444" },
    { label: "C", value: info.close.toFixed(2), color: up ? "#22c55e" : "#ef4444" },
    { label: "V", value: fmtVol(info.volume) },
    { label: "",  value: `${up ? "+" : ""}${chg.toFixed(2)}%`, color: up ? "#22c55e" : "#ef4444" },
  ];

  return (
    <div style={{
      display:    "flex",
      alignItems: "center",
      gap:        16,
      height:     22,
      fontSize:   12,
      marginBottom: 4,
    }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {item.label && (
            <span style={{ color: "#94a3b8", fontWeight: 500 }}>{item.label}</span>
          )}
          <span style={{ color: item.color ?? "var(--mantine-color-text)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {item.value}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CandlestickChart({ candles, tick, apiTf, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef       = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maRefs       = useRef<Partial<Record<IndicatorKey, ISeriesApi<"Line">>>>({});
  const bbRefs       = useRef<{ upper: ISeriesApi<"Line"> | null; mid: ISeriesApi<"Line"> | null; lower: ISeriesApi<"Line"> | null }>
                         ({ upper: null, mid: null, lower: null });

  const [active,      setActive]      = useState<Set<IndicatorKey>>(new Set());
  const [bbActive,    setBbActive]    = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<OHLCVInfo | null>(null);

  const isDark = useComputedColorScheme("light") === "dark";

  // Derive current display info: hovered candle OR last candle as fallback
  const lastCandle  = candles.length > 0 ? candles[candles.length - 1] : null;
  const lastCandleValid = lastCandle != null
    && lastCandle.open != null && lastCandle.high != null
    && lastCandle.low  != null && lastCandle.close != null;
  const displayInfo = hoveredInfo ?? (lastCandleValid && lastCandle ? {
    open:   lastCandle.open,
    high:   lastCandle.high,
    low:    lastCandle.low,
    close:  tick?.price ?? lastCandle.close,
    volume: lastCandle.volume ?? null,
  } : null);

  function toggle(key: IndicatorKey) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Create chart + subscribe crosshair ───────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      layout: {
        background:  { type: ColorType.Solid, color: "transparent" },
        textColor:   "#6b7280",
        fontFamily:  "inherit",
        fontSize:    11,
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.04)" },
        horzLines: { color: "rgba(0,0,0,0.04)" },
      },
      rightPriceScale: {
        borderColor:  "rgba(0,0,0,0.08)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor:    "rgba(0,0,0,0.08)",
        timeVisible:    true,
        secondsVisible: false,
        rightOffset:    5,
        fixLeftEdge:    true,
      },
      crosshair: {
        vertLine: { color: "#94a3b8", labelBackgroundColor: "#334155" },
        horzLine: { color: "#94a3b8", labelBackgroundColor: "#334155" },
      },
      handleScale:  true,
      handleScroll: true,
    });

    // Candlestick
    const series = chart.addSeries(CandlestickSeries, {
      upColor:       "#22c55e",
      downColor:     "#ef4444",
      wickUpColor:   "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    } as Partial<CandlestickSeriesOptions>);

    // Volume
    const vol = chart.addSeries(HistogramSeries, {
      priceScaleId:     "volume",
      color:            VOL_UP,
      priceFormat:      { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    } as Partial<HistogramSeriesOptions>);
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    // MA lines
    const newMaRefs: Partial<Record<IndicatorKey, ISeriesApi<"Line">>> = {};
    for (const [key, cfg] of Object.entries(INDICATORS) as [IndicatorKey, typeof INDICATORS[IndicatorKey]][]) {
      newMaRefs[key] = chart.addSeries(LineSeries, {
        color:            cfg.color,
        lineWidth:        2,
        lineStyle:        LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        visible:          false,
        crosshairMarkerVisible: false,
      } as Partial<LineSeriesOptions>);
    }

    // Bollinger Band lines — upper/lower dashed, mid thin solid, all indigo
    const BB_COLOR = "#6366f1";
    const bbUpper = chart.addSeries(LineSeries, {
      color: BB_COLOR, lineWidth: 1, lineStyle: LineStyle.Dashed,
      priceLineVisible: false, lastValueVisible: false, visible: false,
      crosshairMarkerVisible: false,
    } as Partial<LineSeriesOptions>);
    const bbMid = chart.addSeries(LineSeries, {
      color: BB_COLOR + "80", lineWidth: 1, lineStyle: LineStyle.Solid,
      priceLineVisible: false, lastValueVisible: false, visible: false,
      crosshairMarkerVisible: false,
    } as Partial<LineSeriesOptions>);
    const bbLower = chart.addSeries(LineSeries, {
      color: BB_COLOR, lineWidth: 1, lineStyle: LineStyle.Dashed,
      priceLineVisible: false, lastValueVisible: false, visible: false,
      crosshairMarkerVisible: false,
    } as Partial<LineSeriesOptions>);

    chartRef.current  = chart;
    seriesRef.current = series;
    volRef.current    = vol;
    maRefs.current    = newMaRefs;
    bbRefs.current    = { upper: bbUpper, mid: bbMid, lower: bbLower };

    // ── Crosshair subscription ────────────────────────────────────────────
    const handleCrosshair = (params: MouseEventParams) => {
      // When cursor leaves the chart, params.time is undefined → show last candle
      if (!params.time || !seriesRef.current) {
        setHoveredInfo(null);
        return;
      }

      const candle = params.seriesData.get(seriesRef.current) as
        | { open: number; high: number; low: number; close: number }
        | undefined;

      if (!candle || candle.high == null || candle.low == null) { setHoveredInfo(null); return; }

      const volData = volRef.current
        ? (params.seriesData.get(volRef.current) as { value: number } | undefined)
        : undefined;

      setHoveredInfo({
        open:   candle.open,
        high:   candle.high,
        low:    candle.low,
        close:  candle.close,
        volume: volData?.value ?? null,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshair);

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
      volRef.current    = null;
      maRefs.current    = {};
      bbRefs.current    = { upper: null, mid: null, lower: null };
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load candle + volume + MA data ───────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !volRef.current || !chartRef.current) return;

    if (candles.length === 0) {
      seriesRef.current.setData([]);
      volRef.current.setData([]);
      return;
    }

    const validCandles = candles.filter(
      (c) => c.open != null && c.high != null && c.low != null && c.close != null
    );

    seriesRef.current.setData(
      validCandles.map((c) => ({
        time:  (c.ts / 1000) as UTCTimestamp,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      }))
    );

    const hasVolume = candles.some((c) => c.volume != null && c.volume > 0);
    if (hasVolume) {
      volRef.current.setData(
        candles.map((c) => ({
          time:  (c.ts / 1000) as UTCTimestamp,
          value: c.volume ?? 0,
          color: volColor(c.open, c.close),
        }))
      );
    }

    const closes = candles.map((c) => c.close);
    for (const [key, cfg] of Object.entries(INDICATORS) as [IndicatorKey, typeof INDICATORS[IndicatorKey]][]) {
      const line = maRefs.current[key];
      if (!line) continue;
      const values = cfg.type === "sma" ? computeSMA(closes, cfg.period) : computeEMA(closes, cfg.period);
      line.setData(
        candles
          .map((c, i) => ({ time: (c.ts / 1000) as UTCTimestamp, value: values[i] }))
          .filter((p): p is { time: UTCTimestamp; value: number } => p.value !== null)
      );
    }

    // Bollinger Bands
    const bbValues = computeBB(closes);
    const { upper, mid, lower } = bbRefs.current;
    const toLineData = (key: "upper" | "mid" | "lower") =>
      candles
        .map((c, i) => ({ time: (c.ts / 1000) as UTCTimestamp, value: bbValues[i][key] }))
        .filter((p): p is { time: UTCTimestamp; value: number } => p.value !== null);
    upper?.setData(toLineData("upper"));
    mid?.setData(toLineData("mid"));
    lower?.setData(toLineData("lower"));

    chartRef.current.timeScale().fitContent();
  }, [candles]);

  // ── Toggle MA visibility ─────────────────────────────────────────────────
  useEffect(() => {
    for (const key of Object.keys(INDICATORS) as IndicatorKey[]) {
      maRefs.current[key]?.applyOptions({ visible: active.has(key) });
    }
  }, [active]);

  // ── Toggle Bollinger Band visibility ─────────────────────────────────────
  useEffect(() => {
    const { upper, mid, lower } = bbRefs.current;
    upper?.applyOptions({ visible: bbActive });
    mid?.applyOptions({   visible: bbActive });
    lower?.applyOptions({ visible: bbActive });
  }, [bbActive]);

  // ── Sync chart colors with dark / light mode ──────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor:  isDark ? "#94a3b8" : "#6b7280",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
        horzLines: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
      },
      rightPriceScale: { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" },
      timeScale:       { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" },
      crosshair: {
        vertLine: { color: isDark ? "#475569" : "#94a3b8", labelBackgroundColor: isDark ? "#1e293b" : "#334155" },
        horzLine: { color: isDark ? "#475569" : "#94a3b8", labelBackgroundColor: isDark ? "#1e293b" : "#334155" },
      },
    });
  }, [isDark]);

  // ── Live tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Daily bars use BusinessDay objects internally in lightweight-charts —
    // calling update() with a Unix timestamp causes a type mismatch crash.
    // Live tick updates on a daily chart aren't meaningful anyway.
    if (!seriesRef.current || !tick || candles.length === 0 || apiTf === "1d") return;

    const rawTs    = typeof tick.event_ts === "number" ? tick.event_ts : Date.parse(tick.event_ts as string);
    const tsMs     = rawTs < 1e12 ? rawTs * 1000 : rawTs;
    const bucketMs = floorToBucket(tsMs, apiTf);
    const last     = candles[candles.length - 1];

    if (last.ts !== bucketMs) return;

    seriesRef.current.update({
      time:  (bucketMs / 1000) as UTCTimestamp,
      open:  last.open,
      high:  Math.max(last.high, tick.price),
      low:   Math.min(last.low,  tick.price),
      close: tick.price,
    });

    if (volRef.current && last.volume != null) {
      volRef.current.update({
        time:  (bucketMs / 1000) as UTCTimestamp,
        value: last.volume + (tick.volume ?? 0),
        color: volColor(last.open, tick.price),
      });
    }
  }, [tick, candles, apiTf]);

  return (
    <div>
      {/* Row 1: indicator toggles + OHLCV info side by side */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>

        {/* Toggle pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(Object.entries(INDICATORS) as [IndicatorKey, typeof INDICATORS[IndicatorKey]][]).map(([key, cfg]) => {
            const on = active.has(key);
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           5,
                  padding:       "3px 10px",
                  borderRadius:  20,
                  border:        `1.5px solid ${on ? cfg.color : "#e2e8f0"}`,
                  background:    on ? cfg.color + "18" : "transparent",
                  color:         on ? cfg.color : "#94a3b8",
                  fontSize:      11,
                  fontWeight:    600,
                  cursor:        "pointer",
                  transition:    "all 0.15s",
                  letterSpacing: "0.02em",
                }}
              >
                <span style={{
                  width:        7,
                  height:       7,
                  borderRadius: "50%",
                  background:   on ? cfg.color : "#cbd5e1",
                  flexShrink:   0,
                }} />
                {cfg.label}
              </button>
            );
          })}

          {/* Bollinger Bands pill */}
          {(() => {
            const BB_COLOR = "#6366f1";
            return (
              <button
                onClick={() => setBbActive((v) => !v)}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           5,
                  padding:       "3px 10px",
                  borderRadius:  20,
                  border:        `1.5px solid ${bbActive ? BB_COLOR : "#e2e8f0"}`,
                  background:    bbActive ? BB_COLOR + "18" : "transparent",
                  color:         bbActive ? BB_COLOR : "#94a3b8",
                  fontSize:      11,
                  fontWeight:    600,
                  cursor:        "pointer",
                  transition:    "all 0.15s",
                  letterSpacing: "0.02em",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: bbActive ? BB_COLOR : "#cbd5e1",
                  flexShrink: 0,
                }} />
                BB (20)
              </button>
            );
          })()}
        </div>

        {/* OHLCV info bar — right-aligned, updates on hover */}
        <OHLCVBar info={displayInfo} />
      </div>

      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}
