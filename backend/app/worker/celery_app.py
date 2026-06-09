import os
import ssl
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

BROKER_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
INTERVAL = int(os.getenv("FETCH_INTERVAL_SECONDS", "30"))
app = Celery("trading_hub", broker=BROKER_URL)
from app.worker import tasks

app.conf.timezone = "UTC"
app.conf.enable_utc = True
app.conf.worker_concurrency = 2

# Upstash uses rediss:// (TLS) — skip cert verification since we trust the URL
if BROKER_URL.startswith("rediss://"):
    app.conf.broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}

app.conf.beat_schedule = {
    # Fast tick updates via fast_info — lightweight, runs every 15s
    "fetch-ticks": {
        "task": "fetch_ticks",
        "schedule": 15,
    },
    # Full OHLCV candle refresh — heavier, runs every 60s
    "fetch-prices": {
        "task": "fetch_price_batch",
        "schedule": max(INTERVAL, 60),
    },
    # Historical backfill — runs once daily at 6 PM UTC (after US market close)
    # Keeps 1h and 1d tables fresh with the latest completed bars.
    "fetch-historical-daily": {
        "task": "fetch_historical",
        "schedule": crontab(hour=18, minute=0),
    },
}


DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]

@app.on_after_finalize.connect
def run_historical_on_startup(sender, **kwargs):
    """On worker start: seed default symbols into Redis if watched_symbols is
    empty, then kick off a full historical backfill and an immediate price fetch."""
    try:
        watched = tasks.r.smembers("watched_symbols")
        if not watched:
            seeds = [s for s in DEFAULT_SYMBOLS if s not in (tasks._ENV_SYMBOLS or [])]
            if seeds:
                tasks.r.sadd("watched_symbols", *seeds)
                print(f"[startup] seeded watched_symbols with {seeds}")
    except Exception as e:
        print(f"[startup] could not seed watched_symbols: {e}")

    tasks.fetch_ticks.delay()
    tasks.fetch_price_batch.delay()
    tasks.fetch_historical.delay()
