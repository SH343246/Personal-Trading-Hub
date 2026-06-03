/**
 * usePaper
 * --------
 * Manages all paper trading state:
 *   portfolio  — current positions, cash, P&L (polled every 30s)
 *   trades     — full order history
 *   placeOrder — call this to buy or sell
 *   ordering   — true while an order is in flight
 *   orderError — error message if an order failed
 */

import { useState, useEffect, useCallback } from "react";
import type { OrderRequest, PortfolioOut, TradeOut, EquityPoint } from "../types/paper";

const API = "http://localhost:8001/api";

export function usePaper() {
  const [portfolio,  setPortfolio]  = useState<PortfolioOut | null>(null);
  const [trades,     setTrades]     = useState<TradeOut[]>([]);
  const [equity,     setEquity]     = useState<EquityPoint[]>([]);
  const [ordering,   setOrdering]   = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Fetch portfolio — called on mount and every 30 seconds so P&L
  // updates automatically as live prices change.
  // ------------------------------------------------------------------
  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch(`${API}/paper/portfolio`);
      if (res.ok) setPortfolio(await res.json());
    } catch { /* silently ignore network blips */ }
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`${API}/paper/trades`);
      if (res.ok) setTrades(await res.json());
    } catch { /* silently ignore */ }
  }, []);

  const fetchEquity = useCallback(async () => {
    try {
      const res = await fetch(`${API}/paper/equity`);
      if (res.ok) setEquity(await res.json());
    } catch { /* silently ignore */ }
  }, []);

  // Load on mount, then poll every 30 seconds
  useEffect(() => {
    fetchPortfolio();
    fetchTrades();
    fetchEquity();
    const id = setInterval(() => {
      fetchPortfolio();
      fetchEquity();
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchPortfolio, fetchTrades, fetchEquity]);

  // ------------------------------------------------------------------
  // Place an order
  // ------------------------------------------------------------------
  async function placeOrder(req: OrderRequest): Promise<boolean> {
    setOrderError(null);
    setOrdering(true);
    try {
      const res = await fetch(`${API}/paper/order`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(req),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Order failed (${res.status})`);
      }

      // Refresh portfolio, trades, and equity curve after a successful order
      await Promise.all([fetchPortfolio(), fetchTrades(), fetchEquity()]);
      return true;

    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setOrdering(false);
    }
  }

  async function resetPortfolio(): Promise<boolean> {
    try {
      const res = await fetch(`${API}/paper/reset`, { method: "DELETE" });
      if (!res.ok) return false;
      await Promise.all([fetchPortfolio(), fetchTrades(), fetchEquity()]);
      return true;
    } catch {
      return false;
    }
  }

  return { portfolio, trades, equity, ordering, orderError, placeOrder, resetPortfolio, refresh: fetchPortfolio };
}
