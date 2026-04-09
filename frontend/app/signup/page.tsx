"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { signUp } from "../lib/api";

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
    padding: 32px 56px;
    position: relative;
    overflow-y: auto;
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
    position: relative; z-index: 1; padding: 24px 0;
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

  .auth-left-stats {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;
  }
  .auth-stat {
    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px; padding: 14px 16px;
    transition: background .2s;
  }
  .auth-stat:hover { background: rgba(255,255,255,.08); }
  .auth-stat-num {
    font-size: 1.4rem; font-weight: 900;
    background: linear-gradient(135deg, var(--auth-teal-light), #86efac);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    margin-bottom: 3px;
  }
  .auth-stat-label { font-size: .75rem; color: #64748b; font-weight: 500; }

  .auth-left-quote {
    background: rgba(13,148,136,.12); border-left: 3px solid var(--auth-teal);
    border-radius: 0 10px 10px 0; padding: 16px 18px;
  }
  .auth-left-quote p {
    font-size: .85rem; color: #cbd5e1; line-height: 1.65; font-style: italic; margin: 0 0 8px;
  }
  .auth-left-quote-author { font-size: .75rem; color: #5eead4; font-weight: 600; }

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
    padding: 32px 40px;
    background: var(--auth-bg);
    overflow-y: auto;
  }
  .auth-form-card {
    width: 100%; max-width: 420px;
  }
  .auth-form-header { margin-bottom: 20px; }
  .auth-back-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: .8rem; color: var(--auth-soft); text-decoration: none;
    margin-bottom: 18px; transition: color .15s;
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

  .auth-free-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #ecfdf5; border: 1px solid #bbf7d0;
    color: #15803d; font-size: .75rem; font-weight: 700;
    padding: 4px 12px; border-radius: 50px; margin-bottom: 20px;
  }

  /* ── FORM FIELDS ── */
  .auth-field { margin-bottom: 16px; }
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

  .auth-hint {
    font-size: .75rem; color: var(--auth-soft); margin-top: 5px;
  }

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

  .auth-tos {
    text-align: center; font-size: .75rem; color: var(--auth-soft);
    margin-top: 14px; line-height: 1.6;
  }
  .auth-tos a { color: var(--auth-mid); text-decoration: underline; }

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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSubmitting(true);
    try {
      await signUp(email.trim(), name.trim(), password);
      window.location.href = "/select-plan";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
              Free to get started
            </div>
            <h2 className="auth-left-title">
              Your site&apos;s<br /><span className="hl">AI visibility</span><br />starts here
            </h2>
            <p className="auth-left-sub">
              Join thousands of SEOs and marketers who use AI SEO Tool
              to get cited by ChatGPT, Claude, Perplexity and more.
            </p>

            <div className="auth-left-stats">
              <div className="auth-stat">
                <div className="auth-stat-num">12,400+</div>
                <div className="auth-stat-label">Sites Audited</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-num">5</div>
                <div className="auth-stat-label">AI Engines Scored</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-num">8</div>
                <div className="auth-stat-label">GEO Dimensions</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-num">50x</div>
                <div className="auth-stat-label">Concurrent Crawl</div>
              </div>
            </div>

            <div className="auth-left-quote">
              <p>&ldquo;Within 2 weeks of following the recommendations, our site started appearing in ChatGPT answers for our target keywords.&rdquo;</p>
              <div className="auth-left-quote-author">&#8212; Marketing Lead, SaaS Startup</div>
            </div>
          </div>

          <div className="auth-left-footer">
            &copy; 2026 AI SEO Tool &middot; <a href="#">Privacy</a> &middot; <a href="#">Terms</a>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="auth-right">
          <div className="auth-form-card">
            <Link href="/" className="auth-back-link">
              &#8592; Back to home
            </Link>

            <div className="auth-form-header">
              <div className="auth-free-badge">&#9889; Free audit included</div>
              <h1 className="auth-form-title">Create your account</h1>
              <p className="auth-form-sub">
                Already have an account?{" "}
                <Link href="/login">Sign in</Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="name" className="auth-label">Full name</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="auth-input"
                />
              </div>

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
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="auth-input"
                />
                <p className="auth-hint">Minimum 8 characters</p>
              </div>

              {error && (
                <div role="alert" className="auth-error">
                  <span className="auth-error-icon">&#9888;&#65039;</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="auth-btn">
                {submitting ? "Creating account…" : "Create Free Account →"}
              </button>

              <p className="auth-tos">
                By signing up you agree to our{" "}
                <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
              </p>
            </form>

            <p className="auth-footer-text">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
