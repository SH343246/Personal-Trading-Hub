"""
paper.py  (schemas)
-------------------
Pydantic models for the paper trading API.

Request  = what the frontend sends in
Response = what the backend sends back
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# ---------------------------------------------------------------------------
# Order request — what the frontend POSTs to place a trade
# ---------------------------------------------------------------------------

class OrderRequest(BaseModel):
    symbol:  str            = Field(..., description="Ticker e.g. 'AAPL'")
    side:    str            = Field(..., description="'buy' or 'sell'")
    qty:     float          = Field(..., gt=0, description="Number of shares, must be > 0")
    note:    Optional[str]  = Field(None, description="Optional label for this trade")


# ---------------------------------------------------------------------------
# Trade response — one row from paper_trades sent back to the frontend
# ---------------------------------------------------------------------------

class TradeOut(BaseModel):
    id:          int
    symbol:      str
    side:        str
    qty:         float
    price:       float
    executed_at: datetime
    note:        Optional[str]

    class Config:
        from_attributes = True   # lets Pydantic read from SQLAlchemy model objects


# ---------------------------------------------------------------------------
# Position — computed from trade history, not stored in DB
#
# For each symbol you hold shares in, we return:
#   qty       — total shares currently held
#   avg_cost  — average price paid per share (weighted average of all buys)
#   current_price — latest live price (looked up at request time)
#   market_value  — qty × current_price
#   unrealized_pnl — (current_price - avg_cost) × qty
#   pnl_pct       — unrealized_pnl as a percentage of cost basis
# ---------------------------------------------------------------------------

class PositionOut(BaseModel):
    symbol:         str
    qty:            float
    avg_cost:       float
    current_price:  float
    market_value:   float
    unrealized_pnl: float
    pnl_pct:        float


# ---------------------------------------------------------------------------
# Portfolio summary — the full picture in one response
# ---------------------------------------------------------------------------

class PortfolioOut(BaseModel):
    cash:             float   # cash remaining (starting cash minus all buys plus all sells)
    total_value:      float   # cash + sum of all market values
    total_pnl:        float   # sum of all unrealized P&L across positions
    positions:        list[PositionOut]
    starting_cash:    float   # always 100_000 for now


# ---------------------------------------------------------------------------
# Equity curve — one point per trade, portfolio value over time
# ---------------------------------------------------------------------------

class EquityPointOut(BaseModel):
    ts:    str    # ISO datetime string
    value: float  # total portfolio value at that moment
