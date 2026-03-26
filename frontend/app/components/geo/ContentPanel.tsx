"use client";

import type { ContentResult } from "../../lib/api";

const READING_LEVEL_CONFIG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  "Elementary":    { bg: "#f0fdf4", border: "#86efac", color: "#15803d", label: "Great for AI" },
  "Middle School": { bg: "#fefce8", border: "#fde047", color: "#a16207", label: "Good" },
  "High School":   { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", label: "Moderate" },
  "College":       { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", label: "Too complex" },
};

interface Props {
  content: ContentResult;
}

export function ContentPanel({ content }: Props) {
  const convPct   = Math.round(content.conversational_tone_score * 100);
  const convColor = convPct >= 60 ? "#16a34a" : convPct >= 30 ? "#ca8a04" : "#dc2626";
  const convBg    = convPct >= 60 ? "#f0fdf4" : convPct >= 30 ? "#fefce8" : "#fef2f2";
  const convLabel = convPct >= 60 ? "High" : convPct >= 30 ? "Medium" : "Low";

  const readingCfg = READING_LEVEL_CONFIG[content.reading_level]
    ?? { bg: "var(--surface-elevated)", border: "var(--border)", color: "var(--muted)", label: "" };

  const faqColor  = content.pages_with_faq > 0 ? "#16a34a" : "#dc2626";
  const thinColor = content.thin_content_pages === 0 ? "#16a34a"
    : content.thin_content_pages <= 3 ? "#ca8a04" : "#dc2626";

  const hasFaqPairs = (content.faq_pairs ?? []).length > 0;

  return (
    <div className="space-y-5">

      {/* ── Row 1: Stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        {/* Avg word count */}
        <div
          className="rounded-xl p-3"
          style={{ background: "var(--surface-elevated)", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: "3px solid #6366f1" }}
        >
          <p className="text-2xl font-black tabular-nums" style={{ color: "var(--foreground)" }}>
            {content.avg_word_count.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--muted)" }}>Avg words / page</p>
          <p className="mt-1 text-[10px]" style={{ color: "#6366f1" }}>
            median {content.median_word_count?.toLocaleString() ?? "—"}
          </p>
        </div>

        {/* Reading level */}
        <div
          className="rounded-xl p-3"
          style={{ background: readingCfg.bg, borderTop: `1px solid ${readingCfg.border}`, borderRight: `1px solid ${readingCfg.border}`, borderBottom: `1px solid ${readingCfg.border}`, borderLeft: `3px solid ${readingCfg.color}` }}
        >
          <p className="text-base font-black leading-tight" style={{ color: readingCfg.color }}>
            {content.reading_level}
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--muted)" }}>Reading level</p>
          {readingCfg.label && (
            <p className="mt-1 text-[10px] font-semibold" style={{ color: readingCfg.color }}>
              {readingCfg.label}
            </p>
          )}
        </div>

        {/* FAQ pages */}
        <div
          className="rounded-xl p-3"
          style={{ background: "var(--surface-elevated)", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${faqColor}` }}
        >
          <p className="text-2xl font-black tabular-nums" style={{ color: faqColor }}>
            {content.pages_with_faq}
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--muted)" }}>FAQ pages</p>
          <p className="mt-1 text-[10px]" style={{ color: faqColor }}>
            {content.pages_with_faq > 0 ? "FAQ detected" : "None found"}
          </p>
        </div>

        {/* Thin pages */}
        <div
          className="rounded-xl p-3"
          style={{ background: "var(--surface-elevated)", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${thinColor}` }}
        >
          <p className="text-2xl font-black tabular-nums" style={{ color: thinColor }}>
            {content.thin_content_pages}
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--muted)" }}>Thin pages</p>
          <p className="mt-1 text-[10px]" style={{ color: thinColor }}>
            {content.thin_content_pages === 0 ? "All good" : "< 300 words"}
          </p>
        </div>
      </div>

      {/* ── Row 2: Tone + Heading structure ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* Conversational tone */}
        <div
          className="rounded-xl p-4"
          style={{ background: convBg, borderTop: `1px solid ${convColor}30`, borderRight: `1px solid ${convColor}30`, borderBottom: `1px solid ${convColor}30`, borderLeft: `4px solid ${convColor}` }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Conversational tone</p>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>How natural & accessible the content reads</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black tabular-nums" style={{ color: convColor }}>{convPct}%</span>
              <p className="text-[10px] font-semibold" style={{ color: convColor }}>{convLabel}</p>
            </div>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: `${convColor}20` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${convPct}%`, background: convColor }}
            />
          </div>
        </div>

        {/* Heading structure */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
          <p className="mb-3 text-xs font-semibold" style={{ color: "var(--foreground)" }}>Heading structure</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Pages with H2",       val: content.heading_structure.pages_with_h2 },
              { label: "Pages with H3",       val: content.heading_structure.pages_with_h3 },
              { label: "Avg headings / page", val: content.heading_structure.avg_headings_per_page },
              { label: "Avg lists / page",    val: content.avg_lists_per_page },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="rounded-lg px-3 py-2"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{val}</p>
                <p className="text-[10px]" style={{ color: "var(--muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ Q&A pairs ────────────────────────────────────────────────── */}
      {hasFaqPairs && (
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            <span style={{ color: "#16a34a" }}>?</span> FAQ Q&amp;A pairs
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "#d1fae5", color: "#166534" }}
            >
              {content.faq_pairs!.length}
            </span>
          </p>
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
              {content.faq_pairs!.map((pair, i) => (
                <div
                  key={i}
                  className="px-4 py-3"
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)",
                    borderBottom: i < content.faq_pairs!.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <p className="mb-1 text-[11px] font-semibold leading-snug" style={{ color: "var(--foreground)" }}>
                    {pair.question.length > 100 ? pair.question.slice(0, 100) + "…" : pair.question}
                  </p>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>
                    {pair.answer.length > 150 ? pair.answer.slice(0, 150) + "…" : pair.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ questions fallback ───────────────────────────────────────── */}
      {!hasFaqPairs && content.faq_questions.length > 0 && (
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            <span style={{ color: "#16a34a" }}></span> Detected FAQ questions
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "#d1fae5", color: "#166534" }}
            >
              {content.faq_questions.length}
            </span>
          </p>
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
              {content.faq_questions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)",
                    borderBottom: i < content.faq_questions.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span className="flex-shrink-0 text-xs font-bold" style={{ color: "#16a34a" }}>?</span>
                  <p className="text-[11px]" style={{ color: "var(--foreground)" }}>
                    {q.length > 100 ? q.slice(0, 100) + "…" : q}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
