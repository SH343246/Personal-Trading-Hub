from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from .config import SessionLocal
from .models import Base, User

from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"message":"trading hub"}

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