"use client";

import { useEffect, useState, useRef } from "react";
import { createCheckoutSession } from "../lib/api";

type QuotaDetail = {
  code?: string;
  plan?: "free" | "pro";
  limit?: number;
  message?: string;
};

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<QuotaDetail>({});
  const [upgrading, setUpgrading] = useState<null | "pro" | "agency">(null);
  const headingId = "upgrade-modal-heading";
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<QuotaDetail>;
      const d = (ce.detail as any)?.detail || ce.detail || {};
      setDetail(d);
      setOpen(true);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !upgrading) setOpen(false);
    };
    window.addEventListener("quota:exceeded", handler as EventListener);
    window.addEventListener("keydown", escHandler);
    return () => {
      window.removeEventListener("quota:exceeded", handler as EventListener);
      window.removeEventListener("keydown", escHandler);
    };
  }, [upgrading]);

  useEffect(() => {
    if (open) ctaRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const isPro = detail.plan === "pro";
  const heading = isPro ? "Monthly audit limit reached" : "Audit limit reached";
  const body = isPro
    ? "You've used all 10 audits for this billing period. Upgrade to Agency for unlimited audits."
    : "You've used your 1 free audit. Upgrade to Pro for 10 audits per month with full per-page scores and actionable recommendations.";
  const targetPlan = isPro ? "agency" : "pro";
  const ctaLabel = isPro ? "Upgrade to Agency — $99/mo" : "Upgrade to Pro — $29/mo";

  const handleUpgrade = async (plan: "pro" | "agency") => {
    setUpgrading(plan);
    try {
      const url = await createCheckoutSession(plan);
      window.location.href = url;
    } catch {
      setUpgrading(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !upgrading) setOpen(false);
      }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <h2
          id={headingId}
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {heading}
        </h2>
        <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted)" }}>
          {body}
        </p>

        {/* Primary CTA — go to Stripe directly */}
        <button
          ref={ctaRef}
          onClick={() => handleUpgrade(targetPlan)}
          disabled={upgrading !== null}
          className="w-full rounded min-h-[44px] text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)" }}
        >
          {upgrading ? "Redirecting to checkout..." : ctaLabel}
        </button>

        {/* If free user, also offer Agency */}
        {!isPro && (
          <button
            type="button"
            onClick={() => handleUpgrade("agency")}
            disabled={upgrading !== null}
            className="w-full rounded min-h-[44px] text-xs font-semibold mt-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            {upgrading === "agency" ? "Redirecting to checkout..." : "Agency — $99/mo (unlimited)"}
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={upgrading !== null}
          className="block mx-auto mt-3 text-xs disabled:opacity-50"
          style={{ color: "var(--muted)" }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
