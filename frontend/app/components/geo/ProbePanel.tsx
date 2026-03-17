"use client";

import { useState } from "react";
import type { ProbeResult } from "../../lib/api";

// ── Engine metadata ──────────────────────────────────────────────────────────

const ENGINE_META: Record<string, { label: string; color: string; bg: string }> = {
  claude:     { label: "Claude",     color: "#b45309", bg: "#fef3c7" },
  chatgpt:    { label: "ChatGPT",    color: "#16a34a", bg: "#dcfce7" },
  gemini:     { label: "Gemini",     color: "#1d4ed8", bg: "#dbeafe" },
  grok:       { label: "Grok",       color: "#7c3aed", bg: "#ede9fe" },
  perplexity: { label: "Perplexity", color: "#0e7490", bg: "#cffafe" },
};

const ENGINE_ORDER = ["claude", "chatgpt", "gemini", "grok", "perplexity"];

// ── Visibility label styling ─────────────────────────────────────────────────

function visibilityStyle(label: string) {
  switch (label) {
    case "High":        return { text: "#15803d", bg: "#dcfce7", border: "#86efac" };
    case "Medium":      return { text: "#92400e", bg: "#fef3c7", border: "#fcd34d" };
    case "Low":         return { text: "#b45309", bg: "#ffedd5", border: "#fdba74" };
    case "Not Visible": return { text: "#dc2626", bg: "#fee2e2", border: "#fca5a5" };
    default:            return { text: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" };
  }
}

// ── Engine card ──────────────────────────────────────────────────────────────

function EngineCard({ engineKey, detail }: { engineKey: string; detail: { mention_count?: number; mention_rate?: number; probes?: { domain_mentioned: boolean }[] } }) {
  const meta = ENGINE_META[engineKey] ?? { label: engineKey, color: "#6b7280", bg: "#f3f4f6" };
  const rate = detail.mention_rate ?? 0;
  const total = detail.probes?.length ?? 0;

  return (
    <div
      className="rounded-lg border p-3 flex flex-col gap-1.5"
      style={{ borderColor: meta.color + "40", background: meta.bg }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white"
          style={{ background: meta.color }}
        >
          {meta.label[0]}
        </span>
        <span className="text-xs font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>
      <p className="text-lg font-bold leading-none" style={{ color: meta.color }}>
        {rate.toFixed(0)}%
      </p>
      <p className="text-[10px] text-[var(--muted)]">
        {detail.mention_count ?? 0}/{total} queries mentioned
      </p>
    </div>
  );
}

// ── Question row ─────────────────────────────────────────────────────────────

function QuestionRow({
  question,
  index,
  engines,
}: {
  question: string;
  index: number;
  engines: ProbeResult["engines"];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <div
        className="flex cursor-pointer items-start gap-3 py-2.5 px-1 hover:bg-[var(--surface-elevated)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[10px] font-bold text-[var(--muted)]">
          {index + 1}
        </span>
        <p className="flex-1 text-xs text-[var(--foreground)] leading-relaxed">{question}</p>

        {/* Per-engine result dots */}
        <div className="flex items-center gap-1.5 shrink-0">
          {ENGINE_ORDER.map((key) => {
            const probe = engines[key]?.probes?.[index];
            const mentioned = probe?.domain_mentioned ?? false;
            const meta = ENGINE_META[key];
            return (
              <span
                key={key}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  background: mentioned ? "#dcfce7" : "#fee2e2",
                  color: mentioned ? "#15803d" : "#dc2626",
                }}
                title={`${meta?.label}: ${mentioned ? "Mentioned" : "Not mentioned"}`}
              >
                {mentioned ? "✓" : "✗"}
              </span>
            );
          })}
          <span className="ml-1 text-[10px] text-[var(--muted)]">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded excerpts */}
      {expanded && (
        <div className="pb-3 pl-8 space-y-2">
          {ENGINE_ORDER.map((key) => {
            const probe = engines[key]?.probes?.[index];
            if (!probe) return null;
            const meta = ENGINE_META[key];
            return (
              <div key={key} className="rounded-md border p-2.5" style={{ borderColor: meta.color + "30", background: meta.bg + "80" }}>
                <p className="mb-1 text-[10px] font-semibold" style={{ color: meta.color }}>
                  {meta.label} response:
                </p>
                <p className="text-[10px] text-[var(--foreground)] leading-relaxed italic">
                  &ldquo;{probe.response_excerpt ?? "No response captured."}&rdquo;
                </p>
                {probe.domain_mentioned && (
                  <span className="mt-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700">
                    Domain mentioned ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  probe: ProbeResult | null;
}

export function ProbePanel({ probe }: Props) {
  // API key not configured — show single error card
  if (!probe) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <span className="text-3xl">🔑</span>
        <p className="text-sm font-semibold text-red-700">ANTHROPIC_API_KEY not configured</p>
        <p className="text-xs text-red-600 max-w-sm">
          Add <span className="font-mono font-bold">ANTHROPIC_API_KEY</span> to your{" "}
          <span className="font-mono">.env</span> file to enable AI visibility probing across all 5 engines.
        </p>
      </div>
    );
  }

  const vs = visibilityStyle(probe.visibility_label);

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: vs.border, background: vs.bg }}
        >
          <span className="text-xl font-bold" style={{ color: vs.text }}>
            {probe.overall_mention_rate.toFixed(0)}%
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: vs.text }}>
              {probe.visibility_label}
            </p>
            <p className="text-[10px]" style={{ color: vs.text + "cc" }}>
              Overall visibility
            </p>
          </div>
        </div>

        <div className="text-xs text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">{probe.engines_tested}</span> engines tested
        </div>

        <div className="text-[10px] text-[var(--muted)]">
          Domain: <span className="font-mono font-medium">{probe.domain_checked}</span>
        </div>
      </div>

      {/* Engine cards — all 5 always shown */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ENGINE_ORDER.map((key) => (
          <EngineCard key={key} engineKey={key} detail={probe.engines[key] ?? { mention_count: 0, mention_rate: 0, probes: [] }} />
        ))}
      </div>

      {/* Questions + per-engine result grid */}
      {probe.questions.length > 0 && (
        <div className="rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 rounded-t-lg">
            <p className="text-xs font-semibold text-[var(--foreground)]">Query Results</p>
            <div className="flex items-center gap-1.5">
              {ENGINE_ORDER.map((key) => {
                const meta = ENGINE_META[key];
                return (
                  <span
                    key={key}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ background: meta.color }}
                    title={meta.label}
                  >
                    {meta.label[0]}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="px-1">
            {probe.questions.map((q, i) => (
              <QuestionRow key={i} question={q} index={i} engines={probe.engines} />
            ))}
          </div>
        </div>
      )}

      {/* Simulation disclaimer */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-blue-500 text-sm">ℹ</span>
          <div>
            <p className="text-xs font-medium text-blue-800">Simulated Visibility</p>
            <p className="mt-0.5 text-[10px] text-blue-700 leading-relaxed">
              {probe.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
