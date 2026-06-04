import { useState, useCallback } from "react";
import { API_BASE } from "../config";

const STORAGE_KEY = "watchlist_v1";
const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"];
const MAX_SYMBOLS = 10;

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SYMBOLS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_SYMBOLS;
  } catch {
    return DEFAULT_SYMBOLS;
  }
}

function saveToStorage(symbols: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // storage full or blocked — silently ignore
  }
}

export type AddResult =
  | { ok: true; symbol: string; price: number }
  | { ok: false; error: string };

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(loadFromStorage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSymbol = useCallback(async (raw: string): Promise<AddResult> => {
    const sym = raw.trim().toUpperCase();

    if (!sym) return { ok: false, error: "Enter a symbol" };
    if (sym.length > 10) return { ok: false, error: "Symbol too long" };
    if (symbols.includes(sym)) return { ok: false, error: `${sym} is already in your watchlist` };
    if (symbols.length >= MAX_SYMBOLS) return { ok: false, error: `Watchlist is full (max ${MAX_SYMBOLS})` };

    setLoading(true);
    setError(null);

    try {
      const base = API_BASE;

      // Step 1: verify the symbol exists
      const res = await fetch(`${base}/api/symbols/verify?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();

      if (!data.valid) {
        const msg = data.error ?? "Symbol not found";
        setError(msg);
        return { ok: false, error: msg };
      }

      // Step 2: backfill today's candles + register for ongoing Celery updates.
      // We AWAIT this so that by the time setFocusedSymbol fires and useCandles
      // runs its REST fetch, the DB already has today's bars populated.
      try {
        await fetch(`${base}/api/symbols/seed?symbol=${encodeURIComponent(data.symbol)}`, {
          method: "POST",
        });
      } catch {
        // Seed failed (network/backend error) — still add to watchlist.
        // Data will appear on the next Celery fetch cycle.
      }

      setSymbols((prev) => {
        const next = [...prev, data.symbol];
        saveToStorage(next);
        return next;
      });
      return { ok: true, symbol: data.symbol, price: data.price };
    } catch (e) {
      const msg = "Network error — try again";
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  const removeSymbol = useCallback((sym: string) => {
    setSymbols((prev) => {
      const next = prev.filter((s) => s !== sym);
      saveToStorage(next);
      return next;
    });
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { symbols, addSymbol, removeSymbol, loading, error, clearError };
}
