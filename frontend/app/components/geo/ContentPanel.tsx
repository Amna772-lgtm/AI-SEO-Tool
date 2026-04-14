"use client";

import type { ContentResult, FactualDensity } from "../../lib/api";

function scoreColor(n: number) {
  if (n >= 80) return "#047857";
  if (n >= 50) return "#b45309";
  return "#dc2626";
}

function FactualDensityCard({ fd }: { fd: FactualDensity }) {
  const color = scoreColor(fd.score);
  const label = fd.score >= 60 ? "High — AI-citable" : fd.score >= 30 ? "Medium" : "Low — needs more facts";

  const signals = [
    { label: "Statistics",  val: fd.stats_count },
    { label: "Citations",   val: fd.citations_count },
    { label: "Experts",     val: fd.expert_mentions },
    { label: "Year refs",   val: fd.year_references },
    { label: "Quotes",      val: fd.quotes_count },
  ];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">Factual density</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Stats, citations, expert mentions &amp; quotes per 1000 words
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold tabular-nums" style={{ color }}>{fd.score}</span>
          <p className="text-[10px] font-medium" style={{ color }}>{label}</p>
          <p className="text-[10px] text-[var(--muted)]">{fd.per_1000_words} / 1k words</p>
        </div>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${fd.score}%`, background: color }}
        />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {signals.map(({ label: sl, val }) => (
          <div key={sl} className="rounded-md border border-[var(--border)] bg-white px-2 py-2 text-center">
            <p className="text-sm font-bold tabular-nums" style={{ color: val > 0 ? color : "var(--muted)" }}>
              {val}
            </p>
            <p className="mt-0.5 text-[9px] leading-tight text-[var(--muted)]">{sl}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const READING_LEVEL_LABELS: Record<string, { color: string; note: string }> = {
  "Elementary":    { color: "#047857", note: "Great for AI" },
  "Middle School": { color: "#047857", note: "Good" },
  "High School":   { color: "#b45309", note: "Moderate" },
  "College":       { color: "#dc2626", note: "Too complex" },
};

interface Props {
  content: ContentResult;
}

export function ContentPanel({ content }: Props) {
  const convPct    = Math.round(content.conversational_tone_score * 100);
  const convColor  = convPct >= 60 ? "#047857" : convPct >= 30 ? "#b45309" : "#dc2626";
  const convLabel  = convPct >= 60 ? "High" : convPct >= 30 ? "Medium" : "Low";

  const readingCfg = READING_LEVEL_LABELS[content.reading_level] ?? { color: "var(--muted)", note: "" };
  const faqColor   = content.pages_with_faq > 0 ? "#047857" : "#dc2626";
  const thinColor  = content.thin_content_pages === 0 ? "#047857"
    : content.thin_content_pages <= 3 ? "#b45309" : "#dc2626";

  const hasFaqPairs = (content.faq_pairs ?? []).length > 0;

  return (
    <div className="space-y-4">

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <p className="text-xl font-bold tabular-nums text-[var(--foreground)]">
            {content.avg_word_count.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">Avg words / page</p>
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            median {content.median_word_count?.toLocaleString() ?? "—"}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <p className="text-base font-bold leading-tight" style={{ color: readingCfg.color }}>
            {content.reading_level}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">Reading level</p>
          {readingCfg.note && (
            <p className="mt-1 text-[10px] font-medium" style={{ color: readingCfg.color }}>
              {readingCfg.note}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <p className="text-xl font-bold tabular-nums" style={{ color: faqColor }}>
            {content.pages_with_faq}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">FAQ pages</p>
          <p className="mt-1 text-[10px] font-medium" style={{ color: faqColor }}>
            {content.pages_with_faq > 0 ? "FAQ detected" : "None found"}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <p className="text-xl font-bold tabular-nums" style={{ color: thinColor }}>
            {content.thin_content_pages}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">Thin pages</p>
          <p className="mt-1 text-[10px] font-medium" style={{ color: thinColor }}>
            {content.thin_content_pages === 0 ? "All good" : "< 300 words"}
          </p>
        </div>
      </div>

      {/* ── Tone + Heading structure ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">Conversational tone</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">How natural &amp; accessible the content reads</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold tabular-nums" style={{ color: convColor }}>{convPct}%</span>
              <p className="text-[10px] font-medium" style={{ color: convColor }}>{convLabel}</p>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${convPct}%`, background: convColor }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="mb-3 text-xs font-semibold text-[var(--foreground)]">Heading structure</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Pages with H2",       val: content.heading_structure.pages_with_h2 },
              { label: "Pages with H3",       val: content.heading_structure.pages_with_h3 },
              { label: "Avg headings / page", val: content.heading_structure.avg_headings_per_page },
              { label: "Avg lists / page",    val: content.avg_lists_per_page },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-md border border-[var(--border)] bg-white px-3 py-2">
                <p className="text-sm font-bold tabular-nums text-[var(--foreground)]">{val}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Factual density ──────────────────────────────────────────────── */}
      {content.factual_density && <FactualDensityCard fd={content.factual_density} />}

      {/* ── FAQ Q&A pairs ────────────────────────────────────────────────── */}
      {hasFaqPairs && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">FAQ Q&amp;A pairs</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {content.faq_pairs!.length}
            </span>
          </div>
          <div className="max-h-56 divide-y divide-[var(--border)] overflow-y-auto">
            {content.faq_pairs!.map((pair, i) => (
              <div key={i} className="bg-white px-4 py-3">
                <p className="mb-1 text-[11px] font-semibold leading-snug text-[var(--foreground)]">
                  {pair.question.length > 100 ? pair.question.slice(0, 100) + "…" : pair.question}
                </p>
                <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                  {pair.answer.length > 150 ? pair.answer.slice(0, 150) + "…" : pair.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAQ questions fallback ───────────────────────────────────────── */}
      {!hasFaqPairs && content.faq_questions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Detected FAQ questions</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {content.faq_questions.length}
            </span>
          </div>
          <div className="max-h-52 divide-y divide-[var(--border)] overflow-y-auto">
            {content.faq_questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 bg-white px-4 py-2.5">
                <span className="mt-0.5 shrink-0 text-xs font-bold text-emerald-600">?</span>
                <p className="text-[11px] text-[var(--foreground)]">
                  {q.length > 100 ? q.slice(0, 100) + "…" : q}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
