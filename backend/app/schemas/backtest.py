from pydantic import BaseModel, Field, AwareDatetime
from datetime import date
from enum import Enum
from typing import List, Optional, Union, Literal

class SmaCrossoverStrat(BaseModel):
    kind: Literal["sma_crossover"] = "sma_crossover"
    fast: int = Field(..., description="Fast SMA window length (bars).")
    slow: int = Field(..., description="Slow SMA window length (bars).")

Strategy = SmaCrossoverStrat

class Side(str, Enum):
    BUY = "buy"
    SELL = "sell"

class Timeframe(str, Enum):
    OneMin = "1m"
    FiveMin = "5m"
    OneHour = "1h"
    OneDay = "1d"

class BacktestRequest(BaseModel):
    symbol: str
    start: date
    end: date
    timeframe: Timeframe = Timeframe.OneMin
    initial_cash: float = 10000.0
    strategy: Strategy
    save: bool = False

class Trade(BaseModel):
    time: AwareDatetime
    side: Side
    price: float
    qty: float
    cash_after: float
    position_after: float
    equity_after: float

class EquityPoint(BaseModel):
    time: AwareDatetime
    equity: float

class Metrics(BaseModel):
    cagr : float
    max_drawdown : float

class BacktestResult(BaseModel):
    symbol: str
    start: date
    end: date
    timeframe: Timeframe
    initial_cash: float
    strategy: Strategy
    save: bool
    metrics: Metrics
    trades: List[Trade] = Field(default_factory=list)
    equity_curve: List[EquityPoint] = Field(default_factory=list)
    id: Optional[str] = None

