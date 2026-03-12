"use client";

import type { ContentResult } from "../../lib/api";

const READING_LEVEL_COLORS: Record<string, string> = {
  "Elementary":   "#16a34a",
  "Middle School": "#ca8a04",
  "High School":  "#ea580c",
  "College":      "#dc2626",
};


interface Props {
  content: ContentResult;
}

export function ContentPanel({ content }: Props) {
  const convPct = Math.round(content.conversational_tone_score * 100);
  const convColor = convPct >= 60 ? "#16a34a" : convPct >= 30 ? "#ca8a04" : "#dc2626";
  const readingColor = READING_LEVEL_COLORS[content.reading_level] ?? "#6b7280";
  const faqPct = content.pages_analyzed > 0
    ? Math.round((content.pages_with_faq / content.pages_analyzed) * 100)
    : 0;
  const thinPct = content.pages_analyzed > 0
    ? Math.round((content.thin_content_pages / content.pages_analyzed) * 100)
    : 0;

  const hasFaqPairs = (content.faq_pairs ?? []).length > 0;

  return (
    <div className="space-y-4">
      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{content.avg_word_count.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--muted)]">Avg words/page</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-lg font-bold" style={{ color: readingColor }}>
            {content.reading_level}
          </p>
          <p className="text-[10px] text-[var(--muted)]">Reading level</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-lg font-bold" style={{ color: faqPct > 0 ? "#16a34a" : "#dc2626" }}>
            {content.pages_with_faq}
          </p>
          <p className="text-[10px] text-[var(--muted)]">FAQ pages</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-lg font-bold" style={{ color: thinPct > 10 ? "#dc2626" : "#16a34a" }}>
            {content.thin_content_pages}
          </p>
          <p className="text-[10px] text-[var(--muted)]">Thin pages</p>
        </div>
      </div>

      {/* Conversational tone */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">Conversational tone</span>
          <span className="font-semibold" style={{ color: convColor }}>{convPct}%</span>
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
        <p className="mb-2 text-xs font-medium text-[var(--foreground)]">Heading structure</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Pages with H2</span>
            <span className="font-medium">{content.heading_structure.pages_with_h2}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Pages with H3</span>
            <span className="font-medium">{content.heading_structure.pages_with_h3}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Avg headings/page</span>
            <span className="font-medium">{content.heading_structure.avg_headings_per_page}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Avg lists/page</span>
            <span className="font-medium">{content.avg_lists_per_page}</span>
          </div>
        </div>
      </div>

      {/* FAQ Q&A pairs */}
      {hasFaqPairs && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">FAQ Q&amp;A pairs</p>
          <div className="space-y-2">
            {content.faq_pairs!.slice(0, 5).map((pair, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] p-2.5">
                <p className="text-[10px] font-semibold text-[var(--foreground)] mb-1 leading-snug">
                  {pair.question.length > 100 ? pair.question.slice(0, 100) + "…" : pair.question}
                </p>
                <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                  {pair.answer.length > 150 ? pair.answer.slice(0, 150) + "…" : pair.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ questions (fallback when no pairs) */}
      {!hasFaqPairs && content.faq_questions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">Detected FAQ questions</p>
          <div className="space-y-1">
            {content.faq_questions.slice(0, 5).map((q, i) => (
              <p key={i} className="rounded bg-[var(--surface-elevated)] px-2 py-1 text-[10px] text-[var(--foreground)]">
                {q.length > 80 ? q.slice(0, 80) + "…" : q}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
