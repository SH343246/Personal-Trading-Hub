import { useEffect, useState } from "react";
import type { Candle, Tick } from "../types/types";

export type timeFrame = "1m" | "5m" | "1h" | "1d";



function floorTs(timestampInMilliseconds: number, tf: timeFrame): number {
  const date = new Date(timestampInMilliseconds);
  if      (tf === "1m") date.setSeconds(0, 0);
  else if (tf === "5m") date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
  else if (tf === "1h") date.setMinutes(0, 0, 0);
  else                  date.setHours(0, 0, 0, 0);   // "1d"
  return date.getTime();
}


// sessionStorage key — bump the version suffix if the Candle shape ever changes
// so old serialized data doesn't cause type mismatches.
const SESSION_KEY = "candleCache_v2";

function loadCacheFromSession(): Map<string, Candle[]> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, Candle[]>;
    // Only restore today's candles — anything from a previous day is stale
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
  } catch {
    // sessionStorage can hit quota limits — silently ignore
  }
}

// Module-level cache, pre-loaded from sessionStorage so a page refresh
// restores all candles that were loaded in this browser session.
const candleCache = loadCacheFromSession();

/**
 * Read the session-open price for a symbol directly from the module-level
 * cache — no hook, no fetch, no re-render side-effect.
 * Returns null if the candles haven't loaded yet.
 */
export function getSessionOpen(symbol: string, tf: timeFrame = "1m"): number | null {
  const candles = candleCache.get(`${symbol}:${tf}`);
  if (!candles || candles.length === 0) return null;
  return candles[0].open;
}

export function useCandles(symbol: string, tf: timeFrame = "1m", limit = 120, tick?: Tick) {
  const cacheKey = `${symbol}:${tf}`;
  const [candles, setCandles] = useState<Candle[]>(candleCache.get(cacheKey) ?? []);

  // Derived-state reset: when the cacheKey changes (symbol or tf switch), immediately
  // reset candles to the new symbol's cache during render — before any effects fire.
  // This prevents the tick effect from seeing the previous symbol's candle array.
  const [prevCacheKey, setPrevCacheKey] = useState(cacheKey);
  if (prevCacheKey !== cacheKey) {
    setPrevCacheKey(cacheKey);
    setCandles(candleCache.get(cacheKey) ?? []);
  }

  useEffect(() => { //if smbl, tf,limit change, refetch
    let cancelled = false;
    const base = import.meta.env?.VITE_API_URL ?? "http://localhost:8001";
    const url = `${base}/api/candles/${encodeURIComponent(symbol)}?tf=${tf}&limit=${limit}`;

    fetch(url)
      .then((response) => response.json())
      .then((arr: Candle[]) => {
        if (!cancelled) {
          const data = Array.isArray(arr) ? arr : [];
          if (data.length > 0) {
            // Only replace state/cache if the server actually returned data.
            // An empty response (market closed, no rows yet) should not wipe
            // candles that were already built from live ticks.
            candleCache.set(cacheKey, data);
            setCandles(data);
          }
        }
      })
      .catch(() => {
        // Network / parse error — don't wipe existing data.
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, tf, limit, cacheKey]);

  // Keep both the in-memory cache and sessionStorage in sync whenever
  // candles state changes — covers REST fetch updates AND live tick merges.
  useEffect(() => {
    if (candles.length > 0) {
      candleCache.set(cacheKey, candles);
      saveCacheToSession(candleCache);
    }
  }, [candles, cacheKey]);

  useEffect(() => {
    if (!tick) return;
//sec to ms
const parsed = typeof tick.event_ts === "number"
  ? tick.event_ts
  : Date.parse(tick.event_ts);              

const rawTs: number = Number.isFinite(parsed) ? parsed : Date.now();
// If it looks like seconds, convert to ms
const timestampInMilliseconds: number = rawTs < 1e12 ? rawTs * 1000 : rawTs;

const bucketStart = floorTs(timestampInMilliseconds, tf);

    setCandles((currentCandlesArray) => { // If no candles, create one
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
      if (lastCandleinBucket.ts === bucketStart) {//In same bucket, update candle
        const updated: Candle = {
          ...lastCandleinBucket,
          high: Math.max(lastCandleinBucket.high, tick.price),
          low: Math.min(lastCandleinBucket.low, tick.price),
          close: tick.price,
          volume:
            lastCandleinBucket.volume == null && tick.volume == null? null : (lastCandleinBucket.volume ?? 0) + (tick.volume ?? 0 ),
        };
        return [...currentCandlesArray.slice(0, -1), updated];
      }

      if (bucketStart > lastCandleinBucket.ts) { //Tick in new bucket, new candle
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

      
      return currentCandlesArray; //Ignore older ticks
    });
  }, [tick, tf, limit]);

  return { candles };
}
