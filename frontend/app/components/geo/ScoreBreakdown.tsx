"use client";

import type { ScoreResult } from "../../lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  structured_data: "Structured Data",
  eeat:            "E-E-A-T",
  conversational:  "Conversational",
  technical:       "Technical",
  nlp:             "NLP Intent",
  speed:           "Speed & Access",
  probe:           "AI Probe",
  entity:          "Entity",
};

const CATEGORY_ICONS: Record<string, string> = {
  structured_data: "{}",
  eeat:            "★",
  conversational:  "💬",
  technical:       "⚙",
  nlp:             "🧠",
  speed:           "⚡",
  probe:           "◎",
  entity:          "⬡",
};

function scoreColor(raw: number): string {
  if (raw >= 80) return "#16a34a";
  if (raw >= 60) return "#ca8a04";
  if (raw >= 40) return "#ea580c";
  return "#dc2626";
}

interface Props {
  score: ScoreResult;
}

export function ScoreBreakdown({ score }: Props) {
  const categories = Object.entries(score.breakdown);

  return (
    <div className="space-y-2">
      {categories.map(([key, data]) => {
        const pct = Math.round(data.raw);
        const color = scoreColor(pct);
        return (
          <div key={key} className="group">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                <span className="w-4 text-center text-[10px] opacity-60">{CATEGORY_ICONS[key]}</span>
                {CATEGORY_LABELS[key] ?? key}
                <span className="text-[var(--muted)]">({data.weight}%)</span>
              </span>
              <span className="font-semibold tabular-nums" style={{ color }}>
                {pct}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
