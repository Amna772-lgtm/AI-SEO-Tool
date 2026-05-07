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
      if ((d as any).plan === "agency") return; // already on top plan
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
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !upgrading) setOpen(false);
      }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Gradient top bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg, #0d9488, #16a34a)" }} />

        <div className="p-6">
          {/* Icon + label row */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 4px 12px rgba(13,148,136,0.35)", fontSize: "22px", lineHeight: 1 }}
            >
              🤖
            </div>
            <div>
              <span
                className="mb-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(13,148,136,0.1)", color: "#0d9488" }}
              >
                {isPro ? "Pro plan" : "Free plan"}
              </span>
              <h2
                id={headingId}
                className="text-sm font-bold leading-tight"
                style={{ color: "var(--foreground)" }}
              >
                {heading}
              </h2>
            </div>
          </div>

          {/* Body */}
          <p className="mb-5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            {body}
          </p>

          {/* Primary CTA */}
          <button
            ref={ctaRef}
            onClick={() => handleUpgrade(targetPlan)}
            disabled={upgrading !== null}
            className="w-full min-h-[44px] rounded-xl text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #0d9488, #16a34a)",
              boxShadow: "0 4px 16px rgba(13,148,136,0.35)",
            }}
            onMouseEnter={e => { if (!upgrading) (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(13,148,136,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(13,148,136,0.35)"; }}
          >
            {upgrading === targetPlan ? "Redirecting to checkout…" : ctaLabel}
          </button>

          {/* Secondary CTA for free users */}
          {!isPro && (
            <button
              type="button"
              onClick={() => handleUpgrade("agency")}
              disabled={upgrading !== null}
              className="mt-2 w-full min-h-[44px] rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {upgrading === "agency" ? "Redirecting to checkout…" : "Agency — $99/mo (unlimited)"}
            </button>
          )}

          {/* Dismiss */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={upgrading !== null}
            className="mx-auto mt-4 flex items-center gap-1 text-xs transition-colors hover:opacity-80 disabled:opacity-40"
            style={{ color: "var(--muted)" }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
