/**
 * These mirror the Pydantic schemas in backend/app/schemas/backtest.py.
 * The shape must match exactly — FastAPI serialises to JSON using those
 * schemas and we deserialise on this side using these types.
 */

export type Strategy = {
  kind: "sma_crossover";
  fast: number;
  slow: number;
};

export type BacktestRequest = {
  symbol: string;
  start: string;       // "YYYY-MM-DD"
  end: string;         // "YYYY-MM-DD"
  timeframe: "1m" | "5m" | "1h" | "1d";
  initial_cash: number;
  strategy: Strategy;
  save: boolean;
};

export type Side = "buy" | "sell";

export type Trade = {
  time: string;        // ISO datetime string
  side: Side;
  price: number;
  qty: number;
  cash_after: number;
  position_after: number;
  equity_after: number;
};

export type EquityPoint = {
  time: string;        // ISO datetime string
  equity: number;
};

export type Metrics = {
  cagr: number;        // e.g. 0.18 means 18% per year
  max_drawdown: number; // e.g. -0.25 means worst drop was 25%
};

export type BacktestResult = {
  symbol: string;
  start: string;
  end: string;
  timeframe: string;
  initial_cash: number;
  strategy: Strategy;
  metrics: Metrics;
  trades: Trade[];
  equity_curve: EquityPoint[];
  id: string | null;
};
