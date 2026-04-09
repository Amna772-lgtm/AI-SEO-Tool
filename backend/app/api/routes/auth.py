"""Auth API Routes — signup, signin, logout, me."""
from __future__ import annotations

import sqlite3
import uuid
from typing import Any

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.dependencies.auth import (
    COOKIE_NAME,
    JWT_EXPIRE_HOURS,
    create_access_token,
    get_current_user,
)
from app.schemas.auth import SigninRequest, SignupRequest, UserOut
from app.store.history_store import create_user, get_user_by_email, get_admin_setting

router = APIRouter()

_COOKIE_MAX_AGE_SECONDS = JWT_EXPIRE_HOURS * 3600  # 86400


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=_COOKIE_MAX_AGE_SECONDS,
        samesite="lax",
        secure=False,  # local dev — flip to True via env-driven config later
        path="/",
    )


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, response: Response) -> dict[str, Any]:
    if get_admin_setting("feature_new_signups") == "false":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="New signups are temporarily paused.",
        )
    if get_user_by_email(body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Sign in instead.",
        )
    password_hash = bcrypt.hashpw(
        body.password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")
    user_id = str(uuid.uuid4())
    try:
        user = create_user(user_id, body.email, body.name, password_hash)
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Sign in instead.",
        )
    token = create_access_token(user_id)
    _set_auth_cookie(response, token)
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


@router.post("/signin", response_model=UserOut)
def signin(body: SigninRequest, response: Response) -> dict[str, Any]:
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please create an account first.",
        )
    if not bcrypt.checkpw(
        body.password.encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please try again.",
        )
    if user.get("is_disabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Contact support.",
        )
    token = create_access_token(user["id"])
    _set_auth_cookie(response, token)
    return {"id": user["id"], "email": user["email"], "name": user["name"], "is_admin": bool(user.get("is_admin"))}


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    response.set_cookie(
        key=COOKIE_NAME,
        value="",
        httponly=True,
        max_age=0,
        samesite="lax",
        secure=False,
        path="/",
    )
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
def me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "is_admin": bool(current_user.get("is_admin", False)),
    }
