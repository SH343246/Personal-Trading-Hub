/**
 * Mirror of backend/app/schemas/paper.py
 */

export type OrderRequest = {
  symbol: string;
  side:   "buy" | "sell";
  qty:    number;
  note?:  string;
};

export type TradeOut = {
  id:          number;
  symbol:      string;
  side:        "buy" | "sell";
  qty:         number;
  price:       number;
  executed_at: string;   // ISO datetime
  note:        string | null;
};

export type PositionOut = {
  symbol:         string;
  qty:            number;
  avg_cost:       number;
  current_price:  number;
  market_value:   number;
  unrealized_pnl: number;
  pnl_pct:        number;
};

export type PortfolioOut = {
  cash:          number;
  total_value:   number;
  total_pnl:     number;
  positions:     PositionOut[];
  starting_cash: number;
};

export type EquityPoint = {
  ts:    string;   // ISO datetime
  value: number;   // total portfolio value at that moment
};
