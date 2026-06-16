import os, logging
from dotenv import load_dotenv #imp

load_dotenv(override=False)  # don't override env vars already set by Railway
logging.getLogger().warning("DATABASE_URL at runtime: %s", os.getenv("DATABASE_URL"))

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from app.routers.stocks.prices import router as prices_router
from app.config import SessionLocal 
from app.models1.models import Base, User
from .routers.AuthenticationRoutes import router as auth_router
from app.deps import get_db
from app.routers import local_logging_in as local_auth
from app.routers.stocks.ticks import router as ticks_router
#from app.routers.stocks.market import router as market_router
from app.routers.stocks.realtimeupdates import router as realtime_router
from app.routers.stocks.candles import router as candles_router
from app.routers.stocks.symbols import router as symbols_router
from app.routers.stocks.news import router as news_router
from app.routers.stocks.stats import router as stats_router
from app.routers.stocks.backtest import router as backtest_router
from app.routers.stocks.paper import router as paper_router


app = FastAPI()

# Middleware must be registered once — SessionMiddleware first, then CORS
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "dev-secret"))
# Allow local dev + production frontend (set FRONTEND_URL in Railway env vars)
_frontend_url    = os.getenv("FRONTEND_URL", "http://localhost:5173")
_allowed_origins = list({_frontend_url, "http://localhost:5173"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(local_auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(prices_router)
app.include_router(ticks_router)
app.include_router(realtime_router)
app.include_router(candles_router, prefix="/api", tags=["candles"])
app.include_router(symbols_router, prefix="/api", tags=["symbols"])
app.include_router(news_router,     prefix="/api", tags=["news"])
app.include_router(stats_router,    prefix="/api", tags=["stats"])
app.include_router(backtest_router, prefix="/api", tags=["backtest"])
app.include_router(paper_router,    prefix="/api", tags=["paper"])


@app.get("/")
def read_root():
    return {"message": "trading hub"}

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=SessionLocal().bind)

@app.get("/health")
def health():
    return {"status": "ok"}
