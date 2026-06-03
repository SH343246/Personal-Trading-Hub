"""
paper.py  (router)
------------------
Three endpoints:

  POST /api/paper/order      — place a buy or sell
  GET  /api/paper/trades     — full order history
  GET  /api/paper/portfolio  — current positions + cash + P&L
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from collections import defaultdict

from app.deps import get_db
from app.models1.models import PaperTrade
from app.schemas.paper import OrderRequest, TradeOut, PositionOut, PortfolioOut, EquityPointOut
from app.routers.stocks.market import get_price   # reuse existing live price lookup

router = APIRouter()

STARTING_CASH = 100_000.0   # every paper account starts with $100k


# ---------------------------------------------------------------------------
# Helper — compute portfolio state from raw trade rows
# ---------------------------------------------------------------------------

def _compute_portfolio(trades: list[PaperTrade]) -> dict:
    """
    Replay all trades to compute current positions and cash.

    Returns a dict with:
      cash       — cash remaining
      positions  — { symbol: { qty, cost_basis } }
                   cost_basis = total dollars spent on current holdings
                   (resets after a full sell)
    """
    cash = STARTING_CASH
    # Track qty and total cost for each symbol separately
    qty_held:   dict[str, float] = defaultdict(float)
    cost_basis: dict[str, float] = defaultdict(float)   # total $ spent on current shares

    for trade in trades:
        sym   = trade.symbol
        price = float(trade.price)
        qty   = float(trade.qty)

        if trade.side == "buy":
            cost_basis[sym] += price * qty   # add to what we paid
            qty_held[sym]   += qty
            cash            -= price * qty

        elif trade.side == "sell":
            # Reduce cost basis proportionally to shares sold
            if qty_held[sym] > 0:
                proportion   = qty / qty_held[sym]
                cost_basis[sym] -= cost_basis[sym] * proportion
            qty_held[sym] -= qty
            cash          += price * qty

            # Clean up if fully exited
            if qty_held[sym] <= 0:
                qty_held[sym]   = 0
                cost_basis[sym] = 0

    # Only return symbols we still hold
    positions = {
        sym: { "qty": qty_held[sym], "cost_basis": cost_basis[sym] }
        for sym in qty_held
        if qty_held[sym] > 0.0001   # ignore dust
    }

    return { "cash": cash, "positions": positions }


# ---------------------------------------------------------------------------
# POST /api/paper/order
# ---------------------------------------------------------------------------

@router.post("/paper/order", response_model=TradeOut)
def place_order(req: OrderRequest, db: Session = Depends(get_db)):
    """
    Place a paper buy or sell order.

    Validates:
      - side must be "buy" or "sell"
      - selling more shares than you hold is not allowed
      - buying more than your cash balance is not allowed

    Executes at the current live price from Yahoo Finance.
    """

    side   = req.side.lower()
    symbol = req.symbol.upper()

    if side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be 'buy' or 'sell'")

    # Get current live price
    try:
        price_data = get_price(symbol)
        price      = float(price_data["price"])
    except Exception:
        raise HTTPException(status_code=404, detail=f"Could not fetch price for {symbol}")

    # Load existing trades to check balance/position
    existing = db.query(PaperTrade).filter(PaperTrade.symbol == symbol).all()
    all_trades = db.query(PaperTrade).all()
    state = _compute_portfolio(all_trades)

    if side == "buy":
        cost = price * req.qty
        if cost > state["cash"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient cash. You have ${state['cash']:,.2f} but this order costs ${cost:,.2f}"
            )

    elif side == "sell":
        held = state["positions"].get(symbol, {}).get("qty", 0)
        if req.qty > held:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell {req.qty} shares — you only hold {held:.4f} shares of {symbol}"
            )

    # Record the trade
    trade = PaperTrade(
        symbol      = symbol,
        side        = side,
        qty         = req.qty,
        price       = price,
        executed_at = datetime.now(timezone.utc),
        note        = req.note,
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)

    return trade


# ---------------------------------------------------------------------------
# DELETE /api/paper/reset
# ---------------------------------------------------------------------------

@router.delete("/paper/reset", status_code=204)
def reset_portfolio(db: Session = Depends(get_db)):
    """
    Wipe all paper trades and reset the portfolio back to $100k.
    This is irreversible — all trade history is deleted.
    """
    db.query(PaperTrade).delete()
    db.commit()


# ---------------------------------------------------------------------------
# GET /api/paper/equity
# ---------------------------------------------------------------------------

@router.get("/paper/equity", response_model=list[EquityPointOut])
def get_equity(db: Session = Depends(get_db)):
    """
    Return portfolio value over time — one point per trade.

    Each point uses the trade's own execution price as the "current price"
    for that symbol, giving an accurate snapshot of value at the moment
    each order was placed.
    """
    trades = db.query(PaperTrade).order_by(PaperTrade.executed_at.asc()).all()

    cash:       float              = STARTING_CASH
    qty_held:   dict[str, float]   = defaultdict(float)
    last_price: dict[str, float]   = {}

    # Start with an anchor point so the chart begins at $100k
    points: list[EquityPointOut] = []
    if trades:
        points.append(EquityPointOut(ts=trades[0].executed_at.isoformat(), value=round(STARTING_CASH, 2)))

    for trade in trades:
        sym   = trade.symbol
        price = float(trade.price)
        qty   = float(trade.qty)
        last_price[sym] = price

        if trade.side == "buy":
            qty_held[sym] += qty
            cash           -= price * qty
        elif trade.side == "sell":
            qty_held[sym] -= qty
            cash           += price * qty
            if qty_held[sym] <= 0:
                qty_held[sym] = 0

        market_value = sum(
            qty_held[s] * last_price[s]
            for s in qty_held
            if qty_held[s] > 0.0001
        )
        points.append(EquityPointOut(
            ts=trade.executed_at.isoformat(),
            value=round(cash + market_value, 2),
        ))

    return points


# ---------------------------------------------------------------------------
# GET /api/paper/trades
# ---------------------------------------------------------------------------

@router.get("/paper/trades", response_model=list[TradeOut])
def get_trades(db: Session = Depends(get_db)):
    """Return all paper trades, newest first."""
    return (
        db.query(PaperTrade)
          .order_by(PaperTrade.executed_at.desc())
          .all()
    )


# ---------------------------------------------------------------------------
# GET /api/paper/portfolio
# ---------------------------------------------------------------------------

@router.get("/paper/portfolio", response_model=PortfolioOut)
def get_portfolio(db: Session = Depends(get_db)):
    """
    Compute and return the current portfolio state.

    For each position, fetch the live price and calculate unrealized P&L.
    """
    trades = db.query(PaperTrade).order_by(PaperTrade.executed_at.asc()).all()
    state  = _compute_portfolio(trades)

    positions: list[PositionOut] = []
    total_market_value = 0.0
    total_pnl          = 0.0

    for symbol, pos in state["positions"].items():
        qty        = pos["qty"]
        cost_basis = pos["cost_basis"]
        avg_cost   = cost_basis / qty if qty > 0 else 0

        # Fetch live price
        try:
            price_data     = get_price(symbol)
            current_price  = float(price_data["price"])
        except Exception:
            current_price  = avg_cost   # fall back to cost if price unavailable

        market_value   = qty * current_price
        unrealized_pnl = market_value - cost_basis
        pnl_pct        = (unrealized_pnl / cost_basis * 100) if cost_basis > 0 else 0

        total_market_value += market_value
        total_pnl          += unrealized_pnl

        positions.append(PositionOut(
            symbol         = symbol,
            qty            = round(qty, 6),
            avg_cost       = round(avg_cost, 4),
            current_price  = round(current_price, 4),
            market_value   = round(market_value, 2),
            unrealized_pnl = round(unrealized_pnl, 2),
            pnl_pct        = round(pnl_pct, 4),
        ))

    return PortfolioOut(
        cash          = round(state["cash"], 2),
        total_value   = round(state["cash"] + total_market_value, 2),
        total_pnl     = round(total_pnl, 2),
        positions     = positions,
        starting_cash = STARTING_CASH,
    )
