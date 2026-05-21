import os, datetime, pytz
import yfinance


PROVIDER = os.getenv("DATA_PROVIDER", "yahoo")

def get_price_yahoo(symbol: str):
    ticker = yfinance.Ticker(symbol)
    fi = ticker.fast_info

    price = fi.last_price
    if price is None:
        raise ValueError(f"yfinance returned no last_price for {symbol}")

    # fast_info has no price timestamp — use current UTC time
    ts = datetime.datetime.now(tz=pytz.UTC)

    return {
        "symbol": symbol,
        "ts": ts.isoformat(),
        "price": float(price),
        "volume": fi.last_volume,
        "currency": fi.currency or "USD",
    }
    

def get_price(symbol: str):
    if PROVIDER == "yahoo":
        return get_price_yahoo(symbol)
    raise ValueError("Stock provider is not Yahoo/or some other error")

