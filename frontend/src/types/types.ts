export type Tick = {
  symbol: string;
  price: number;
  // can be ISO string or a numeric timestamp (sec/ms) depending on source
  event_ts: string | number;
  volume?: number | null;
  source?: string;
};

export type Candle = {
  ts: number; 
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};
