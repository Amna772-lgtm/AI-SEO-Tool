"""Pydantic request/response models for the /subscriptions router.

Separation rationale: PlanSelectRequest is Free-only (D-07 — Free plan takes
a different code path with no Stripe). CheckoutRequest is Pro/Agency only
(D-08 — paid plans always redirect to Stripe Checkout).
"""
from __future__ import annotations

from typing import Literal, Any
from pydantic import BaseModel, Field


class PlanSelectRequest(BaseModel):
    """POST /subscriptions/select — Free plan enrollment only (D-07)."""
    plan: Literal["free"] = Field(..., description="Only 'free' is accepted here")


class CheckoutRequest(BaseModel):
    """POST /subscriptions/create-checkout-session — Pro/Agency only (D-08)."""
    plan: Literal["pro", "agency"] = Field(..., description="Paid plan tier")


class SubscriptionOut(BaseModel):
    """Response shape returned by GET /subscriptions/me and after enrollment."""
    id: str
    plan: Literal["free", "pro", "agency"]
    status: Literal["active", "canceled", "past_due"]
    audit_count: int
    current_period_end: str | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "SubscriptionOut":
        return cls(
            id=row["id"],
            plan=row["plan"],
            status=row["status"],
            audit_count=row["audit_count"],
            current_period_end=row.get("current_period_end"),
        )
