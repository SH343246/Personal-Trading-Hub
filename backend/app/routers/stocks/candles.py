from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Literal, Optional
from datetime import datetime, date, timezone, timedelta
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models1.models import Candle1m, Candle5m, Candle1h, Candle1d

router = APIRouter()

# How far back to look by default for each timeframe.
# 1m/5m are intraday so we default to today only.
# 1h/1d have history so we look back far enough to fill a useful chart.
_DEFAULT_LOOKBACK: dict[str, timedelta] = {
    "1m": timedelta(days=1),
    "5m": timedelta(days=1),
    "1h": timedelta(days=14),   # ~2 weeks of hourly bars
    "1d": timedelta(days=36500),  # 100 years — effectively "all rows in DB"
}

_TABLE_MAP = {
    "1m": Candle1m,
    "5m": Candle5m,
    "1h": Candle1h,
    "1d": Candle1d,
}

def row_to_dictionary(r):
    ts_ms = int(r.bucket_start.replace(tzinfo=timezone.utc).timestamp() * 1000)
    return {
        "ts": ts_ms,
        "open": float(r.open),
        "high": float(r.high),
        "low": float(r.low),
        "close": float(r.close),
        "volume": None if r.volume is None else float(r.volume),
    }

@router.get("/candles/{symbol}")
def get_candles(
    symbol: str,
    tickInterval: Literal["1m", "5m", "1h", "1d"] = Query("1m", alias="tf"),
    limit: int = Query(300, ge=1, le=2000),
    since: Optional[date] = Query(None),
    db: Session = Depends(get_db),
) -> List[dict]:
    try:
        smbl = symbol.upper()
        table = _TABLE_MAP[tickInterval]

        if since is not None:
            since_dt = datetime.combine(since, datetime.min.time(), tzinfo=timezone.utc)
        elif tickInterval in ("1m", "5m"):
            # Intraday — always start from midnight today so yesterday's session
            # never bleeds into the chart. "24 hours ago" would include yesterday.
            since_dt = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
        else:
            lookback = _DEFAULT_LOOKBACK[tickInterval]
            since_dt = datetime.now(timezone.utc) - lookback

        rows = (
            db.query(table)
              .filter(table.symbol == smbl)
              .filter(table.bucket_start >= since_dt)
              .order_by(table.bucket_start.desc())
              .limit(limit)
              .all()
        )

        if not rows:
            return []

        rows.reverse()
        return [row_to_dictionary(r) for r in rows]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
