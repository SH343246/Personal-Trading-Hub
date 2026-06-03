"""
backtest.py  (router)
---------------------
One endpoint:  POST /api/backtest

The frontend sends a BacktestRequest (symbol, dates, strategy params).
We fetch the matching candles from our DB, run the engine, and return
the full BacktestResult (trades, equity curve, metrics).
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.deps import get_db
from app.schemas.backtest import BacktestRequest, BacktestResult, Timeframe
from app.models1.models import Candle1m, Candle5m, Candle1h, Candle1d
from app.services.backtest_engine import Bar, run_backtest

router = APIRouter()

# Maps the timeframe string the frontend sends to the right DB table
_TABLE_MAP = {
    Timeframe.OneMin:  Candle1m,
    Timeframe.FiveMin: Candle5m,
    Timeframe.OneHour: Candle1h,
    Timeframe.OneDay:  Candle1d,
}


@router.post("/backtest", response_model=BacktestResult)
def run_backtest_endpoint(request: BacktestRequest, db: Session = Depends(get_db)):
    """
    Run a backtest and return the full result.

    Steps:
      1. Validate the request (FastAPI does this automatically via Pydantic)
      2. Fetch candles from DB for the requested symbol / timeframe / date range
      3. Convert DB rows → Bar objects the engine understands
      4. Call run_backtest()
      5. Return the result — FastAPI serialises it to JSON automatically
    """

    # --- 1. Pick the right table ---
    table = _TABLE_MAP.get(request.timeframe)
    if table is None:
        raise HTTPException(status_code=400, detail=f"Unsupported timeframe: {request.timeframe}")

    # --- 2. Fetch candles from DB ---
    # Convert the date range to timezone-aware datetimes so they match
    # the UTC timestamps stored in the DB.
    start_dt = datetime.combine(request.start, datetime.min.time(), tzinfo=timezone.utc)
    end_dt   = datetime.combine(request.end,   datetime.max.time(), tzinfo=timezone.utc)

    rows = (
        db.query(table)
          .filter(table.symbol == request.symbol.upper())
          .filter(table.bucket_start >= start_dt)
          .filter(table.bucket_start <= end_dt)
          .order_by(table.bucket_start.asc())   # oldest first — engine expects this
          .all()
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No candle data found for {request.symbol} "
                   f"({request.timeframe.value}) between {request.start} and {request.end}. "
                   f"Try a different date range — your DB may not have data that far back."
        )

    # --- 3. Convert DB rows → Bar objects ---
    # We strip the DB model here so the engine has no SQLAlchemy dependency.
    bars = [
        Bar(
            ts=row.bucket_start.replace(tzinfo=timezone.utc),
            open_=float(row.open),
            high=float(row.high),
            low=float(row.low),
            close=float(row.close),
        )
        for row in rows
    ]

    # --- 4. Run the engine ---
    try:
        result = run_backtest(request, bars)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

    return result
