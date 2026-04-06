"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { signIn } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export function SessionExpiredModal() {
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleExpired() {
      setOpen(true);
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  useEffect(() => {
    if (open && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [open]);

  // If we have no user info we cannot pre-fill the email — fall back to /login redirect
  useEffect(() => {
    if (open && !user) {
      window.location.href = "/login";
    }
  }, [open, user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setSubmitting(true);
    try {
      await signIn(user.email, password);
      await refresh();
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect email or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-heading"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <h2
          id="session-expired-heading"
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Session expired
        </h2>
        <p className="mt-1 mb-4 text-xs" style={{ color: "var(--muted)" }}>
          Your session has expired. Sign in again to continue.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full rounded px-3 py-2 text-xs"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="session-expired-password" className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <input
              id="session-expired-password"
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {error && (
            <div role="alert" className="mb-3 text-xs" style={{ color: "var(--error)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
