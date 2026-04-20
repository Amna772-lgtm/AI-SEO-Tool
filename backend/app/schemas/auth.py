"""Auth request/response Pydantic v2 schemas."""
from __future__ import annotations
from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=200)


class SigninRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1, max_length=200)


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    is_admin: bool = False
    plan: str | None = None
    audit_count: int | None = None
    audit_limit: int | None = None


class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=200)
    new_password: str = Field(..., min_length=8, max_length=200)


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ApiKeyOut(BaseModel):
    id: str
    name: str
    created_at: str
    last_used_at: str | None = None


class ApiKeyCreatedOut(ApiKeyOut):
    key: str  # raw key — returned once only at creation
