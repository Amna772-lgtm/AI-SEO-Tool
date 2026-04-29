"use client";

import type { EeatResult } from "../../lib/api";

interface Props {
  eeat: EeatResult;
}

function scoreColor(s: number) {
  return s >= 70 ? "#047857" : s >= 45 ? "#b45309" : "#dc2626";
}

function SignalRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--border)] bg-white px-4 py-2.5 last:border-0">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ background: ok ? "#047857" : "#e5e7eb" }}
      >
        {ok ? "✓" : ""}
      </span>
      <span className="flex-1 text-xs" style={{ color: ok ? "var(--foreground)" : "var(--muted)" }}>
        {label}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={ok
          ? { background: "#ecfdf5", color: "#047857" }
          : { background: "var(--surface-elevated)", color: "var(--muted)" }}
      >
        {ok ? "Present" : "Missing"}
      </span>
    </div>
  );
}

interface GroupProps {
  title: string;
  items: { ok: boolean; label: string }[];
  footer?: React.ReactNode;
}

function SignalGroup({ title, items, footer }: GroupProps) {
  const passed = items.filter(x => x.ok).length;
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
        <p className="text-xs font-semibold text-[var(--foreground)]">{title}</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={passed === items.length
            ? { background: "#ecfdf5", color: "#047857" }
            : { background: "#fffbeb", color: "#b45309" }}
        >
          {passed} / {items.length}
        </span>
      </div>
      {items.map(({ ok, label }) => <SignalRow key={label} ok={ok} label={label} />)}
      {footer}
    </div>
  );
}

const CADENCE_CONFIG: Record<string, { label: string; color: string }> = {
  daily:     { label: "Daily",     color: "#047857" },
  weekly:    { label: "Weekly",    color: "#0891b2" },
  monthly:   { label: "Monthly",   color: "#b45309" },
  quarterly: { label: "Quarterly", color: "#ea580c" },
  irregular: { label: "Irregular", color: "#6b7280" },
  none:      { label: "None",      color: "#dc2626" },
};

export function EeatPanel({ eeat }: Props) {
  const color = scoreColor(eeat.eeat_score);
  const label = eeat.eeat_score >= 70 ? "Strong" : eeat.eeat_score >= 45 ? "Moderate" : "Weak";

  const credibilityItems = [
    { ok: eeat.has_about_page,    label: "About page" },
    { ok: eeat.has_contact_page,  label: "Contact page" },
    { ok: eeat.has_author_pages,  label: "Author / team pages" },
    { ok: eeat.has_case_studies,  label: "Case studies" },
  ];

  const legalItems = [
    { ok: eeat.has_privacy_policy,   label: "Privacy policy" },
    { ok: eeat.has_terms_page,       label: "Terms of service" },
    { ok: eeat.has_editorial_policy, label: "Editorial policy" },
  ];

  const supportItems = [
    { ok: eeat.has_faq_page,     label: "FAQ page" },
    { ok: eeat.has_support_page, label: "Support / help page" },
  ];

  const contentItems = [
    { ok: eeat.author_credentials_found,     label: "Author credentials / byline" },
    { ok: eeat.author_social_profiles_found, label: "Author social profiles linked" },
    { ok: eeat.citations_found,              label: "Research citations" },
    { ok: eeat.content_freshness,            label: "Content freshness dates" },
  ];

  return (
    <div className="space-y-4">

      {/* ── Score hero ───────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full"
            style={{ background: color }}
          >
            <span className="text-lg font-black leading-none text-white">{eeat.eeat_score}</span>
            <span className="text-[9px] font-semibold text-white opacity-80">/ 100</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color }}>E-E-A-T {label}</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              Experience · Expertise · Authoritativeness · Trustworthiness
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${eeat.eeat_score}%`, background: color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Trust pages — 3 grouped columns ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SignalGroup title="Credibility & Identity" items={credibilityItems} />
        <SignalGroup title="Legal & Policies"       items={legalItems} />
        <SignalGroup title="Support & Help"         items={supportItems} />
      </div>

      {/* ── Content authority + freshness ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        <SignalGroup
          title="Content Authority"
          items={contentItems}
          footer={eeat.expertise_signals.length > 0 ? (
            <div className="border-t border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold text-[var(--muted)]">Expertise signals detected</p>
              <div className="flex flex-wrap gap-1.5">
                {eeat.expertise_signals.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : undefined}
        />

        {eeat.freshness && (() => {
          const f = eeat.freshness!;
          const fscore = f.freshness_score;
          const fcolor = fscore >= 65 ? "#047857" : fscore >= 35 ? "#b45309" : "#dc2626";
          const cadenceCfg = CADENCE_CONFIG[f.blog_cadence] ?? CADENCE_CONFIG["none"];
          const buckets = [
            { label: "< 30d",  count: f.pages_30d,   color: "#047857" },
            { label: "< 90d",  count: f.pages_90d,   color: "#0891b2" },
            { label: "< 180d", count: f.pages_180d,  color: "#b45309" },
            { label: "> 180d", count: f.pages_older, color: "#9ca3af" },
          ];
          return (
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">Content Freshness</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    Last update: {f.last_update_label} · {f.pages_with_dates} of {f.pages_total} pages dated
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums"
                  style={fscore >= 65
                    ? { background: "#ecfdf5", color: "#047857" }
                    : fscore >= 35
                      ? { background: "#fffbeb", color: "#b45309" }
                      : { background: "#fef2f2", color: "#dc2626" }}
                >
                  {fscore} / 100
                </span>
              </div>

              <div className="px-4 pt-3 pb-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${fscore}%`, background: fcolor }}
                  />
                </div>
              </div>

              {f.pages_with_dates > 0 && (
                <div className="grid grid-cols-4 gap-2 px-4 py-3">
                  {buckets.map(({ label, count, color }) => (
                    <div key={label} className="rounded-md border border-[var(--border)] bg-white py-2 text-center">
                      <p className="text-base font-bold tabular-nums leading-none" style={{ color }}>{count}</p>
                      <p className="mt-0.5 text-[9px] font-medium leading-tight text-[var(--muted)]">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-2.5">
                <p className="text-[11px] text-[var(--muted)]">Blog cadence:</p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: "var(--surface-elevated)", color: cadenceCfg.color }}
                >
                  {cadenceCfg.label}
                </span>
                {f.blog_post_count > 0 && (
                  <span className="text-[10px] text-[var(--muted)]">({f.blog_post_count} posts)</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
