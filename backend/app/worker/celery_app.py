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
    # Intraday OHLCV — runs every 30s during market hours
    "fetch-prices": {
        "task": "fetch_price_batch",
        "schedule": INTERVAL,
    },
    # Historical backfill — runs once daily at 6 PM UTC (after US market close)
    # Keeps 1h and 1d tables fresh with the latest completed bars.
    "fetch-historical-daily": {
        "task": "fetch_historical",
        "schedule": crontab(hour=18, minute=0),
    },
}


@app.on_after_finalize.connect
def run_historical_on_startup(sender, **kwargs):
    """Kick off a historical backfill immediately when the worker starts up
    so the 1H and 1D charts have data without waiting until 6 PM."""
    tasks.fetch_historical.delay()
