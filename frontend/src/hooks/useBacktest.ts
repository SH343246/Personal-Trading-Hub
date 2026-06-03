/**
 * useBacktest
 * -----------
 * Manages the state for a single backtest run.
 *
 * Returns:
 *   result  — the BacktestResult once the request completes, null before that
 *   loading — true while the request is in flight
 *   error   — error message string if something went wrong, null otherwise
 *   run     — call this with a BacktestRequest to kick off the backtest
 *   reset   — clears result/error back to null (for running a fresh backtest)
 */

import { useState } from "react";
import type { BacktestRequest, BacktestResult } from "../types/backtest";

const API_BASE = "http://localhost:8001/api";

export function useBacktest() {
  const [result,  setResult]  = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function run(request: BacktestRequest) {
    // Reset any previous result/error before starting
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        // The backend returns { "detail": "..." } for errors
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail ?? `Request failed (${response.status})`);
      }

      const data: BacktestResult = await response.json();
      setResult(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      // Always turn off loading when done, whether it succeeded or failed
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return { result, loading, error, run, reset };
}
