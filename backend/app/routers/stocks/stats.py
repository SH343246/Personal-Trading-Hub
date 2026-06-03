import yfinance
from fastapi import APIRouter

router = APIRouter()


def _fmt_large(n: float | None) -> str | None:
    """Format a large number as $2.8T / $500B / $12M etc."""
    if n is None:
        return None
    if n >= 1e12:
        return f"${n / 1e12:.2f}T"
    if n >= 1e9:
        return f"${n / 1e9:.2f}B"
    if n >= 1e6:
        return f"${n / 1e6:.2f}M"
    return f"${n:,.0f}"


@router.get("/stats/{symbol}")
def get_stats(symbol: str):
    """
    Return key fundamental stats for a symbol using yfinance fast_info.
    fast_info is a lightweight property bag — much faster than ticker.info.
    """
    sym = symbol.strip().upper()
    try:
        fi = yfinance.Ticker(sym).fast_info

        def safe(attr):
            try:
                v = getattr(fi, attr, None)
                return None if v != v else v   # filter NaN
            except Exception:
                return None

        mktcap   = safe("market_cap")
        wk52_hi  = safe("fifty_two_week_high")
        wk52_lo  = safe("fifty_two_week_low")
        prev_cls = safe("previous_close")
        last_vol = safe("last_volume")
        avg_vol  = safe("three_month_average_volume")

        return {
            "symbol": sym,
            "market_cap": _fmt_large(mktcap),
            "fifty_two_week_high": round(wk52_hi, 2) if wk52_hi else None,
            "fifty_two_week_low":  round(wk52_lo, 2) if wk52_lo else None,
            "previous_close":      round(prev_cls, 2) if prev_cls else None,
            "last_volume":         int(last_vol) if last_vol else None,
            "avg_volume_3m":       int(avg_vol)  if avg_vol  else None,
        }
    except Exception as e:
        return {"symbol": sym, "error": str(e)}
