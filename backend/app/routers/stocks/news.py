import yfinance
from fastapi import APIRouter, Query
from datetime import datetime, timezone

router = APIRouter()


def _time_ago(ts: int) -> str:
    """Convert a Unix timestamp to a human-readable 'X ago' string."""
    now = datetime.now(timezone.utc).timestamp()
    diff = int(now - ts)
    if diff < 60:
        return "just now"
    if diff < 3600:
        return f"{diff // 60}m ago"
    if diff < 86400:
        return f"{diff // 3600}h ago"
    return f"{diff // 86400}d ago"


@router.get("/news/{symbol}")
def get_news(symbol: str, limit: int = Query(6, ge=1, le=20)):
    """
    Return recent news articles for a symbol via yfinance.
    No API key required — yfinance scrapes Yahoo Finance's news feed.
    """
    sym = symbol.strip().upper()
    try:
        articles = yfinance.Ticker(sym).news or []
        results = []
        for a in articles[:limit]:
            content = a.get("content", {})
            title = content.get("title") or a.get("title", "")
            publisher = (
                content.get("provider", {}).get("displayName")
                or a.get("publisher", "")
            )
            url = (
                content.get("canonicalUrl", {}).get("url")
                or a.get("link", "")
            )
            pub_ts = content.get("pubDate") or a.get("providerPublishTime")
            # pubDate may be an ISO string; providerPublishTime is a Unix int
            if isinstance(pub_ts, str):
                try:
                    pub_ts = int(datetime.fromisoformat(
                        pub_ts.replace("Z", "+00:00")).timestamp())
                except Exception:
                    pub_ts = None
            if not title or not url:
                continue
            results.append({
                "title": title,
                "publisher": publisher,
                "url": url,
                "published_at": pub_ts,
                "time_ago": _time_ago(pub_ts) if pub_ts else "",
            })
        return results
    except Exception as e:
        return []
