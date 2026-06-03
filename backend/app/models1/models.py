from sqlalchemy import Column, Integer, String, Numeric, BigInteger, TIMESTAMP, UniqueConstraint, Index, Boolean, Float, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from app.config import Base
from sqlalchemy.orm import column_property  


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Tick(Base):
    __tablename__ = "ticks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    ts = Column(TIMESTAMP(timezone=True), index=True, nullable=False)
    price = Column(Numeric(18, 6), nullable=False)
    volume = Column(BigInteger, nullable=True)

    __table_args__ = (
        UniqueConstraint("symbol", "ts", name="uq_ticks_symbol_ts"),
       # Index("ix_ticks_ts", "ts"),
    )

class Candle1m(Base):
    __tablename__ = "candles_1m"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    bucket_start = Column(TIMESTAMP(timezone=True), index=True, nullable=False)
    open = Column(Numeric(18, 6), nullable=False)
    high = Column(Numeric(18, 6), nullable=False)
    low = Column(Numeric(18, 6), nullable=False)
    close = Column(Numeric(18, 6), nullable=False)
    volume = Column(BigInteger, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("symbol", "bucket_start", name="uq_c1m_symbol_bucket"),
        Index("ix_c1m_bucket_start", "bucket_start"),
    )

class Candle5m(Base):
    __tablename__ = "candles_5m"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    bucket_start = Column(TIMESTAMP(timezone=True), index=True, nullable=False)
    open = Column(Numeric(18, 6), nullable=False)
    high = Column(Numeric(18, 6), nullable=False)
    low = Column(Numeric(18, 6), nullable=False)
    close = Column(Numeric(18, 6), nullable=False)
    volume = Column(BigInteger, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("symbol", "bucket_start", name="uq_c5m_symbol_bucket"),
        Index("ix_c5m_bucket_start", "bucket_start"),
    )

class Candle1h(Base):
    __tablename__ = "candles_1h"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    bucket_start = Column(TIMESTAMP(timezone=True), index=True, nullable=False)
    open = Column(Numeric(18, 6), nullable=False)
    high = Column(Numeric(18, 6), nullable=False)
    low = Column(Numeric(18, 6), nullable=False)
    close = Column(Numeric(18, 6), nullable=False)
    volume = Column(BigInteger, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("symbol", "bucket_start", name="uq_c1h_symbol_bucket"),
        Index("ix_c1h_bucket_start", "bucket_start"),
    )

class Candle1d(Base):
    __tablename__ = "candles_1d"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    bucket_start = Column(TIMESTAMP(timezone=True), index=True, nullable=False)
    open = Column(Numeric(18, 6), nullable=False)
    high = Column(Numeric(18, 6), nullable=False)
    low = Column(Numeric(18, 6), nullable=False)
    close = Column(Numeric(18, 6), nullable=False)
    volume = Column(BigInteger, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("symbol", "bucket_start", name="uq_c1d_symbol_bucket"),
        Index("ix_c1d_bucket_start", "bucket_start"),
    )

class PaperTrade(Base):
    """
    Every paper order ever placed — the single source of truth for the
    paper trading portfolio. Positions and P&L are computed from this table,
    never stored separately.

    Columns:
      symbol     — ticker e.g. "AAPL"
      side       — "buy" or "sell"
      qty        — number of shares (can be fractional)
      price      — execution price (the live price at the moment of the order)
      executed_at — UTC timestamp of the order
      note       — optional free-text label (e.g. "following backtest signal")
    """
    __tablename__ = "paper_trades"

    id          = Column(Integer, primary_key=True, index=True)
    symbol      = Column(String(16), index=True, nullable=False)
    side        = Column(String(4), nullable=False)   # "buy" | "sell"
    qty         = Column(Numeric(18, 6), nullable=False)
    price       = Column(Numeric(18, 6), nullable=False)
    executed_at = Column(TIMESTAMP(timezone=True), index=True, nullable=False)
    note        = Column(Text, nullable=True)


class Candle(Base):
    __tablename__ = "candles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol = Column(String(16), index=True, nullable=False)
    interval = Column(String(8), index=True, nullable=False)
    open_time = Column(BigInteger, index=True, nullable=False)
    close_time = Column(BigInteger, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("symbol", "interval", "open_time", name="uq_candle_symbol_interval_open"),
    )