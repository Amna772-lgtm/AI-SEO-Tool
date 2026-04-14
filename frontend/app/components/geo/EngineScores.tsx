"use client";

import type { ScoreResult, EngineScore } from "../../lib/api";
import type { FC } from "react";

const ENGINE_ORDER = ["chatgpt", "perplexity", "gemini", "claude", "grok"];

function IconChatGPT({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-7.505-3.348 10.079 10.079 0 0 0-9.612 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.504 3.347 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813zM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496zM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744zM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L7.044 23.86a7.504 7.504 0 0 1-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l8.048 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.499v4.999l-4.331 2.5-4.331-2.5V18z" fill="#10a37f"/>
    </svg>
  );
}

function IconPerplexity({ size = 18 }: { size?: number }) {
  // 6-arm snowflake with Y-fork tips — Perplexity brand mark
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 6 main arms */}
      <line x1="12" y1="2"    x2="12" y2="22"   stroke="#1FB8CD" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="3.7" y1="7"   x2="20.3" y2="17" stroke="#1FB8CD" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="20.3" y1="7"  x2="3.7" y2="17"  stroke="#1FB8CD" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Y-fork at top */}
      <line x1="12" y1="5.2"  x2="9.8"  y2="3.2" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="12" y1="5.2"  x2="14.2" y2="3.2" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Y-fork at bottom */}
      <line x1="12" y1="18.8" x2="9.8"  y2="20.8" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="12" y1="18.8" x2="14.2" y2="20.8" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Y-fork at upper-right */}
      <line x1="17.9" y1="8.5" x2="20.1" y2="6.8" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="17.9" y1="8.5" x2="19.8" y2="11.0" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Y-fork at lower-left */}
      <line x1="6.1" y1="15.5" x2="3.9" y2="17.2" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="6.1" y1="15.5" x2="4.2" y2="13.0" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Y-fork at upper-left */}
      <line x1="6.1" y1="8.5" x2="3.9" y2="6.8" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="6.1" y1="8.5" x2="4.2" y2="11.0" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Y-fork at lower-right */}
      <line x1="17.9" y1="15.5" x2="20.1" y2="17.2" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="17.9" y1="15.5" x2="19.8" y2="13.0" stroke="#1FB8CD" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconGemini({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.305 14.305 0 0 0 12 12 14.305 14.305 0 0 0-12 12" fill="#4285f4"/>
    </svg>
  );
}

function IconClaude({ size = 18 }: { size?: number }) {
  // Anthropic/Claude brand mark — coral rounded asterisk (8 arms)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="2"    x2="12" y2="22"   stroke="#DA7557" strokeWidth="2.6" strokeLinecap="round"/>
      <line x1="2"  y1="12"   x2="22" y2="12"   stroke="#DA7557" strokeWidth="2.6" strokeLinecap="round"/>
      <line x1="4.1" y1="4.1" x2="19.9" y2="19.9" stroke="#DA7557" strokeWidth="2.6" strokeLinecap="round"/>
      <line x1="19.9" y1="4.1" x2="4.1" y2="19.9" stroke="#DA7557" strokeWidth="2.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconGrok({ size = 18 }: { size?: number }) {
  // Grok logo — ø style: circle with slash clearly extending beyond the ring
  return (
    '⚡'
  );
}

const ENGINE_ICON_COMPONENTS: Record<string, FC<{ size?: number }>> = {
  chatgpt:    IconChatGPT,
  perplexity: IconPerplexity,
  gemini:     IconGemini,
  claude:     IconClaude,
  grok:       IconGrok,
};

function scoreColor(score: number): string {
  if (score >= 80) return "#047857";
  if (score >= 65) return "#b45309";
  if (score >= 50) return "#ea580c";
  return "#dc2626";
}

function gradeColor(grade: string): string {
  if (grade === "A") return "#047857";
  if (grade === "B") return "#0891b2";
  if (grade === "C") return "#b45309";
  if (grade === "D") return "#ea580c";
  return "#dc2626";
}

function EngineCard({ engineKey, data }: { engineKey: string; data: EngineScore }) {
  const IconComponent = ENGINE_ICON_COMPONENTS[engineKey];
  const color = scoreColor(data.score);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {IconComponent && (
            <span style={{ lineHeight: 0, display: "inline-flex", flexShrink: 0 }}>
              <IconComponent size={16} />
            </span>
          )}
          <span className="text-xs font-semibold text-[var(--foreground)]">{data.label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>{data.score}</span>
          <span className="text-sm font-bold" style={{ color: gradeColor(data.grade) }}>{data.grade}</span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${data.score}%`, background: color }}
        />
      </div>
      <p className="text-[10px] leading-tight text-[var(--muted)]">{data.focus}</p>
    </div>
  );
}

interface Props {
  score: ScoreResult;
  /** When true, renders just the grid without the outer card wrapper (used inside a combined panel). */
  inline?: boolean;
}

export function EngineScores({ score, inline = false }: Props) {
  const engineScores = score.engine_scores;
  if (!engineScores || Object.keys(engineScores).length === 0) return null;

  const grid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ENGINE_ORDER.map(key => {
        const data = engineScores[key];
        if (!data) return null;
        return <EngineCard key={key} engineKey={key} data={data} />;
      })}
    </div>
  );

  if (inline) return grid;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
      <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 rounded-t-xl">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Per-Engine Citation Scores</h2>
        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
          Each AI model weighs signals differently — target the engines most relevant to your audience
        </p>
      </div>
      <div className="p-4">{grid}</div>
    </div>
  );
}
