"use client";

import type { NlpResult } from "../../lib/api";

const READINESS_CONFIG = {
  High:    { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", label: "High",    desc: "Well-structured for AI extraction" },
  Medium:  { color: "#ca8a04", bg: "#fefce8", border: "#fde047", label: "Medium",  desc: "Partially optimised for AI snippets" },
  Low:     { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Low",     desc: "Needs restructuring for AI engines" },
  Unknown: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", label: "Unknown", desc: "" },
};

const RICHNESS_CONFIG: Record<string, { color: string; bg: string }> = {
  High:   { color: "#16a34a", bg: "#dcfce7" },
  Medium: { color: "#ca8a04", bg: "#fef9c3" },
  Low:    { color: "#dc2626", bg: "#fef2f2" },
};

const INTENT_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  informational:  { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  commercial:     { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  transactional:  { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  navigational:   { color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
};

const INTENT_LABELS: Record<string, string> = {
  informational: "Informational",
  commercial:    "Commercial",
  transactional: "Transactional",
  navigational:  "Navigational",
};

interface Props {
  nlp: NlpResult;
}

export function NlpPanel({ nlp }: Props) {
  const readiness    = nlp.ai_snippet_readiness ?? "Unknown";
  const cfg          = READINESS_CONFIG[readiness] ?? READINESS_CONFIG["Unknown"];
  const richnessCfg  = nlp.synonym_richness ? RICHNESS_CONFIG[nlp.synonym_richness] : null;
  const primaryKey   = nlp.primary_intent ?? "";
  const intentCfg    = INTENT_CONFIG[primaryKey] ?? { color: "var(--foreground)", bg: "var(--surface-elevated)", border: "var(--border)" };

  return (
    <div className="space-y-5">

      {/* ── Row 1: Readiness hero + intent ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* AI Snippet Readiness */}
        <div
          className="rounded-xl p-4"
          style={{ background: cfg.bg, borderTop: `1px solid ${cfg.border}`, borderRight: `1px solid ${cfg.border}`, borderBottom: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.color}` }}
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: cfg.color }}>
            AI Snippet Readiness
          </p>
          <p className="text-xl font-black" style={{ color: cfg.color }}>{cfg.label}</p>
          {cfg.desc && (
            <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>{cfg.desc}</p>
          )}
        </div>

        {/* Primary intent */}
        <div
          className="rounded-xl p-4"
          style={{ background: intentCfg.bg, borderTop: `1px solid ${intentCfg.border}`, borderRight: `1px solid ${intentCfg.border}`, borderBottom: `1px solid ${intentCfg.border}`, borderLeft: `4px solid ${intentCfg.color}` }}
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: intentCfg.color }}>
            Primary intent
          </p>
          <p className="text-xl font-black capitalize" style={{ color: intentCfg.color }}>
            {INTENT_LABELS[primaryKey] ?? primaryKey ?? "—"}
          </p>
          {/* Secondary intents */}
          {(nlp.secondary_intents ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {nlp.secondary_intents.map((intent, i) => (
                <span
                  key={i}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium capitalize"
                  style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {intent}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Stat cards ─────────────────────────────────────────────*/}
      <div className="grid grid-cols-3 gap-3">

        {/* Question density */}
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "var(--surface-elevated)", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: "3px solid #6366f1" }}
        >
          <p className="text-2xl font-black tabular-nums" style={{ color: "var(--foreground)" }}>
            {nlp.question_density ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--muted)" }}>Q density / 100w</p>
        </div>

        {/* Answer blocks */}
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "var(--surface-elevated)", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: "3px solid #0891b2" }}
        >
          <p className="text-2xl font-black tabular-nums" style={{ color: "var(--foreground)" }}>
            {nlp.answer_blocks_detected ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--muted)" }}>Answer blocks</p>
        </div>

        {/* Synonym richness */}
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: richnessCfg ? richnessCfg.bg : "var(--surface-elevated)",
            borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
            borderLeft: `3px solid ${richnessCfg ? richnessCfg.color : "var(--border-dark)"}`,
          }}
        >
          <p className="text-xl font-black" style={{ color: richnessCfg ? richnessCfg.color : "var(--muted)" }}>
            {nlp.synonym_richness ?? "—"}
          </p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--muted)" }}>Synonym richness</p>
        </div>
      </div>

      {/* ── Key topics ───────────────────────────────────────────────────── */}
      {(nlp.key_topics ?? []).length > 0 && (
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            Key topics
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "var(--accent-light)", color: "var(--accent)" }}
            >
              {nlp.key_topics.length}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {nlp.key_topics.map((topic, i) => (
              <span
                key={i}
                className="rounded-lg px-2.5 py-1 text-[11px] font-medium"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Claude reasoning ─────────────────────────────────────────────── */}
      {nlp.reasoning && (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--surface-elevated)", borderTop: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: "3px solid var(--accent)" }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              AI Analysis
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "var(--accent-light)", color: "var(--accent)" }}
            >
              {nlp.source === "claude" ? "Claude" : "Rule-based"}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
            {nlp.reasoning}
          </p>
        </div>
      )}

      {nlp.error && (
        <p className="text-[10px]" style={{ color: "#ca8a04" }}>Note: {nlp.error}</p>
      )}
    </div>
  );
}
