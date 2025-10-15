import os, logging
from dotenv import load_dotenv #imp

load_dotenv(override=True) 
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
from backend.app.routers.stocks.candles import router as candles_router




app = FastAPI()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(local_auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(prices_router)
app.include_router(ticks_router)
app.include_router(realtime_router)
#app.include_router(market_router)
app.include_router(candles_router, prefix="/api", tags=["candles"])


app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "dev-secret"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "trading hub"}

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=SessionLocal().bind)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health(db: Session = Depends(get_db)):
    return {"users_count": db.query(User).count()}
