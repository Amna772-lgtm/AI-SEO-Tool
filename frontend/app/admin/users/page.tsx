"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminUsers,
  adminUpdateUserPlan,
  adminDisableUser,
  adminEnableUser,
  adminDeleteUser,
  AdminUsersResponse,
  AdminUserRow,
} from "../../lib/api";

// ── Badges ────────────────────────────────────────────────────────────────────

function RoleBadge({ isAdmin }: { isAdmin: number }) {
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
        style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
      style={{ background: "rgba(148,163,184,0.1)", color: "#64748b" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#64748b", display: "inline-block" }} />
      User
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  const p = plan ?? "free";
  if (p === "agency") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold"
        style={{ background: "rgba(139,92,246,0.12)", color: "#7c3aed" }}>
        Agency
      </span>
    );
  }
  if (p === "pro") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold"
        style={{ background: "rgba(59,130,246,0.12)", color: "#2563eb" }}>
        Pro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
      style={{ background: "rgba(148,163,184,0.1)", color: "#64748b" }}>
      Free
    </span>
  );
}

function StatusBadge({ disabled }: { disabled: number }) {
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
        style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
      style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
      Active
    </span>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, onConfirm, onCancel, confirmLabel = "Confirm",
}: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)" }}
      role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "rgba(239,68,68,0.1)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 id="confirm-dialog-title" className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{title}</h2>
          </div>
          <p className="text-xs mb-5 leading-relaxed" style={{ color: "var(--muted)", paddingLeft: "3rem" }}>{message}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel}
              className="rounded-lg px-4 py-2 text-xs font-medium transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}>
              Cancel
            </button>
            <button onClick={onConfirm}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 8px rgba(239,68,68,.3)" }}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="inline-block animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"
      style={{ color: "var(--muted)" }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LIMIT = 50;

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUsersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  async function loadUsers(opts?: { search?: string; plan?: string; status?: string; page?: number }) {
    const p = opts?.page ?? page;
    const s = opts?.search ?? search;
    const pl = opts?.plan ?? planFilter;
    const st = opts?.status ?? statusFilter;
    try {
      const data = await fetchAdminUsers({ search: s || undefined, plan: pl || undefined, status: st || undefined, skip: p * LIMIT, limit: LIMIT });
      setUsers(data);
    } catch { /* keep previous state */ }
  }

  useEffect(() => {
    fetchAdminUsers({ skip: 0, limit: LIMIT }).then(setUsers).catch(() => {}).finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { loadUsers({ search, plan: planFilter, status: statusFilter, page }); }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, planFilter, statusFilter, page]);

  async function handlePlanChange(userId: string, plan: string) {
    setActionLoading(userId + ":plan");
    try { await adminUpdateUserPlan(userId, plan); await loadUsers(); } finally { setActionLoading(null); }
  }

  async function handleDisable(userId: string) {
    setActionLoading(userId + ":toggle");
    try { await adminDisableUser(userId); await loadUsers(); } finally { setActionLoading(null); }
  }

  async function handleEnable(userId: string) {
    setActionLoading(userId + ":toggle");
    try { await adminEnableUser(userId); await loadUsers(); } finally { setActionLoading(null); }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id + ":delete");
    setDeleteTarget(null);
    try { await adminDeleteUser(deleteTarget.id); await loadUsers(); } finally { setActionLoading(null); }
  }

  function formatDate(iso: string): string {
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return iso.slice(0, 10); }
  }

  const total = users?.total ?? 0;
  const start = page * LIMIT + 1;
  const end = Math.min(page * LIMIT + (users?.users.length ?? 0), total);
  const hasPrev = page > 0;
  const hasNext = end < total;

  return (
    <div className="max-w-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 4px 12px rgba(13,148,136,.35)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--foreground)", letterSpacing: "-0.3px" }}>Users</h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Manage accounts, plans, and access</p>
          </div>
        </div>
        {total > 0 && (
          <div className="rounded-xl px-4 py-2 text-xs font-semibold"
            style={{ background: "rgba(13,148,136,0.08)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.2)" }}>
            {total} total {total === 1 ? "user" : "users"}
          </div>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email..."
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-xs transition-colors"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
        </div>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(0); }}
          aria-label="Filter by plan"
          className="w-32 rounded-lg px-3 py-2.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }}>
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          aria-label="Filter by status"
          className="w-32 rounded-lg px-3 py-2.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* User table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
        {initialLoading ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
              <Spinner /> Loading users...
            </div>
          </div>
        ) : !users || users.users.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-3"
              style={{ background: "rgba(148,163,184,0.1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>No users found</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Try adjusting your search or filter.</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--surface-elevated)" }}>
                    {["#", "Name", "Email", "Role", "Plan", "Joined", "Audits", "Status", "Actions"].map((col) => (
                      <th key={col} scope="col" className="px-4 py-3 text-left font-semibold uppercase tracking-wider"
                        style={{ color: "var(--muted)", fontSize: "10px", borderBottom: "1px solid var(--border)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((user, idx) => {
                    const rowNum = page * LIMIT + idx + 1;
                    const isPlanLoading = actionLoading === user.id + ":plan";
                    const isToggleLoading = actionLoading === user.id + ":toggle";
                    const isDeleteLoading = actionLoading === user.id + ":delete";

                    return (
                      <tr key={user.id} className="group transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-elevated)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                        <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "var(--muted)" }}>{rowNum}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>{user.name || "—"}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: "var(--foreground)", fontSize: "11px" }}>{user.email}</td>
                        <td className="px-4 py-3"><RoleBadge isAdmin={user.is_admin} /></td>
                        <td className="px-4 py-3">{user.is_admin ? null : <PlanBadge plan={user.plan} />}</td>
                        <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{user.is_admin ? null : formatDate(user.created_at)}</td>
                        <td className="px-4 py-3">
                          {user.is_admin ? null : (
                            <span className="font-semibold" style={{ color: "var(--foreground)" }}>{user.audit_count}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{user.is_admin ? null : <StatusBadge disabled={user.is_disabled} />}</td>
                        <td className="px-4 py-3">
                          {user.is_admin ? null : (
                            <div className="flex items-center gap-2">
                              {/* Plan dropdown */}
                              <div className="relative flex items-center">
                                {isPlanLoading && <span className="absolute -left-4"><Spinner /></span>}
                                <select value={user.plan ?? "free"} onChange={(e) => handlePlanChange(user.id, e.target.value)}
                                  disabled={isPlanLoading} aria-label={`Change plan for ${user.email}`}
                                  className="rounded-lg px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50"
                                  style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }}>
                                  <option value="free">free</option>
                                  <option value="pro">pro</option>
                                  <option value="agency">agency</option>
                                </select>
                              </div>

                              {/* Disable / Enable */}
                              {isToggleLoading ? <Spinner /> : user.is_disabled ? (
                                <button onClick={() => handleEnable(user.id)} aria-label={`Enable ${user.email}`}
                                  className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
                                  style={{ color: "#059669", background: "rgba(16,185,129,0.1)" }}>
                                  Enable
                                </button>
                              ) : (
                                <button onClick={() => handleDisable(user.id)} aria-label={`Disable ${user.email}`}
                                  className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
                                  style={{ color: "var(--muted)", background: "rgba(148,163,184,0.08)" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#dc2626"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.08)"; }}>
                                  Disable
                                </button>
                              )}

                              {/* Delete */}
                              {isDeleteLoading ? <Spinner /> : (
                                <button onClick={() => setDeleteTarget(user)} aria-label={`Delete ${user.email}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
                                  style={{ color: "var(--muted)" }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#dc2626"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4h6v2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {total > 0 ? `Showing ${start}–${end} of ${total} users` : "No users"}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!hasPrev}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}>
                  ← Previous
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={!hasNext}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}>
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete user account?"
          message={`This permanently removes ${deleteTarget.email} and all their data — analyses, schedules, and subscription history. This cannot be undone.`}
          confirmLabel="Delete Account"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
