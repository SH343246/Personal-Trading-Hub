from sqlalchemy import Column, Integer, String, Numeric, BigInteger, TIMESTAMP, UniqueConstraint, Index, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from app.config import Base


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
