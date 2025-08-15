from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import timedelta
import os
from pydantic import BaseModel, EmailStr
from app.deps import get_db
from app.models import User
from .jwt_handler import create_access_token, create_refresh_token

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
ACCESS_EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MIN", 60))

class AuthBody(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register(body: AuthBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="email exists")
    hashed = pwd_ctx.hash(body.password)
    user = User(email=body.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}

@router.post("/login")
def login(body: AuthBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not pwd_ctx.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="bad creds")
    access = create_access_token(
        data={"sub": user.email, "id": user.id},
        expires_delta=timedelta(minutes=ACCESS_EXPIRE_MIN),
    )
    refresh = create_refresh_token(data={"sub": user.email, "id": user.id})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}