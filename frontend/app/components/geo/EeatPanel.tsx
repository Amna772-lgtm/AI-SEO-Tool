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

const CADENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  daily:     { label: "Daily",     color: "#16a34a", bg: "#f0fdf4" },
  weekly:    { label: "Weekly",    color: "#0891b2", bg: "#ecfeff" },
  monthly:   { label: "Monthly",  color: "#ca8a04", bg: "#fefce8" },
  quarterly: { label: "Quarterly",color: "#ea580c", bg: "#fff7ed" },
  irregular: { label: "Irregular",color: "#6b7280", bg: "#f3f4f6" },
  none:      { label: "None",     color: "#dc2626", bg: "#fef2f2" },
};


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

      {/* ── Content Freshness + Missing Signals ─────────────────────────── */}
      {(eeat.freshness || eeat.missing_signals.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Content Freshness card */}
          {eeat.freshness && (() => {
            const f = eeat.freshness!;
            const fscore = f.freshness_score;
            const fcolor = fscore >= 65 ? "#16a34a" : fscore >= 35 ? "#ca8a04" : "#dc2626";
            const cadenceCfg = CADENCE_CONFIG[f.blog_cadence] ?? CADENCE_CONFIG["none"];
            const buckets = [
              { label: "< 30 days",  count: f.pages_30d,   color: "#16a34a", bg: "#dcfce7" },
              { label: "< 90 days",  count: f.pages_90d,   color: "#0891b2", bg: "#cffafe" },
              { label: "< 180 days", count: f.pages_180d,  color: "#ca8a04", bg: "#fef9c3" },
              { label: "> 180 days", count: f.pages_older, color: "#6b7280", bg: "#f3f4f6" },
            ];
            return (
              <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
                {/* Header */}
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Content Freshness</p>
                    <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                      Last update: {f.last_update_label} · {f.pages_with_dates} of {f.pages_total} pages dated
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                    style={fscore >= 65
                      ? { background: "#d1fae5", color: "#166534" }
                      : fscore >= 35
                        ? { background: "#fef9c3", color: "#92400e" }
                        : { background: "#fee2e2", color: "#991b1b" }}
                  >
                    {fscore} / 100
                  </span>
                </div>

                {/* Score bar */}
                <div className="px-3 pt-3 pb-1">
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: `${fcolor}20` }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${fscore}%`, background: fcolor }}
                    />
                  </div>
                </div>

                {/* Page-date buckets */}
                {f.pages_with_dates > 0 && (
                  <div className="grid grid-cols-4 gap-2 px-3 py-2">
                    {buckets.map(({ label, count, color, bg }) => (
                      <div key={label} className="rounded-lg px-2 py-2 text-center" style={{ background: bg }}>
                        <p className="text-lg font-black tabular-nums leading-none" style={{ color }}>{count}</p>
                        <p className="mt-0.5 text-[9px] font-medium leading-tight" style={{ color }}>{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blog cadence row */}
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>Blog / news cadence:</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: cadenceCfg.bg, color: cadenceCfg.color }}
                  >
                    {cadenceCfg.label}
                  </span>
                  {f.blog_post_count > 0 && (
                    <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                      ({f.blog_post_count} posts found)
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Missing Signals card */}
          {eeat.missing_signals.length > 0 && (
            <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
              {/* Header */}
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Missing signals</p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "#fee2e2", color: "#dc2626" }}
                >
                  {eeat.missing_signals.length}
                </span>
              </div>
              {eeat.missing_signals.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2 text-[11px]"
                  style={{
                    borderBottom: i < eeat.missing_signals.length - 1 ? "1px solid var(--border)" : "none",
                    color: "#991b1b",
                  }}
                >
                  <span className="flex-shrink-0 font-bold" style={{ color: "#dc2626" }}>·</span>
                  {s}
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
