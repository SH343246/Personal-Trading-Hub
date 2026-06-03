import os, datetime, pytz
import yfinance


PROVIDER = os.getenv("DATA_PROVIDER", "yahoo")

def get_price_yahoo(symbol: str):
    ticker = yfinance.Ticker(symbol)
    tickerInfo = ticker.fast_info
    ts = datetime.datetime.fromtimestamp(tickerInfo.get("last_price_time", datetime.datetime.now().timestamp()), tz=pytz.UTC)
    return { 
        "symbol": symbol,
        "ts": ts.isoformat(),
        "price": float(tickerInfo["last_price"]), 
        "currency": tickerInfo.get("currency","USD")}
    

def get_price(symbol: str):
    if PROVIDER == "yahoo":
        return get_price_yahoo(symbol)
    raise ValueError("Stock provider is not Yahoo/or some other error")

