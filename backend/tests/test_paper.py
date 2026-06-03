"""
Tests for the paper trading portfolio computation logic.

We test _compute_portfolio directly since it's a pure function —
no DB, no HTTP, just trade history in, portfolio state out.
"""

import pytest
from app.routers.stocks.paper import _compute_portfolio, STARTING_CASH


# ---------------------------------------------------------------------------
# Minimal fake trade object so we don't need the DB
# ---------------------------------------------------------------------------

class FakeTrade:
    def __init__(self, symbol: str, side: str, qty: float, price: float):
        self.symbol = symbol
        self.side   = side
        self.qty    = qty
        self.price  = price


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestComputePortfolio:

    def test_no_trades_returns_full_cash(self):
        state = _compute_portfolio([])
        assert state["cash"] == STARTING_CASH
        assert state["positions"] == {}

    def test_single_buy_reduces_cash(self):
        trades = [FakeTrade("AAPL", "buy", qty=10, price=150.0)]
        state  = _compute_portfolio(trades)
        assert state["cash"] == pytest.approx(STARTING_CASH - 1500.0)
        assert "AAPL" in state["positions"]
        assert state["positions"]["AAPL"]["qty"] == pytest.approx(10.0)

    def test_buy_then_full_sell_clears_position(self):
        trades = [
            FakeTrade("AAPL", "buy",  qty=10, price=150.0),
            FakeTrade("AAPL", "sell", qty=10, price=160.0),
        ]
        state = _compute_portfolio(trades)
        # Cash: started 100k, spent 1500, received 1600 → net +100
        assert state["cash"] == pytest.approx(STARTING_CASH + 100.0)
        # Position fully closed
        assert "AAPL" not in state["positions"]

    def test_partial_sell_keeps_remaining_position(self):
        trades = [
            FakeTrade("AAPL", "buy",  qty=10, price=100.0),
            FakeTrade("AAPL", "sell", qty=4,  price=110.0),
        ]
        state = _compute_portfolio(trades)
        pos   = state["positions"]["AAPL"]
        assert pos["qty"] == pytest.approx(6.0)

    def test_partial_sell_adjusts_cost_basis(self):
        """
        Buy 10 shares at $100 → cost_basis = $1000.
        Sell 4 shares (40%) → remaining cost_basis should be $600.
        """
        trades = [
            FakeTrade("AAPL", "buy",  qty=10, price=100.0),
            FakeTrade("AAPL", "sell", qty=4,  price=100.0),
        ]
        state = _compute_portfolio(trades)
        pos   = state["positions"]["AAPL"]
        assert pos["cost_basis"] == pytest.approx(600.0, rel=1e-6)

    def test_multiple_symbols_tracked_independently(self):
        trades = [
            FakeTrade("AAPL", "buy", qty=5,  price=200.0),
            FakeTrade("MSFT", "buy", qty=10, price=300.0),
        ]
        state = _compute_portfolio(trades)
        assert "AAPL" in state["positions"]
        assert "MSFT" in state["positions"]
        expected_cash = STARTING_CASH - (5 * 200) - (10 * 300)
        assert state["cash"] == pytest.approx(expected_cash)

    def test_sell_one_symbol_leaves_other_untouched(self):
        trades = [
            FakeTrade("AAPL", "buy",  qty=5,  price=200.0),
            FakeTrade("MSFT", "buy",  qty=10, price=300.0),
            FakeTrade("AAPL", "sell", qty=5,  price=200.0),
        ]
        state = _compute_portfolio(trades)
        assert "AAPL" not in state["positions"]
        assert "MSFT" in state["positions"]
        assert state["positions"]["MSFT"]["qty"] == pytest.approx(10.0)

    def test_buy_sell_buy_accumulates_correctly(self):
        """Buy, sell everything, buy again — position should reflect only the second buy."""
        trades = [
            FakeTrade("AAPL", "buy",  qty=10, price=100.0),
            FakeTrade("AAPL", "sell", qty=10, price=120.0),
            FakeTrade("AAPL", "buy",  qty=5,  price=130.0),
        ]
        state = _compute_portfolio(trades)
        pos   = state["positions"]["AAPL"]
        assert pos["qty"] == pytest.approx(5.0)
        # Cost basis should only reflect the second buy
        assert pos["cost_basis"] == pytest.approx(5 * 130.0)

    def test_dust_threshold_removes_tiny_position(self):
        """
        Selling almost everything should leave qty ≈ 0 which gets filtered out
        by the dust threshold (< 0.0001 shares).
        """
        trades = [
            FakeTrade("AAPL", "buy",  qty=1.0,     price=100.0),
            FakeTrade("AAPL", "sell", qty=0.99999, price=100.0),
        ]
        state = _compute_portfolio(trades)
        assert "AAPL" not in state["positions"]

    def test_cash_never_goes_below_zero_after_sells(self):
        """Net cash across many trades should never be tracked as negative from arithmetic errors."""
        trades = [
            FakeTrade("AAPL", "buy",  qty=100, price=100.0),
            FakeTrade("AAPL", "sell", qty=50,  price=150.0),
            FakeTrade("AAPL", "sell", qty=50,  price=200.0),
        ]
        state = _compute_portfolio(trades)
        # Spent 10000, received 7500+10000=17500, net +7500
        assert state["cash"] == pytest.approx(STARTING_CASH + 7500.0)
        assert state["cash"] >= 0
