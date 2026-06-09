import os
import math
from decimal import Decimal
from .celery_app import app
from app.config import SessionLocal
from app.models1.models import Candle1m, Candle5m, Candle1h, Candle1d
from app.db.repository import insert_tick, upsert_candle_ohlcv
from datetime import datetime, timezone
import json
import redis
import yfinance


import ssl as _ssl
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
_redis_ssl = {"ssl_cert_reqs": _ssl.CERT_NONE} if REDIS_URL.startswith("rediss://") else {}
r = redis.Redis.from_url(REDIS_URL, decode_responses=True, **_redis_ssl)


@app.task(name="ping")
def ping():
    return "pong"

SYMBOLS_ENV = os.getenv("SYMBOLS", "")
_ENV_SYMBOLS = [s.strip().upper() for s in SYMBOLS_ENV.split(",") if s.strip()]
INTERVAL = int(os.getenv("FETCH_INTERVAL_SECONDS", "30"))
WATCHED_KEY = "watched_symbols"

def _get_symbols() -> list[str]:
    """Union of env-configured symbols + any user-added symbols in Redis."""
    try:
        watched = r.smembers(WATCHED_KEY)  # Redis SET → Python set of strings
    except Exception:
        watched = set()
    combined = set(_ENV_SYMBOLS) | watched
    return sorted(combined)


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@app.task(name="fetch_ticks")
def fetch_ticks():
    """
    Fast tick-only update using fast_info — one lightweight API call per symbol.
    Publishes latest price to Redis so WebSocket clients get near-real-time updates.
    Runs every FETCH_INTERVAL_SECONDS (default 30s).
    """
    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    for symbol in _get_symbols():
        try:
            info = yfinance.Ticker(symbol).fast_info
            price = float(info.last_price)
            volume = int(info.three_month_average_volume or 0)
            payload = {
                "symbol": symbol,
                "price":  price,
                "volume": volume,
                "event_ts": ts_ms,
                "newTickTimestamp": ts_ms,
            }
            r.set(f"tick:{symbol}", json.dumps(payload))
            r.publish(f"ticks:{symbol}", json.dumps(payload))
            print(f"[tick] {symbol} price={price:.2f}")
        except Exception as e:
            print(f"[fetch_ticks] {symbol} error: {e}")

    return {"status": "ok", "symbols": _get_symbols()}


@app.task(name="fetch_price_batch")
def fetch_price_batch():
    """
    Full OHLCV candle update via history() — runs every FETCH_INTERVAL_SECONDS
    to keep 1m and 5m candle tables fresh. Slower than fetch_ticks but gives
    proper OHLCV bars for the chart.
    """
    db = SessionLocal()
    try:
        for symbol in _get_symbols():
            try:
                ticker = yfinance.Ticker(symbol)

                # --- 1-minute bars (today only) ---
                df_1m = ticker.history(period="1d", interval="1m")
                if df_1m.empty:
                    print(f"[fetch] {symbol}: no 1m history returned")
                    continue

                for ts_idx, row in df_1m.iterrows():
                    bucket = _to_utc(ts_idx.to_pydatetime().replace(second=0, microsecond=0))
                    vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                    upsert_candle_ohlcv(
                        db, Candle1m, symbol, bucket,
                        Decimal(str(row["Open"])),
                        Decimal(str(row["High"])),
                        Decimal(str(row["Low"])),
                        Decimal(str(row["Close"])),
                        vol,
                    )

                # --- 5-minute bars (today only) ---
                df_5m = ticker.history(period="1d", interval="5m")
                for ts_idx, row in df_5m.iterrows():
                    bucket = _to_utc(ts_idx.to_pydatetime().replace(second=0, microsecond=0))
                    vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                    upsert_candle_ohlcv(
                        db, Candle5m, symbol, bucket,
                        Decimal(str(row["Open"])),
                        Decimal(str(row["High"])),
                        Decimal(str(row["Low"])),
                        Decimal(str(row["Close"])),
                        vol,
                    )

                # Also publish tick from latest 1m bar
                latest = df_1m.iloc[-1]
                latest_ts = _to_utc(df_1m.index[-1].to_pydatetime())
                latest_price = float(latest["Close"])
                latest_vol   = 0 if math.isnan(latest["Volume"]) else int(latest["Volume"])
                ts_ms = int(latest_ts.timestamp() * 1000)
                payload = {
                    "symbol": symbol,
                    "price":  latest_price,
                    "volume": latest_vol,
                    "event_ts": ts_ms,
                    "newTickTimestamp": ts_ms,
                }
                r.set(f"tick:{symbol}", json.dumps(payload))
                r.publish(f"ticks:{symbol}", json.dumps(payload))

                print(f"[fetch] {symbol} price={latest_price:.2f}  1m_bars={len(df_1m)}  5m_bars={len(df_5m)}")

            except Exception as e:
                print(f"[fetch_price_batch] {symbol} error: {e}")
    finally:
        db.close()

    return {"status": "ok", "symbols": _get_symbols()}


@app.task(name="fetch_historical")
def fetch_historical():
    """
    Fetch multi-day historical bars for every tracked symbol and upsert into
    candles_1h and candles_1d tables.

    Runs once daily (scheduled via Celery beat). Also triggered manually on
    worker startup and whenever a new symbol is seeded via the watchlist.

    - 1h bars: last 60 days  (yfinance period="60d" interval="1h")
    - 1d bars: last 2 years  (yfinance period="2y"  interval="1d")
    """
    db = SessionLocal()
    try:
        for symbol in _get_symbols():
            try:
                ticker = yfinance.Ticker(symbol)

                # --- Hourly bars (last 60 days) ---
                df_1h = ticker.history(period="60d", interval="1h")
                for ts_idx, row in df_1h.iterrows():
                    bucket = _to_utc(ts_idx.to_pydatetime().replace(minute=0, second=0, microsecond=0))
                    vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                    upsert_candle_ohlcv(
                        db, Candle1h, symbol, bucket,
                        Decimal(str(row["Open"])),
                        Decimal(str(row["High"])),
                        Decimal(str(row["Low"])),
                        Decimal(str(row["Close"])),
                        vol,
                    )

                # --- Daily bars (all available history) ---
                df_1d = ticker.history(period="max", interval="1d")
                for ts_idx, row in df_1d.iterrows():
                    bucket = _to_utc(ts_idx.to_pydatetime().replace(hour=0, minute=0, second=0, microsecond=0))
                    vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                    upsert_candle_ohlcv(
                        db, Candle1d, symbol, bucket,
                        Decimal(str(row["Open"])),
                        Decimal(str(row["High"])),
                        Decimal(str(row["Low"])),
                        Decimal(str(row["Close"])),
                        vol,
                    )

                print(f"[historical] {symbol}  1h_bars={len(df_1h)}  1d_bars={len(df_1d)}")

            except Exception as e:
                print(f"[fetch_historical] {symbol} error: {e}")
    finally:
        db.close()

    return {"status": "ok", "symbols": _get_symbols()}
