"use client";

import type { NlpResult } from "../../lib/api";

const READINESS_CONFIG = {
  High:    { color: "#16a34a", bg: "#dcfce7", label: "High" },
  Medium:  { color: "#ca8a04", bg: "#fef9c3", label: "Medium" },
  Low:     { color: "#dc2626", bg: "#fef2f2", label: "Low" },
  Unknown: { color: "#6b7280", bg: "#f3f4f6", label: "Unknown" },
};

const INTENT_LABELS: Record<string, string> = {
  informational:  "Informational",
  commercial:     "Commercial",
  transactional:  "Transactional",
  navigational:   "Navigational",
};

interface Props {
  nlp: NlpResult;
}

export function NlpPanel({ nlp }: Props) {
  const readiness = nlp.ai_snippet_readiness ?? "Unknown";
  const cfg = READINESS_CONFIG[readiness] ?? READINESS_CONFIG["Unknown"];

  return (
    <div className="space-y-4">
      {/* AI Snippet Readiness badge */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">AI Snippet Readiness</p>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Intent */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">Primary intent</p>
        <span className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium capitalize">
          {INTENT_LABELS[nlp.primary_intent] ?? nlp.primary_intent ?? "—"}
        </span>
      </div>

      {/* Secondary intents */}
      {(nlp.secondary_intents ?? []).length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-[var(--muted)]">Secondary intents</p>
          <div className="flex flex-wrap gap-1">
            {nlp.secondary_intents.map((intent, i) => (
              <span key={i} className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-0.5 text-[10px] capitalize">
                {intent}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{nlp.question_density ?? 0}</p>
          <p className="text-[10px] text-[var(--muted)]">Q density / 100w</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{nlp.answer_blocks_detected ?? 0}</p>
          <p className="text-[10px] text-[var(--muted)]">Answer blocks</p>
        </div>
      </div>

      {/* Key topics */}
      {(nlp.key_topics ?? []).length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">Key topics</p>
          <div className="flex flex-wrap gap-1">
            {nlp.key_topics.map((topic, i) => (
              <span key={i} className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Claude reasoning */}
      {nlp.reasoning && (
        <div className="rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] p-3">
          <p className="mb-1 text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">
            AI Analysis {nlp.source === "claude" ? "· Claude" : "· Rule-based"}
          </p>
          <p className="text-xs text-[var(--foreground)] leading-relaxed">{nlp.reasoning}</p>
        </div>
      )}

      {nlp.error && (
        <p className="text-[10px] text-amber-600">Note: {nlp.error}</p>
      )}
    </div>
  );
}
