"""
Tests for app/services/backtest_engine.py

Covers SMA crossover logic, metrics computation, and edge cases.
"""

import pytest
from datetime import datetime, timezone, date
from app.services.backtest_engine import Bar, _run_sma_crossover, _compute_metrics
from app.schemas.backtest import BacktestRequest, SmaCrossoverStrat, EquityPoint, Side


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_request(fast=3, slow=5, initial_cash=10_000.0, start="2020-01-01", end="2021-01-01"):
    return BacktestRequest(
        symbol="TEST",
        start=date.fromisoformat(start),
        end=date.fromisoformat(end),
        timeframe="1d",
        initial_cash=initial_cash,
        strategy=SmaCrossoverStrat(kind="sma_crossover", fast=fast, slow=slow),
        save=False,
    )

def make_bar(close: float, day: int = 1) -> Bar:
    ts = datetime(2020, 1, day, tzinfo=timezone.utc)
    return Bar(ts=ts, open_=close, high=close, low=close, close=close)

def make_bars(closes: list[float]) -> list[Bar]:
    return [Bar(
        ts=datetime(2020, 1, 1, tzinfo=timezone.utc),
        open_=c, high=c, low=c, close=c
    ) for c in closes]


# ---------------------------------------------------------------------------
# SMA crossover — signal detection
# ---------------------------------------------------------------------------

class TestSmaCrossover:

    def test_no_trades_on_flat_prices(self):
        """Flat prices → no crossover → no trades."""
        bars    = make_bars([100.0] * 20)
        request = make_request(fast=3, slow=5)
        result  = _run_sma_crossover(request, bars, request.strategy)
        assert result.trades == []

    def test_uptrend_generates_buy(self):
        """
        Flat prices then rising: fast SMA crosses above slow → BUY signal.
        With flat prices both SMAs are equal, so when prices rise the fast
        SMA (shorter window) reacts first and crosses above the slow SMA.
        """
        closes  = [10] * 6 + [11, 12, 13, 14, 15, 16, 17, 18]
        bars    = make_bars(closes)
        request = make_request(fast=2, slow=5)
        result  = _run_sma_crossover(request, bars, request.strategy)
        buys = [t for t in result.trades if t.side == Side.BUY]
        assert len(buys) >= 1

    def test_downtrend_generates_sell_after_buy(self):
        """
        Flat → rise (triggers BUY) → fall (triggers SELL).
        Fast SMA crosses above slow on the way up, then crosses back below on the way down.
        """
        closes = [10] * 6 + [11, 12, 13, 14, 15] + [14, 13, 12, 11, 10, 9, 8, 7, 6, 5]
        bars   = make_bars(closes)
        request = make_request(fast=2, slow=5)
        result  = _run_sma_crossover(request, bars, request.strategy)
        sides   = [t.side for t in result.trades]
        assert Side.BUY  in sides
        assert Side.SELL in sides

    def test_equity_curve_length_equals_bars(self):
        bars    = make_bars([float(i) for i in range(1, 21)])
        request = make_request(fast=3, slow=5)
        result  = _run_sma_crossover(request, bars, request.strategy)
        assert len(result.equity_curve) == len(bars)

    def test_initial_equity_equals_initial_cash(self):
        """First equity point should be the starting cash (no trades yet)."""
        bars    = make_bars([100.0] * 10)
        request = make_request(initial_cash=10_000.0, fast=3, slow=5)
        result  = _run_sma_crossover(request, bars, request.strategy)
        assert result.equity_curve[0].equity == pytest.approx(10_000.0)

    def test_equity_always_non_negative(self):
        closes  = [abs(100 + i * 3 - i**2 * 0.5) + 1 for i in range(30)]
        bars    = make_bars(closes)
        request = make_request(fast=3, slow=7)
        result  = _run_sma_crossover(request, bars, request.strategy)
        for pt in result.equity_curve:
            assert pt.equity >= 0, f"Equity went negative: {pt.equity}"

    def test_cash_after_buy_is_near_zero(self):
        """All-in strategy: after a buy, remaining cash should be near 0."""
        closes  = list(range(10, 30))
        bars    = make_bars(closes)
        request = make_request(fast=2, slow=5, initial_cash=10_000.0)
        result  = _run_sma_crossover(request, bars, request.strategy)
        buys = [t for t in result.trades if t.side == Side.BUY]
        if buys:
            assert buys[0].cash_after == pytest.approx(0.0, abs=0.01)

    def test_no_bars_returns_empty_result(self):
        request = make_request()
        result  = _run_sma_crossover(request, [], request.strategy)
        assert result.trades      == []
        assert result.equity_curve == []

    def test_fewer_bars_than_slow_window_produces_no_trades(self):
        """Not enough bars to compute slow SMA → no signals → no trades."""
        bars    = make_bars([100.0, 101.0, 102.0])   # only 3 bars
        request = make_request(fast=2, slow=5)        # slow needs 5
        result  = _run_sma_crossover(request, bars, request.strategy)
        assert result.trades == []


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

class TestComputeMetrics:

    def _pt(self, equity: float) -> EquityPoint:
        return EquityPoint(time=datetime(2020, 1, 1, tzinfo=timezone.utc), equity=equity)

    def test_zero_growth_gives_zero_cagr(self):
        curve = [self._pt(10_000), self._pt(10_000)]
        m = _compute_metrics(curve, date(2020, 1, 1), date(2021, 1, 1), 10_000.0)
        assert m.cagr == pytest.approx(0.0, abs=0.001)

    def test_doubled_in_one_year_is_100pct_cagr(self):
        curve = [self._pt(10_000), self._pt(20_000)]
        m = _compute_metrics(curve, date(2020, 1, 1), date(2021, 1, 1), 10_000.0)
        assert m.cagr == pytest.approx(1.0, rel=0.01)

    def test_no_drawdown_on_monotonically_rising_curve(self):
        curve = [self._pt(float(v)) for v in range(100, 200)]
        m = _compute_metrics(curve, date(2020, 1, 1), date(2021, 1, 1), 100.0)
        assert m.max_drawdown == pytest.approx(0.0, abs=1e-6)

    def test_max_drawdown_50pct(self):
        """Equity goes 100 → 200 → 100 → max drawdown = -50%."""
        curve = [self._pt(100), self._pt(200), self._pt(100)]
        m = _compute_metrics(curve, date(2020, 1, 1), date(2021, 1, 1), 100.0)
        assert m.max_drawdown == pytest.approx(-0.5, rel=0.001)

    def test_empty_curve_returns_zeros(self):
        m = _compute_metrics([], date(2020, 1, 1), date(2021, 1, 1), 10_000.0)
        assert m.cagr        == 0.0
        assert m.max_drawdown == 0.0

    def test_max_drawdown_is_negative_or_zero(self):
        """Drawdown should always be ≤ 0."""
        curve = [self._pt(v) for v in [100, 80, 120, 60, 150]]
        m = _compute_metrics(curve, date(2020, 1, 1), date(2021, 1, 1), 100.0)
        assert m.max_drawdown <= 0.0
