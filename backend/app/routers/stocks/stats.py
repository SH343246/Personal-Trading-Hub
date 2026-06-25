import yfinance
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from app.deps import get_db
from app.models1.models import Candle1d

router = APIRouter()


def _fmt_large(n: float | None) -> str | None:
    if n is None:
        return None
    if n >= 1e12:
        return f"${n / 1e12:.2f}T"
    if n >= 1e9:
        return f"${n / 1e9:.2f}B"
    if n >= 1e6:
        return f"${n / 1e6:.2f}M"
    return f"${n:,.0f}"


@router.get("/stats/{symbol}")
def get_stats(symbol: str, db: Session = Depends(get_db)):
    sym = symbol.strip().upper()
    try:
        fi = yfinance.Ticker(sym).fast_info

        def safe(attr):
            try:
                v = getattr(fi, attr, None)
                return None if v != v else v
            except Exception:
                return None

        mktcap   = safe("market_cap")
        prev_cls = safe("previous_close")
        last_vol = safe("last_volume")
        avg_vol  = safe("three_month_average_volume")

        one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
        row = db.query(
            func.max(Candle1d.high).label("year_high"),
            func.min(Candle1d.low).label("year_low"),
        ).filter(
            Candle1d.symbol == sym,
            Candle1d.bucket_start >= one_year_ago,
        ).one()
        wk52_hi = float(row.year_high) if row.year_high is not None else None
        wk52_lo = float(row.year_low)  if row.year_low  is not None else None

        return {
            "symbol":              sym,
            "market_cap":          _fmt_large(mktcap),
            "fifty_two_week_high": round(wk52_hi, 2) if wk52_hi else None,
            "fifty_two_week_low":  round(wk52_lo, 2) if wk52_lo else None,
            "previous_close":      round(prev_cls, 2) if prev_cls else None,
            "last_volume":         int(last_vol) if last_vol else None,
            "avg_volume_3m":       int(avg_vol)  if avg_vol  else None,
        }
    except Exception as e:
        return {"symbol": sym, "error": str(e)}
