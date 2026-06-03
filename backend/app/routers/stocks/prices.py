from fastapi import APIRouter, HTTPException
from app.schemas.price import StockPrice
from app.routers.stocks.market import get_price

router = APIRouter(prefix="/prices", tags=["prices"])

@router.get("/{symbol}/latest", response_model=StockPrice)
def latest_price(symbol: str):
    try:
        return get_price(symbol.upper())
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
