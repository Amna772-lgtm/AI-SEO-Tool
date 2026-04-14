"use client";

import { useState } from "react";
import type { ProbeResult } from "../../lib/api";

const ENGINE_META: Record<string, { label: string; color: string }> = {
  claude:     { label: "Claude",     color: "#b45309" },
  chatgpt:    { label: "ChatGPT",    color: "#047857" },
  gemini:     { label: "Gemini",     color: "#1d4ed8" },
  grok:       { label: "Grok",       color: "#7c3aed" },
  perplexity: { label: "Perplexity", color: "#0e7490" },
};

const ENGINE_ORDER = ["claude", "chatgpt", "gemini", "grok", "perplexity"];

function visibilityStyle(label: string) {
  switch (label) {
    case "High":        return { color: "#047857", bg: "#ecfdf5" };
    case "Medium":      return { color: "#b45309", bg: "#fffbeb" };
    case "Low":         return { color: "#b45309", bg: "#fff7ed" };
    case "Not Visible": return { color: "#dc2626", bg: "#fef2f2" };
    default:            return { color: "#9ca3af", bg: "var(--surface-elevated)" };
  }
}

function EngineCard({ engineKey, detail }: {
  engineKey: string;
  detail: { mention_count?: number; mention_rate?: number; probes?: { domain_mentioned: boolean }[] };
}) {
  const meta  = ENGINE_META[engineKey] ?? { label: engineKey, color: "#9ca3af" };
  const rate  = detail.mention_rate ?? 0;
  const total = detail.probes?.length ?? 0;
  const rateColor = rate >= 70 ? "#047857" : rate >= 50 ? "#b45309" : "#dc2626";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
          style={{ background: meta.color }}
        >
          {meta.label[0]}
        </span>
        <span className="text-xs font-semibold text-[var(--foreground)]">{meta.label}</span>
      </div>
      <p className="text-xl font-bold leading-none tabular-nums" style={{ color: rateColor }}>
        {rate.toFixed(0)}%
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: rateColor }} />
      </div>
      <p className="text-[10px] text-[var(--muted)]">
        {detail.mention_count ?? 0}/{total} queries
      </p>
    </div>
  );
}

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
        className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-[var(--surface-elevated)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[10px] font-bold text-[var(--muted)]">
          {index + 1}
        </span>
        <p className="flex-1 text-xs leading-relaxed text-[var(--foreground)]">{question}</p>

        <div className="flex shrink-0 items-center gap-1">
          {ENGINE_ORDER.map((key) => {
            const probe     = engines[key]?.probes?.[index];
            const mentioned = probe?.domain_mentioned ?? false;
            return (
              <span
                key={key}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  background: mentioned ? "#ecfdf5" : "#f3f4f6",
                  color: mentioned ? "#047857" : "#9ca3af",
                }}
                title={`${ENGINE_META[key]?.label}: ${mentioned ? "Mentioned" : "Not mentioned"}`}
              >
                {mentioned ? "✓" : "·"}
              </span>
            );
          })}
          <span className="ml-1 text-[10px] text-[var(--muted)]">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 bg-[var(--surface-elevated)] px-4 pb-3 pl-11">
          {ENGINE_ORDER.map((key) => {
            const probe = engines[key]?.probes?.[index];
            if (!probe) return null;
            const meta = ENGINE_META[key];
            return (
              <div
                key={key}
                className="rounded-md border border-[var(--border)] bg-white p-3"
              >
                <p className="mb-1.5 text-[10px] font-semibold" style={{ color: meta?.color }}>
                  {meta?.label} response:
                </p>
                <p className="text-[10px] leading-relaxed italic text-[var(--muted)]">
                  &ldquo;{probe.response_excerpt ?? "No response captured."}&rdquo;
                </p>
                {probe.domain_mentioned && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                    ✓ Domain mentioned
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

interface Props {
  probe: ProbeResult | null;
}

export function ProbePanel({ probe }: Props) {
  if (!probe) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-8 text-center">
        <p className="text-sm font-semibold text-[var(--foreground)]">ANTHROPIC_API_KEY not configured</p>
        <p className="max-w-sm text-xs text-[var(--muted)]">
          Add <span className="font-mono font-bold">ANTHROPIC_API_KEY</span> to your{" "}
          <span className="font-mono">.env</span> file to enable AI visibility probing.
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
          className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3"
          style={{ background: vs.bg }}
        >
          <span className="text-2xl font-bold tabular-nums" style={{ color: vs.color }}>
            {probe.overall_mention_rate.toFixed(0)}%
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: vs.color }}>{probe.visibility_label}</p>
            <p className="text-[10px] text-[var(--muted)]">Overall visibility</p>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">{probe.engines_tested}</span> engines tested
        </p>
        <p className="text-[10px] text-[var(--muted)]">
          Domain: <span className="font-mono font-medium text-[var(--foreground)]">{probe.domain_checked}</span>
        </p>
      </div>

      {/* Engine cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ENGINE_ORDER.map((key) => (
          <EngineCard
            key={key}
            engineKey={key}
            detail={probe.engines[key] ?? { mention_count: 0, mention_rate: 0, probes: [] }}
          />
        ))}
      </div>

      {/* Questions */}
      {probe.questions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Query Results</p>
            <div className="flex items-center gap-1.5">
              {ENGINE_ORDER.map((key) => {
                const meta = ENGINE_META[key];
                return (
                  <span
                    key={key}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ background: meta?.color }}
                    title={meta?.label}
                  >
                    {meta?.label[0]}
                  </span>
                );
              })}
            </div>
          </div>
          <div>
            {probe.questions.map((q, i) => (
              <QuestionRow key={i} question={q} index={i} engines={probe.engines} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-[var(--muted)]">ℹ</span>
          <div>
            <p className="text-xs font-medium text-[var(--foreground)]">Simulated Visibility</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">{probe.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
