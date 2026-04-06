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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Score Ring (SVG donut) ────────────────────────────────────────────────────

function ScoreRing({ score, grade, size = 52 }: { score: number | null; grade: string | null; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = score != null ? (score / 100) * circ : 0;
  const color = scoreColor(score);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold leading-none" style={{ color, fontSize: size < 48 ? 10 : 12 }}>
          {grade ?? "?"}
        </span>
      </div>
    </div>
  );
}

// ── History Card ──────────────────────────────────────────────────────────────

interface CardProps {
  item: HistoryItem;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function HistoryCard({ item, selected, selectionDisabled, onToggle, onDelete }: CardProps) {
  const color = scoreColor(item.overall_score);
  return (
    <div
      className="group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all"
      style={{
        background: selected ? scoreBg(item.overall_score) : "var(--surface)",
        borderTop: `1px solid ${selected ? color : "var(--border)"}`,
        borderRight: `1px solid ${selected ? color : "var(--border)"}`,
        borderBottom: `1px solid ${selected ? color : "var(--border)"}`,
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        disabled={selectionDisabled && !selected}
        onChange={onToggle}
        className="h-4 w-4 flex-shrink-0 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        title={selectionDisabled ? "Select two items to compare" : selected ? "Deselect" : "Select for comparison"}
      />

      {/* Score ring */}
      <ScoreRing score={item.overall_score} grade={item.grade} size={48} />

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {item.domain}
          </span>
          {item.site_type && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: "var(--surface-elevated)", color: "var(--muted)" }}
            >
              {item.site_type}
            </span>
          )}
          {item.pages_count != null && (
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--surface-elevated)", color: "var(--muted)" }}>
              {item.pages_count} pages
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)", maxWidth: 340 }}>
          {item.url}
        </div>
        <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          {formatDate(item.analyzed_at)}
        </div>
      </div>

      {/* Score bar */}
      <div className="hidden w-28 flex-shrink-0 sm:block">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--muted)" }}>Score</span>
          <span className="text-sm font-bold" style={{ color }}>{item.overall_score ?? "–"}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${item.overall_score ?? 0}%`, background: color }}
          />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="ml-1 flex-shrink-0 rounded-lg p-1.5 text-xs opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
        style={{ color: "var(--muted)" }}
        title="Delete this record"
      >
        ✕
      </button>
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
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold"
      style={{
        background: up ? "#d1fae5" : "#ffe4e6",
        color: up ? "#059669" : "#dc2626",
      }}
    >
      {up ? "↑" : "↓"}{Math.abs(delta)}
    </span>
  );
}

// ── Compare view ──────────────────────────────────────────────────────────────

function CompareView({ records, onBack }: { records: [HistoryRecord, HistoryRecord]; onBack: () => void }) {
  const [a, b] = records;
  const ga = a.geo_data;
  const gb = b.geo_data;

  const BREAKDOWN_LABELS: Record<string, string> = {
    structured_data: "Structured Data",
    eeat:            "E-E-A-T",
    conversational:  "Conversational",
    technical:       "Technical",
    nlp:             "NLP Intent",
    speed:           "Speed & Access",
  };

  function SectionHeader({ label }: { label: string }) {
    return (
      <tr>
        <td
          colSpan={4}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          style={{ background: "var(--surface-elevated)", color: "var(--muted)", borderTop: "1px solid var(--border)" }}
        >
          {label}
        </td>
      </tr>
    );
  }

  function DataRow({ label, va, vb, delta }: {
    label: string;
    va: React.ReactNode;
    vb: React.ReactNode;
    delta?: React.ReactNode;
  }) {
    return (
      <tr
        className="border-b transition-colors hover:bg-[var(--surface-elevated)]"
        style={{ borderColor: "var(--border)" }}
      >
        <td className="px-4 py-2.5 text-xs font-medium" style={{ color: "var(--muted)", width: "28%" }}>{label}</td>
        <td className="px-4 py-2.5 text-sm" style={{ color: "var(--foreground)", width: "30%" }}>{va ?? "—"}</td>
        <td className="px-4 py-2.5 text-sm" style={{ color: "var(--foreground)", width: "30%" }}>{vb ?? "—"}</td>
        <td className="px-4 py-2.5 text-sm" style={{ width: "12%" }}>{delta ?? null}</td>
      </tr>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4">
      {/* Back bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--surface-elevated)]"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          ← Back
        </button>
        <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
          Comparison
        </h2>
      </div>

      {/* Site header cards */}
      <div className="grid grid-cols-3 gap-3">
        <div /> {/* metric column spacer */}
        {[a, b].map((rec, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <ScoreRing score={rec.overall_score} grade={rec.grade} size={52} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>{rec.domain}</div>
              <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{formatDate(rec.analyzed_at)}</div>
              <div
                className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ background: scoreBg(rec.overall_score), color: scoreColor(rec.overall_score) }}
              >
                {rec.overall_score ?? "?"} / 100
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full min-w-[600px] text-left border-collapse">
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", width: "28%", borderBottom: "2px solid var(--border)" }}>Metric</th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--foreground)", width: "30%", borderBottom: "2px solid var(--border)" }}>
                {a.domain}
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--foreground)", width: "30%", borderBottom: "2px solid var(--border)" }}>
                {b.domain}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", width: "12%", borderBottom: "2px solid var(--border)" }}>Change</th>
            </tr>
          </thead>
          <tbody style={{ background: "var(--background)" }}>
            <SectionHeader label="Overall Score" />
            <DataRow label="Score"
              va={<span className="font-semibold" style={{ color: scoreColor(a.overall_score) }}>{a.overall_score ?? "—"} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({a.grade ?? "?"})</span></span>}
              vb={<span className="font-semibold" style={{ color: scoreColor(b.overall_score) }}>{b.overall_score ?? "—"} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({b.grade ?? "?"})</span></span>}
              delta={<Delta a={a.overall_score} b={b.overall_score} />}
            />
            <DataRow label="Site Type" va={a.site_type} vb={b.site_type} />
            <DataRow label="Pages Crawled" va={a.pages_count} vb={b.pages_count} delta={<Delta a={a.pages_count} b={b.pages_count} />} />

            <SectionHeader label="Score Breakdown" />
            {Object.entries(BREAKDOWN_LABELS).map(([k, label]) => {
              const va = a.score_breakdown?.[k as keyof typeof a.score_breakdown]?.raw;
              const vb = b.score_breakdown?.[k as keyof typeof b.score_breakdown]?.raw;
              return <DataRow key={k} label={label} va={va ?? "—"} vb={vb ?? "—"} delta={<Delta a={va} b={vb} />} />;
            })}

            <SectionHeader label="Schema" />
            <DataRow label="Has JSON-LD" va={ga?.schema?.has_json_ld ? "Yes" : "No"} vb={gb?.schema?.has_json_ld ? "Yes" : "No"} />
            <DataRow label="Schema Coverage"
              va={ga?.schema?.coverage_percent != null ? `${ga.schema.coverage_percent}%` : "—"}
              vb={gb?.schema?.coverage_percent != null ? `${gb.schema.coverage_percent}%` : "—"}
              delta={<Delta a={ga?.schema?.coverage_percent} b={gb?.schema?.coverage_percent} />}
            />

            <SectionHeader label="E-E-A-T" />
            <DataRow label="E-E-A-T Score" va={ga?.eeat?.eeat_score} vb={gb?.eeat?.eeat_score} delta={<Delta a={ga?.eeat?.eeat_score} b={gb?.eeat?.eeat_score} />} />
            <DataRow label="Has About Page" va={ga?.eeat?.has_about_page ? "Yes" : "No"} vb={gb?.eeat?.has_about_page ? "Yes" : "No"} />
            <DataRow label="Has Contact Page" va={ga?.eeat?.has_contact_page ? "Yes" : "No"} vb={gb?.eeat?.has_contact_page ? "Yes" : "No"} />
            <DataRow label="Has Privacy Policy" va={ga?.eeat?.has_privacy_policy ? "Yes" : "No"} vb={gb?.eeat?.has_privacy_policy ? "Yes" : "No"} />

            <SectionHeader label="Content" />
            <DataRow label="Avg Word Count" va={ga?.content?.avg_word_count} vb={gb?.content?.avg_word_count} delta={<Delta a={ga?.content?.avg_word_count} b={gb?.content?.avg_word_count} />} />
            <DataRow label="Reading Level" va={ga?.content?.reading_level} vb={gb?.content?.reading_level} />
            <DataRow label="FAQ Pages" va={ga?.content?.pages_with_faq} vb={gb?.content?.pages_with_faq} delta={<Delta a={ga?.content?.pages_with_faq} b={gb?.content?.pages_with_faq} />} />
            <DataRow label="Thin Content Pages" va={ga?.content?.thin_content_pages} vb={gb?.content?.thin_content_pages} delta={<Delta a={ga?.content?.thin_content_pages} b={gb?.content?.thin_content_pages} />} />

            <SectionHeader label="NLP" />
            <DataRow label="Primary Intent" va={ga?.nlp?.primary_intent} vb={gb?.nlp?.primary_intent} />
            <DataRow label="AI Snippet Readiness" va={ga?.nlp?.ai_snippet_readiness} vb={gb?.nlp?.ai_snippet_readiness} />

            <SectionHeader label="Technical" />
            <DataRow label="HTTPS" va={a.audit_summary?.https_passed ? "Yes" : "No"} vb={b.audit_summary?.https_passed ? "Yes" : "No"} />
            <DataRow label="Sitemap Found" va={a.audit_summary?.sitemap_found ? "Yes" : "No"} vb={b.audit_summary?.sitemap_found ? "Yes" : "No"} />
            <DataRow label="Broken Links" va={a.audit_summary?.broken_links_count ?? "—"} vb={b.audit_summary?.broken_links_count ?? "—"} delta={<Delta a={a.audit_summary?.broken_links_count} b={b.audit_summary?.broken_links_count} />} />
            <DataRow label="Missing Canonicals" va={a.audit_summary?.missing_canonicals_count ?? "—"} vb={b.audit_summary?.missing_canonicals_count ?? "—"} delta={<Delta a={a.audit_summary?.missing_canonicals_count} b={b.audit_summary?.missing_canonicals_count} />} />
            <DataRow label="PSI Desktop" va={a.audit_summary?.psi_desktop_performance != null ? `${a.audit_summary.psi_desktop_performance}` : "—"} vb={b.audit_summary?.psi_desktop_performance != null ? `${b.audit_summary.psi_desktop_performance}` : "—"} delta={<Delta a={a.audit_summary?.psi_desktop_performance} b={b.audit_summary?.psi_desktop_performance} />} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main HistoryTab ───────────────────────────────────────────────────────────

export function HistoryTab({ initialDomain }: Props) {
  const [domain, setDomain] = useState(initialDomain ?? "");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareRecords, setCompareRecords] = useState<[HistoryRecord, HistoryRecord] | null>(null);
  const [view, setView] = useState<"list" | "compare">("list");
  const [comparing, setComparing] = useState(false);

  const loadHistory = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory({ domain: d || undefined, limit: 50 });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(domain);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => loadHistory(domain), 400);
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
      const [a, b] = await Promise.all([
        getHistoryRecord(selectedIds[0]),
        getHistoryRecord(selectedIds[1]),
      ]);
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
      setItems(prev => prev.filter(i => i.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
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

  if (view === "compare" && compareRecords) {
    return (
      <CompareView
        records={compareRecords}
        onBack={() => { setView("list"); setCompareRecords(null); }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
            style={{ color: "var(--muted)" }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Filter by domain…"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="rounded-lg border pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--foreground)",
              width: 260,
            }}
          />
        </div>

        {/* Compare action */}
        {selectedIds.length === 2 && (
          <button
            onClick={startCompare}
            disabled={comparing}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {comparing ? "Loading…" : "↔ Compare Selected"}
          </button>
        )}
        {selectedIds.length === 1 && (
          <span
            className="rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}
          >
            Select one more to compare
          </span>
        )}

        {/* Total count */}
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: "var(--surface-elevated)", color: "var(--muted)" }}
          >
            {total} {total === 1 ? "analysis" : "analyses"}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span>⚠</span> {error}
        </div>
      )}


      {/* Trend chart */}
      {trendData.length >= 2 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
              Score Trends
            </h3>
            {domain && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "var(--surface-elevated)", color: "var(--muted)" }}
              >
                {domain}
              </span>
            )}
          </div>
          <ScoreTrendChart data={trendData} />
        </div>
      )}
      {!loading && items.length > 0 && items.length < 2 && (
        <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
          Run at least 2 analyses for this domain to see a trend chart.
        </p>
      )}
      
      {/* History list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl"
              style={{ background: "var(--surface-elevated)" }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mb-3 text-3xl">📊</div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>No analyses yet</p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Complete a GEO analysis to start building history.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <HistoryCard
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              selectionDisabled={selectedIds.length >= 2 && !selectedIds.includes(item.id)}
              onToggle={() => toggleSelect(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
          {total > items.length && (
            <p className="pt-2 text-center text-xs" style={{ color: "var(--muted)" }}>
              Showing {items.length} of {total} analyses
            </p>
          )}
        </div>
      )}
    </div>
  );
}
