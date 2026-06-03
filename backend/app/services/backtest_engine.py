"""
backtest_engine.py
------------------
Runs a simulated trading strategy over historical candle data and returns
the full result: every trade made, the equity curve, and summary metrics.

No database calls here — the caller fetches candles and passes them in.
This keeps the engine pure and easy to test.
"""

from datetime import datetime, timezone, date
from typing import Optional
from app.schemas.backtest import (
    BacktestRequest,
    BacktestResult,
    Trade,
    EquityPoint,
    Metrics,
    Side,
    SmaCrossoverStrat,
)
from app.services.indicators import sma


# ---------------------------------------------------------------------------
# Internal candle type — just what we need from the DB rows
# ---------------------------------------------------------------------------

class Bar:
    """One OHLCV bar passed into the engine."""
    def __init__(self, ts: datetime, open_: float, high: float, low: float, close: float):
        self.ts    = ts
        self.open  = open_
        self.high  = high
        self.low   = low
        self.close = close


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_backtest(request: BacktestRequest, bars: list[Bar]) -> BacktestResult:
    """
    Run the requested strategy over the provided bars and return a full result.

    Parameters
    ----------
    request : BacktestRequest
        Symbol, date range, initial cash, strategy config — from the API.
    bars : list[Bar]
        Historical candles for the symbol, oldest first.
        The caller (the API router) is responsible for fetching these from DB.

    Returns
    -------
    BacktestResult
        All trades, equity curve, and computed metrics.
    """

    if isinstance(request.strategy, SmaCrossoverStrat):
        return _run_sma_crossover(request, bars, request.strategy)

    raise ValueError(f"Unknown strategy: {request.strategy.kind}")


# ---------------------------------------------------------------------------
# SMA crossover strategy
# ---------------------------------------------------------------------------

def _run_sma_crossover(
    request: BacktestRequest,
    bars: list[Bar],
    strategy: SmaCrossoverStrat,
) -> BacktestResult:
    """
    At each bar:
      - If fast SMA crosses above slow SMA and we have no position → BUY
      - If fast SMA crosses below slow SMA and we have a position  → SELL
    We go "all in" on every buy (spend all cash) and "all out" on every sell.
    """

    closes = [b.close for b in bars]

    # Compute both SMA series upfront — same length as `closes`, None where
    # there isn't enough data yet.
    fast_sma = sma(closes, strategy.fast)
    slow_sma = sma(closes, strategy.slow)

    # Starting state
    cash     : float = request.initial_cash
    position : float = 0.0   # shares currently held
    trades   : list[Trade] = []
    equity_curve: list[EquityPoint] = []

    for i, bar in enumerate(bars):
        # We need at least two bars of SMA values to detect a crossover
        # (we compare this bar vs the previous bar)
        if i == 0:
            equity_curve.append(EquityPoint(time=bar.ts, equity=cash))
            continue

        f_now  = fast_sma[i]
        f_prev = fast_sma[i - 1]
        s_now  = slow_sma[i]
        s_prev = slow_sma[i - 1]

        # Skip if either SMA doesn't have enough data yet
        if None in (f_now, f_prev, s_now, s_prev):
            equity_curve.append(EquityPoint(time=bar.ts, equity=cash + position * bar.close))
            continue

        # --- Crossover detection ---
        # "Fast crossed above slow" means:
        #   previous bar: fast was BELOW slow
        #   current bar:  fast is ABOVE slow
        fast_crossed_above = (f_prev <= s_prev) and (f_now > s_now)
        fast_crossed_below = (f_prev >= s_prev) and (f_now < s_now)

        if fast_crossed_above and position == 0:
            # BUY — spend all cash at this bar's close price
            qty      = cash / bar.close        # how many shares we can afford
            cost     = qty * bar.close         # = cash (all in)
            cash    -= cost
            position += qty

            trades.append(Trade(
                time=bar.ts,
                side=Side.BUY,
                price=bar.close,
                qty=qty,
                cash_after=cash,
                position_after=position,
                equity_after=cash + position * bar.close,
            ))

        elif fast_crossed_below and position > 0:
            # SELL — liquidate everything at this bar's close price
            qty_sold  = position          # capture BEFORE zeroing
            proceeds  = position * bar.close
            cash     += proceeds
            position  = 0.0

            trades.append(Trade(
                time=bar.ts,
                side=Side.SELL,
                price=bar.close,
                qty=qty_sold,             # shares sold
                cash_after=cash,
                position_after=0.0,
                equity_after=cash,
            ))

        # Record equity at this bar regardless of whether a trade happened
        equity_curve.append(EquityPoint(
            time=bar.ts,
            equity=cash + position * bar.close,
        ))

    # If we're still holding at the end, "close" the position at the last price
    if position > 0 and bars:
        last_price = bars[-1].close
        cash      += position * last_price
        position   = 0.0

    # --- Compute metrics ---
    metrics = _compute_metrics(
        equity_curve=equity_curve,
        start_date=request.start,
        end_date=request.end,
        initial_cash=request.initial_cash,
    )

    return BacktestResult(
        symbol=request.symbol,
        start=request.start,
        end=request.end,
        timeframe=request.timeframe,
        initial_cash=request.initial_cash,
        strategy=request.strategy,
        save=request.save,
        metrics=metrics,
        trades=trades,
        equity_curve=equity_curve,
    )


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def _compute_metrics(
    equity_curve: list[EquityPoint],
    start_date: date,
    end_date: date,
    initial_cash: float,
) -> Metrics:
    """
    CAGR — Compound Annual Growth Rate.
        How much did the portfolio grow per year on average?
        Formula: (final / initial) ^ (1 / years) - 1

    Max Drawdown — the largest peak-to-trough drop in equity.
        e.g. -0.25 means the portfolio dropped 25% from its peak at some point.
        This measures risk / how painful the strategy was to hold.
    """

    if not equity_curve:
        return Metrics(cagr=0.0, max_drawdown=0.0)

    final_equity = equity_curve[-1].equity

    # CAGR
    days  = (end_date - start_date).days or 1   # avoid division by zero
    years = days / 365.25
    cagr  = (final_equity / initial_cash) ** (1 / years) - 1

    # Max drawdown
    peak        = equity_curve[0].equity
    max_dd      = 0.0
    for point in equity_curve:
        if point.equity > peak:
            peak = point.equity
        drawdown = (point.equity - peak) / peak   # negative number
        if drawdown < max_dd:
            max_dd = drawdown

    return Metrics(cagr=round(cagr, 6), max_drawdown=round(max_dd, 6))
