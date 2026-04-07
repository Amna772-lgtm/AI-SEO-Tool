"""Wave 0 test scaffolding for Phase 05 — Pricing plan selection flow.

Tests that cannot pass yet are marked @pytest.mark.xfail(strict=False) with a
reason noting which plan will make them green. As each plan lands, the xfail
mark is removed and the test becomes a regular assertion (RED->GREEN).
"""
import pytest


# --- SUB-01: Free plan enrollment creates a subscription row -------------
def test_free_plan_creates_subscription(client, signup_user):
    """POST /subscriptions/select {plan:'free'} -> 200, subscription row exists."""
    # Sign in first
    su = signup_user
    client.post("/auth/signin", json={"email": su["email"], "password": su["password"]})
    res = client.post("/subscriptions/select", json={"plan": "free"})
    assert res.status_code == 200
    body = res.json()
    assert body["plan"] == "free"
    assert body["status"] == "active"
    assert body["audit_count"] == 0


# --- SUB-02: Pro plan returns Stripe Checkout URL ------------------------
def test_pro_plan_returns_checkout_url(client, signup_user, monkeypatch):
    """POST /subscriptions/create-checkout-session {plan:'pro'} -> 200 with checkout_url."""
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("STRIPE_PRICE_PRO", "price_test_pro")
    # Mock stripe.checkout.Session.create to avoid real API call
    import stripe
    class FakeSession:
        url = "https://checkout.stripe.com/pay/cs_test_123"
    monkeypatch.setattr(stripe.checkout.Session, "create", lambda **kwargs: FakeSession())
    su = signup_user
    client.post("/auth/signin", json={"email": su["email"], "password": su["password"]})
    res = client.post("/subscriptions/create-checkout-session", json={"plan": "pro"})
    assert res.status_code == 200
    assert res.json()["checkout_url"].startswith("https://checkout.stripe.com/")


# --- SUB-03: Webhook activates subscription on checkout.session.completed -
def test_webhook_activates_subscription(client, signup_user, monkeypatch):
    """POST /webhooks/stripe with checkout.session.completed -> subscription row created."""
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_fake")
    import stripe
    from app.store.history_store import get_subscription_by_user, get_user_by_email
    user = get_user_by_email(signup_user["email"])
    fake_event = {
        "type": "checkout.session.completed",
        "data": {"object": {
            "client_reference_id": user["id"],
            "subscription": "sub_test_abc",
            "customer": "cus_test_xyz",
            "metadata": {"plan": "pro"},
        }},
    }
    monkeypatch.setattr(stripe.Webhook, "construct_event", lambda payload, sig, secret: fake_event)
    res = client.post("/webhooks/stripe", content=b"{}", headers={"stripe-signature": "t=1,v1=fake"})
    assert res.status_code == 200
    sub = get_subscription_by_user(user["id"])
    assert sub is not None
    assert sub["plan"] == "pro"
    assert sub["stripe_subscription_id"] == "sub_test_abc"


# --- SUB-04: Free quota exceeded returns 402 -----------------------------
@pytest.mark.xfail(reason="Enforcement added in plan 05-03", strict=False)
def test_free_quota_exceeded(client, signup_and_subscribe):
    """Free user with audit_count >= 1 -> POST /analyze/ returns 402."""
    from app.store.history_store import increment_audit_count
    u = signup_and_subscribe(plan="free")
    increment_audit_count(u["user_id"])  # simulate 1 audit already used
    res = client.post("/analyze/", json={"url": "https://example.com"})
    assert res.status_code == 402
    assert res.json()["detail"]["code"] == "quota_exceeded"


# --- SUB-05: Pro quota resets at period end ------------------------------
@pytest.mark.xfail(reason="Enforcement added in plan 05-03", strict=False)
def test_pro_quota_reset(signup_and_subscribe):
    """Pro user with current_period_end in the past -> audit_count resets to 0."""
    from datetime import datetime, timedelta, timezone
    from app.store.history_store import update_subscription, maybe_reset_pro_audit_count
    u = signup_and_subscribe(plan="pro")
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    update_subscription(u["user_id"], current_period_end=past, audit_count=10)
    sub = maybe_reset_pro_audit_count(u["user_id"])
    assert sub["audit_count"] == 0


# --- SUB-06: Schedules blocked for Free users ----------------------------
@pytest.mark.xfail(reason="Enforcement added in plan 05-03", strict=False)
def test_schedules_blocked_for_free(client, signup_and_subscribe):
    """Free user POST /schedules -> 403 with upgrade message."""
    signup_and_subscribe(plan="free")
    res = client.post("/schedules", json={
        "url": "https://example.com",
        "frequency": "daily",
        "hour_utc": 9,
    })
    assert res.status_code == 403
    assert "upgrade" in res.json()["detail"]["message"].lower()


# --- SUB-07: Webhook rejects invalid signature ---------------------------
def test_webhook_invalid_signature(client, monkeypatch):
    """POST /webhooks/stripe with bad signature -> 400."""
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_fake")
    import stripe
    def raise_sig(payload, sig, secret):
        raise stripe.error.SignatureVerificationError("bad sig", sig)
    monkeypatch.setattr(stripe.Webhook, "construct_event", raise_sig)
    res = client.post("/webhooks/stripe", content=b"{}", headers={"stripe-signature": "bad"})
    assert res.status_code == 400
