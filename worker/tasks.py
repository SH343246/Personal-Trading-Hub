# worker/tasks.py
import os
from decimal import Decimal
from .celery_app import app
from app.config import SessionLocal
from app.routers.stocks.market import get_price
from app.db.repository import insert_tick, upsert_candle_1m, upsert_candle_5m
from app.utilities.roundtimestampsdown import floor_to_minute, floor_to_5min
from datetime import datetime, timezone
import json
import redis


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
r = redis.Redis.from_url(REDIS_URL, decode_responses=True)




@app.task(name="ping")
def ping():
    return "pong"

# safer version
SYMBOLS_ENV = os.getenv("SYMBOLS", "")
SYMBOLS = [s.strip().upper() for s in SYMBOLS_ENV.split(",") if s.strip()]
INTERVAL = int(os.getenv("FETCH_INTERVAL_SECONDS", "30"))


def to_utc(ts):
    if isinstance(ts, str):
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    raise TypeError(f"Unsupported ts type: {type(ts)}")



@app.task(name="fetch_price_batch")
def fetch_price_batch():
    db = SessionLocal()
    try:
        for symbol in SYMBOLS:
            try:
                data = get_price(symbol)  # expects: {"symbol","ts","price","volume",...}
                ts = to_utc(data["ts"])                          # tz-aware UTC datetime
                price = Decimal(str(data["price"]))      # ensure Decimal
                volume = data.get("volume")

                insert_tick(db, symbol, ts, price, volume)
                upsert_candle_1m(db, symbol, floor_to_minute(ts), price, volume) # DB entries
                upsert_candle_5m(db, symbol, floor_to_5min(ts), price, volume)

                key = f"tick:{symbol}"

                new_ts_ms = int(ts.timestamp() * 1000)
                now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                delay_ms = now_ms - new_ts_ms
                print(f"[tick] {symbol} price={float(price)} ts={new_ts_ms} delay_ms={delay_ms}")

                newTickTimestamp = int(ts.timestamp() * 1000) 

                currentTickTimestamp = r.get(key)
                if currentTickTimestamp:
                    try:
                        currentTickTimestamp_ts = json.loads(currentTickTimestamp).get("newTickTimestamp", 0)
                    except Exception:
                        currentTickTimestamp_ts = 0
                else:
                    currentTickTimestamp_ts = 0

                if newTickTimestamp > currentTickTimestamp_ts: #API can return older ticks after newer ones so we avoid that
                    payload={
                        "symbol": symbol,
                        "price": float(price),
                        "volume": volume,
                        "newTickTimestamp": newTickTimestamp, }
                    r. set(key, json.dumps (payload))
                    r. set (f"' latest: {symbol}", json.dumps (payload) )
                    r. publish(f"ticks:{symbol}", json. dumps (payload) )

            except Exception as e:
                # log and continue with the next symbol
                print(f"[fetch_price_batch] {symbol} error: {e}")
    finally:
        print("[fetch_price_batch] SYMBOLS =", SYMBOLS)
        db.close()

    return {"status": "ok", "symbols": SYMBOLS, "interval": INTERVAL}
