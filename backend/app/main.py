import os
from dotenv import load_dotenv #imp

load_dotenv() 
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware

from app.config import SessionLocal 
from app.models import Base, User
from .routers.AuthenticationRoutes import router as auth_router
from app.deps import get_db
from app.routers import local_logging_in as local_auth




app = FastAPI()

app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(local_auth.router, prefix="/api/auth", tags=["auth"])


app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "dev-secret"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
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
