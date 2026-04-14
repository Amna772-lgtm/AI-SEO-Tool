"use client";

import type { NlpResult, AnswerQuality } from "../../lib/api";

const READINESS_COLOR: Record<string, string> = {
  High:    "#047857",
  Medium:  "#b45309",
  Low:     "#dc2626",
  Unknown: "#9ca3af",
};

const RICHNESS_COLOR: Record<string, string> = {
  High:   "#047857",
  Medium: "#b45309",
  Low:    "#dc2626",
};

const INTENT_LABELS: Record<string, string> = {
  informational: "Informational",
  commercial:    "Commercial",
  transactional: "Transactional",
  navigational:  "Navigational",
};

function pct(ratio: number) { return `${Math.round(ratio * 100)}%`; }

function AnswerQualityCard({ aq }: { aq: AnswerQuality }) {
  const scoreColor = aq.score >= 70 ? "#047857" : aq.score >= 50 ? "#b45309" : "#dc2626";
  const lengthOk   = aq.avg_answer_length >= 40 && aq.avg_answer_length <= 120;

  const metrics = [
    {
      label: "BLUF format",
      val: pct(aq.bluf_ratio),
      desc: "Answer in first sentence",
      color: aq.bluf_ratio >= 0.6 ? "#047857" : aq.bluf_ratio >= 0.3 ? "#b45309" : "#dc2626",
    },
    {
      label: "Avg length",
      val: aq.avg_answer_length > 0 ? `${aq.avg_answer_length}w` : "—",
      desc: "Ideal: 40–120 words",
      color: aq.avg_answer_length === 0 ? "#9ca3af" : lengthOk ? "#047857" : "#b45309",
    },
    {
      label: "Self-contained",
      val: pct(aq.self_contained_ratio),
      desc: "Understandable standalone",
      color: aq.self_contained_ratio >= 0.6 ? "#047857" : aq.self_contained_ratio >= 0.3 ? "#b45309" : "#dc2626",
    },
    {
      label: "Confident tone",
      val: pct(aq.confident_ratio),
      desc: "Declarative vs hedged",
      color: aq.confident_ratio >= 0.7 ? "#047857" : aq.confident_ratio >= 0.4 ? "#b45309" : "#dc2626",
    },
  ];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">Answer block quality</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            BLUF · length · self-containment · confidence
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold tabular-nums" style={{ color: scoreColor }}>{aq.score}</span>
          <p className="text-[10px] font-medium" style={{ color: scoreColor }}>{aq.quality_label}</p>
        </div>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${aq.score}%`, background: scoreColor }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(({ label, val, desc, color }) => (
          <div key={label} className="rounded-md border border-[var(--border)] bg-white px-3 py-2">
            <p className="text-sm font-bold tabular-nums" style={{ color }}>{val}</p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--foreground)]">{label}</p>
            <p className="text-[9px] leading-tight text-[var(--muted)]">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  nlp: NlpResult;
}

export function NlpPanel({ nlp }: Props) {
  const readiness    = nlp.ai_snippet_readiness ?? "Unknown";
  const readColor    = READINESS_COLOR[readiness] ?? "#9ca3af";
  const richColor    = nlp.synonym_richness ? RICHNESS_COLOR[nlp.synonym_richness] : "var(--muted)";
  const primaryKey   = nlp.primary_intent ?? "";

  return (
    <div className="space-y-4">

      {/* ── Row 1: Readiness + Intent ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            AI Snippet Readiness
          </p>
          <p className="text-xl font-bold" style={{ color: readColor }}>{readiness}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {readiness === "High"    ? "Well-structured for AI extraction"
            : readiness === "Medium" ? "Partially optimised for AI snippets"
            : readiness === "Low"    ? "Needs restructuring for AI engines"
            : ""}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Primary intent
          </p>
          <p className="text-xl font-bold capitalize text-[var(--foreground)]">
            {INTENT_LABELS[primaryKey] ?? primaryKey ?? "—"}
          </p>
          {(nlp.secondary_intents ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {nlp.secondary_intents.map((intent, i) => (
                <span
                  key={i}
                  className="rounded-md border border-[var(--border)] bg-white px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--muted)]"
                >
                  {intent}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-center">
          <p className="text-xl font-bold tabular-nums text-[var(--foreground)]">
            {nlp.question_density ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">Q density / 100w</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-center">
          <p className="text-xl font-bold tabular-nums text-[var(--foreground)]">
            {nlp.answer_blocks_detected ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">Answer blocks</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-center">
          <p className="text-xl font-bold" style={{ color: richColor }}>
            {nlp.synonym_richness ?? "—"}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">Synonym richness</p>
        </div>
      </div>

      {/* ── Answer block quality ─────────────────────────────────────────── */}
      {nlp.answer_quality && <AnswerQualityCard aq={nlp.answer_quality} />}

      {/* ── Key topics ───────────────────────────────────────────────────── */}
      {(nlp.key_topics ?? []).length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--foreground)]">Key topics</p>
            <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
              {nlp.key_topics.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nlp.key_topics.map((topic, i) => (
              <span
                key={i}
                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── AI reasoning ─────────────────────────────────────────────────── */}
      {nlp.reasoning && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              AI Analysis
            </span>
            <span className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
              {nlp.source === "claude" ? "Claude" : "Rule-based"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)]">{nlp.reasoning}</p>
        </div>
      )}

      {nlp.error && (
        <p className="text-[10px] text-amber-600">Note: {nlp.error}</p>
      )}
    </div>
  );
}
