import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from jose import jwt, JWTError
from dotenv import load_dotenv, dotenv_values

DOTENV_PATH = load_dotenv() 
load_dotenv(DOTENV_PATH)
SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET")
if not SECRET_KEY:
    available = ", ".join(dotenv_values(DOTENV_PATH).keys())
    raise RuntimeError(
        f"Can not find secret key. .env checked at: {DOTENV_PATH}\n"
        f".env contains: {available or '[empty]'}"
    )
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def _exp_in(delta: timedelta) -> int:
    """UTC unix timestamp now + delta."""
    return int((datetime.now(timezone.utc) + delta).timestamp())

def create_access_token(data: Dict[str, Any], expires_delta: timedelta = timedelta(minutes=45)) -> str:
    to_encode = {**data, "exp": _exp_in(expires_delta)}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: Dict[str, Any], expires_delta: timedelta = timedelta(days=30)) -> str:
    to_encode = {**data, "exp": _exp_in(expires_delta), "type": "refresh"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise JWTError("Token is invalid/expired.") from e

def decode_refresh_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise JWTError("Bad type.")
        return payload
    except JWTError as e:
        raise JWTError("Refresh token is invalid or expired.") from e
