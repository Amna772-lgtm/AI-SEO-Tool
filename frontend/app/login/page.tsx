"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "../lib/api";

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
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
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
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"  strokeLinejoin="round" className="text-[var(--accent)]">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            AI SEO TOOL
          </span>
        </div>

        <h2 className="mt-4 mb-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Sign in to your account
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
          Enter your email and password to continue.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <input
              id="password"
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
              {noAccount && (
                <>
                  {" "}
                  <Link href="/signup" style={{ color: "var(--accent)" }}>
                    Create an account
                  </Link>
                </>
              )}
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

        <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--accent)" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
