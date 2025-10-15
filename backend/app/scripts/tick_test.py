import asyncio, time, json
from redis import asyncio as aioredis

async def main():
    r = aioredis.from_url("redis://localhost:6379", decode_responses=True)

    tick = {
        "symbol": "NVDA",
        "price": 111.25,
        "event_ts": int(time.time() * 1000)
    }

    await r.set("tick:NVDA", json.dumps(tick))
    out = await r.get("tick:NVDA")
    print("from redis:", out)

asyncio.run(main())
