"use client";

import type { EeatResult } from "../../lib/api";

function Signal({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ backgroundColor: ok ? "#16a34a" : "#dc2626" }}
      >
        {ok ? "✓" : "✗"}
      </span>
      <span className={`text-xs ${ok ? "text-[var(--foreground)]" : "text-[var(--muted)] line-through"}`}>
        {label}
      </span>
    </div>
  );
}

interface Props {
  eeat: EeatResult;
}

export function EeatPanel({ eeat }: Props) {
  const scoreColor =
    eeat.eeat_score >= 70 ? "#16a34a"
    : eeat.eeat_score >= 45 ? "#ca8a04"
    : "#dc2626";

  const dimensions = [
    { key: "E", label: "Experience", signals: ["has_case_studies", "citations_found", "content_freshness"] },
    { key: "E", label: "Expertise", signals: ["author_credentials_found"] },
    { key: "A", label: "Authoritativeness", signals: ["has_author_pages"] },
    { key: "T", label: "Trustworthiness", signals: ["has_about_page", "has_contact_page", "has_privacy_policy", "has_faq_page"] },
  ];

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">E-E-A-T Score</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: scoreColor }}>
            {eeat.eeat_score}
            <span className="text-xs font-normal text-[var(--muted)]">/100</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${eeat.eeat_score}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>

      {/* Page signals */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--foreground)]">Trust pages</p>
        <Signal ok={eeat.has_about_page} label="About page" />
        <Signal ok={eeat.has_contact_page} label="Contact page" />
        <Signal ok={eeat.has_privacy_policy} label="Privacy policy" />
        <Signal ok={eeat.has_faq_page} label="FAQ page" />
        <Signal ok={eeat.has_author_pages} label="Author / team pages" />
        <Signal ok={eeat.has_case_studies} label="Case studies" />
      </div>

      {/* Content signals */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--foreground)]">Content signals</p>
        <Signal ok={eeat.author_credentials_found} label="Author credentials / byline" />
        <Signal ok={eeat.citations_found} label="Research citations" />
        <Signal ok={eeat.content_freshness} label="Content freshness dates" />
      </div>

      {/* Expertise signals */}
      {eeat.expertise_signals.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">Expertise signals found</p>
          <div className="flex flex-wrap gap-1">
            {eeat.expertise_signals.map((s, i) => (
              <span key={i} className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 text-[10px] text-[var(--accent)]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing */}
      {eeat.missing_signals.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[#dc2626]">Missing signals</p>
          <div className="space-y-0.5">
            {eeat.missing_signals.slice(0, 4).map((s, i) => (
              <p key={i} className="text-[10px] text-[#dc2626]">• {s}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
