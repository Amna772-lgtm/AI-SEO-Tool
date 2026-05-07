"use client";

import { useState } from "react";
import { createCheckoutSession } from "../lib/api";

export default function LockedFeature({
  title,
  plan = "Pro",
}: {
  title: string;
  plan?: "Pro" | "Agency";
}) {
  const [loading, setLoading] = useState(false);
  const isPro = plan === "Agency";
  const targetPlan = isPro ? "agency" : "pro";

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession(targetPlan);
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  const features = isPro
    ? ["Unlimited audits per month", "Full GEO & technical analysis", "Competitors benchmarking"]
    : ["10 audits per month", "Full per-page scores", "Actionable recommendations"];

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-sm"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* Top gradient band */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #0d9488, #16a34a)" }} />

      <div className="flex flex-col items-center px-8 py-8 text-center">

        {/* Icon */}
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 6px 20px rgba(13,148,136,0.3)", fontSize: "28px", lineHeight: 1 }}
        >
          🤖
        </div>

        {/* Badge */}
        <span
          className="mb-3 inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: "rgba(13,148,136,0.1)", color: "#0d9488" }}
        >
          {isPro ? "Pro plan" : "Free plan"} · Limit reached
        </span>

        {/* Title */}
        <h3 className="mb-1.5 text-base font-extrabold" style={{ color: "var(--foreground)" }}>
          {title}
        </h3>

        {/* Subtitle */}
        <p className="mb-5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Upgrade to <strong style={{ color: "var(--foreground)" }}>{plan}</strong> to unlock unlimited auditing and advanced features.
        </p>

        {/* Feature list */}
        <ul className="mb-6 w-full space-y-2 text-left">
          {features.map(f => (
            <li key={f} className="flex items-center gap-2.5 text-xs" style={{ color: "var(--foreground)" }}>
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: "rgba(13,148,136,0.12)", color: "#0d9488" }}
              >
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full min-h-[42px] rounded-xl text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #0d9488, #16a34a)",
            boxShadow: "0 4px 16px rgba(13,148,136,0.35)",
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(13,148,136,0.5)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(13,148,136,0.35)"; }}
        >
          {loading ? "Redirecting to checkout…" : `Upgrade to ${plan}`}
        </button>
      </div>
    </div>
  );
}
