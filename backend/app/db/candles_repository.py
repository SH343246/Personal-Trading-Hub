from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from app.models1.models import Tick, Candle1m, Candle5m
from decimal import Decimal
from sqlalchemy.dialects.postgresql import insert
from app.config import SessionLocal
from sqlalchemy import func
from datetime import datetime, timezone

from models1.models import Candle1m, Candle5m, Candle1d

def _to_utc(dt: datetime ) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    else:
        return dt.astimezone(timezone.utc)

## def get_candles(symbol, timeframe, start, end):

def bounds_check(db: Session, symbol: str, timeframe: str): # Do i have enough data for the specific bounds
    Model = modelfortimeframe(timeframe)
    first_ts, last_ts, count_rows = db.query(
        func.min(Model.bucket_start),
        func.max(Model.bucket_start),
        func.count()
    ).filter(Model.symbol == symbol.upper()).one()

    if first_ts is None or last_ts is None: ## edge case check
        return None       

    return first_ts, last_ts, int(count_rows)



##def upsert_candles_backfill(symbol, timeframe):

