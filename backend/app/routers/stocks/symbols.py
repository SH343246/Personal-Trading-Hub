import os
import math
import json
from decimal import Decimal
from datetime import datetime, timezone

import redis
import yfinance
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models1.models import Candle1m, Candle5m, Candle1h, Candle1d
from app.db.repository import upsert_candle_ohlcv

router = APIRouter()

import ssl as _ssl
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
_redis_ssl = {"ssl_cert_reqs": _ssl.CERT_NONE} if REDIS_URL.startswith("rediss://") else {}
_redis = redis.Redis.from_url(REDIS_URL, decode_responses=True, **_redis_ssl)

WATCHED_KEY = "watched_symbols"   # Redis SET of user-added symbols


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.get("/symbols/verify")
def verify_symbol(symbol: str = Query(...)):
    """
    Check whether a ticker symbol is valid by asking yfinance for its
    latest price. Returns valid=True plus the current price if found,
    valid=False otherwise. Used by the frontend watchlist add flow.
    """
    sym = symbol.strip().upper()

    if not sym or len(sym) > 10:
        return {"valid": False, "symbol": sym, "error": "Invalid symbol format"}

    try:
        fi = yfinance.Ticker(sym).fast_info
        price = fi.last_price

        if price is None:
            return {"valid": False, "symbol": sym, "error": "Symbol not found"}

        return {"valid": True, "symbol": sym, "price": round(float(price), 2)}

    except Exception as e:
        return {"valid": False, "symbol": sym, "error": str(e)}


@router.post("/symbols/seed")
def seed_symbol(symbol: str = Query(...), db: Session = Depends(get_db)):
    """
    Called when the user adds a new symbol to their watchlist.
    1. Fetches today's 1m and 5m bars from yfinance and upserts them to DB.
    2. Publishes a latest-price tick to Redis so WebSocket subscribers see it immediately.
    3. Adds the symbol to the Redis 'watched_symbols' set so the Celery worker
       keeps it updated on every future fetch cycle.
    """
    sym = symbol.strip().upper()

    try:
        ticker = yfinance.Ticker(sym)

        # --- 1-minute bars ---
        df_1m = ticker.history(period="1d", interval="1m")
        bars_1m = 0
        if not df_1m.empty:
            for ts_idx, row in df_1m.iterrows():
                bucket = _to_utc(ts_idx.to_pydatetime().replace(second=0, microsecond=0))
                vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                upsert_candle_ohlcv(
                    db, Candle1m, sym, bucket,
                    Decimal(str(row["Open"])),
                    Decimal(str(row["High"])),
                    Decimal(str(row["Low"])),
                    Decimal(str(row["Close"])),
                    vol,
                )
            bars_1m = len(df_1m)

        # --- 5-minute bars ---
        df_5m = ticker.history(period="1d", interval="5m")
        bars_5m = 0
        if not df_5m.empty:
            for ts_idx, row in df_5m.iterrows():
                bucket = _to_utc(ts_idx.to_pydatetime().replace(second=0, microsecond=0))
                vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                upsert_candle_ohlcv(
                    db, Candle5m, sym, bucket,
                    Decimal(str(row["Open"])),
                    Decimal(str(row["High"])),
                    Decimal(str(row["Low"])),
                    Decimal(str(row["Close"])),
                    vol,
                )
            bars_5m = len(df_5m)

        # --- Publish latest tick (Redis errors must not abort the DB writes) ---
        try:
            if not df_1m.empty:
                latest = df_1m.iloc[-1]
                latest_ts = _to_utc(df_1m.index[-1].to_pydatetime())
                ts_ms = int(latest_ts.timestamp() * 1000)
                payload = {
                    "symbol": sym,
                    "price":  float(latest["Close"]),
                    "volume": 0 if math.isnan(latest["Volume"]) else int(latest["Volume"]),
                    "event_ts": ts_ms,
                    "newTickTimestamp": ts_ms,
                }
                _redis.set(f"tick:{sym}", json.dumps(payload))
                _redis.publish(f"ticks:{sym}", json.dumps(payload))
            _redis.sadd(WATCHED_KEY, sym)
        except Exception as redis_err:
            print(f"[seed] Redis error (non-fatal): {redis_err}")

        # --- 1-hour bars (last 60 days) — done inline so data is ready immediately ---
        bars_1h = 0
        try:
            df_1h = ticker.history(period="60d", interval="1h")
            for ts_idx, row in df_1h.iterrows():
                bucket = _to_utc(ts_idx.to_pydatetime().replace(minute=0, second=0, microsecond=0))
                vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                upsert_candle_ohlcv(
                    db, Candle1h, sym, bucket,
                    Decimal(str(row["Open"])),
                    Decimal(str(row["High"])),
                    Decimal(str(row["Low"])),
                    Decimal(str(row["Close"])),
                    vol,
                )
            bars_1h = len(df_1h)
        except Exception as e:
            print(f"[seed] 1h fetch error for {sym} (non-fatal): {e}")

        # --- Daily bars (5 years) — covers 1W/1M/1Y/Max tabs; avoids timeout on huge inserts ---
        bars_1d = 0
        try:
            df_1d = ticker.history(period="5y", interval="1d")
            for ts_idx, row in df_1d.iterrows():
                bucket = _to_utc(ts_idx.to_pydatetime().replace(hour=0, minute=0, second=0, microsecond=0))
                vol = 0 if math.isnan(row["Volume"]) else int(row["Volume"])
                upsert_candle_ohlcv(
                    db, Candle1d, sym, bucket,
                    Decimal(str(row["Open"])),
                    Decimal(str(row["High"])),
                    Decimal(str(row["Low"])),
                    Decimal(str(row["Close"])),
                    vol,
                )
            bars_1d = len(df_1d)
        except Exception as e:
            print(f"[seed] 1d fetch error for {sym} (non-fatal): {e}")

        return {"status": "ok", "symbol": sym, "bars_1m": bars_1m, "bars_5m": bars_5m, "bars_1h": bars_1h, "bars_1d": bars_1d}

    except Exception as e:
        return {"status": "error", "symbol": sym, "error": str(e)}
