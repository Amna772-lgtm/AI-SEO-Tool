"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getHistory,
  getHistoryRecord,
  deleteHistoryRecord,
  type HistoryItem,
  type HistoryRecord,
} from "../../lib/api";
import { ScoreTrendChart, type TrendDataPoint } from "./ScoreTrendChart";

interface Props {
  initialDomain?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return "var(--muted)";
  if (score >= 80) return "#10b981";
  if (score >= 65) return "#f59e0b";
  if (score >= 50) return "#f97316";
  return "#f43f5e";
}

function scoreBg(score: number | null): string {
  if (score == null) return "#f3f4f6";
  if (score >= 80) return "#d1fae5";
  if (score >= 65) return "#fef3c7";
  if (score >= 50) return "#ffedd5";
  return "#ffe4e6";
}

function scoreLabel(score: number | null): string {
  if (score == null) return "N/A";
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

function filterTrendData(data: TrendDataPoint[], period: string): TrendDataPoint[] {
  if (period === "all") return data;
  const cutoff = new Date();
  if (period === "7d")  cutoff.setDate(cutoff.getDate() - 7);
  if (period === "30d") cutoff.setDate(cutoff.getDate() - 30);
  if (period === "3m")  cutoff.setMonth(cutoff.getMonth() - 3);
  return data.filter(d => new Date(d.date) >= cutoff);
}

// ── Score Ring (used only in CompareView) ─────────────────────────────────────

function ScoreRing({ score, grade, size = 52 }: { score: number | null; grade: string | null; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = score != null ? (score / 100) * circ : 0;
  const color = scoreColor(score);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold leading-none" style={{ color, fontSize: size < 48 ? 10 : size < 64 ? 12 : 15 }}>
          {grade ?? "?"}
        </span>
      </div>
    </div>
  );
}

// ── Delta badge ───────────────────────────────────────────────────────────────

function Delta({ a, b }: { a: number | null | undefined; b: number | null | undefined }) {
  if (a == null || b == null) return <span style={{ color: "var(--muted)" }}>—</span>;
  const delta = Math.round(b - a);
  if (delta === 0) return <span style={{ color: "var(--muted)" }}>—</span>;
  const up = delta > 0;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold"
      style={{ background: up ? "#d1fae5" : "#ffe4e6", color: up ? "#059669" : "#dc2626" }}>
      {up ? "↑" : "↓"}{Math.abs(delta)}
    </span>
  );
}

// ── Breakdown keys ────────────────────────────────────────────────────────────

const BREAKDOWN_KEYS = [
  { key: "structured_data", label: "Schema" },
  { key: "eeat",            label: "E-E-A-T" },
  { key: "conversational",  label: "Content" },
  { key: "nlp",             label: "NLP" },
  { key: "technical",       label: "Technical" },
  { key: "speed",           label: "Speed" },
] as const;

// ── Site type badge colours ───────────────────────────────────────────────────

const SITE_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  blog:           { bg: "#ede9fe", color: "#7c3aed" },
  saas:           { bg: "#dbeafe", color: "#1d4ed8" },
  ecommerce:      { bg: "#fce7f3", color: "#be185d" },
  news:           { bg: "#fef3c7", color: "#b45309" },
  local_business: { bg: "#dcfce7", color: "#15803d" },
  portfolio:      { bg: "#e0f2fe", color: "#0369a1" },
  informational:  { bg: "#f1f5f9", color: "#475569" },
  other:          { bg: "#f1f5f9", color: "#475569" },
};

// ── Mini bar chart ────────────────────────────────────────────────────────────

function MiniBarChart({ item, color }: { item: HistoryItem; color: string }) {
  const MAX_H = 30;
  const keys = BREAKDOWN_KEYS.map(k => k.key);
  const values = keys.map(k => {
    const raw = item.score_breakdown?.[k as keyof typeof item.score_breakdown]?.raw;
    return raw != null ? raw / 100 : null;
  });
  const hasData = values.some(v => v != null);
  // Fallback decorative pattern when no breakdown available
  const base = (item.overall_score ?? 50) / 100;
  const bars = hasData
    ? values.map(v => Math.max(0.05, v ?? 0.1))
    : [base * 1.1, base * 0.65, base * 0.9, base * 0.55, base * 1.2, base * 0.75].map(v => Math.min(1, Math.max(0.05, v)));
  return (
    <div className="flex flex-shrink-0 items-end gap-0.5" style={{ height: MAX_H, width: 42 }}>
      {bars.map((ratio, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{
          height: Math.max(3, Math.round(ratio * MAX_H)),
          background: color,
          opacity: ratio < 0.15 ? 0.45 : 1,
        }} />
      ))}
    </div>
  );
}

// ── History card ──────────────────────────────────────────────────────────────

interface CardProps {
  item: HistoryItem;
  index: number;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function HistoryCard({ item, selected, selectionDisabled, onToggle, onDelete }: CardProps) {
  const color = scoreColor(item.overall_score);
  const bg = scoreBg(item.overall_score);
  const siteStyle = SITE_TYPE_STYLES[item.site_type ?? "other"] ?? SITE_TYPE_STYLES.other;

  return (
    <div
      className="flex items-center gap-4 rounded-xl p-2 transition-all"
      style={{
        background: selected ? "#f3f4f6" : "var(--surface)",
        border: `1px solid ${selected ? "#9ca3af" : "var(--border)"}`,
        boxShadow: "0 1px 3px rgba(0,0,0,.06)",
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        disabled={selectionDisabled && !selected}
        onChange={e => { e.stopPropagation(); onToggle(); }}
        onClick={e => e.stopPropagation()}
        className="h-4 w-4 flex-shrink-0 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
      />

      {/* Score ring */}
      <ScoreRing score={item.overall_score} grade={item.grade} size={56} />

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{item.domain}</span>
          {item.site_type && (
            <span className="rounded-full px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
              style={{ background: siteStyle.bg, color: siteStyle.color }}>
              {item.site_type.replace("_", " ")}
            </span>
          )}
          {item.pages_count != null && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px]"
              style={{ background: "var(--surface-elevated)", color: "var(--muted)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              {item.pages_count} pages
            </span>
          )}
        </div>
        <div className="mt-1 flex max-w-xs items-center gap-1 truncate text-xs" style={{ color: "var(--accent)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span className="truncate">{item.url}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: "var(--muted)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatDate(item.analyzed_at)}
        </div>
      </div>

      {/* Right: mini bars + score + delete */}
      <div className="flex flex-shrink-0 items-center gap-3">
        <MiniBarChart item={item} color={color} />
        <div className="text-right" style={{ minWidth: 72 }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Score</p>
          <p className="text-[20px] font-bold tabular-nums leading-tight" style={{ color }}>{item.overall_score ?? "—"}</p>
          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${item.overall_score ?? 0}%`, background: color }} />
          </div>
        </div>
        {/* Delete button */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
          style={{ color: "var(--muted)" }}
          title="Delete record"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Compare view ──────────────────────────────────────────────────────────────

function CompareView({ records, onBack }: { records: [HistoryRecord, HistoryRecord]; onBack: () => void }) {
  const [a, b] = records;
  const ga = a.geo_data;
  const gb = b.geo_data;

  const overallDelta = a.overall_score != null && b.overall_score != null
    ? Math.round(b.overall_score - a.overall_score) : null;

  const BREAKDOWN_LABELS: Record<string, string> = {
    structured_data: "Structured Data",
    eeat:            "E-E-A-T",
    conversational:  "Conversational",
    technical:       "Technical",
    nlp:             "NLP Intent",
    speed:           "Speed & Access",
  };

  function bool(v: boolean | null | undefined): React.ReactNode {
    if (v == null) return <span style={{ color: "var(--muted)" }}>—</span>;
    return v
      ? <span style={{ color: "#0d9488", fontWeight: 500 }}>Yes</span>
      : <span style={{ color: "var(--muted)" }}>No</span>;
  }

  function ChangeBadge({ va, vb }: { va: number | null | undefined; vb: number | null | undefined }) {
    if (va == null || vb == null) return <span style={{ color: "var(--muted)" }}>—</span>;
    const d = Math.round((vb - va) * 10) / 10;
    if (d === 0) return <span style={{ color: "var(--muted)" }}>— 0</span>;
    const up = d > 0;
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold"
        style={{ background: up ? "#d1fae5" : "#ffe4e6", color: up ? "#059669" : "#dc2626" }}>
        {up ? "↑" : "↓"} {up ? "+" : ""}{d}
      </span>
    );
  }

  function SectionHeader({ label }: { label: string }) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: "linear-gradient(to right, #f0fdfa, #f8fafc)", color: "#0f766e", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          · {label}
        </td>
      </tr>
    );
  }

  function DataRow({ label, va, vb, delta }: {
    label: string; va: React.ReactNode; vb: React.ReactNode; delta?: React.ReactNode;
  }) {
    return (
      <tr className="transition-colors hover:bg-[#f8fafc]" style={{ borderBottom: "1px solid var(--border)" }}>
        <td className="px-4 py-3 text-sm" style={{ color: "#374151", width: "30%" }}>{label}</td>
        <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)", width: "28%" }}>{va ?? "—"}</td>
        <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)", width: "28%" }}>{vb ?? "—"}</td>
        <td className="px-4 py-3 text-right" style={{ width: "14%" }}>{delta ?? <span style={{ color: "var(--muted)" }}>—</span>}</td>
      </tr>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: "var(--background)" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between border-b px-6 py-3 bg-white"
        style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--surface-elevated)]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Comparison Report</h2>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Side-by-side analysis across 15 metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity"
            style={{ background: "linear-gradient(135deg, rgb(13, 148, 136), rgb(22, 163, 74))" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Hero 3-column card ── */}
      <div className="mx-6 mt-5 rounded-xl border bg-white" style={{ borderColor: "var(--border)" }}>
        <div className="grid" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
          {/* Baseline A */}
          <div className="flex items-center gap-4 p-5">
            <ScoreRing score={a.overall_score} grade={a.grade} size={52} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Baseline · A</p>
              <p className="mt-0.5 truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>{a.domain}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{formatDate(a.analyzed_at)}</p>
              <span className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{ background: scoreBg(a.overall_score), color: scoreColor(a.overall_score) }}>
                {a.overall_score ?? "?"} / 100 · Grade {a.grade ?? "?"}
              </span>
            </div>
          </div>

          {/* Center difference */}
          <div className="flex flex-col items-center justify-center border-x px-8 py-5"
            style={{ borderColor: "var(--border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Difference</p>
            {overallDelta != null ? (
              <>
                <p className="mt-1 text-4xl font-black tabular-nums leading-none"
                  style={{ color: overallDelta > 0 ? "#059669" : overallDelta < 0 ? "#dc2626" : "var(--muted)" }}>
                  {overallDelta > 0 ? "+" : ""}{overallDelta}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ background: overallDelta > 0 ? "#d1fae5" : overallDelta < 0 ? "#ffe4e6" : "#f1f5f9",
                           color: overallDelta > 0 ? "#059669" : overallDelta < 0 ? "#dc2626" : "#64748b" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                  {b.domain} {overallDelta > 0 ? "+" : ""}{overallDelta}
                </span>
              </>
            ) : (
              <p className="mt-1 text-2xl font-bold" style={{ color: "var(--muted)" }}>—</p>
            )}
          </div>

          {/* Comparison B */}
          <div className="flex items-center justify-end gap-4 p-5">
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Comparison · B</p>
              <p className="mt-0.5 truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>{b.domain}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{formatDate(b.analyzed_at)}</p>
              <span className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{ background: scoreBg(b.overall_score), color: scoreColor(b.overall_score) }}>
                {b.overall_score ?? "?"} / 100 · Grade {b.grade ?? "?"}
              </span>
            </div>
            <ScoreRing score={b.overall_score} grade={b.grade} size={52} />
          </div>
        </div>
      </div>

      {/* ── Metrics table ── */}
      <div className="mx-6 my-5 rounded-xl border bg-white" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8", width: "30%" }}>Metric</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8", width: "28%" }}>{a.domain}</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8", width: "28%" }}>{b.domain}</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8", width: "14%" }}>Change</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="Overall Score" />
              <DataRow label="Score"
                va={<span style={{ color: scoreColor(a.overall_score), fontWeight: 600 }}>{a.overall_score ?? "—"} ({a.grade ?? "?"})</span>}
                vb={<span style={{ color: scoreColor(b.overall_score), fontWeight: 600 }}>{b.overall_score ?? "—"} ({b.grade ?? "?"})</span>}
                delta={<ChangeBadge va={a.overall_score} vb={b.overall_score} />}
              />
              <DataRow label="Site Type" va={a.site_type ?? "—"} vb={b.site_type ?? "—"} />
              <DataRow label="Pages Crawled" va={a.pages_count ?? "—"} vb={b.pages_count ?? "—"}
                delta={<ChangeBadge va={a.pages_count} vb={b.pages_count} />} />

              <SectionHeader label="Score Breakdown" />
              {Object.entries(BREAKDOWN_LABELS).map(([k, label]) => {
                const va = a.score_breakdown?.[k as keyof typeof a.score_breakdown]?.raw;
                const vb = b.score_breakdown?.[k as keyof typeof b.score_breakdown]?.raw;
                return (
                  <DataRow key={k} label={label}
                    va={va != null ? <span style={{ color: vb != null && va >= vb ? "#0d9488" : "var(--foreground)" }}>{va}</span> : "—"}
                    vb={vb != null ? <span style={{ color: va != null && vb >= va ? "#0d9488" : "var(--foreground)" }}>{vb}</span> : "—"}
                    delta={<ChangeBadge va={va} vb={vb} />}
                  />
                );
              })}

              <SectionHeader label="Schema" />
              <DataRow label="Has JSON-LD" va={bool(ga?.schema?.has_json_ld)} vb={bool(gb?.schema?.has_json_ld)} />
              <DataRow label="Schema Coverage"
                va={ga?.schema?.coverage_percent != null ? `${ga.schema.coverage_percent}%` : "—"}
                vb={gb?.schema?.coverage_percent != null ? `${gb.schema.coverage_percent}%` : "—"}
                delta={<ChangeBadge va={ga?.schema?.coverage_percent} vb={gb?.schema?.coverage_percent} />}
              />

              <SectionHeader label="E-E-A-T" />
              <DataRow label="E-E-A-T Score" va={ga?.eeat?.eeat_score ?? "—"} vb={gb?.eeat?.eeat_score ?? "—"}
                delta={<ChangeBadge va={ga?.eeat?.eeat_score} vb={gb?.eeat?.eeat_score} />} />
              <DataRow label="Has About Page"   va={bool(ga?.eeat?.has_about_page)}   vb={bool(gb?.eeat?.has_about_page)} />
              <DataRow label="Has Contact Page"  va={bool(ga?.eeat?.has_contact_page)}  vb={bool(gb?.eeat?.has_contact_page)} />
              <DataRow label="Has Privacy Policy" va={bool(ga?.eeat?.has_privacy_policy)} vb={bool(gb?.eeat?.has_privacy_policy)} />

              <SectionHeader label="Content" />
              <DataRow label="Avg Word Count" va={ga?.content?.avg_word_count ?? "—"} vb={gb?.content?.avg_word_count ?? "—"}
                delta={<ChangeBadge va={ga?.content?.avg_word_count} vb={gb?.content?.avg_word_count} />} />
              <DataRow label="Reading Level"   va={ga?.content?.reading_level ?? "—"} vb={gb?.content?.reading_level ?? "—"} />
              <DataRow label="FAQ Pages"       va={ga?.content?.pages_with_faq ?? "—"} vb={gb?.content?.pages_with_faq ?? "—"}
                delta={<ChangeBadge va={ga?.content?.pages_with_faq} vb={gb?.content?.pages_with_faq} />} />
              <DataRow label="Thin Pages"      va={ga?.content?.thin_content_pages ?? "—"} vb={gb?.content?.thin_content_pages ?? "—"}
                delta={<ChangeBadge va={ga?.content?.thin_content_pages} vb={gb?.content?.thin_content_pages} />} />

              <SectionHeader label="NLP" />
              <DataRow label="Primary Intent"      va={ga?.nlp?.primary_intent ?? "—"} vb={gb?.nlp?.primary_intent ?? "—"} />
              <DataRow label="Snippet Readiness"   va={ga?.nlp?.ai_snippet_readiness ?? "—"} vb={gb?.nlp?.ai_snippet_readiness ?? "—"} />

              <SectionHeader label="Technical" />
              <DataRow label="HTTPS"              va={bool(a.audit_summary?.https_passed)}   vb={bool(b.audit_summary?.https_passed)} />
              <DataRow label="Sitemap Found"      va={bool(a.audit_summary?.sitemap_found)}  vb={bool(b.audit_summary?.sitemap_found)} />
              <DataRow label="Broken Links"       va={a.audit_summary?.broken_links_count ?? "—"} vb={b.audit_summary?.broken_links_count ?? "—"}
                delta={<ChangeBadge va={a.audit_summary?.broken_links_count} vb={b.audit_summary?.broken_links_count} />} />
              <DataRow label="Missing Canonicals" va={a.audit_summary?.missing_canonicals_count ?? "—"} vb={b.audit_summary?.missing_canonicals_count ?? "—"}
                delta={<ChangeBadge va={a.audit_summary?.missing_canonicals_count} vb={b.audit_summary?.missing_canonicals_count} />} />
              <DataRow label="PSI Desktop"
                va={a.audit_summary?.psi_desktop_performance != null ? `${a.audit_summary.psi_desktop_performance}` : "—"}
                vb={b.audit_summary?.psi_desktop_performance != null ? `${b.audit_summary.psi_desktop_performance}` : "—"}
                delta={<ChangeBadge va={a.audit_summary?.psi_desktop_performance} vb={b.audit_summary?.psi_desktop_performance} />}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main HistoryTab ───────────────────────────────────────────────────────────

type TrendPeriod = "7d" | "30d" | "3m" | "all";
const TREND_PERIODS: { key: TrendPeriod; label: string }[] = [
  { key: "7d",  label: "7D" },
  { key: "30d", label: "30D" },
  { key: "3m",  label: "3M" },
  { key: "all", label: "All" },
];

export function HistoryTab({ initialDomain }: Props) {
  const PAGE_SIZE = 10;
  const [domain, setDomain] = useState(initialDomain ?? "");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareRecords, setCompareRecords] = useState<[HistoryRecord, HistoryRecord] | null>(null);
  const [view, setView] = useState<"list" | "compare">("list");
  const [comparing, setComparing] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("all");

  const loadHistory = useCallback(async (d: string, pg: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory({ domain: d || undefined, limit: PAGE_SIZE, offset: pg * PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(domain, 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(0);
    const t = setTimeout(() => loadHistory(domain, 0), 400);
    return () => clearTimeout(t);
  }, [domain, loadHistory]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  async function startCompare() {
    if (selectedIds.length !== 2) return;
    setComparing(true);
    try {
      const [a, b] = await Promise.all([getHistoryRecord(selectedIds[0]), getHistoryRecord(selectedIds[1])]);
      setCompareRecords([a, b]);
      setView("compare");
    } catch {
      setError("Failed to load records for comparison.");
    } finally {
      setComparing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHistoryRecord(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
      const newTotal = Math.max(0, total - 1);
      const maxPage = Math.max(0, Math.ceil(newTotal / PAGE_SIZE) - 1);
      const newPage = Math.min(page, maxPage);
      setPage(newPage);
      loadHistory(domain, newPage);
    } catch {
      setError("Failed to delete record.");
    }
  }

  const trendData: TrendDataPoint[] = [...items].reverse().map(item => ({
    date: item.analyzed_at,
    overall: item.overall_score ?? 0,
    structured_data: item.score_breakdown?.structured_data?.raw,
    eeat: item.score_breakdown?.eeat?.raw,
    conversational: item.score_breakdown?.conversational?.raw,
    technical: item.score_breakdown?.technical?.raw,
    nlp: item.score_breakdown?.nlp?.raw,
    speed: item.score_breakdown?.speed?.raw,
  }));

  const filteredTrendData = filterTrendData(trendData, trendPeriod);

  // Stats
  const scores = items.map(i => i.overall_score).filter((s): s is number => s != null);
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bestItem = items.find(i => i.overall_score === bestScore);

  // Deltas vs previous item
  const prevScores = items.slice(1).map(i => i.overall_score).filter((s): s is number => s != null);
  const prevBest = prevScores.length > 0 ? Math.max(...prevScores) : null;
  const prevAvg = prevScores.length > 0 ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length) : null;
  const bestDelta = bestScore != null && prevBest != null ? bestScore - prevBest : null;
  const avgDelta = avgScore != null && prevAvg != null ? avgScore - prevAvg : null;

  // "This week" delta for header badge
  const latestTrend = trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoTrend = [...trendData].reverse().find(d => new Date(d.date) <= weekAgo) ?? null;
  const thisWeekDelta = latestTrend != null
    ? weekAgoTrend != null
      ? Math.round(latestTrend.overall - weekAgoTrend.overall)
      : trendData.length >= 2
        ? Math.round(trendData[trendData.length - 1].overall - trendData[trendData.length - 2].overall)
        : null
    : null;

  if (view === "compare" && compareRecords) {
    return (
      <CompareView records={compareRecords} onBack={() => { setView("list"); setCompareRecords(null); setSelectedIds([]); }} />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        {/* Search — fixed width */}
        <div className="relative" style={{ width: 400 }}>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input type="text" placeholder="Filter by domain…" value={domain} onChange={e => setDomain(e.target.value)}
            className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
        </div>

        {/* Total count badge — pushed to right */}
        <div className="ml-auto flex items-center gap-1.5 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent)", flexShrink: 0 }}>
            <path d="M3 3h18v4H3z" /><path d="M3 9h18v4H3z" /><path d="M3 15h18v4H3z" />
          </svg>
          <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{total}</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>analyses</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {error}
        </div>
      )}

      {/* ── Unified Score Trends card ── */}
      {!loading && items.length > 0 && (
        <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>

          {/* Card header */}
          <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "#ede9fe" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Score Trends</h3>
                </div>
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  Last {trendData.length} {trendData.length === 1 ? "analysis" : "analyses"} across all generative search signals
                </p>
              </div>
            </div>
            {/* Period filter */}
            <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: "var(--border)", background: "var(--surface-elevated)" }}>
              {TREND_PERIODS.map(({ key, label }) => (
                <button key={key} onClick={() => setTrendPeriod(key)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
                  style={{
                    background: trendPeriod === key ? "var(--accent)" : "transparent",
                    color: trendPeriod === key ? "white" : "var(--muted)",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="px-4 pb-2 pt-4">
            {trendData.length >= 2 ? (
              filteredTrendData.length >= 2 ? (
                <ScoreTrendChart data={filteredTrendData} height={200} />
              ) : (
                <div className="flex items-center justify-center py-10 text-xs" style={{ color: "var(--muted)" }}>
                  Not enough data for this period — try a wider range.
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-2 py-10 text-xs" style={{ color: "var(--muted)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                Run at least 2 analyses to see the score trend chart.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Compare button row ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {selectedIds.length === 0
            ? "Check two rows to compare"
            : selectedIds.length === 1
            ? "Select 1 more to compare"
            : "2 selected — ready to compare"}
        </p>
        {selectedIds.length === 2 ? (
          <button onClick={startCompare} disabled={comparing}
            className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60">
            {comparing
              ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Loading…</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8L22 12L18 16M6 8L2 12L6 16M14 4L10 20" /></svg>Compare</>
            }
          </button>
        ) : (
          <button disabled
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8L22 12L18 16M6 8L2 12L6 16M14 4L10 20" /></svg>
            Compare
          </button>
        )}
      </div>

      {/* ── Analysis History table ── */}
      <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {/* Card header */}
        <div className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--surface-elevated)" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Analysis History</h3>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              {selectedIds.length > 0
                ? `${selectedIds.length} of 2 selected for comparison`
                : "Check two rows to compare"}
            </p>
          </div>
          {items.length > 0 && (
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
              Page {page + 1} of {totalPages}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl" style={{ background: "var(--surface-elevated)" }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ background: "var(--surface-elevated)" }}>
              📊
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>No analyses yet</p>
            <p className="mt-1 max-w-xs text-xs" style={{ color: "var(--muted)" }}>
              {domain
                ? `No results for "${domain}". Try a different domain or clear the filter.`
                : "Complete a GEO analysis to start building history."}
            </p>
          </div>
        ) : (
          <>
            {/* Card list */}
            <div className="flex flex-col gap-3 p-4">
              {items.map((item, idx) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  index={page * PAGE_SIZE + idx}
                  selected={selectedIds.includes(item.id)}
                  selectionDisabled={selectedIds.length >= 2 && !selectedIds.includes(item.id)}
                  onToggle={() => toggleSelect(item.id)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t px-4 py-3"
                style={{ borderColor: "var(--border)", background: "var(--surface-elevated)" }}>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} analyses
                </span>
                <div className="flex gap-2">
                  <button disabled={page === 0}
                    onClick={() => { const pg = page - 1; setPage(pg); loadHistory(domain, pg); }}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 hover:bg-[var(--surface)]"
                    style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                    Previous
                  </button>
                  <button disabled={(page + 1) * PAGE_SIZE >= total}
                    onClick={() => { const pg = page + 1; setPage(pg); loadHistory(domain, pg); }}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 hover:bg-[var(--surface)]"
                    style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}>
                    Next
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
