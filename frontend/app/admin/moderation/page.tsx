"use client";
import { useState, useEffect, useRef } from "react";
import {
  fetchAdminAnalyses,
  adminDeleteAnalysis,
  fetchBannedDomains,
  adminBanDomain,
  adminUnbanDomain,
  fetchQuotaOverrides,
  adminSetQuotaOverride,
  adminRemoveQuotaOverride,
  type AdminAnalysesResponse,
  type BannedDomain,
  type QuotaOverride,
} from "@/app/lib/api";

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-lg p-6 bg-[var(--surface)] border border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="text-xs text-[var(--muted)] mt-1 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-xs border border-[var(--border)] text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded px-4 py-2 text-xs font-semibold text-white bg-[var(--error)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminModeration() {
  // Analyses state
  const [analyses, setAnalyses] = useState<AdminAnalysesResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; domain: string; date: string } | null>(null);

  // Filter state (per D-25)
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [analysesPage, setAnalysesPage] = useState(0);
  const ANALYSES_LIMIT = 50;

  // Domain blocklist state
  const [bannedDomains, setBannedDomains] = useState<BannedDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainReason, setNewDomainReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);

  // Quota overrides state
  const [quotaOverrides, setQuotaOverrides] = useState<QuotaOverride[]>([]);
  const [newOverrideUserId, setNewOverrideUserId] = useState("");
  const [newOverrideQuota, setNewOverrideQuota] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [editingOverride, setEditingOverride] = useState<string | null>(null);
  const [editingQuotaVal, setEditingQuotaVal] = useState("");

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial data
  useEffect(() => {
    loadAnalyses();
    fetchBannedDomains().then(setBannedDomains).catch(() => {});
    fetchQuotaOverrides().then(setQuotaOverrides).catch(() => {});
  }, []);

  function loadAnalyses(overrides?: {
    searchVal?: string;
    dateFromVal?: string;
    dateToVal?: string;
    scoreMinVal?: string;
    scoreMaxVal?: string;
    page?: number;
  }) {
    const s = overrides?.searchVal ?? search;
    const df = overrides?.dateFromVal ?? dateFrom;
    const dt = overrides?.dateToVal ?? dateTo;
    const smin = overrides?.scoreMinVal ?? scoreMin;
    const smax = overrides?.scoreMaxVal ?? scoreMax;
    const pg = overrides?.page ?? analysesPage;

    fetchAdminAnalyses({
      search: s || undefined,
      date_from: df || undefined,
      date_to: dt || undefined,
      score_min: smin ? parseFloat(smin) : undefined,
      score_max: smax ? parseFloat(smax) : undefined,
      skip: pg * ANALYSES_LIMIT,
      limit: ANALYSES_LIMIT,
    })
      .then(setAnalyses)
      .catch(() => {});
  }

  function handleApplyFilters() {
    setAnalysesPage(0);
    loadAnalyses({ page: 0 });
  }

  function handleClearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setScoreMin("");
    setScoreMax("");
    setAnalysesPage(0);
    fetchAdminAnalyses({ skip: 0, limit: ANALYSES_LIMIT })
      .then(setAnalyses)
      .catch(() => {});
  }

  // Search debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setAnalysesPage(0);
      loadAnalyses({ searchVal: search, page: 0 });
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDeleteAnalysis() {
    if (!deleteTarget) return;
    await adminDeleteAnalysis(deleteTarget.id).catch(() => {});
    setDeleteTarget(null);
    loadAnalyses();
  }

  async function handleBanDomain() {
    if (!newDomain.trim()) return;
    setBanLoading(true);
    try {
      await adminBanDomain(newDomain.trim(), newDomainReason.trim() || undefined);
      setNewDomain("");
      setNewDomainReason("");
      const list = await fetchBannedDomains();
      setBannedDomains(list);
    } catch {
      // ignore
    } finally {
      setBanLoading(false);
    }
  }

  async function handleUnbanDomain(domain: string) {
    await adminUnbanDomain(domain).catch(() => {});
    const list = await fetchBannedDomains().catch(() => []);
    setBannedDomains(list);
  }

  async function handleSetQuota() {
    if (!newOverrideUserId.trim() || !newOverrideQuota.trim()) return;
    setOverrideLoading(true);
    try {
      await adminSetQuotaOverride(newOverrideUserId.trim(), parseInt(newOverrideQuota, 10));
      setNewOverrideUserId("");
      setNewOverrideQuota("");
      const list = await fetchQuotaOverrides();
      setQuotaOverrides(list);
    } catch {
      // ignore
    } finally {
      setOverrideLoading(false);
    }
  }

  async function handleRemoveQuota(userId: string) {
    await adminRemoveQuotaOverride(userId).catch(() => {});
    const list = await fetchQuotaOverrides().catch(() => []);
    setQuotaOverrides(list);
  }

  async function handleSaveQuotaEdit(userId: string) {
    if (!editingQuotaVal.trim()) return;
    await adminSetQuotaOverride(userId, parseInt(editingQuotaVal, 10)).catch(() => {});
    setEditingOverride(null);
    setEditingQuotaVal("");
    const list = await fetchQuotaOverrides().catch(() => []);
    setQuotaOverrides(list);
  }

  const total = analyses?.total ?? 0;
  const currentPage = analysesPage;
  const startIdx = currentPage * ANALYSES_LIMIT + 1;
  const endIdx = Math.min((currentPage + 1) * ANALYSES_LIMIT, total);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Moderation</h1>
        <p className="text-xs text-[var(--muted)]">Audit records, domain blocklist, and rate limit overrides</p>
      </div>

      {/* Section 1: All Audits Table */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden mb-4">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
            ALL AUDITS
          </div>

          {/* Search row */}
          <div className="mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by domain or user email..."
              className="w-full rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)]"
            />
          </div>

          {/* Date and score filter row (per D-25) */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <label className="text-xs text-[var(--muted)]">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded border border-[var(--border)] px-2 py-1.5 text-xs bg-[var(--surface)]"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-[var(--muted)]">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded border border-[var(--border)] px-2 py-1.5 text-xs bg-[var(--surface)]"
              />
            </div>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Min score"
              value={scoreMin}
              onChange={(e) => setScoreMin(e.target.value)}
              className="rounded border border-[var(--border)] px-2 py-1.5 text-xs bg-[var(--surface)] w-24"
            />
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Max score"
              value={scoreMax}
              onChange={(e) => setScoreMax(e.target.value)}
              className="rounded border border-[var(--border)] px-2 py-1.5 text-xs bg-[var(--surface)] w-24"
            />
            <button
              onClick={handleApplyFilters}
              className="rounded px-3 py-1.5 text-xs font-semibold text-white bg-[var(--accent)]"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="rounded px-3 py-1.5 text-xs border border-[var(--border)] text-[var(--muted)]"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Audits table */}
        {analyses === null ? (
          <div className="p-4 text-xs text-[var(--muted)] animate-pulse">Loading audits...</div>
        ) : analyses.analyses.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-sm font-semibold text-[var(--foreground)]">No audits yet</div>
            <div className="text-xs text-[var(--muted)] mt-1">
              Audits will appear here once users run analyses.
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-elevated)] text-[var(--muted)] uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Domain</th>
                    <th className="px-4 py-2 text-left">User Email</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Grade</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.analyses.map((a) => {
                    const dateStr = a.analyzed_at
                      ? a.analyzed_at.slice(0, 10)
                      : "--";
                    return (
                      <tr
                        key={a.id}
                        className="border-t border-[var(--border)] hover:bg-[var(--surface-elevated)]"
                      >
                        <td className="px-4 py-2 font-mono text-xs">{a.domain}</td>
                        <td className="px-4 py-2 text-[var(--muted)]">
                          {a.user_email || "--"}
                        </td>
                        <td className="px-4 py-2 text-[var(--muted)]">{dateStr}</td>
                        <td className="px-4 py-2">
                          {a.overall_score != null ? a.overall_score : "--"}
                        </td>
                        <td className="px-4 py-2">{a.grade || "--"}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() =>
                              setDeleteTarget({ id: a.id, domain: a.domain, date: dateStr })
                            }
                            aria-label={`Delete audit for ${a.domain}`}
                            className="text-xs text-[var(--error)] hover:underline"
                          >
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
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
              <span>
                Showing {startIdx}&#8211;{endIdx} of {total} audits
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 0}
                  onClick={() => {
                    const pg = currentPage - 1;
                    setAnalysesPage(pg);
                    loadAnalyses({ page: pg });
                  }}
                  className="rounded border border-[var(--border)] px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={endIdx >= total}
                  onClick={() => {
                    const pg = currentPage + 1;
                    setAnalysesPage(pg);
                    loadAnalyses({ page: pg });
                  }}
                  className="rounded border border-[var(--border)] px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Section 2: Domain Blocklist */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              DOMAIN BLOCKLIST
            </span>
            <span className="bg-[var(--surface-elevated)] text-[var(--muted)] rounded-full px-2 py-0.5 text-[10px]">
              {bannedDomains.length}
            </span>
          </div>

          {/* Add form */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)]"
            />
            <input
              type="text"
              value={newDomainReason}
              onChange={(e) => setNewDomainReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)]"
            />
            <button
              onClick={handleBanDomain}
              disabled={banLoading || !newDomain.trim()}
              aria-label="Ban domain"
              className="rounded px-4 py-2 text-xs font-semibold text-white bg-[var(--accent)] disabled:opacity-50"
            >
              {banLoading ? "..." : "Ban Domain"}
            </button>
          </div>

          {/* Blocklist */}
          {bannedDomains.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-sm font-semibold text-[var(--foreground)]">No blocked domains</div>
              <div className="text-xs text-[var(--muted)] mt-1">
                Add domains below to prevent them from being audited.
              </div>
            </div>
          ) : (
            <div className="max-h-64 overflow-auto space-y-1">
              {bannedDomains.map((bd) => (
                <div
                  key={bd.domain}
                  className="flex items-start justify-between py-2 border-b border-[var(--border)] last:border-b-0"
                >
                  <div>
                    <span className="font-mono text-xs text-[var(--foreground)]">{bd.domain}</span>
                    {bd.reason && (
                      <span className="ml-2 text-xs text-[var(--muted)]">{bd.reason}</span>
                    )}
                    <div className="text-[10px] text-[var(--muted)] mt-0.5">
                      {bd.banned_at ? bd.banned_at.slice(0, 10) : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnbanDomain(bd.domain)}
                    aria-label={`Unban ${bd.domain}`}
                    className="text-xs text-[var(--error)] hover:underline ml-2 flex-shrink-0"
                  >
                    Unban
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Rate Limit Overrides */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
            RATE LIMIT OVERRIDES
          </div>

          {/* Add override form */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newOverrideUserId}
              onChange={(e) => setNewOverrideUserId(e.target.value)}
              placeholder="User ID"
              className="flex-1 rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)]"
            />
            <input
              type="number"
              value={newOverrideQuota}
              onChange={(e) => setNewOverrideQuota(e.target.value)}
              placeholder="Quota"
              min="0"
              className="w-24 rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)]"
            />
            <button
              onClick={handleSetQuota}
              disabled={overrideLoading || !newOverrideUserId.trim() || !newOverrideQuota.trim()}
              aria-label="Apply quota override"
              className="rounded px-4 py-2 text-xs font-semibold text-white bg-[var(--accent)] disabled:opacity-50"
            >
              {overrideLoading ? "..." : "Apply Override"}
            </button>
          </div>

          {/* Overrides table */}
          {quotaOverrides.length === 0 ? (
            <div className="text-xs text-[var(--muted)] py-2">
              No overrides set. All users are using their plan&apos;s default quota.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-elevated)] text-[var(--muted)] uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">User Email</th>
                    <th className="px-3 py-2 text-left">Plan</th>
                    <th className="px-3 py-2 text-left">Override Quota</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotaOverrides.map((qo) => (
                    <tr
                      key={qo.user_id}
                      className="border-t border-[var(--border)] hover:bg-[var(--surface-elevated)]"
                    >
                      <td className="px-3 py-2 font-mono text-xs">{qo.user_email}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{qo.plan}</td>
                      <td className="px-3 py-2">
                        {editingOverride === qo.user_id ? (
                          <input
                            type="number"
                            value={editingQuotaVal}
                            onChange={(e) => setEditingQuotaVal(e.target.value)}
                            min="0"
                            className="rounded border border-[var(--border)] px-2 py-1 text-xs bg-[var(--surface)] w-20"
                            autoFocus
                          />
                        ) : (
                          <span>{qo.override_quota}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {editingOverride === qo.user_id ? (
                            <>
                              <button
                                onClick={() => handleSaveQuotaEdit(qo.user_id)}
                                aria-label="Save quota override"
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingOverride(null);
                                  setEditingQuotaVal("");
                                }}
                                aria-label="Cancel edit"
                                className="text-xs text-[var(--muted)] hover:underline"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingOverride(qo.user_id);
                                  setEditingQuotaVal(String(qo.override_quota));
                                }}
                                aria-label={`Edit quota override for ${qo.user_email}`}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemoveQuota(qo.user_id)}
                                aria-label={`Remove quota override for ${qo.user_email}`}
                                className="text-xs text-[var(--error)] hover:underline"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete audit confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this audit?"
          message={`This permanently removes the audit for ${deleteTarget.domain} from ${deleteTarget.date}. This cannot be undone.`}
          confirmLabel="Delete Audit"
          onConfirm={handleDeleteAnalysis}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
