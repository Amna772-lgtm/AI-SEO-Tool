"use client";

import { useEffect, useState, useRef } from "react";

type QuotaDetail = {
  code?: string;
  plan?: "free" | "pro";
  limit?: number;
  message?: string;
};

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<QuotaDetail>({});
  const headingId = "upgrade-modal-heading";
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<QuotaDetail>;
      // The event detail may be nested under a `detail` key depending on
      // how the backend serialises the 402 body (e.g. { detail: { code, plan, ... } })
      const d = (ce.detail as any)?.detail || ce.detail || {};
      setDetail(d);
      setOpen(true);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("quota:exceeded", handler as EventListener);
    window.addEventListener("keydown", escHandler);
    return () => {
      window.removeEventListener("quota:exceeded", handler as EventListener);
      window.removeEventListener("keydown", escHandler);
    };
  }, []);

  useEffect(() => {
    if (open) ctaRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const body =
    detail.plan === "pro"
      ? "You've used all 10 audits for this billing period. Upgrade to Agency for unlimited audits."
      : "You've used your 1 free audit. Upgrade to Pro for 10 audits per month with full per-page scores and recommendations.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
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
          id={headingId}
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Audit limit reached
        </h2>
        <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted)" }}>
          {body}
        </p>
        <button
          ref={ctaRef}
          onClick={() => {
            window.location.href = "/select-plan";
          }}
          className="w-full rounded min-h-[44px] text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          style={{
            background: "var(--accent)",
          }}
        >
          Upgrade Plan
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="block mx-auto mt-3 text-xs"
          style={{ color: "var(--muted)" }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
