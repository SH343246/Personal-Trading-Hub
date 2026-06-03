from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from app.models1.models import Tick, Candle1m, Candle5m
from app.config import SessionLocal
from datetime import timezone

def round_timestamps_down(ts, interval):
    if interval == '1m':
        return ts.replace(second=0, microsecond=0)
    elif interval == '5m':
        return ts.replace(minute=(ts.minute // 5) * 5, second=0, microsecond=0)
    else:
        raise ValueError("Unsupported interval")


def floor_to_minute(ts):
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.replace(second=0, microsecond=0)

def floor_to_5min(ts):
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    minute = (ts.minute // 5) * 5
    return ts.replace(minute=minute, second=0, microsecond=0)