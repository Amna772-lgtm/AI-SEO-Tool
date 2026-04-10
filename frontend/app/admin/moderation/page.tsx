"use client";
import { useState, useEffect, useRef } from "react";
import {
  fetchAdminAnalyses,
  adminDeleteAnalysis,
  type AdminAnalysesResponse,
} from "@/app/lib/api";

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, onConfirm, onCancel, confirmLabel = "Confirm",
}: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)" }}
      role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(239,68,68,0.1)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{title}</h2>
          </div>
          <p className="text-xs mb-5 leading-relaxed" style={{ color: "var(--muted)", paddingLeft: "3rem" }}>{message}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel} className="rounded-lg px-4 py-2 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}>
              Cancel
            </button>
            <button onClick={onConfirm} className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 8px rgba(239,68,68,.3)" }}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GradeChip ─────────────────────────────────────────────────────────────────

function GradeChip({ grade, score }: { grade?: string | null; score?: number | null }) {
  if (!grade) return <span style={{ color: "var(--muted)" }}>—</span>;
  const colors: Record<string, { bg: string; color: string }> = {
    A: { bg: "rgba(16,185,129,0.1)", color: "#059669" },
    B: { bg: "rgba(59,130,246,0.1)", color: "#2563eb" },
    C: { bg: "rgba(234,179,8,0.1)", color: "#ca8a04" },
    D: { bg: "rgba(249,115,22,0.1)", color: "#ea580c" },
    F: { bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
  };
  const c = colors[grade] ?? { bg: "rgba(148,163,184,0.1)", color: "#64748b" };
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold"
        style={{ background: c.bg, color: c.color }}>
        {grade}
      </span>
      {score != null && (
        <span className="text-xs font-medium tabular-nums" style={{ color: "var(--foreground)" }}>{score}</span>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminModeration() {
  const [analyses, setAnalyses] = useState<AdminAnalysesResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; domain: string; date: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [analysesPage, setAnalysesPage] = useState(0);
  const ANALYSES_LIMIT = 10;

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  function loadAnalyses(overrides?: {
    searchVal?: string; dateFromVal?: string; dateToVal?: string;
    scoreMinVal?: string; scoreMaxVal?: string; page?: number;
  }) {
    const s = overrides?.searchVal ?? search;
    const df = overrides?.dateFromVal ?? dateFrom;
    const dt = overrides?.dateToVal ?? dateTo;
    const smin = overrides?.scoreMinVal ?? scoreMin;
    const smax = overrides?.scoreMaxVal ?? scoreMax;
    const pg = overrides?.page ?? analysesPage;

    fetchAdminAnalyses({
      search: s || undefined, date_from: df || undefined, date_to: dt || undefined,
      score_min: smin ? parseFloat(smin) : undefined, score_max: smax ? parseFloat(smax) : undefined,
      skip: pg * ANALYSES_LIMIT, limit: ANALYSES_LIMIT,
    }).then((data) => { setAnalyses(data); setSelected(new Set()); }).catch(() => {});
  }

  function handleApplyFilters() { setAnalysesPage(0); loadAnalyses({ page: 0 }); }

  function handleClearFilters() {
    setSearch(""); setDateFrom(""); setDateTo(""); setScoreMin(""); setScoreMax(""); setAnalysesPage(0);
    fetchAdminAnalyses({ skip: 0, limit: ANALYSES_LIMIT }).then((data) => { setAnalyses(data); setSelected(new Set()); }).catch(() => {});
  }

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { setAnalysesPage(0); loadAnalyses({ searchVal: search, page: 0 }); }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDeleteAnalysis() {
    if (!deleteTarget) return;
    try { await adminDeleteAnalysis(deleteTarget.id); setDeleteTarget(null); loadAnalyses(); }
    catch { setDeleteTarget(null); }
  }

  async function handleBulkDelete() {
    setBulkDeleteConfirm(false);
    setBulkDeleting(true);
    const ids = Array.from(selected);
    await Promise.allSettled(ids.map((id) => adminDeleteAnalysis(id)));
    setBulkDeleting(false);
    setSelected(new Set());
    loadAnalyses();
  }

  const pageRows = analyses?.analyses ?? [];
  const allPageSelected = pageRows.length > 0 && pageRows.every((a) => selected.has(a.id));
  const somePageSelected = pageRows.some((a) => selected.has(a.id));

  function toggleAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((a) => next.add(a.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const total = analyses?.total ?? 0;
  const startIdx = analysesPage * ANALYSES_LIMIT + 1;
  const endIdx = Math.min((analysesPage + 1) * ANALYSES_LIMIT, total);

  return (
    <div className="max-w-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 4px 12px rgba(13,148,136,.35)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--foreground)", letterSpacing: "-0.3px" }}>Audit Records</h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>View, search, filter, and delete audit records</p>
          </div>
        </div>
        {total > 0 && (
          <div className="rounded-xl px-4 py-2 text-xs font-semibold"
            style={{ background: "rgba(13,148,136,0.08)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.2)" }}>
            {total} total {total === 1 ? "audit" : "audits"}
          </div>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domain or email..."
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-xs transition-colors"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs bg-transparent outline-none" style={{ color: "var(--foreground)" }} />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="text-xs bg-transparent outline-none" style={{ color: "var(--foreground)" }} />
        </div>
        <input type="number" min="0" max="100" placeholder="Min score" value={scoreMin}
          onChange={(e) => setScoreMin(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-xs w-24"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
        <input type="number" min="0" max="100" placeholder="Max score" value={scoreMax}
          onChange={(e) => setScoreMax(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-xs w-24"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
        <button onClick={handleApplyFilters}
          className="rounded-lg px-4 py-2.5 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 2px 6px rgba(13,148,136,.3)" }}>
          Apply
        </button>
        <button onClick={handleClearFilters}
          className="rounded-lg px-4 py-2.5 text-xs font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}>
          Clear
        </button>
      </div>

      {/* Bulk action bar — visible when items are selected */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span className="text-xs font-semibold" style={{ color: "#dc2626" }}>
            {selected.size} {selected.size === 1 ? "audit" : "audits"} selected
          </span>
          <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkDeleting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 6px rgba(239,68,68,.3)" }}>
            {bulkDeleting ? (
              <>
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
                Delete
              </>
            )}
          </button>
        </div>
      )}

      {/* Audits table */}
      <div className="rounded-2xl overflow-hidden mb-5"
        style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
        {analyses === null ? (
          <div className="py-12 text-center">
            <div className="text-xs animate-pulse" style={{ color: "var(--muted)" }}>Loading audits...</div>
          </div>
        ) : analyses.analyses.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-3"
              style={{ background: "rgba(148,163,184,0.1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>No audits found</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Audits will appear here once users run analyses.</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--surface-elevated)" }}>
                    <th className="px-4 py-3 w-10" style={{ borderBottom: "1px solid var(--border)" }}>
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                        onChange={toggleAll}
                        aria-label="Select all on this page"
                        className="rounded"
                        style={{ accentColor: "#0d9488", cursor: "pointer" }}
                      />
                    </th>
                    {["Domain", "User Email", "Date", "Score / Grade", "Actions"].map(col => (
                      <th key={col} className="px-4 py-3 text-left font-semibold uppercase tracking-wider"
                        style={{ color: "var(--muted)", fontSize: "10px", borderBottom: "1px solid var(--border)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyses.analyses.map((a) => {
                    const dateStr = a.analyzed_at ? a.analyzed_at.slice(0, 10) : "—";
                    const isChecked = selected.has(a.id);
                    return (
                      <tr key={a.id}
                        style={{ borderBottom: "1px solid var(--border)", background: isChecked ? "rgba(13,148,136,0.04)" : "" }}
                        onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = "var(--surface-elevated)"; }}
                        onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = ""; }}>
                        <td className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(a.id)}
                            aria-label={`Select audit for ${a.domain}`}
                            className="rounded"
                            style={{ accentColor: "#0d9488", cursor: "pointer" }}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-medium" style={{ color: "var(--foreground)" }}>{a.domain}</td>
                        <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{a.user_email || "—"}</td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: "var(--muted)" }}>{dateStr}</td>
                        <td className="px-4 py-3">
                          <GradeChip grade={a.grade} score={a.overall_score} />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDeleteTarget({ id: a.id, domain: a.domain, date: dateStr })}
                            aria-label={`Delete audit for ${a.domain}`}
                            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ color: "#dc2626", background: "rgba(239,68,68,0.06)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--muted)" }}>Showing {startIdx}–{endIdx} of {total} audits</span>
              <div className="flex gap-2">
                <button disabled={analysesPage === 0}
                  onClick={() => { const pg = analysesPage - 1; setAnalysesPage(pg); loadAnalyses({ page: pg }); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}>
                  ← Previous
                </button>
                <button disabled={endIdx >= total}
                  onClick={() => { const pg = analysesPage + 1; setAnalysesPage(pg); loadAnalyses({ page: pg }); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}>
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Single delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this audit?"
          message={`This permanently removes the audit for ${deleteTarget.domain} from ${deleteTarget.date}. This cannot be undone.`}
          confirmLabel="Delete Audit"
          onConfirm={handleDeleteAnalysis}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteConfirm && (
        <ConfirmDialog
          title={`Delete ${selected.size} ${selected.size === 1 ? "audit" : "audits"}?`}
          message={`This permanently removes ${selected.size} selected ${selected.size === 1 ? "audit" : "audits"}. This cannot be undone.`}
          confirmLabel={`Delete ${selected.size} ${selected.size === 1 ? "Audit" : "Audits"}`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
