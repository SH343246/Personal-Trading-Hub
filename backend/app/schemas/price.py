from pydantic import BaseModel, Field


class StockPrice(BaseModel):
    symbol: str
    ts: str
    price: float
    currency: str | None = None