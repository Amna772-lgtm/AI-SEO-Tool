"use client";

import { useState } from "react";
import type { PageScoreResult, PageScoreIssue } from "../../lib/api";

function gradeStyle(grade: string): { color: string; bg: string } {
  switch (grade) {
    case "A": return { color: "#047857", bg: "#ecfdf5" };
    case "B": return { color: "#0891b2", bg: "#ecfeff" };
    case "C": return { color: "#b45309", bg: "#fffbeb" };
    case "D": return { color: "#ea580c", bg: "#fff7ed" };
    default:  return { color: "#dc2626", bg: "#fef2f2" };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "#047857";
  if (score >= 65) return "#b45309";
  if (score >= 50) return "#ea580c";
  return "#dc2626";
}

function priorityStyle(priority: PageScoreIssue["priority"]): { dot: string; text: string } {
  switch (priority) {
    case "critical":  return { dot: "#dc2626", text: "#991b1b" };
    case "important": return { dot: "#b45309", text: "#78350f" };
    default:          return { dot: "#9ca3af", text: "#374151" };
  }
}

function shortenUrl(url: string, maxChars = 55): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (path.length <= maxChars) return path || "/";
    return path.slice(0, maxChars) + "…";
  } catch {
    return url.length > maxChars ? url.slice(0, maxChars) + "…" : url;
  }
}

const ENGINE_LABELS: Record<string, string> = {
  claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini", grok: "Grok", perplexity: "Perplexity",
};

function PageRow({ page }: { page: PageScoreResult }) {
  const [expanded, setExpanded] = useState(false);
  const gs           = gradeStyle(page.grade);
  const criticalCount  = page.issues.filter(i => i.priority === "critical").length;
  const importantCount = page.issues.filter(i => i.priority === "important").length;

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      {/* Row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[var(--surface-elevated)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score + grade */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
          <span className="text-base font-bold leading-none" style={{ color: scoreColor(page.score) }}>
            {page.score}
          </span>
          <span
            className="rounded px-1 py-0.5 text-[9px] font-bold"
            style={{ background: gs.bg, color: gs.color }}
          >
            {page.grade}
          </span>
        </div>

        {/* URL + issue badges */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--foreground)]" title={page.url}>
            {shortenUrl(page.url)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {criticalCount > 0 && (
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600">
                {criticalCount} critical
              </span>
            )}
            {importantCount > 0 && (
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                {importantCount} important
              </span>
            )}
            {page.issues.length === 0 && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                No issues
              </span>
            )}
          </div>
        </div>

        {/* Per-engine scores */}
        {page.engine_scores && (
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            {(["claude", "chatgpt", "gemini", "grok", "perplexity"] as const).map(key => {
              const val   = page.engine_scores![key];
              const color = scoreColor(val);
              return (
                <div key={key} className="flex w-12 flex-col items-center gap-0.5">
                  <span className="w-full truncate text-center text-[9px] text-[var(--muted)]">{ENGINE_LABELS[key]}</span>
                  <span className="text-xs font-bold leading-none" style={{ color }}>{val}</span>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-3 bg-[var(--surface-elevated)] px-4 pb-3 pl-[64px]">
          {/* Signal badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { ok: page.has_author,    label: page.has_author    ? "Author"      : "No Author" },
              { ok: page.has_date,      label: page.has_date      ? "Dated"       : "No Date" },
              { ok: page.has_citations, label: page.has_citations ? "Citations"   : "No Citations" },
            ].map(({ ok, label }) => (
              <span
                key={label}
                className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-[9px] font-medium"
                style={{ color: ok ? "#047857" : "var(--muted)" }}
              >
                {ok ? "✓ " : ""}{label}
              </span>
            ))}
            {page.reading_grade != null && (
              <span className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-[9px] font-medium text-[var(--muted)]">
                Grade {page.reading_grade.toFixed(1)}
              </span>
            )}
          </div>

          {/* 5-category breakdown */}
          {page.breakdown && (
            <div className="space-y-1.5">
              {(["structured_data", "eeat", "content", "meta", "nlp"] as const).map(key => {
                const val = page.breakdown[key];
                const color = scoreColor(val);
                const LABELS: Record<string, string> = {
                  structured_data: "Structured Data (25%)",
                  eeat:            "E-E-A-T (25%)",
                  content:         "Content (20%)",
                  meta:            "Meta (15%)",
                  nlp:             "NLP / Semantic (15%)",
                };
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-[9px] text-[var(--muted)]">{LABELS[key]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                      <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: color }} />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[9px] font-bold" style={{ color }}>{val}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Issues */}
          {page.issues.length === 0 ? (
            <p className="text-xs text-emerald-600">No issues detected — this page is well-optimized.</p>
          ) : (
            <div className="space-y-1.5">
              {page.issues.map((issue, i) => {
                const ps = priorityStyle(issue.priority);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-white p-2.5"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ps.dot }} />
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: ps.text }}>
                        {issue.priority}
                      </span>
                      <p className="text-[10px] leading-relaxed" style={{ color: ps.text }}>
                        {issue.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  pageScores: PageScoreResult[];
}

type SortKey = "score" | "word_count" | "issues";

export function PageScoresPanel({ pageScores }: Props) {
  const [sort, setSort] = useState<SortKey>("score");

  const attentionCount = pageScores.filter(p => p.score < 65).length;

  const sorted = [...pageScores].sort((a, b) => {
    if (sort === "score")      return a.score - b.score;
    if (sort === "word_count") return a.word_count - b.word_count;
    if (sort === "issues")     return b.issues.length - a.issues.length;
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* Summary + sort */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">{pageScores.length}</span> pages scored
          {attentionCount > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-red-600">{attentionCount}</span> need attention
            </>
          )}
        </p>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-[var(--muted)]">Sort:</span>
          {(["score", "word_count", "issues"] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className="rounded px-2 py-0.5 font-medium transition-colors"
              style={{
                background: sort === key ? "var(--accent-light)" : "var(--surface-elevated)",
                color:      sort === key ? "var(--accent)" : "var(--muted)",
              }}
            >
              {key === "score" ? "Score ↑" : key === "word_count" ? "Words ↑" : "Issues ↓"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <div className="grid grid-cols-[48px_1fr] gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)] sm:grid-cols-[48px_1fr_auto]">
          <span>Score</span>
          <span>Page</span>
          <span className="hidden sm:block">AI Engine Citation Score</span>
        </div>
        {sorted.map(page => <PageRow key={page.url} page={page} />)}
      </div>

      <p className="text-[10px] text-[var(--muted)]">
        Pages sorted by AI citation readiness score. Click any row to view specific issues and fixes.
      </p>
    </div>
  );
}
