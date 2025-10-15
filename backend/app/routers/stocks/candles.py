from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Literal, Optional
from datetime import timezone
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models1.models import Candle1m, Candle5m

router = APIRouter()

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
    tickInterval: Literal["1m", "5m"] = Query("1m", alias="tf"),
    limit: int = Query(120, ge=1, le=2000),
    db: Session = Depends(get_db),
) -> List[dict]:
    try:
        smbl = symbol.upper()
        table = Candle1m if tickInterval == "1m" else Candle5m

        rows = (
            db.query(table)
              .filter(table.symbol == smbl)
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

  
