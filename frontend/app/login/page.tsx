"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "../lib/api";

const authStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  :root {
    --auth-teal:       #0d9488;
    --auth-teal-light: #14b8a6;
    --auth-teal-pale:  #ccfbf1;
    --auth-green:      #16a34a;
    --auth-dark:       #0f172a;
    --auth-dark-2:     #1e293b;
    --auth-mid:        #475569;
    --auth-soft:       #94a3b8;
    --auth-bg:         #f8fafc;
    --auth-border:     #e2e8f0;
    --auth-radius:     14px;
    --auth-shadow-sm:  0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
    --auth-shadow-md:  0 4px 16px rgba(0,0,0,.08);
    --auth-shadow-lg:  0 20px 60px rgba(0,0,0,.12);
  }

  body {
    font-family: 'Inter', sans-serif !important;
    background: var(--auth-bg) !important;
    color: var(--auth-dark) !important;
    margin: 0; padding: 0; overflow-x: hidden;
  }

  .auth-wrap {
    height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: stretch;
  }

  /* ── LEFT PANEL ── */
  .auth-left {
    flex: 0 0 42%;
    background: linear-gradient(160deg, #0f2027, #1e3a3a, #0f2027);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px 56px;
    position: relative;
    overflow: hidden;
  }
  .auth-left::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 30% 20%, rgba(13,148,136,.25) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 80%, rgba(22,163,74,.2) 0%, transparent 60%);
    pointer-events: none;
  }
  .auth-left-logo {
    display: flex; align-items: center; gap: 12px;
    position: relative; z-index: 1;
    text-decoration: none;
  }
  .auth-left-logo-icon {
    width: 42px; height: 42px; border-radius: 11px;
    background: linear-gradient(135deg, var(--auth-teal), var(--auth-green));
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; box-shadow: 0 4px 16px rgba(13,148,136,.4);
    flex-shrink: 0;
  }
  .auth-left-logo span {
    font-weight: 800; font-size: 1.1rem; color: #fff; letter-spacing: -.3px;
  }

  .auth-left-content {
    flex: 1; display: flex; flex-direction: column; justify-content: center;
    position: relative; z-index: 1; padding: 48px 0;
  }
  .auth-left-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(13,148,136,.2); border: 1px solid rgba(94,234,212,.25);
    color: #5eead4; font-size: .75rem; font-weight: 700; letter-spacing: .5px;
    text-transform: uppercase; padding: 5px 14px; border-radius: 50px;
    margin-bottom: 22px; width: fit-content;
  }
  .auth-left-badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--auth-teal-light);
    animation: auth-pulse 2s infinite;
  }
  @keyframes auth-pulse {
    0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)}
  }
  .auth-left-title {
    font-size: clamp(1.7rem, 2.5vw, 2.4rem);
    font-weight: 900; line-height: 1.15; letter-spacing: -1px;
    color: #fff; margin-bottom: 16px;
  }
  .auth-left-title .hl {
    background: linear-gradient(135deg, var(--auth-teal-light), #86efac);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .auth-left-sub {
    font-size: .93rem; color: #94a3b8; line-height: 1.7; margin-bottom: 36px;
  }
  .auth-left-features {
    display: flex; flex-direction: column; gap: 14px;
  }
  .auth-left-feat {
    display: flex; align-items: flex-start; gap: 12px;
  }
  .auth-feat-icon {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    background: rgba(13,148,136,.2); border: 1px solid rgba(94,234,212,.2);
    display: flex; align-items: center; justify-content: center; font-size: 15px;
  }
  .auth-feat-text { display: flex; flex-direction: column; gap: 1px; }
  .auth-feat-title { font-size: .85rem; font-weight: 700; color: #e2e8f0; }
  .auth-feat-desc { font-size: .78rem; color: #64748b; }

  .auth-left-footer {
    position: relative; z-index: 1;
    font-size: .77rem; color: #475569;
  }
  .auth-left-footer a { color: #5eead4; text-decoration: none; }
  .auth-left-footer a:hover { text-decoration: underline; }

  /* ── RIGHT PANEL ── */
  .auth-right {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 48px 40px;
    background: var(--auth-bg);
    overflow-y: auto;
  }
  .auth-form-card {
    width: 100%; max-width: 420px;
  }
  .auth-form-header { margin-bottom: 32px; }
  .auth-back-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: .8rem; color: var(--auth-soft); text-decoration: none;
    margin-bottom: 28px; transition: color .15s;
  }
  .auth-back-link:hover { color: var(--auth-teal); }
  .auth-form-title {
    font-size: 1.7rem; font-weight: 800; letter-spacing: -.5px;
    color: var(--auth-dark); margin-bottom: 8px;
  }
  .auth-form-sub {
    font-size: .88rem; color: var(--auth-mid); line-height: 1.6;
  }
  .auth-form-sub a { color: var(--auth-teal); text-decoration: none; font-weight: 600; }
  .auth-form-sub a:hover { text-decoration: underline; }

  /* ── FORM FIELDS ── */
  .auth-field { margin-bottom: 18px; }
  .auth-label {
    display: block; font-size: .8rem; font-weight: 600;
    color: var(--auth-dark); margin-bottom: 7px; letter-spacing: .1px;
  }
  .auth-input {
    width: 100%; box-sizing: border-box;
    padding: 11px 14px; border-radius: 10px;
    border: 1.5px solid var(--auth-border);
    background: #fff; color: var(--auth-dark);
    font-size: .9rem; font-family: 'Inter', sans-serif;
    transition: border-color .15s, box-shadow .15s;
    outline: none;
  }
  .auth-input:focus {
    border-color: var(--auth-teal);
    box-shadow: 0 0 0 3px rgba(13,148,136,.1);
  }
  .auth-input:disabled { opacity: .6; cursor: not-allowed; }

  .auth-error {
    background: #fef2f2; border: 1px solid #fecaca;
    border-radius: 8px; padding: 10px 14px;
    font-size: .83rem; color: #dc2626; margin-bottom: 16px;
    display: flex; align-items: flex-start; gap: 8px;
  }
  .auth-error-icon { flex-shrink: 0; margin-top: 1px; }

  /* ── SUBMIT BUTTON ── */
  .auth-btn {
    width: 100%; padding: 13px;
    background: linear-gradient(135deg, var(--auth-teal), var(--auth-green));
    color: #fff; border: none; border-radius: 50px;
    font-size: .93rem; font-weight: 700; font-family: 'Inter', sans-serif;
    cursor: pointer; letter-spacing: .1px;
    box-shadow: 0 4px 20px rgba(13,148,136,.35);
    transition: transform .15s, box-shadow .15s, opacity .15s;
  }
  .auth-btn:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 6px 28px rgba(13,148,136,.45);
  }
  .auth-btn:active:not(:disabled) { transform: translateY(0); }
  .auth-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }

  .auth-divider {
    display: flex; align-items: center; gap: 14px;
    margin: 22px 0; color: var(--auth-soft); font-size: .8rem;
  }
  .auth-divider::before, .auth-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--auth-border);
  }

  .auth-footer-text {
    text-align: center; font-size: .83rem; color: var(--auth-mid); margin-top: 22px;
  }
  .auth-footer-text a { color: var(--auth-teal); font-weight: 600; text-decoration: none; }
  .auth-footer-text a:hover { text-decoration: underline; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .auth-left { display: none; }
    .auth-right { padding: 32px 20px; }
    .auth-form-card { max-width: 100%; }
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNoAccount(false);
    if (!email.trim()) { setError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (err?.status === 404) {
        setError(err.message);
        setNoAccount(true);
        setTimeout(() => router.push("/signup"), 2000);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{authStyles}</style>
      <div className="auth-wrap">

        {/* LEFT BRAND PANEL */}
        <div className="auth-left">
          <Link href="/" className="auth-left-logo">
            <div className="auth-left-logo-icon">&#129302;</div>
            <span>AI SEO Tool</span>
          </Link>

          <div className="auth-left-content">
            <div className="auth-left-badge">
              <div className="auth-left-badge-dot" />
              AI Citation Readiness Platform
            </div>
            <h2 className="auth-left-title">
              Get <span className="hl">cited</span> by<br />every AI engine
            </h2>
            <p className="auth-left-sub">
              The only platform that audits your site across ChatGPT, Claude,
              Perplexity, Gemini &amp; Grok — and tells you exactly how to rank higher.
            </p>
            <div className="auth-left-features">
              <div className="auth-left-feat">
                <div className="auth-feat-icon">&#128202;</div>
                <div className="auth-feat-text">
                  <span className="auth-feat-title">8-Dimension GEO Score</span>
                  <span className="auth-feat-desc">Unified citation readiness across all major AI engines</span>
                </div>
              </div>
              <div className="auth-left-feat">
                <div className="auth-feat-icon">&#128375;&#65039;</div>
                <div className="auth-feat-text">
                  <span className="auth-feat-title">Full-Site BFS Crawl</span>
                  <span className="auth-feat-desc">50 concurrent pages, deep metadata extraction</span>
                </div>
              </div>
              <div className="auth-left-feat">
                <div className="auth-feat-icon">&#127942;</div>
                <div className="auth-feat-text">
                  <span className="auth-feat-title">E-E-A-T & Schema Analysis</span>
                  <span className="auth-feat-desc">Trust signals, structured data, entity authority</span>
                </div>
              </div>
              <div className="auth-left-feat">
                <div className="auth-feat-icon">&#128197;</div>
                <div className="auth-feat-text">
                  <span className="auth-feat-title">Scheduled Re-Audits</span>
                  <span className="auth-feat-desc">Track your progress automatically over time</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            &copy; 2025 AI SEO Tool &middot; <a href="#">Privacy</a> &middot; <a href="#">Terms</a>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="auth-right">
          <div className="auth-form-card">
            <Link href="/" className="auth-back-link">
              &#8592; Back to home
            </Link>

            <div className="auth-form-header">
              <h1 className="auth-form-title">Welcome back</h1>
              <p className="auth-form-sub">
                Don&apos;t have an account?{" "}
                <Link href="/signup">Create one free</Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="email" className="auth-label">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="auth-input"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password" className="auth-label">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="auth-input"
                />
              </div>

              {error && (
                <div role="alert" className="auth-error">
                  <span className="auth-error-icon">&#9888;&#65039;</span>
                  <span>
                    {error}
                    {noAccount && (
                      <> <Link href="/signup" style={{ color: "#dc2626", fontWeight: 600 }}>Create an account</Link></>
                    )}
                  </span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="auth-btn">
                {submitting ? "Signing in…" : "Sign In →"}
              </button>
            </form>

            <p className="auth-footer-text">
              Forgot your password? <a href="#">Reset it</a>
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
