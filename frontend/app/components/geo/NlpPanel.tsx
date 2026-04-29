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

const READINESS_DESC: Record<string, string> = {
  High:    "Well-structured for AI extraction",
  Medium:  "Partially optimised for AI snippets",
  Low:     "Needs restructuring for AI engines",
  Unknown: "",
};

function pct(n: number) { return `${Math.round(n * 100)}%`; }

function AnswerQualityCard({ aq }: { aq: AnswerQuality }) {
  const scoreColor = aq.score >= 70 ? "#047857" : aq.score >= 50 ? "#b45309" : "#dc2626";
  const lengthOk   = aq.avg_answer_length >= 40 && aq.avg_answer_length <= 120;

  const bars = [
    {
      label:   "BLUF format",
      desc:    "Answer in first sentence",
      display: pct(aq.bluf_ratio),
      color:   aq.bluf_ratio >= 0.6 ? "#047857" : aq.bluf_ratio >= 0.3 ? "#b45309" : "#dc2626",
    },
    {
      label:   "Avg length",
      desc:    "Ideal: 40–120 words",
      display: aq.avg_answer_length > 0 ? `${aq.avg_answer_length}w` : "—",
      color:   aq.avg_answer_length === 0 ? "#9ca3af" : lengthOk ? "#047857" : "#b45309",
    },
    {
      label:   "Self-contained",
      desc:    "Understandable standalone",
      display: pct(aq.self_contained_ratio),
      color:   aq.self_contained_ratio >= 0.6 ? "#047857" : aq.self_contained_ratio >= 0.3 ? "#b45309" : "#dc2626",
    },
    {
      label:   "Confident tone",
      desc:    "Declarative vs hedged",
      display: pct(aq.confident_ratio),
      color:   aq.confident_ratio >= 0.7 ? "#047857" : aq.confident_ratio >= 0.4 ? "#b45309" : "#dc2626",
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">Answer block quality</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">BLUF · length · self-containment · confidence</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold tabular-nums" style={{ color: scoreColor }}>{aq.score}</span>
          <p className="text-[10px] font-medium" style={{ color: scoreColor }}>{aq.quality_label}</p>
        </div>
      </div>

      {/* Overall bar */}
      <div className="bg-[var(--surface-elevated)] px-4 pt-3 pb-2.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${aq.score}%`, background: scoreColor }} />
        </div>
      </div>

      {/* Per-metric rows with bars */}
      <div className="divide-y divide-[var(--border)] bg-white px-4">
        {bars.map(({ label, desc, display, color }) => (
          <div key={label} className="grid items-center gap-3 py-2.5" style={{ gridTemplateColumns: "8rem 1fr 2.5rem" }}>
            <div>
              <p className="text-[11px] font-medium text-[var(--foreground)]">{label}</p>
              <p className="text-[9px] leading-tight text-[var(--muted)]">{desc}</p>
            </div>
            <p className="text-right text-xs font-bold tabular-nums" style={{ color }}>{display}</p>
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
  const readiness  = nlp.ai_snippet_readiness ?? "Unknown";
  const readColor  = READINESS_COLOR[readiness] ?? "#9ca3af";
  const richColor  = nlp.synonym_richness ? RICHNESS_COLOR[nlp.synonym_richness] : "var(--muted)";
  const primaryKey = nlp.primary_intent ?? "";

  const hasTopics    = (nlp.key_topics ?? []).length > 0;
  const hasReasoning = !!nlp.reasoning;

  const aq = nlp.answer_quality ?? null;
  const aqColor = aq
    ? aq.score >= 70 ? "#047857" : aq.score >= 50 ? "#b45309" : "#dc2626"
    : "#9ca3af";

  const aqBars = aq ? (() => {
    const lengthOk = aq.avg_answer_length >= 40 && aq.avg_answer_length <= 120;
    return [
      {
        label:   "BLUF format",
        display: pct(aq.bluf_ratio),
        color:   aq.bluf_ratio >= 0.6 ? "#047857" : aq.bluf_ratio >= 0.3 ? "#b45309" : "#dc2626",
      },
      {
        label:   "Avg length",
        display: aq.avg_answer_length > 0 ? `${aq.avg_answer_length}w` : "—",
        color:   aq.avg_answer_length === 0 ? "#9ca3af" : lengthOk ? "#047857" : "#b45309",
      },
      {
        label:   "Self-contained",
        display: pct(aq.self_contained_ratio),
        color:   aq.self_contained_ratio >= 0.6 ? "#047857" : aq.self_contained_ratio >= 0.3 ? "#b45309" : "#dc2626",
      },
      {
        label:   "Confident tone",
        display: pct(aq.confident_ratio),
        color:   aq.confident_ratio >= 0.7 ? "#047857" : aq.confident_ratio >= 0.4 ? "#b45309" : "#dc2626",
      },
    ];
  })() : [];

  return (
    <div className="space-y-4">

      {/* ── Three-column hero card ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <div className="grid grid-cols-1 sm:grid-cols-3">

          {/* Col 1: Readiness + Intent */}
          <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:border-b-0 sm:border-r">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              AI Snippet Readiness
            </p>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: readColor }} />
              <p className="text-xl font-bold" style={{ color: readColor }}>{readiness}</p>
            </div>
            <p className="text-[11px] text-[var(--muted)]">{READINESS_DESC[readiness]}</p>

            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Primary intent
              </p>
              <p className="text-sm font-bold capitalize text-[var(--foreground)]">
                {INTENT_LABELS[primaryKey] ?? primaryKey ?? "—"}
              </p>
              {(nlp.secondary_intents ?? []).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
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

          {/* Col 2: Content metrics */}
          <div className="border-b border-[var(--border)] sm:border-b-0 sm:border-r">
            <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
              <p className="text-xs font-semibold text-[var(--foreground)]">Content metrics</p>
            </div>
            <div className="divide-y divide-[var(--border)] bg-white px-4">
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-[var(--muted)]">Q density</p>
                <p className="text-xs font-bold tabular-nums text-[var(--foreground)]">
                  {nlp.question_density ?? 0}
                  <span className="ml-1 font-normal text-[var(--muted)]">/ 100w</span>
                </p>
              </div>
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-[var(--muted)]">Answer blocks</p>
                <p className="text-xs font-bold tabular-nums text-[var(--foreground)]">{nlp.answer_blocks_detected ?? 0}</p>
              </div>
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-[var(--muted)]">Synonym richness</p>
                <p className="text-xs font-bold" style={{ color: richColor }}>{nlp.synonym_richness ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Col 3: Answer block quality */}
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
              <p className="text-xs font-semibold text-[var(--foreground)]">Answer block quality</p>
              {aq && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tabular-nums" style={{ color: aqColor }}>{aq.score}</span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                    style={aq.score >= 70
                      ? { background: "#ecfdf5", color: "#047857" }
                      : aq.score >= 50
                        ? { background: "#fffbeb", color: "#b45309" }
                        : { background: "#fef2f2", color: "#dc2626" }}
                  >
                    {aq.quality_label}
                  </span>
                </div>
              )}
            </div>
            {aq ? (
              <>
                <div className="bg-[var(--surface-elevated)] px-4 pt-3 pb-2.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${aq.score}%`, background: aqColor }} />
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)] bg-white px-4">
                  {aqBars.map(({ label, display, color }) => (
                    <div key={label} className="py-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-[10px] font-medium text-[var(--foreground)]">{label}</p>
                        <p className="text-[10px] font-bold tabular-nums" style={{ color }}>{display}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="px-4 py-6 text-center text-[11px] text-[var(--muted)]">Not yet available</p>
            )}
          </div>

        </div>
      </div>

      {/* ── Key topics + AI analysis ─────────────────────────────────────── */}
      {(hasTopics || hasReasoning) && (
        <div className={`grid grid-cols-1 gap-3 ${hasTopics && hasReasoning ? "sm:grid-cols-2" : ""}`}>

          {hasTopics && (
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

          {hasReasoning && (
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
        </div>
      )}

      {nlp.error && (
        <p className="text-[10px] text-amber-600">Note: {nlp.error}</p>
      )}
    </div>
  );
}
