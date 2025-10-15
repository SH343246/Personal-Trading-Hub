from sqlalchemy import Column, Integer, String, Numeric, BigInteger, TIMESTAMP, UniqueConstraint, Index, Boolean, Float
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
    ts = column_property(bucket_start)
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
    ts = column_property(bucket_start)
    __table_args__ = (
        UniqueConstraint("symbol", "bucket_start", name="uq_c5m_symbol_bucket"),
        Index("ix_c5m_bucket_start", "bucket_start"),
    )

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