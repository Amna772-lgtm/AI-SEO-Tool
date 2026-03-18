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

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return "var(--muted)";
  if (score >= 80) return "#10b981";
  if (score >= 65) return "#f59e0b";
  if (score >= 50) return "#f97316";
  return "#f43f5e";
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

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score, grade }: { score: number | null; grade: string | null }) {
  const color = scoreColor(score);
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
      title={`Score: ${score ?? "N/A"}`}
    >
      {grade ?? "?"}
    </div>
  );
}

// ── History card ──────────────────────────────────────────────────────────────

interface CardProps {
  item: HistoryItem;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function HistoryCard({ item, selected, selectionDisabled, onToggle, onDelete }: CardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--border)",
        backgroundColor: selected ? "var(--accent-light)" : "var(--surface)",
      }}
    >
      {/* Select checkbox */}
      <input
        type="checkbox"
        checked={selected}
        disabled={selectionDisabled && !selected}
        onChange={onToggle}
        className="h-4 w-4 flex-shrink-0 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        title={selectionDisabled ? "Select two items to compare" : selected ? "Deselect" : "Select for comparison"}
      />

      <ScoreBadge score={item.overall_score} grade={item.grade} />

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
            {item.domain}
          </span>
          {item.site_type && (
            <span
              className="rounded px-1.5 py-0.5 text-xs"
              style={{ backgroundColor: "var(--surface-elevated)", color: "var(--muted)" }}
            >
              {item.site_type}
            </span>
          )}
          {item.pages_count != null && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {item.pages_count} pages
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)" }}>
          {item.url}
        </div>
        <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
          {formatDate(item.analyzed_at)}
        </div>
      </div>

      {/* Score bar */}
      <div className="hidden w-24 flex-shrink-0 sm:block">
        <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--muted)" }}>
          <span>Score</span>
          <span style={{ color: scoreColor(item.overall_score) }}>{item.overall_score ?? "–"}</span>
        </div>
        <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--border)" }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${item.overall_score ?? 0}%`,
              backgroundColor: scoreColor(item.overall_score),
            }}
          />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="ml-1 flex-shrink-0 rounded p-1.5 text-xs transition-colors hover:bg-red-50 hover:text-red-600"
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
  return (
    <span style={{ color: delta > 0 ? "#16a34a" : "#dc2626" }} className="font-medium">
      {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
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

  function row(label: string, va: React.ReactNode, vb: React.ReactNode, delta?: React.ReactNode) {
    return (
      <tr key={label} className="border-b" style={{ borderColor: "var(--border)" }}>
        <td className="py-2 pr-4 text-sm font-medium" style={{ color: "var(--muted)" }}>{label}</td>
        <td className="py-2 pr-4 text-sm" style={{ color: "var(--foreground)" }}>{va ?? "—"}</td>
        <td className="py-2 pr-4 text-sm" style={{ color: "var(--foreground)" }}>{vb ?? "—"}</td>
        {delta !== undefined && <td className="py-2 text-sm">{delta}</td>}
      </tr>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded border px-3 py-1.5 text-sm transition-colors hover:bg-[var(--surface-elevated)]"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          ← Back
        </button>
        <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Comparison
        </h2>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full min-w-[600px] text-left">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", width: "28%" }}>Metric</th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--foreground)", width: "30%" }}>
                <div className="truncate">{a.domain}</div>
                <div className="truncate text-xs font-normal" style={{ color: "var(--muted)" }}>{formatDate(a.analyzed_at)}</div>
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--foreground)", width: "30%" }}>
                <div className="truncate">{b.domain}</div>
                <div className="truncate text-xs font-normal" style={{ color: "var(--muted)" }}>{formatDate(b.analyzed_at)}</div>
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted)", width: "12%" }}>Change</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ backgroundColor: "var(--background)" }}>
            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Overall Score</td>
            </tr>
            {row("Score", `${a.overall_score ?? "—"} (${a.grade ?? "?"})`, `${b.overall_score ?? "—"} (${b.grade ?? "?"})`,
              <Delta a={a.overall_score} b={b.overall_score} />)}
            {row("Site Type", a.site_type, b.site_type)}
            {row("Pages Crawled", a.pages_count, b.pages_count,
              <Delta a={a.pages_count} b={b.pages_count} />)}

            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Score Breakdown</td>
            </tr>
            {Object.entries(BREAKDOWN_LABELS).map(([k, label]) => {
              const va = a.score_breakdown?.[k as keyof typeof a.score_breakdown]?.raw;
              const vb = b.score_breakdown?.[k as keyof typeof b.score_breakdown]?.raw;
              return row(label, va ?? "—", vb ?? "—", <Delta a={va} b={vb} />);
            })}

            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Schema</td>
            </tr>
            {row("Has JSON-LD", ga?.schema?.has_json_ld ? "Yes" : "No", gb?.schema?.has_json_ld ? "Yes" : "No")}
            {row("Schema Coverage", ga?.schema?.coverage_percent != null ? `${ga.schema.coverage_percent}%` : "—",
              gb?.schema?.coverage_percent != null ? `${gb.schema.coverage_percent}%` : "—",
              <Delta a={ga?.schema?.coverage_percent} b={gb?.schema?.coverage_percent} />)}

            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>E-E-A-T</td>
            </tr>
            {row("E-E-A-T Score", ga?.eeat?.eeat_score, gb?.eeat?.eeat_score,
              <Delta a={ga?.eeat?.eeat_score} b={gb?.eeat?.eeat_score} />)}
            {row("Has About Page", ga?.eeat?.has_about_page ? "Yes" : "No", gb?.eeat?.has_about_page ? "Yes" : "No")}
            {row("Has Contact Page", ga?.eeat?.has_contact_page ? "Yes" : "No", gb?.eeat?.has_contact_page ? "Yes" : "No")}
            {row("Has Privacy Policy", ga?.eeat?.has_privacy_policy ? "Yes" : "No", gb?.eeat?.has_privacy_policy ? "Yes" : "No")}

            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Content</td>
            </tr>
            {row("Avg Word Count", ga?.content?.avg_word_count, gb?.content?.avg_word_count,
              <Delta a={ga?.content?.avg_word_count} b={gb?.content?.avg_word_count} />)}
            {row("Reading Level", ga?.content?.reading_level, gb?.content?.reading_level)}
            {row("FAQ Pages", ga?.content?.pages_with_faq, gb?.content?.pages_with_faq,
              <Delta a={ga?.content?.pages_with_faq} b={gb?.content?.pages_with_faq} />)}
            {row("Thin Content Pages", ga?.content?.thin_content_pages, gb?.content?.thin_content_pages,
              <Delta a={ga?.content?.thin_content_pages} b={gb?.content?.thin_content_pages} />)}

            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>NLP</td>
            </tr>
            {row("Primary Intent", ga?.nlp?.primary_intent, gb?.nlp?.primary_intent)}
            {row("AI Snippet Readiness", ga?.nlp?.ai_snippet_readiness, gb?.nlp?.ai_snippet_readiness)}

            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Technical</td>
            </tr>
            {row("HTTPS", a.audit_summary?.https_passed ? "Yes" : "No", b.audit_summary?.https_passed ? "Yes" : "No")}
            {row("Sitemap Found", a.audit_summary?.sitemap_found ? "Yes" : "No", b.audit_summary?.sitemap_found ? "Yes" : "No")}
            {row("Broken Links", a.audit_summary?.broken_links_count ?? "—", b.audit_summary?.broken_links_count ?? "—",
              <Delta a={a.audit_summary?.broken_links_count} b={b.audit_summary?.broken_links_count} />)}
            {row("Missing Canonicals", a.audit_summary?.missing_canonicals_count ?? "—", b.audit_summary?.missing_canonicals_count ?? "—",
              <Delta a={a.audit_summary?.missing_canonicals_count} b={b.audit_summary?.missing_canonicals_count} />)}
            {row("PSI Desktop", a.audit_summary?.psi_desktop_performance != null ? `${a.audit_summary.psi_desktop_performance}` : "—",
              b.audit_summary?.psi_desktop_performance != null ? `${b.audit_summary.psi_desktop_performance}` : "—",
              <Delta a={a.audit_summary?.psi_desktop_performance} b={b.audit_summary?.psi_desktop_performance} />)}
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

  // Initial load
  useEffect(() => {
    loadHistory(domain);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced re-load on domain filter change
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

  // Build trend data (oldest-first)
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
        <input
          type="text"
          placeholder="Filter by domain (e.g. example.com)"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--foreground)", width: 280 }}
        />
        {selectedIds.length === 2 && (
          <button
            onClick={startCompare}
            disabled={comparing}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {comparing ? "Loading…" : "Compare Selected"}
          </button>
        )}
        {selectedIds.length === 1 && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>Select one more to compare</span>
        )}
        <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
          {total} {total === 1 ? "analysis" : "analyses"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* History list */}
      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>Loading history…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>No analyses yet.</p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Complete a GEO analysis to start building history.</p>
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

      {/* Trend chart */}
      {trendData.length >= 2 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Score Trends
            {domain && <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>— {domain}</span>}
          </h3>
          <ScoreTrendChart data={trendData} />
        </div>
      )}
      {!loading && items.length > 0 && items.length < 2 && (
        <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
          Run at least 2 analyses for this domain to see a trend chart.
        </p>
      )}
    </div>
  );
}
