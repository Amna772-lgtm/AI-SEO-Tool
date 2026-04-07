"use client";

import { useEffect, useState } from "react";
import { selectFreePlan, createCheckoutSession, fetchSubscription } from "../lib/api";

const FREE_FEATURES = [
  "1 audit (lifetime)",
  "Top-level GEO score",
  "Technical health summary",
  "No scheduled re-audits",
  "No per-page breakdown",
];

const PRO_FEATURES = [
  "10 audits per month",
  "Full per-page GEO scores",
  "Actionable suggestions",
  "Scheduled re-audits",
  "Standard-branded reports",
];

const AGENCY_FEATURES = [
  "Unlimited audits",
  "Full per-page GEO scores",
  "Actionable suggestions",
  "Scheduled re-audits",
  "White-label PDF reports",
];

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2.5 7L5.5 10L11.5 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureList({ features, accent }: { features: string[]; accent: boolean }) {
  const color = accent ? "var(--accent)" : "var(--muted)";
  return (
    <ul className="space-y-2 mb-6">
      {features.map((f) => (
        <li key={f} className="flex items-center gap-2">
          <CheckIcon color={color} />
          <span className="text-xs" style={{ color: "var(--foreground)" }}>
            {f}
          </span>
        </li>
      ))}
    </ul>
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
          window.location.href = "/";
          return;
        }
        if (attempts < 5) {
          setTimeout(poll, 1000);
        } else {
          setError(
            "Payment confirmed but subscription not yet active. Please refresh in a moment."
          );
          setChecking(false);
        }
      };
      poll();
      return;
    }

    // status === "cancelled" → silent return, show plan cards again
    // default: check if user already has an active subscription
    fetchSubscription()
      .then((sub) => {
        if (sub && sub.status === "active") {
          window.location.href = "/";
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
      window.location.href = "/";
    } catch {
      setError(
        "Something went wrong. Please try again. If the problem persists, contact support."
      );
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

  if (checking && isSuccess) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center">
          <h1
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Payment confirmed
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Setting up your account — you&apos;ll be redirected in a moment.
          </p>
        </div>
      </main>
    );
  }

  if (checking) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Loading...
        </p>
      </main>
    );
  }

  const isLoading = loading !== null;

  return (
    <main
      className="flex min-h-screen items-center justify-center py-12"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-4xl px-4">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--accent)]"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              AI SEO TOOL
            </span>
          </div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Choose your plan
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Select the plan that fits your needs. You can upgrade at any time.
          </p>
        </div>

        {/* Plan card grid */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-8${isLoading ? " pointer-events-none" : ""}`}
        >
          {/* Free card */}
          <div
            className="rounded-lg p-6 flex flex-col"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-base font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              Free
            </p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
                $0
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                /month
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Get started and see your top-level SEO score.
            </p>
            <FeatureList features={FREE_FEATURES} accent={false} />
            <button
              onClick={handleFree}
              disabled={isLoading}
              className="w-full rounded min-h-[44px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {loading === "free" ? "Setting up your account..." : "Get Started Free"}
            </button>
          </div>

          {/* Pro card */}
          <div
            className="rounded-lg p-6 flex flex-col"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--accent)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                Pro
              </p>
              <span
                className="text-xs font-semibold rounded-full px-2 py-0.5"
                style={{ color: "var(--warning)", background: "#fefce8" }}
              >
                Most Popular
              </span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
                $29
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                /month
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Full audit reports with actionable recommendations.
            </p>
            <FeatureList features={PRO_FEATURES} accent={true} />
            <button
              onClick={() => handlePaid("pro")}
              disabled={isLoading}
              className="w-full rounded min-h-[44px] text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")
              }
            >
              {loading === "pro" ? "Redirecting to checkout..." : "Start Pro"}
            </button>
          </div>

          {/* Agency card */}
          <div
            className="rounded-lg p-6 flex flex-col"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-base font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              Agency
            </p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
                $99
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                /month
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Unlimited audits and white-label reports for client work.
            </p>
            <FeatureList features={AGENCY_FEATURES} accent={true} />
            <button
              onClick={() => handlePaid("agency")}
              disabled={isLoading}
              className="w-full rounded min-h-[44px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {loading === "agency" ? "Redirecting to checkout..." : "Start Agency"}
            </button>
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <p role="alert" className="text-xs mt-4 text-center" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
