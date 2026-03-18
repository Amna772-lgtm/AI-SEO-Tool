"use client";

import type { ContentResult } from "../../lib/api";

const READING_LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  "Elementary":    { bg: "#d1fae5", color: "#065f46" },
  "Middle School": { bg: "#fef3c7", color: "#92400e" },
  "High School":   { bg: "#ffedd5", color: "#9a3412" },
  "College":       { bg: "#fee2e2", color: "#991b1b" },
};

interface Props {
  content: ContentResult;
}

export function ContentPanel({ content }: Props) {
  const convPct    = Math.round(content.conversational_tone_score * 100);
  const convColor  = convPct >= 60 ? "#10b981" : convPct >= 30 ? "#f59e0b" : "#f43f5e";
  const readingCfg = READING_LEVEL_COLORS[content.reading_level] ?? { bg: "var(--surface-elevated)", color: "var(--muted)" };
  const faqPct     = content.pages_analyzed > 0
    ? Math.round((content.pages_with_faq / content.pages_analyzed) * 100) : 0;
  const thinPct    = content.pages_analyzed > 0
    ? Math.round((content.thin_content_pages / content.pages_analyzed) * 100) : 0;

  const hasFaqPairs = (content.faq_pairs ?? []).length > 0;

  return (
    <div className="space-y-4">
      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-[var(--surface-elevated)] px-3 py-3 text-center">
          <p className="text-xl font-black tabular-nums text-[var(--foreground)]">
            {content.avg_word_count.toLocaleString()}
          </p>
          <p className="text-[10px] font-medium text-[var(--muted)]">Avg words / page</p>
        </div>

        <div className="rounded-xl px-3 py-3 text-center" style={{ backgroundColor: readingCfg.bg }}>
          <p className="text-sm font-black" style={{ color: readingCfg.color }}>
            {content.reading_level}
          </p>
          <p className="text-[10px] font-medium" style={{ color: readingCfg.color, opacity: 0.75 }}>
            Reading level
          </p>
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] px-3 py-3 text-center">
          <p
            className="text-xl font-black tabular-nums"
            style={{ color: faqPct > 0 ? "#10b981" : "#f43f5e" }}
          >
            {content.pages_with_faq}
          </p>
          <p className="text-[10px] font-medium text-[var(--muted)]">FAQ pages</p>
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] px-3 py-3 text-center">
          <p
            className="text-xl font-black tabular-nums"
            style={{ color: thinPct > 10 ? "#f43f5e" : "#10b981" }}
          >
            {content.thin_content_pages}
          </p>
          <p className="text-[10px] font-medium text-[var(--muted)]">Thin pages</p>
        </div>
      </div>

      {/* Conversational tone */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">Conversational tone</span>
          <span className="font-bold" style={{ color: convColor }}>{convPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${convPct}%`, backgroundColor: convColor }}
          />
        </div>
      </div>

      {/* Heading structure */}
      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">Heading structure</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {[
            { label: "Pages with H2",       val: content.heading_structure.pages_with_h2 },
            { label: "Pages with H3",       val: content.heading_structure.pages_with_h3 },
            { label: "Avg headings / page", val: content.heading_structure.avg_headings_per_page },
            { label: "Avg lists / page",    val: content.avg_lists_per_page },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--surface-elevated)]">
              <span className="text-[var(--muted)]">{label}</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Q&A pairs */}
      {hasFaqPairs && (
        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">FAQ Q&amp;A pairs</p>
          <div className="space-y-2">
            {content.faq_pairs!.slice(0, 5).map((pair, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <p className="mb-1 text-[11px] font-semibold leading-snug text-[var(--foreground)]">
                  {pair.question.length > 100 ? pair.question.slice(0, 100) + "…" : pair.question}
                </p>
                <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                  {pair.answer.length > 150 ? pair.answer.slice(0, 150) + "…" : pair.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ questions fallback */}
      {!hasFaqPairs && content.faq_questions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">Detected FAQ questions</p>
          <div className="space-y-1">
            {content.faq_questions.slice(0, 5).map((q, i) => (
              <p
                key={i}
                className="rounded-lg bg-[var(--surface-elevated)] px-3 py-1.5 text-[11px] text-[var(--foreground)]"
              >
                {q.length > 80 ? q.slice(0, 80) + "…" : q}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
