from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio, os, json, ssl
from datetime import datetime, timezone

import redis.asyncio as redis

router = APIRouter()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
POLL_INTERVAL = 5  # seconds between Redis polls

def _redis_kwargs() -> dict:
    if REDIS_URL.startswith("rediss://"):
        return {"ssl_cert_reqs": ssl.CERT_NONE}
    return {}

_redis_client = None

async def get_redis():
    global _redis_client
    if not _redis_client:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True, **_redis_kwargs())
    return _redis_client

async def get_initial_price(symbol: str) -> str | None:
    """Try Redis first, fall back to DB."""
    try:
        r = await get_redis()
        data = await r.get(f"tick:{symbol}") or await r.get(f"latest:{symbol}")
        if data:
            return data
    except Exception as e:
        print(f"[WS] Redis snapshot error for {symbol}: {repr(e)}")

    try:
        from app.db.repository import get_latest_tick
        from app.config import SessionLocal
        with SessionLocal() as db:
            row = get_latest_tick(db, symbol)
            if row:
                payload = {
                    "symbol": symbol,
                    "price": float(row.price),
                    "volume": row.volume,
                    "newTickTimestamp": int(row.ts.replace(tzinfo=timezone.utc).timestamp() * 1000),
                }
                return json.dumps(payload)
    except Exception as e:
        print(f"[WS] DB snapshot error for {symbol}: {repr(e)}")

    return None

@router.websocket("/ws/ticks/{symbol}")
async def ws_ticks(ws: WebSocket, symbol: str):
    await ws.accept()
    s = symbol.upper()

    # Send initial snapshot immediately
    snap = await get_initial_price(s)
    if snap:
        try:
            await ws.send_text(snap)
        except:
            return

    # Poll Redis every POLL_INTERVAL seconds and push any new price.
    # IMPORTANT: only catch Redis errors in the inner block — let send errors
    # (WebSocketDisconnect, "close message" RuntimeError) propagate to the
    # outer except so the loop exits cleanly instead of running forever on a
    # dead connection.
    last_sent = snap
    try:
        while True:
            await asyncio.sleep(POLL_INTERVAL)
            # Redis fetch — non-fatal, keep polling if Redis hiccups
            try:
                r = await get_redis()
                data = await r.get(f"tick:{s}")
            except Exception as e:
                print(f"[WS] Redis error for {s}: {repr(e)}")
                continue
            # Send — fatal if the connection is gone; outer except exits the loop
            if data and data != last_sent:
                await ws.send_text(data)
                last_sent = data
    except (WebSocketDisconnect, Exception):
        pass  # Connection closed — exit cleanly, no zombie loop
