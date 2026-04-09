"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { selectFreePlan, createCheckoutSession, fetchSubscription } from "../lib/api";

const planStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  body {
    font-family: 'Inter', sans-serif !important;
    margin: 0; padding: 0; overflow: hidden;
  }

  .plan-wrap {
    height: 100vh;
    overflow: hidden;
    background: #f0f9f8;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    position: relative;
  }
  .plan-wrap::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse at 15% 15%, rgba(13,148,136,.10) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 80%, rgba(22,163,74,.07) 0%, transparent 50%);
  }

  /* ── HEADER ── */
  .plan-header {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    text-align: center; margin-bottom: 20px;
  }
  .plan-logo {
    display: flex; align-items: center; gap: 9px;
    text-decoration: none; margin-bottom: 14px;
  }
  .plan-logo-icon {
    width: 34px; height: 34px; border-radius: 9px;
    background: linear-gradient(135deg, #0d9488, #16a34a);
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; box-shadow: 0 4px 14px rgba(13,148,136,.4);
    flex-shrink: 0;
  }
  .plan-logo span { font-weight: 800; font-size: 1rem; color: #0f172a; letter-spacing: -.3px; }

  .plan-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(13,148,136,.1); border: 1px solid rgba(13,148,136,.22);
    color: #0d9488; font-size: .68rem; font-weight: 700; letter-spacing: .5px;
    text-transform: uppercase; padding: 4px 12px; border-radius: 50px;
    margin-bottom: 12px;
  }
  .plan-badge-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #0d9488; animation: pp 2s infinite;
  }
  @keyframes pp { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }

  .plan-title {
    font-size: clamp(1.55rem, 2.8vw, 2rem);
    font-weight: 900; line-height: 1.15; letter-spacing: -0.8px;
    color: #0f172a; margin: 0 0 8px;
  }
  .plan-title .hl {
    background: linear-gradient(135deg, #0d9488, #16a34a);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .plan-sub { font-size: .82rem; color: #64748b; line-height: 1.55; max-width: 440px; margin: 0; }

  /* ── GRID ── */
  .plan-grid {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 14px; width: 100%; max-width: 900px;
  }

  .plan-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px; padding: 22px 20px;
    display: flex; flex-direction: column;
    box-shadow: 0 2px 8px rgba(0,0,0,.05);
    transition: transform .2s, box-shadow .2s, border-color .2s;
  }
  .plan-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(0,0,0,.09);
    border-color: #cbd5e1;
  }
  .plan-card.featured {
    background: #ffffff;
    border: 1.5px solid #0d9488;
    box-shadow: 0 0 0 3px rgba(13,148,136,.08), 0 12px 28px rgba(13,148,136,.12);
    position: relative;
  }
  .plan-card.featured:hover {
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13,148,136,.12), 0 18px 36px rgba(13,148,136,.16);
  }

  .popular-badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #0d9488, #16a34a);
    color: #fff; font-size: .66rem; font-weight: 800; letter-spacing: .5px;
    text-transform: uppercase; padding: 3px 14px; border-radius: 50px;
    white-space: nowrap; box-shadow: 0 3px 10px rgba(13,148,136,.4);
  }

  .card-tier {
    font-size: .68rem; font-weight: 700; letter-spacing: .8px;
    text-transform: uppercase; margin-bottom: 8px; color: #94a3b8;
  }
  .featured .card-tier { color: #0d9488; }

  .card-price {
    display: flex; align-items: baseline; gap: 3px; margin-bottom: 6px;
  }
  .card-price-num { font-size: 2.2rem; font-weight: 900; letter-spacing: -1px; color: #0f172a; }
  .card-price-per { font-size: .78rem; color: #94a3b8; font-weight: 500; }

  .card-desc {
    font-size: .78rem; color: #64748b; line-height: 1.5;
    margin-bottom: 14px; min-height: 36px;
  }

  .card-divider { height: 1px; background: #f1f5f9; margin-bottom: 14px; }
  .featured .card-divider { background: rgba(13,148,136,.12); }

  /* ── FEATURES ── */
  .card-features {
    list-style: none; padding: 0; margin: 0 0 18px;
    display: flex; flex-direction: column; gap: 8px;
    flex: 1;
  }
  .card-feature { display: flex; align-items: center; gap: 8px; font-size: .79rem; }
  .card-feature.available { color: #334155; }
  .card-feature.unavailable { color: #94a3b8; }

  .feat-icon {
    width: 16px; height: 16px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .feat-icon.check {
    background: #e6faf8; border: 1px solid #99e6de;
  }
  .feat-icon.cross {
    background: #f1f5f9; border: 1px solid #e2e8f0;
  }
  .featured .feat-icon.check {
    background: #ccfbf1; border-color: #5eead4;
  }

  /* ── BUTTONS ── */
  .card-btn {
    width: 100%; padding: 11px 16px;
    border-radius: 50px; font-size: .85rem; font-weight: 700;
    font-family: 'Inter', sans-serif; cursor: pointer;
    transition: transform .15s, box-shadow .15s, background .15s;
    border: none; outline: none; letter-spacing: .1px;
  }
  .card-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }
  .card-btn:focus-visible { outline: 2px solid #14b8a6; outline-offset: 3px; }

  .card-btn-ghost {
    background: #f8fafc;
    border: 1.5px solid #e2e8f0 !important;
    color: #334155;
  }
  .card-btn-ghost:hover:not(:disabled) { background: #f1f5f9; transform: translateY(-1px); }

  .card-btn-primary {
    background: linear-gradient(135deg, #0d9488, #16a34a);
    color: #fff; box-shadow: 0 4px 18px rgba(13,148,136,.38);
  }
  .card-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px); box-shadow: 0 7px 24px rgba(13,148,136,.48);
  }
  .card-btn-primary:active:not(:disabled) { transform: translateY(0); }

  /* ── GUARANTEE ── */
  .plan-guarantee {
    position: relative; z-index: 1;
    margin-top: 14px;
    display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap;
  }
  .guarantee-item { display: flex; align-items: center; gap: 6px; font-size: .73rem; color: #94a3b8; }
  .guarantee-dot { width: 4px; height: 4px; border-radius: 50%; background: #0d9488; flex-shrink: 0; }

  /* ── ERROR ── */
  .plan-error {
    position: relative; z-index: 1; margin-top: 14px;
    background: rgba(220,38,38,.13); border: 1px solid rgba(248,113,113,.28);
    border-radius: 9px; padding: 10px 16px; font-size: .8rem; color: #fca5a5;
    display: flex; align-items: center; gap: 8px; max-width: 440px; text-align: center;
  }

  /* ── LOADING ── */
  .plan-loading {
    height: 100vh; overflow: hidden;
    background: #f0f9f8;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 10px; font-family: 'Inter', sans-serif;
  }
  .plan-spinner {
    width: 32px; height: 32px; border-radius: 50%;
    border: 3px solid rgba(13,148,136,.18); border-top-color: #0d9488;
    animation: spin .8s linear infinite; margin-bottom: 4px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .plan-loading-title { font-size: .9rem; font-weight: 600; color: #0f172a; margin: 0; }
  .plan-loading-sub { font-size: .78rem; color: #64748b; margin: 0; }

  /* ── FOOTER ── */
  .plan-footer {
    position: relative; z-index: 1; margin-top: 12px;
    font-size: .72rem; color: #94a3b8; text-align: center;
  }
  .plan-footer a { color: #0d9488; text-decoration: none; }
  .plan-footer a:hover { text-decoration: underline; }

  @media (max-width: 820px) {
    body { overflow: auto; }
    .plan-wrap { height: auto; min-height: 100vh; overflow: visible; padding: 36px 16px 48px; }
    .plan-grid { grid-template-columns: 1fr; max-width: 380px; }
  }
`;

type Feature = { label: string; available: boolean };

const FREE_FEATURES: Feature[] = [
  { label: "1 audit (lifetime)",         available: true  },
  { label: "Top-level GEO score",        available: true  },
  { label: "Technical health summary",   available: true  },
  { label: "Scheduled re-audits",        available: false },
  { label: "Per-page GEO breakdown",     available: false },
];

const PRO_FEATURES: Feature[] = [
  { label: "10 audits per month",        available: true },
  { label: "Full per-page GEO scores",   available: true },
  { label: "Actionable AI suggestions",  available: true },
  { label: "Scheduled re-audits",        available: true },
  { label: "Standard-branded reports",   available: true },
];

const AGENCY_FEATURES: Feature[] = [
  { label: "Unlimited audits",           available: true },
  { label: "Full per-page GEO scores",   available: true },
  { label: "Actionable AI suggestions",  available: true },
  { label: "Scheduled re-audits",        available: true },
  { label: "White-label PDF reports",    available: true },
];

function CheckIcon({ accent }: { accent: boolean }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M1.5 4L3 5.5L6.5 2" stroke={accent ? "#0d9488" : "#0d9488"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
      <path d="M1.5 1.5L5.5 5.5M5.5 1.5L1.5 5.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FeatureItem({ feature, accent }: { feature: Feature; accent: boolean }) {
  return (
    <li className={`card-feature ${feature.available ? "available" : "unavailable"}`}>
      <div className={`feat-icon ${feature.available ? "check" : "cross"}`}>
        {feature.available ? <CheckIcon accent={accent} /> : <CrossIcon />}
      </div>
      {feature.label}
    </li>
  );
}

export default function SelectPlanPage() {
  const [loading, setLoading] = useState<null | "free" | "pro" | "agency">(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");

    if (status === "success") {
      setIsSuccess(true);
      setChecking(true);
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const sub = await fetchSubscription().catch(() => null);
        if (sub && sub.status === "active" && sub.plan !== "free") {
          window.location.href = "/dashboard";
          return;
        }
        if (attempts < 5) {
          setTimeout(poll, 1000);
        } else {
          setError("Payment confirmed but subscription not yet active. Please refresh in a moment.");
          setChecking(false);
        }
      };
      poll();
      return;
    }

    fetchSubscription()
      .then((sub) => {
        if (sub && sub.status === "active") {
          window.location.href = "/dashboard";
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  const handleFree = async () => {
    setLoading("free");
    setError(null);
    try {
      await selectFreePlan();
      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const handlePaid = async (plan: "pro" | "agency") => {
    setLoading(plan);
    setError(null);
    try {
      const url = await createCheckoutSession(plan);
      window.location.href = url;
    } catch {
      setError("Could not start checkout. Please try again or contact support.");
      setLoading(null);
    }
  };

  if (checking) {
    return (
      <>
        <style>{planStyles}</style>
        <div className="plan-loading">
          <div className="plan-spinner" />
          {isSuccess ? (
            <>
              <p className="plan-loading-title">Payment confirmed</p>
              <p className="plan-loading-sub">Setting up your account — redirecting shortly…</p>
            </>
          ) : (
            <p className="plan-loading-sub">Loading…</p>
          )}
        </div>
      </>
    );
  }

  const isLoading = loading !== null;

  return (
    <>
      <style>{planStyles}</style>
      <div className="plan-wrap">

        <header className="plan-header">
          <Link href="/" className="plan-logo">
            <div className="plan-logo-icon">&#129302;</div>
            <span>AI SEO Tool</span>
          </Link>
          <div className="plan-badge">
            <div className="plan-badge-dot" />
            Choose your plan
          </div>
          <h1 className="plan-title">
            Unlock your site&apos;s <span className="hl">AI citation potential</span>
          </h1>
          <p className="plan-sub">
            Start free, scale when you&apos;re ready — all plans include GEO analysis
            across ChatGPT, Claude, Perplexity, Gemini &amp; Grok.
          </p>
        </header>

        <div className={`plan-grid${isLoading ? " pointer-events-none" : ""}`}>

          {/* Free */}
          <div className="plan-card">
            <p className="card-tier">Free</p>
            <div className="card-price">
              <span className="card-price-num">$0</span>
              <span className="card-price-per">/month</span>
            </div>
            <p className="card-desc">Get your first audit and see your top-level GEO score.</p>
            <div className="card-divider" />
            <ul className="card-features">
              {FREE_FEATURES.map((f) => <FeatureItem key={f.label} feature={f} accent={false} />)}
            </ul>
            <button onClick={handleFree} disabled={isLoading} className="card-btn card-btn-ghost">
              {loading === "free" ? "Setting up…" : "Get Started Free"}
            </button>
          </div>

          {/* Pro */}
          <div className="plan-card featured">
            <div className="popular-badge">&#11088; Most Popular</div>
            <p className="card-tier">Pro</p>
            <div className="card-price">
              <span className="card-price-num">$29</span>
              <span className="card-price-per">/month</span>
            </div>
            <p className="card-desc">Full audit reports with actionable AI-powered recommendations.</p>
            <div className="card-divider" />
            <ul className="card-features">
              {PRO_FEATURES.map((f) => <FeatureItem key={f.label} feature={f} accent={true} />)}
            </ul>
            <button onClick={() => handlePaid("pro")} disabled={isLoading} className="card-btn card-btn-primary">
              {loading === "pro" ? "Redirecting to checkout…" : "Start Pro →"}
            </button>
          </div>

          {/* Agency */}
          <div className="plan-card">
            <p className="card-tier">Agency</p>
            <div className="card-price">
              <span className="card-price-num">$99</span>
              <span className="card-price-per">/month</span>
            </div>
            <p className="card-desc">Unlimited audits and white-label reports for client work.</p>
            <div className="card-divider" />
            <ul className="card-features">
              {AGENCY_FEATURES.map((f) => <FeatureItem key={f.label} feature={f} accent={false} />)}
            </ul>
            <button onClick={() => handlePaid("agency")} disabled={isLoading} className="card-btn card-btn-ghost">
              {loading === "agency" ? "Redirecting to checkout…" : "Start Agency →"}
            </button>
          </div>

        </div>

        <div className="plan-guarantee">
          <div className="guarantee-item"><div className="guarantee-dot" />Cancel anytime</div>
          <div className="guarantee-item"><div className="guarantee-dot" />No hidden fees</div>
          <div className="guarantee-item"><div className="guarantee-dot" />Upgrade instantly</div>
        </div>

        {error && (
          <div role="alert" className="plan-error">
            <span>&#9888;&#65039;</span>
            <span>{error}</span>
          </div>
        )}

        <footer className="plan-footer">
          &copy; 2026 AI SEO Tool &middot; <a href="#">Privacy</a> &middot; <a href="#">Terms</a>
        </footer>

      </div>
    </>
  );
}
