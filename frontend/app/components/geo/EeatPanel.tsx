"use client";

import type { EeatResult } from "../../lib/api";

interface Props {
  eeat: EeatResult;
}

function scoreColor(s: number) {
  return s >= 70 ? "#16a34a" : s >= 45 ? "#ca8a04" : "#dc2626";
}
function scoreBg(s: number) {
  return s >= 70 ? "#f0fdf4" : s >= 45 ? "#fefce8" : "#fef2f2";
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 text-xs"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: ok ? "#16a34a" : "#dc2626" }}
      >
        {ok ? "✓" : "✗"}
      </span>
      <span style={{ color: ok ? "var(--foreground)" : "var(--muted)", textDecoration: ok ? "none" : "line-through" }}>
        {label}
      </span>
      <span
        className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={ok
          ? { background: "#d1fae5", color: "#166534" }
          : { background: "#fee2e2", color: "#991b1b" }}
      >
        {ok ? "Present" : "Missing"}
      </span>
    </div>
  );
}

export function EeatPanel({ eeat }: Props) {
  const color = scoreColor(eeat.eeat_score);
  const bg    = scoreBg(eeat.eeat_score);
  const label = eeat.eeat_score >= 70 ? "Strong" : eeat.eeat_score >= 45 ? "Moderate" : "Weak";

  const trustItems = [
    { ok: eeat.has_about_page,         label: "About page" },
    { ok: eeat.has_contact_page,       label: "Contact page" },
    { ok: eeat.has_privacy_policy,     label: "Privacy policy" },
    { ok: eeat.has_faq_page,           label: "FAQ page" },
    { ok: eeat.has_author_pages,       label: "Author / team pages" },
    { ok: eeat.has_case_studies,       label: "Case studies" },
  ];

  const contentItems = [
    { ok: eeat.author_credentials_found, label: "Author credentials / byline" },
    { ok: eeat.citations_found,          label: "Research citations" },
    { ok: eeat.content_freshness,        label: "Content freshness dates" },
  ];

  const trustPassed   = trustItems.filter(x => x.ok).length;
  const contentPassed = contentItems.filter(x => x.ok).length;

  return (
    <div className="space-y-5">

      {/* ── Score hero ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 rounded-xl p-4"
        style={{ background: bg, borderTop: `1px solid ${color}30`, borderRight: `1px solid ${color}30`, borderBottom: `1px solid ${color}30`, borderLeft: `4px solid ${color}` }}
      >
        {/* Big score circle */}
        <div
          className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-full"
          style={{ background: color, color: "#fff" }}
        >
          <span className="text-xl font-black leading-none">{eeat.eeat_score}</span>
          <span className="text-[9px] font-semibold opacity-80">/ 100</span>
        </div>

        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color }}>E-E-A-T {label}</p>
          <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted)" }}>
            Experience · Expertise · Authoritativeness · Trustworthiness
          </p>
          {/* Mini bar */}
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full" style={{ background: `${color}25` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${eeat.eeat_score}%`, background: color }}
            />
          </div>
        </div>
      </div>

      {/* ── Signal checklists ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Trust pages */}
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Trust pages</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={trustPassed === trustItems.length
                ? { background: "#d1fae5", color: "#166634" }
                : { background: "#fef3c7", color: "#92400e" }}
            >
              {trustPassed} / {trustItems.length}
            </span>
          </div>
          {trustItems.map(({ ok, label }) => (
            <CheckRow key={label} ok={ok} label={label} />
          ))}
        </div>

        {/* Content signals */}
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Content signals</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={contentPassed === contentItems.length
                ? { background: "#d1fae5", color: "#166634" }
                : { background: "#fef3c7", color: "#92400e" }}
            >
              {contentPassed} / {contentItems.length}
            </span>
          </div>
          {contentItems.map(({ ok, label }) => (
            <CheckRow key={label} ok={ok} label={label} />
          ))}

          {/* Expertise signals */}
          {eeat.expertise_signals.length > 0 && (
            <div className="px-3 py-2.5" style={{ background: "var(--surface)" }}>
              <p className="mb-1.5 text-[10px] font-semibold" style={{ color: "var(--muted)" }}>Expertise signals detected</p>
              <div className="flex flex-wrap gap-1">
                {eeat.expertise_signals.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-lg px-2 py-0.5 text-[10px] font-medium"
                    style={{ background: "#dcfce7", color: "#166534" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Missing signals ──────────────────────────────────────────────── */}
      {eeat.missing_signals.length > 0 && (
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            <span style={{ color: "#dc2626" }}>⚠</span> Missing signals
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "#fee2e2", color: "#dc2626" }}
            >
              {eeat.missing_signals.length}
            </span>
          </p>
          <div className="overflow-hidden rounded-xl" style={{ borderTop: "1px solid #fecaca", borderRight: "1px solid #fecaca", borderBottom: "1px solid #fecaca", borderLeft: "3px solid #dc2626" }}>
            {eeat.missing_signals.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[11px]"
                style={{
                  background: i % 2 === 0 ? "#fff7f7" : "#fef2f2",
                  borderBottom: i < eeat.missing_signals.length - 1 ? "1px solid #fecaca" : "none",
                  color: "#991b1b",
                }}
              >
                <span className="flex-shrink-0 font-bold" style={{ color: "#dc2626" }}>·</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
