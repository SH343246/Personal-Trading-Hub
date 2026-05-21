export type Tick = {
  symbol: string;
  price: number;
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
