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

// ── RoleBadge ─────────────────────────────────────────────────────────────────

function RoleBadge({ isAdmin }: { isAdmin: number }) {
  if (isAdmin) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
        admin
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--surface-elevated)] text-[var(--muted)]">
      user
    </span>
  );
}

// ── PlanBadge ─────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string | null }) {
  const p = plan ?? "free";
  if (p === "agency") {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700">
        agency
      </span>
    );
  }
  if (p === "pro") {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">
        pro
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--surface-elevated)] text-[var(--muted)]">
      free
    </span>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ disabled }: { disabled: number }) {
  if (disabled) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#fee2e2] text-[#991b1b]">
        disabled
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#d1fae5] text-[#166534]">
      active
    </span>
  );
}

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
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm rounded-lg p-6 bg-[var(--surface)] border border-[var(--border)]">
        <h2 id="confirm-dialog-title" className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h2>
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

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="inline-block animate-spin h-3 w-3 text-[var(--muted)]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
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

  async function loadUsers(opts?: {
    search?: string;
    plan?: string;
    status?: string;
    page?: number;
  }) {
    const p = opts?.page ?? page;
    const s = opts?.search ?? search;
    const pl = opts?.plan ?? planFilter;
    const st = opts?.status ?? statusFilter;
    try {
      const data = await fetchAdminUsers({
        search: s || undefined,
        plan: pl || undefined,
        status: st || undefined,
        skip: p * LIMIT,
        limit: LIMIT,
      });
      setUsers(data);
    } catch {
      // keep previous state on error
    }
  }

  // Initial load
  useEffect(() => {
    fetchAdminUsers({ skip: 0, limit: LIMIT })
      .then(setUsers)
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  // Debounced re-fetch on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers({ search, plan: planFilter, status: statusFilter, page });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, planFilter, statusFilter, page]);

  async function handlePlanChange(userId: string, plan: string) {
    setActionLoading(userId + ":plan");
    try {
      await adminUpdateUserPlan(userId, plan);
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisable(userId: string) {
    setActionLoading(userId + ":toggle");
    try {
      await adminDisableUser(userId);
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEnable(userId: string) {
    setActionLoading(userId + ":toggle");
    try {
      await adminEnableUser(userId);
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id + ":delete");
    setDeleteTarget(null);
    try {
      await adminDeleteUser(deleteTarget.id);
      await loadUsers();
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return iso.slice(0, 10);
    }
  }

  const total = users?.total ?? 0;
  const start = page * LIMIT + 1;
  const end = Math.min(page * LIMIT + (users?.users.length ?? 0), total);
  const hasPrev = page > 0;
  const hasNext = end < total;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Users</h1>
        <p className="text-xs text-[var(--muted)]">Manage user accounts, plans, and access</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by email or name..."
          className="flex-1 rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(0); }}
          className="w-32 rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
          aria-label="Filter by plan"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="w-32 rounded border border-[var(--border)] px-3 py-2 text-xs bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* User table */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {initialLoading ? (
          <div className="py-12 text-center text-xs text-[var(--muted)] animate-pulse">
            Loading users...
          </div>
        ) : !users || users.users.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-sm font-semibold text-[var(--foreground)] mb-1">No users found</div>
            <div className="text-xs text-[var(--muted)]">Try adjusting your search or filter.</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-elevated)] text-[var(--muted)] uppercase tracking-wide">
                  <tr>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">#</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Name</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Email</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Role</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Signup Date</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Audits</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Status</th>
                    <th scope="col" className="px-4 py-2 border-b border-[var(--border)] text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((user, idx) => {
                    const rowNum = page * LIMIT + idx + 1;
                    const isPlanLoading = actionLoading === user.id + ":plan";
                    const isToggleLoading = actionLoading === user.id + ":toggle";
                    const isDeleteLoading = actionLoading === user.id + ":delete";

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-[var(--surface-elevated)] transition-colors"
                      >
                        <td className="px-4 py-2 border-b border-[var(--border)] text-[var(--muted)]">
                          {rowNum}
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)] text-[var(--foreground)]">
                          {user.name || "--"}
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)] font-mono text-[var(--foreground)]">
                          {user.email}
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)]">
                          <RoleBadge isAdmin={user.is_admin} />
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)]">
                          {user.is_admin ? null : <PlanBadge plan={user.plan} />}
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)] text-[var(--muted)]">
                          {user.is_admin ? null : formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)] text-[var(--muted)]">
                          {user.is_admin ? null : user.audit_count}
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)]">
                          {user.is_admin ? null : <StatusBadge disabled={user.is_disabled} />}
                        </td>
                        <td className="px-4 py-2 border-b border-[var(--border)]">
                          {user.is_admin ? null : (
                            <div className="flex items-center gap-2">
                              {/* Plan change dropdown */}
                              <div className="relative flex items-center">
                                {isPlanLoading && (
                                  <span className="absolute -left-4">
                                    <Spinner />
                                  </span>
                                )}
                                <select
                                  value={user.plan ?? "free"}
                                  onChange={(e) => handlePlanChange(user.id, e.target.value)}
                                  disabled={isPlanLoading}
                                  aria-label={`Change plan for ${user.email}`}
                                  className="rounded border border-[var(--border)] px-2 py-1 text-[10px] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
                                >
                                  <option value="free">free</option>
                                  <option value="pro">pro</option>
                                  <option value="agency">agency</option>
                                </select>
                              </div>

                              {/* Disable / Enable button */}
                              {isToggleLoading ? (
                                <Spinner />
                              ) : user.is_disabled ? (
                                <button
                                  onClick={() => handleEnable(user.id)}
                                  aria-label={`Enable ${user.email}`}
                                  className="text-[var(--accent)] hover:underline text-[10px] font-medium"
                                >
                                  Enable
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDisable(user.id)}
                                  aria-label={`Disable ${user.email}`}
                                  className="text-[var(--muted)] hover:text-[var(--warning)] text-[10px] font-medium"
                                >
                                  Disable
                                </button>
                              )}

                              {/* Delete button */}
                              {isDeleteLoading ? (
                                <Spinner />
                              ) : (
                                <button
                                  onClick={() => setDeleteTarget(user)}
                                  aria-label={`Delete ${user.email}`}
                                  className="text-[var(--muted)] hover:text-[var(--error)] transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
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
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
              <span>
                {total > 0 ? `Showing ${start}–${end} of ${total} users` : "No users"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!hasPrev}
                  className="rounded px-3 py-1 border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                  className="rounded px-3 py-1 border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete user account?"
          message={`This permanently removes ${deleteTarget.email} and all their data -- analyses, schedules, and subscription history. This cannot be undone.`}
          confirmLabel="Delete Account"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
