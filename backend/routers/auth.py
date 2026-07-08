import datetime
import time
import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import jwt, JWTError
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from database import get_db
from models import User
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
ph = PasswordHasher()

# In-memory login rate limiter mapping (username_lower, ip) -> {"count": int, "lockout_until": float}
FAILED_ATTEMPTS = {}


class UserSignup(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6)
    confirm_password: str


class UserLogin(BaseModel):
    username: str
    password: str


def is_rate_limited(username: str, ip: str) -> tuple[bool, int]:
    key = (username.lower().strip(), ip)
    now = time.time()
    if key in FAILED_ATTEMPTS:
        record = FAILED_ATTEMPTS[key]
        if record["lockout_until"] > now:
            return True, int(record["lockout_until"] - now)
    return False, 0


def register_failed_attempt(username: str, ip: str):
    key = (username.lower().strip(), ip)
    now = time.time()
    if key not in FAILED_ATTEMPTS:
        FAILED_ATTEMPTS[key] = {"count": 0, "lockout_until": 0.0}
    FAILED_ATTEMPTS[key]["count"] += 1
    if FAILED_ATTEMPTS[key]["count"] >= 5:
        FAILED_ATTEMPTS[key]["lockout_until"] = now + 300  # 5-minute lockout


def clear_failed_attempts(username: str, ip: str):
    key = (username.lower().strip(), ip)
    if key in FAILED_ATTEMPTS:
        del FAILED_ATTEMPTS[key]


def create_access_token(user_id: str) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    to_encode = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str, token_version: int) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        days=settings.jwt_refresh_token_expire_days
    )
    to_encode = {"sub": user_id, "exp": expire, "version": token_version, "type": "refresh"}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to Authorization Header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid access token token type",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token expired or invalid",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


@router.post("/signup")
def signup(body: UserSignup, db: Session = Depends(get_db)):
    username = body.username.strip()

    if not (3 <= len(username) <= 32):
        raise HTTPException(status_code=400, detail="Username must be between 3 and 32 characters.")

    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, and underscores.")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    existing = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username is already taken.")

    user_id = str(uuid.uuid4())
    password_hash = ph.hash(body.password)
    new_user = User(
        id=user_id,
        username=username,
        password_hash=password_hash,
        token_version=0
    )
    db.add(new_user)
    db.commit()
    return {"message": "User signed up successfully. Please log in."}


@router.post("/login")
def login(request: Request, response: Response, body: UserLogin, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    username = body.username.strip()

    limited, wait_sec = is_rate_limited(username, ip)
    if limited:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Please try again in {wait_sec} seconds."
        )

    user = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if not user:
        register_failed_attempt(username, ip)
        raise HTTPException(status_code=400, detail="Invalid username or password.")

    try:
        ph.verify(user.password_hash, body.password)
    except (VerifyMismatchError, Exception):
        register_failed_attempt(username, ip)
        raise HTTPException(status_code=400, detail="Invalid username or password.")

    clear_failed_attempts(username, ip)

    user.last_login = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id, user.token_version)

    is_secure = "localhost" not in request.url.hostname and "127.0.0.1" not in request.url.hostname

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
        max_age=settings.jwt_access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 3600,
    )

    return {"user": {"id": user.id, "username": user.username}}


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        payload = jwt.decode(refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        token_version = payload.get("version")
        token_type = payload.get("type")
        if not user_id or token_version is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if token_version != user.token_version:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")

    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id, user.token_version)
    is_secure = "localhost" not in request.url.hostname and "127.0.0.1" not in request.url.hostname

    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
        max_age=settings.jwt_access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 3600,
    )

    return {"message": "Token refreshed successfully"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    # Try to increment user's token_version to globally log out from all devices
    access_token = request.cookies.get("access_token")
    if access_token:
        try:
            payload = jwt.decode(access_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.token_version += 1
                    db.commit()
        except Exception:
            pass

    is_secure = "localhost" not in request.url.hostname and "127.0.0.1" not in request.url.hostname
    response.delete_cookie(key="access_token", path="/", httponly=True, secure=is_secure, samesite="lax")
    response.delete_cookie(key="refresh_token", path="/", httponly=True, secure=is_secure, samesite="lax")
    return {"message": "Logged out successfully"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username}
