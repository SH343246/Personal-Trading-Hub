"""
indicators.py
-------------
Pure functions that take a list of floats (closing prices) and return
a list of the same length with computed indicator values.

Rules:
- Input:  list of closing prices, oldest first  e.g. [150.1, 151.3, ...]
- Output: list of float | None, same length.
          None means "not enough data yet to compute this value."
- No side effects, no DB calls — just math.
"""

from typing import Optional


def sma(prices: list[float], window: int) -> list[Optional[float]]:
    """
    Simple Moving Average.

    For each bar i, returns the average of prices[i-window+1 : i+1].
    The first (window - 1) values are None because there aren't enough
    preceding bars to fill the window.

    Example: prices=[1,2,3,4,5], window=3
      -> [None, None, 2.0, 3.0, 4.0]
         bar 0: only 1 price, need 3  -> None
         bar 1: only 2 prices, need 3 -> None
         bar 2: avg(1,2,3) = 2.0
         bar 3: avg(2,3,4) = 3.0
         bar 4: avg(3,4,5) = 4.0
    """
    result: list[Optional[float]] = []

    for i in range(len(prices)):
        if i < window - 1:
            # Not enough bars yet
            result.append(None)
        else:
            window_slice = prices[i - window + 1 : i + 1]  # last `window` prices
            result.append(sum(window_slice) / window)

    return result
