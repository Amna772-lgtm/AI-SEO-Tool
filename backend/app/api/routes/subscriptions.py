"""/subscriptions router — Free enrollment, Stripe Checkout, webhook, GET me.

Implements decisions D-01, D-06, D-07, D-08, D-09, D-10, D-13, D-16, D-17 from
05-CONTEXT.md. Patterns from 05-RESEARCH.md Patterns 3 and 4.
"""
from __future__ import annotations

import os
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies.auth import get_current_user
from app.schemas.subscriptions import (
    CheckoutRequest,
    PlanSelectRequest,
    SubscriptionOut,
)
from app.store.history_store import (
    create_subscription,
    get_subscription_by_user,
    update_subscription,
)

router = APIRouter()
webhook_router = APIRouter()

# Initialize Stripe API key at import time (reads env var)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


@router.post("/select", response_model=SubscriptionOut)
def select_free_plan(
    body: PlanSelectRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SubscriptionOut:
    """D-07: Free plan enrollment — no payment, immediate activation."""
    existing = get_subscription_by_user(current_user["id"])
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_subscribed",
                "message": "User already has a subscription.",
                "current_plan": existing["plan"],
            },
        )
    sub = create_subscription(user_id=current_user["id"], plan="free")
    return SubscriptionOut.from_row(sub)


@router.post("/create-checkout-session")
def create_checkout_session(
    body: CheckoutRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """D-08: Pro/Agency — create Stripe Checkout session and return redirect URL."""
    price_id = (
        os.getenv("STRIPE_PRICE_PRO") if body.plan == "pro"
        else os.getenv("STRIPE_PRICE_AGENCY")
    )
    if not price_id:
        raise HTTPException(
            status_code=500,
            detail={"code": "stripe_not_configured",
                    "message": f"Missing STRIPE_PRICE_{body.plan.upper()}"},
        )
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=current_user["email"],
            client_reference_id=current_user["id"],
            metadata={"plan": body.plan, "user_id": current_user["id"]},
            success_url=f"{FRONTEND_URL}/select-plan?status=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/select-plan?status=cancelled",
        )
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "stripe_error", "message": str(exc)},
        )
    return {"checkout_url": session.url}


@router.get("/me", response_model=SubscriptionOut)
def get_my_subscription(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SubscriptionOut:
    sub = get_subscription_by_user(current_user["id"])
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "no_subscription"},
        )
    return SubscriptionOut.from_row(sub)


# ------------------------------ WEBHOOK ---------------------------------

@webhook_router.post("/stripe", include_in_schema=False)
async def stripe_webhook(request: Request) -> dict[str, str]:
    """D-08: Stripe webhook — ONLY source of truth for activation.

    MUST be async (reads raw body). MUST NOT depend on get_current_user
    (Stripe has no auth cookie — authenticates via HMAC signature).
    Per RESEARCH Pitfall 1 and Pattern 4.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type") if isinstance(event, dict) else event["type"]
    if event_type == "checkout.session.completed":
        obj = event["data"]["object"]
        user_id = obj.get("client_reference_id")
        stripe_sub_id = obj.get("subscription")
        stripe_cust_id = obj.get("customer")
        plan = (obj.get("metadata") or {}).get("plan", "pro")
        period_start = obj.get("current_period_start")
        period_end = obj.get("current_period_end")
        if user_id:
            existing = get_subscription_by_user(user_id)
            if existing:
                update_subscription(
                    user_id,
                    plan=plan,
                    status="active",
                    stripe_subscription_id=stripe_sub_id,
                    stripe_customer_id=stripe_cust_id,
                    current_period_start=str(period_start) if period_start else None,
                    current_period_end=str(period_end) if period_end else None,
                )
            else:
                create_subscription(
                    user_id=user_id,
                    plan=plan,
                    stripe_customer_id=stripe_cust_id,
                    stripe_subscription_id=stripe_sub_id,
                    current_period_start=str(period_start) if period_start else None,
                    current_period_end=str(period_end) if period_end else None,
                )
    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        obj = event["data"]["object"]
        # Look up by stripe_subscription_id — needs to be added if required; for now, no-op
        pass
    # Unknown events: acknowledge with 200 (per Stripe best practice)
    return {"status": "ok"}
