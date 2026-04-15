"use client";

import { useState } from "react";
import type { ContentResult, FactualDensity } from "../../lib/api";

/* ── colour helpers ──────────────────────────────────────────────────────── */

function scoreColor(n: number) {
  if (n >= 60) return "#047857";
  if (n >= 30) return "#b45309";
  return "#dc2626";
}

function metricColor(ratio: number) {
  if (ratio >= 0.7) return "#047857";
  if (ratio >= 0.4) return "#b45309";
  return "#dc2626";
}

/* ── Site-type-aware reading-level labels ─────────────────────────────── */

const TECHNICAL_SITE_TYPES = new Set([
  "saas", "news", "informational",
]);

function readingLevelCfg(level: string, siteType?: string) {
  const isTechnical = siteType ? TECHNICAL_SITE_TYPES.has(siteType) : false;

  const map: Record<string, { color: string; note: string }> = {
    "Elementary":    { color: "#047857", note: "Great for AI" },
    "Middle School": { color: "#047857", note: "Good" },
    "High School":   isTechnical
      ? { color: "#047857", note: "Good for this site type" }
      : { color: "#b45309", note: "Moderate" },
    "College":       isTechnical
      ? { color: "#b45309", note: "Acceptable for technical content" }
      : { color: "#dc2626", note: "Too complex" },
  };
  return map[level] ?? { color: "var(--muted)", note: "" };
}

/* ── Factual Density card ────────────────────────────────────────────── */

function FactualDensityCard({ fd }: { fd: FactualDensity }) {
  const color = scoreColor(fd.score);
  const label =
    fd.score >= 60 ? "High — AI-citable" :
    fd.score >= 30 ? "Medium" :
    "Low — needs more facts";

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
          style={{ width: `${Math.min(fd.score, 100)}%`, background: color }}
        />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {signals.map(({ label: sl, val }) => (
          <div key={sl} className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-2 text-center">
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

/* ── Main Content Panel ──────────────────────────────────────────────── */

interface Props {
  content: ContentResult;
  siteType?: string;
}

export function ContentPanel({ content, siteType }: Props) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const convPct    = Math.round(content.conversational_tone_score * 100);
  const convColor  = convPct >= 40 ? "#047857" : convPct >= 20 ? "#b45309" : "#dc2626";
  const convLabel  = convPct >= 40 ? "High" : convPct >= 20 ? "Medium" : "Low";

  const readingCfg = readingLevelCfg(content.reading_level, siteType);
  const faqColor   = content.pages_with_faq > 0 ? "#047857" : "#dc2626";
  const thinColor  = content.thin_content_pages === 0 ? "#047857"
    : content.thin_content_pages <= 3 ? "#b45309" : "#dc2626";

  const hasFaqPairs = content.faq_pairs.length > 0;

  const pa = content.pages_analyzed || 1;
  const h2Pct = Math.round((content.heading_structure.pages_with_h2 / pa) * 100);
  const h3Pct = Math.round((content.heading_structure.pages_with_h3 / pa) * 100);
  const h2Color = metricColor(content.heading_structure.pages_with_h2 / pa);
  const h3Color = metricColor(content.heading_structure.pages_with_h3 / pa);
  const avgHeadings = content.heading_structure.avg_headings_per_page;
  const headingsColor = avgHeadings >= 3 ? "#047857" : avgHeadings >= 1.5 ? "#b45309" : "#dc2626";

  return (
    <div className="space-y-4">

      {/* ── Pages analyzed badge ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-1 text-[11px] font-medium text-[var(--muted)]">
          Based on {content.pages_analyzed} page{content.pages_analyzed !== 1 ? "s" : ""} analyzed
        </span>
      </div>

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
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            FK grade {content.flesch_kincaid_grade.toFixed(1)}
          </p>
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

      {/* ── Tone + Content structure ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* Conversational tone */}
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
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Benchmark: most professional sites score 20–40%. AI engines favor natural, direct language.
          </p>
        </div>

        {/* Content structure — headings + lists separated */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="mb-3 text-xs font-semibold text-[var(--foreground)]">Content structure</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-sm font-bold tabular-nums" style={{ color: h2Color }}>
                {content.heading_structure.pages_with_h2}
                <span className="ml-1 text-[10px] font-medium">({h2Pct}%)</span>
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Pages with H2</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-sm font-bold tabular-nums" style={{ color: h3Color }}>
                {content.heading_structure.pages_with_h3}
                <span className="ml-1 text-[10px] font-medium">({h3Pct}%)</span>
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Pages with H3</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-sm font-bold tabular-nums" style={{ color: headingsColor }}>
                {avgHeadings}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Avg headings / page</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-sm font-bold tabular-nums text-[var(--foreground)]">
                {content.avg_lists_per_page}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Avg lists / page</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Factual density ──────────────────────────────────────────────── */}
      <FactualDensityCard fd={content.factual_density} />

      {/* ── FAQ Q&A pairs (expandable) ───────────────────────────────────── */}
      {hasFaqPairs && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">FAQ Q&amp;A pairs</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {content.faq_pairs.length}
            </span>
          </div>
          <div className="max-h-72 divide-y divide-[var(--border)] overflow-y-auto">
            {content.faq_pairs.map((pair, i) => {
              const isLong = pair.answer.length > 150;
              const isExpanded = expandedFaq === i;
              return (
                <div key={i} className="bg-[var(--surface-elevated)] px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold leading-snug text-[var(--foreground)]">
                    {pair.question.length > 120 ? pair.question.slice(0, 120) + "…" : pair.question}
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                    {isLong && !isExpanded
                      ? pair.answer.slice(0, 150) + "…"
                      : pair.answer}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : i)}
                      className="mt-1 text-[10px] font-medium text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FAQ questions fallback ───────────────────────────────────────── */}
      {!hasFaqPairs && content.faq_questions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Detected FAQ questions</p>
            <p className="text-[10px] text-[var(--muted)]">Answers not extractable — questions use bold/inline format, not headings</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {content.faq_questions.length}
            </span>
          </div>
          <div className="max-h-52 divide-y divide-[var(--border)] overflow-y-auto">
            {content.faq_questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 bg-[var(--surface-elevated)] px-4 py-2.5">
                <span className="mt-0.5 shrink-0 text-xs font-bold text-emerald-600">?</span>
                <p className="text-[11px] text-[var(--foreground)]">
                  {q.length > 120 ? q.slice(0, 120) + "…" : q}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
