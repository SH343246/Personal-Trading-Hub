import { useEffect, useRef, useState } from "react";
import type { Candle, Tick } from "../types/types";
import { API } from "../config";

export type timeFrame = "1m" | "5m" | "1h" | "1d";

const BACKFILL_POLL_MS = 5000;
const STALE_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;

function floorTs(timestampInMilliseconds: number, tf: timeFrame): number {
  const date = new Date(timestampInMilliseconds);
  if      (tf === "1m") date.setSeconds(0, 0);
  else if (tf === "5m") date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
  else if (tf === "1h") date.setMinutes(0, 0, 0);
  else                  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

const SESSION_KEY = "candleCache_v2";

function loadCacheFromSession(): Map<string, Candle[]> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, Candle[]>;
    const todayStartMs = new Date().setHours(0, 0, 0, 0);
    const map = new Map<string, Candle[]>();
    for (const [key, candles] of Object.entries(obj)) {
      const fresh = candles.filter((c) => c.ts >= todayStartMs);
      if (fresh.length > 0) map.set(key, fresh);
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveCacheToSession(cache: Map<string, Candle[]>) {
  try {
    const obj: Record<string, Candle[]> = {};
    for (const [k, v] of cache.entries()) obj[k] = v;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
  } catch {}
}

function isDataStale(candles: Candle[], tf: timeFrame): boolean {
  if (tf !== "1d") return false;
  if (candles.length === 0) return false;
  return candles[candles.length - 1].ts < Date.now() - STALE_THRESHOLD_MS;
}

const candleCache = loadCacheFromSession();

export function getSessionOpen(symbol: string, tf: timeFrame = "1m"): number | null {
  const candles = candleCache.get(`${symbol}:${tf}`);
  if (!candles || candles.length === 0) return null;
  return candles[0].open;
}

export function useCandles(symbol: string, tf: timeFrame = "1m", limit = 120, tick?: Tick) {
  const cacheKey = `${symbol}:${tf}`;

  const cachedOnMount = candleCache.get(cacheKey) ?? [];
  const cacheIsStale = isDataStale(cachedOnMount, tf);

  const [candles, setCandles] = useState<Candle[]>(cacheIsStale ? [] : cachedOnMount);
  const [loading, setLoading] = useState<boolean>(cachedOnMount.length === 0 || cacheIsStale);

  const hasServerData = useRef<boolean>(cachedOnMount.length > 0 && !cacheIsStale);

  const [prevCacheKey, setPrevCacheKey] = useState(cacheKey);
  if (prevCacheKey !== cacheKey) {
    setPrevCacheKey(cacheKey);
    const cached = candleCache.get(cacheKey) ?? [];
    const stale = isDataStale(cached, tf);
    hasServerData.current = cached.length > 0 && !stale;
    setLoading(cached.length === 0 || stale);
    setCandles(stale ? [] : cached);
  }

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setTimeout> | null = null;
    const url = `${API}/candles/${encodeURIComponent(symbol)}?tf=${tf}&limit=${limit}`;

    function doFetch() {
      fetch(url)
        .then((r) => r.json())
        .then((arr: Candle[]) => {
          if (cancelled) return;
          const data = Array.isArray(arr) ? arr : [];

          if (data.length > 0) {
            candleCache.set(cacheKey, data);

            if (isDataStale(data, tf)) {
              pollId = setTimeout(doFetch, BACKFILL_POLL_MS);
            } else {
              hasServerData.current = true;
              setLoading(false);
              setCandles(data);
            }
          } else {
            if (tf === "1d") {
              pollId = setTimeout(doFetch, BACKFILL_POLL_MS);
            } else {
              setLoading(false);
            }
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    }

    doFetch();

    return () => {
      cancelled = true;
      if (pollId) clearTimeout(pollId);
    };
  }, [symbol, tf, limit, cacheKey]);

  useEffect(() => {
    if (candles.length > 0) {
      candleCache.set(cacheKey, candles);
      saveCacheToSession(candleCache);
    }
  }, [candles, cacheKey]);

  useEffect(() => {
    if (!tick) return;
    if (!hasServerData.current) return;

    const parsed = typeof tick.event_ts === "number"
      ? tick.event_ts
      : Date.parse(tick.event_ts);
    const rawTs: number = Number.isFinite(parsed) ? parsed : Date.now();
    const timestampInMilliseconds: number = rawTs < 1e12 ? rawTs * 1000 : rawTs;
    const bucketStart = floorTs(timestampInMilliseconds, tf);

    setCandles((currentCandlesArray) => {
      if (currentCandlesArray.length === 0) {
        return [
          {
            ts: bucketStart,
            open: tick.price,
            high: tick.price,
            low: tick.price,
            close: tick.price,
            volume: tick.volume ?? null,
          },
        ];
      }

      const lastCandleinBucket = currentCandlesArray[currentCandlesArray.length - 1];
      if (lastCandleinBucket.ts === bucketStart) {
        const updated: Candle = {
          ...lastCandleinBucket,
          high: Math.max(lastCandleinBucket.high, tick.price),
          low: Math.min(lastCandleinBucket.low, tick.price),
          close: tick.price,
          volume:
            lastCandleinBucket.volume == null && tick.volume == null
              ? null
              : (lastCandleinBucket.volume ?? 0) + (tick.volume ?? 0),
        };
        return [...currentCandlesArray.slice(0, -1), updated];
      }

      if (bucketStart > lastCandleinBucket.ts) {
        const nextCandle: Candle = {
          ts: bucketStart,
          open: lastCandleinBucket.close,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume ?? null,
        };
        const out = [...currentCandlesArray, nextCandle];
        return out.length > limit ? out.slice(out.length - limit) : out;
      }

      return currentCandlesArray;
    });
  }, [tick, tf, limit]);

  return { candles, loading };
}
