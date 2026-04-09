"""Admin API routes — protected by get_admin_user dependency.

All routes here require an authenticated user with is_admin=1.
Plans 02-06 will add the full CRUD endpoints; this file provides the
/admin/ping health check used by tests in plan 01.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_admin_user

router = APIRouter()


@router.get("/ping")
def admin_ping(admin: dict[str, Any] = Depends(get_admin_user)) -> dict[str, str]:
    """Health check for the admin dependency. Returns 200 for admin users, 403 otherwise."""
    return {"status": "ok", "admin": admin["email"]}
