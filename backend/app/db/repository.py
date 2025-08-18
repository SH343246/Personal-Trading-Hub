from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from app.models1.models import Tick, Candle1m, Candle5m
from decimal import Decimal
from sqlalchemy.dialects.postgresql import insert
from app.config import SessionLocal
from sqlalchemy import func

def insert_tick(db, symbol, ts, price: Decimal, volume=None):
    stmt = insert(Tick.__table__).values(
        symbol=symbol.upper(),
        ts=ts,
        price=price,
        volume=volume
    ).on_conflict_do_nothing(
        index_elements=["symbol", "ts"]
    )
    db.execute(stmt)
    db.commit()

def upsert_candle_1m(db, symbol, bucket_start, price: Decimal, volume=None):
    v = 0 if volume is None else int(volume)
    stmt = insert(Candle1m.__table__).values(
        symbol=symbol.upper(),
        bucket_start=bucket_start,
        open=price,
        high=price,
        low=price,
        close=price,
        volume=v
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol", "bucket_start"],
        set_={
            "high": func.greatest(Candle1m.high, stmt.excluded.high),
            "low": func.least(Candle1m.low, stmt.excluded.low),
            "close": stmt.excluded.close,
            "volume": Candle1m.volume + stmt.excluded.volume,
        }
    )
    db.execute(stmt)
    db.commit()

def upsert_candle_5m(db, symbol, bucket_start, price: Decimal, volume=None):
    v = 0 if volume is None else int(volume)
    stmt = insert(Candle5m.__table__).values(
        symbol=symbol.upper(),
        bucket_start=bucket_start,
        open=price,
        high=price,
        low=price,
        close=price,
        volume=v
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol", "bucket_start"],
        set_={
            "high": func.greatest(Candle5m.high, stmt.excluded.high),
            "low": func.least(Candle5m.low, stmt.excluded.low),
            "close": stmt.excluded.close,
            "volume": Candle5m.volume + stmt.excluded.volume,
        }
    )
    db.execute(stmt)
    db.commit()

def get_latest_tick(db, symbol):
    return (
        db.query(Tick)
        .filter(Tick.symbol == symbol.upper())
        .order_by(Tick.ts.desc())
        .first()
    )



def get_candles(db, symbol, interval, limit):
    model = Candle1m if interval == "1m" else Candle5m
    return (
        db.query(model)
        .filter(model.symbol == symbol.upper())
        .order_by(model.bucket_start.desc())
        .limit(limit)
        .all()
    )