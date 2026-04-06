"use client";

import type { ScoreResult, EngineScore } from "../../lib/api";

const ENGINE_ORDER = ["chatgpt", "perplexity", "gemini", "claude", "grok"];

const ENGINE_ICONS: Record<string, string> = {
  chatgpt:    "⊕",
  perplexity: "◎",
  gemini:     "✦",
  claude:     "◈",
  grok:       "⚡",
};

function gradeColor(grade: string): string {
  if (grade === "A") return "text-emerald-600";
  if (grade === "B") return "text-[var(--accent)]";
  if (grade === "C") return "text-amber-500";
  if (grade === "D") return "text-orange-500";
  return "text-red-500";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-[var(--accent)]";
  if (score >= 50) return "bg-amber-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function EngineCard({ engineKey, data }: { engineKey: string; data: EngineScore }) {
  const icon = ENGINE_ICONS[engineKey] ?? "○";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[var(--muted)]">{icon}</span>
          <span className="text-xs font-semibold text-[var(--foreground)]">{data.label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">{data.score}</span>
          <span className={`text-sm font-bold ${gradeColor(data.grade)}`}>{data.grade}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor(data.score)}`}
          style={{ width: `${data.score}%` }}
        />
      </div>

      {/* Focus label */}
      <p className="text-[10px] leading-tight text-[var(--muted)]">{data.focus}</p>
    </div>
  );
}

interface Props {
  score: ScoreResult;
}

export function EngineScores({ score }: Props) {
  const engineScores = score.engine_scores;
  if (!engineScores || Object.keys(engineScores).length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
      <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 rounded-t-xl">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Per-Engine Citation Scores</h2>
        <p className="text-[10px] text-[var(--muted)]">
          Each AI model weighs signals differently — target the engines most relevant to your audience
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
        {ENGINE_ORDER.map((key) => {
          const data = engineScores[key];
          if (!data) return null;
          return <EngineCard key={key} engineKey={key} data={data} />;
        })}
      </div>
    </div>
  );
}
