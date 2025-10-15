import { useEffect, useState } from "react";
import type { Candle, Tick } from "../types/types";

export type timeFrame = "1m" | "5m";



function floorTs(timestampInMilliseconds: number, tf: timeFrame): number {
  const date = new Date(timestampInMilliseconds);
  if (tf === "1m") {
    date.setSeconds(0, 0);
  } else {
    date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
  }
  return date.getTime();
}


export function useCandles(symbol: string, tf: timeFrame = "1m", limit = 120, tick?: Tick) {
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => { //if smbl, tf,limit change, refetch
    let cancelled = false;
    const base = import.meta.env?.VITE_API_URL ?? "http://localhost:8000";
    const url = `${base}/api/candles/${encodeURIComponent(symbol)}?tf=${tf}&limit=${limit}`;

    fetch(url)
      .then((response) => response.json())
      .then((arr: Candle[]) =>{
        if (!cancelled) setCandles(Array.isArray(arr) ?arr: []); })
      .catch(() =>{ if (!cancelled) setCandles([]); });

    return () => {
      cancelled = true;
    };
  }, [symbol, tf,limit]); 

  useEffect(() => {
    if (!tick) return;
//sec to ms
   // Be robust to string/number + seconds/ms
const parsed = typeof tick.event_ts === "number"
  ? tick.event_ts
  : Date.parse(tick.event_ts);              // ISO string -> ms (number)

// Fallback if parse failed (NaN)
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
