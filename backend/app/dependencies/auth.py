"""get_current_user FastAPI dependency — Bearer API key first, JWT cookie fallback."""
from __future__ import annotations
import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.store.history_store import get_user_by_id, get_user_by_api_key_hash, update_api_key_last_used

_bearer = HTTPBearer(auto_error=False)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
COOKIE_NAME = "access_token"


def create_access_token(user_id: str) -> str:
    """Encode a JWT with sub=user_id and exp=now+24h."""
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    access_token: str | None = Cookie(default=None),
) -> dict[str, Any]:
    """Bearer API key checked first; falls back to JWT cookie."""
    if credentials is not None:
        raw_key = credentials.credentials
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        user = get_user_by_api_key_hash(key_hash)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        if user.get("is_disabled"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
        update_api_key_last_used(key_hash)
        return user

    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_admin_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Require admin role. Raises 403 if authenticated user is not an admin."""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def get_current_subscription(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the subscription row for the current user.
    Raises 402 if no subscription exists (D-13 edge case redirect target)."""
    from app.store.history_store import get_subscription_by_user
    sub = get_subscription_by_user(current_user["id"])
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "no_subscription", "message": "Plan selection required."},
        )
    return sub
