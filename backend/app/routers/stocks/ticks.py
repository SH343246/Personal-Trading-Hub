from fastapi import APIRouter, HTTPException
from redis import asyncio as aioredis
import os, json
from app.config import SessionLocal
from app.db.repository import get_latest_tick

router = APIRouter(prefix="/market", tags=["market"])

def get_redis():
    url = "redis://localhost:6379"
    print("DEBUG get_redis() using:", url)
    return aioredis.from_url(url, decode_responses=True)

@router.get("/tick/{symbol}")
async def get_tick(symbol: str):
    r = get_redis()  
    key = f"tick:{symbol.upper()}"
    v = await r.get(key)
    if v:
        return json.loads(v)

    db = SessionLocal()
    try:
        row = get_latest_tick(db, symbol.upper())
        if not row:
            raise HTTPException(404, "not found")
        out = {
            "symbol": row.symbol,
            "price": float(row.price),
            "volume": getattr(row, "volume", None),
            "event_ts": int(row.ts.timestamp() * 1000),
            }
        await r.set(key, json.dumps(out))
        return out
    finally:
        db.close()
















#get latest tick for symbol from redis, if not from db and set in redis
