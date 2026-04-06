"use client";

import { useState } from "react";
import type { PageScoreResult, PageScoreIssue } from "../../lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function gradeStyle(grade: string): { text: string; bg: string } {
  switch (grade) {
    case "A": return { text: "#15803d", bg: "#dcfce7" };
    case "B": return { text: "#166534", bg: "#bbf7d0" };
    case "C": return { text: "#92400e", bg: "#fef3c7" };
    case "D": return { text: "#b45309", bg: "#ffedd5" };
    default:  return { text: "#dc2626", bg: "#fee2e2" };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 65) return "#ca8a04";
  if (score >= 50) return "#ea580c";
  return "#dc2626";
}

function priorityStyle(priority: PageScoreIssue["priority"]): { dot: string; text: string; bg: string } {
  switch (priority) {
    case "critical":  return { dot: "#dc2626", text: "#991b1b", bg: "#fee2e2" };
    case "important": return { dot: "#ca8a04", text: "#78350f", bg: "#fef3c7" };
    default:          return { dot: "#6b7280", text: "#374151", bg: "#f3f4f6" };
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

function Badge({ color, label }: { color: "green" | "red" | "amber" | "neutral"; label: string }) {
  const styles = {
    green:   { bg: "#dcfce7", text: "#166534" },
    red:     { bg: "#fee2e2", text: "#991b1b" },
    amber:   { bg: "#fef3c7", text: "#78350f" },
    neutral: { bg: "#f3f4f6", text: "#374151" },
  }[color];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-medium"
      style={{ background: styles.bg, color: styles.text }}
    >
      {label}
    </span>
  );
}

// ── Page row ─────────────────────────────────────────────────────────────────

function PageRow({ page }: { page: PageScoreResult }) {
  const [expanded, setExpanded] = useState(false);
  const gs = gradeStyle(page.grade);
  const criticalCount = page.issues.filter((i) => i.priority === "critical").length;
  const importantCount = page.issues.filter((i) => i.priority === "important").length;

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      {/* Main row */}
      <div
        className="flex cursor-pointer items-center gap-3 py-2.5 px-3 hover:bg-[var(--surface-elevated)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score badge */}
        <div className="flex flex-col items-center gap-0.5 w-12 shrink-0">
          <span className="text-base font-bold leading-none" style={{ color: scoreColor(page.score) }}>
            {page.score}
          </span>
          <span
            className="rounded px-1 py-0.5 text-[9px] font-bold"
            style={{ background: gs.bg, color: gs.text }}
          >
            {page.grade}
          </span>
        </div>

        {/* URL */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--foreground)] truncate" title={page.url}>
            {shortenUrl(page.url)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {criticalCount > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">
                {criticalCount} critical
              </span>
            )}
            {importantCount > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                {importantCount} important
              </span>
            )}
            {page.issues.length === 0 && (
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700">
                No issues
              </span>
            )}
          </div>
        </div>

        {/* AI engine citation scores */}
        {page.engine_scores && (
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {(["claude", "chatgpt", "gemini", "grok", "perplexity"] as const).map((key) => {
              const val = page.engine_scores![key];
              const color = val >= 80 ? "#16a34a" : val >= 60 ? "#ca8a04" : val >= 40 ? "#ea580c" : "#dc2626";
              const ENGINE_LABELS: Record<string, string> = {
                claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini", grok: "Grok", perplexity: "Perplexity",
              };
              return (
                <div key={key} className="flex flex-col items-center gap-0.5 w-12">
                  <span className="text-[9px] text-[var(--muted)] truncate w-full text-center">{ENGINE_LABELS[key]}</span>
                  <span className="text-xs font-bold leading-none" style={{ color }}>{val}</span>
                  <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden mt-0.5">
                    <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded: signal badges + breakdown bars + issues */}
      {expanded && (
        <div className="px-3 pb-3 pl-[60px] space-y-3">
          {/* Signal badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge color={page.has_author ? "green" : "red"} label={page.has_author ? "Author" : "No Author"} />
            <Badge color={page.has_date ? "green" : "amber"} label={page.has_date ? "Dated" : "No Date"} />
            <Badge color={page.has_citations ? "green" : "amber"} label={page.has_citations ? "Citations" : "No Citations"} />
            {page.reading_grade != null && (
              <Badge color="neutral" label={`Grade ${page.reading_grade.toFixed(1)}`} />
            )}
          </div>

          {/* 5-category breakdown bars */}
          {page.breakdown && (
            <div className="space-y-1.5">
              {(["structured_data", "eeat", "content", "meta", "nlp"] as const).map((key) => {
                const val = page.breakdown[key];
                const LABELS: Record<string, string> = {
                  structured_data: "Structured Data (25%)",
                  eeat:            "E-E-A-T (25%)",
                  content:         "Content (20%)",
                  meta:            "Meta (15%)",
                  nlp:             "NLP / Semantic (15%)",
                };
                const color = val >= 80 ? "#16a34a" : val >= 60 ? "#ca8a04" : "#dc2626";
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-[9px] text-[var(--muted)]">{LABELS[key]}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                    </div>
                    <span className="w-6 shrink-0 text-[9px] font-bold text-right" style={{ color }}>{val}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Issues */}
          {page.issues.length === 0 ? (
            <p className="text-xs text-green-600">No issues detected — this page is well-optimized.</p>
          ) : (
            page.issues.map((issue, i) => {
              const ps = priorityStyle(issue.priority);
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md border p-2"
                  style={{ borderColor: ps.dot + "40", background: ps.bg }}
                >
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: ps.dot }}
                  />
                  <div>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wide"
                      style={{ color: ps.text }}
                    >
                      {issue.priority}
                    </span>
                    <p className="text-[10px] leading-relaxed" style={{ color: ps.text }}>
                      {issue.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  pageScores: PageScoreResult[];
}

type SortKey = "score" | "word_count" | "issues";

export function PageScoresPanel({ pageScores }: Props) {
  const [sort, setSort] = useState<SortKey>("score");

  const attentionCount = pageScores.filter((p) => p.score < 65).length;

  const sorted = [...pageScores].sort((a, b) => {
    if (sort === "score") return a.score - b.score;
    if (sort === "word_count") return a.word_count - b.word_count;
    if (sort === "issues") return b.issues.length - a.issues.length;
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* Summary + sort bar */}
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
          {(["score", "word_count", "issues"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className="rounded px-2 py-0.5 font-medium transition-colors"
              style={{
                background: sort === key ? "var(--accent-light)" : "var(--surface-elevated)",
                color: sort === key ? "var(--accent)" : "var(--muted)",
              }}
            >
              {key === "score" ? "Score ↑" : key === "word_count" ? "Words ↑" : "Issues ↓"}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="grid grid-cols-[48px_1fr] sm:grid-cols-[48px_1fr_auto] gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          <span>Score</span>
          <span>Page</span>
          <span className="hidden sm:block">AI Engine Citation Score</span>
        </div>
        {sorted.map((page) => (
          <PageRow key={page.url} page={page} />
        ))}
      </div>

      <p className="text-[10px] text-[var(--muted)]">
        Pages sorted by AI citation readiness score. Click any row to view specific issues and fixes.
        Scores reflect content depth, structured data, and metadata completeness.
      </p>
    </div>
  );
}
