from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio, os, json
from typing import Dict, Set
from datetime import datetime, timezone

import redis.asyncio as redis

router = APIRouter()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class Hub:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}
        self.redis = None
        self.tasks: Dict[str, asyncio.Task] = {}

    async def start(self):
        if not self.redis:
            self.redis = redis.from_url(REDIS_URL, decode_responses=True)


    async def send_initial_snapshot(self, s: str, ws: WebSocket):
        try:
            snap = await self.redis.get(f"latest:{s}")
            if not snap:
                snap = await self.redis.get(f"tick:{s}")
            if snap:
                print(f"[Hub] initial snapshot from Redis for {s}")
                await ws.send_text(snap)
                return
        except Exception as e:
            print("[Hub] snapshot Redis error:", repr(e))

        try:
            from app.db.repository import get_latest_tick
            from app.config import SessionLocal
            with SessionLocal() as db:
                row = get_latest_tick(db, s)
                if row:
                    payload = {
                        "symbol": s,
                        "price": float(row.price),
                        "volume": row.volume,
                        "newTickTimestamp": int(row.ts.replace(tzinfo=timezone.utc).timestamp() * 1000),
                        "source": "db",
                    }
                    await self.redis.set(f"latest:{s}", json.dumps(payload))
                    print(f"[Hub] initial snapshot from DB for {s}")
                    await ws.send_text(json.dumps(payload))
                    return
        except Exception as e:
            print("[Hub] snapshot DB error:", repr(e))

        try:
            from app.routers.stocks.market import get_price
            data = get_price(s) 
            ts_ms = int(to_utc(data["ts"]).timestamp() * 1000)
            payload = {
                "symbol": s,
                "price": float(data["price"]),
                "volume": data.get("volume"),
                "newTickTimestamp": ts_ms,
                "source": "bootstrap",
            }
            await self.redis.set(f"latest:{s}", json.dumps(payload))
            await self.redis.publish(f"ticks:{s}", json.dumps(payload))
            print(f"[Hub] initial snapshot from provider for {s}")
            await ws.send_text(json.dumps(payload))
        except Exception as e:
            print("[Hub] snapshot provider error:", repr(e))

    async def ensure_subscription(self, symbol: str):
        if symbol in self.tasks:
            return
        async def run():
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(f"ticks:{symbol}")
            try:
                async for msg in pubsub.listen():
                    if msg and msg.get("type") == "message":
                        data = msg.get("data")
                        conns = list(self.active.get(symbol, []))
                        for ws in conns:
                            try:
                                await ws.send_text(data)
                            except:
                                pass
            finally:
                await pubsub.unsubscribe(f"ticks:{symbol}")
                await pubsub.close()
        self.tasks[symbol] = asyncio.create_task(run())

    async def connect(self, symbol: str, ws: WebSocket):
        await ws.accept()
        s = symbol.upper()
        self.active.setdefault(s, set()).add(ws)
        await self.ensure_subscription(s)
        await self.send_initial_snapshot(s, ws)

    def disconnect(self, symbol: str, ws: WebSocket):
        s = symbol.upper()
        if s in self.active:
            self.active[s].discard(ws)
            if not self.active[s]:
                self.active.pop(s, None)

hub = Hub()

@router.on_event("startup")
async def _startup():
    await hub.start()

@router.websocket("/ws/ticks/{symbol}")
async def ws_ticks(ws: WebSocket, symbol: str):
    await hub.connect(symbol, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(symbol, ws)
