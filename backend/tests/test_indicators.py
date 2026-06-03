"""
Tests for app/services/indicators.py

The SMA function is the foundation of the backtest engine.
If these are wrong, every backtest result is wrong.
"""

import pytest
from app.services.indicators import sma


class TestSma:

    def test_basic_window_3(self):
        """The docstring example: [1,2,3,4,5] with window=3."""
        result = sma([1, 2, 3, 4, 5], window=3)
        assert result == [None, None, 2.0, 3.0, 4.0]

    def test_window_1_returns_values_unchanged(self):
        """Window of 1 is just the prices themselves."""
        prices = [10.0, 20.0, 30.0]
        result = sma(prices, window=1)
        assert result == [10.0, 20.0, 30.0]

    def test_window_equals_length(self):
        """Window == len(prices) — only the last element has a value."""
        result = sma([1, 2, 3, 4, 5], window=5)
        assert result[:4] == [None, None, None, None]
        assert result[4] == pytest.approx(3.0)

    def test_window_larger_than_length(self):
        """Window > len(prices) — all None."""
        result = sma([1, 2, 3], window=10)
        assert all(v is None for v in result)
        assert len(result) == 3

    def test_output_length_matches_input(self):
        prices = [float(i) for i in range(20)]
        assert len(sma(prices, window=5)) == 20

    def test_empty_input(self):
        assert sma([], window=3) == []

    def test_single_price_window_1(self):
        assert sma([42.0], window=1) == [42.0]

    def test_single_price_window_2(self):
        assert sma([42.0], window=2) == [None]

    def test_decimal_accuracy(self):
        """Average of 1/3 + 1/3 + 1/3 should be ~0.333."""
        result = sma([1/3, 1/3, 1/3], window=3)
        assert result[2] == pytest.approx(1/3, rel=1e-6)

    def test_none_count_equals_window_minus_1(self):
        """Exactly (window - 1) leading Nones."""
        for window in [2, 3, 5, 10]:
            prices = [float(i) for i in range(window + 5)]
            result = sma(prices, window=window)
            none_count = sum(1 for v in result if v is None)
            assert none_count == window - 1, f"window={window}"
