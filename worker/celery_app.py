import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

BROKER_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
INTERVAL = int(os.getenv("FETCH_INTERVAL_SECONDS", "30"))
app = Celery("trading_hub", broker=BROKER_URL)
import worker.tasks

app.conf.timezone = "UTC"
app.conf.enable_utc = True

app.conf.beat_schedule = {
    "fetch-prices": 
    {"task": "fetch_price_batch", 
     "schedule": INTERVAL}
}
