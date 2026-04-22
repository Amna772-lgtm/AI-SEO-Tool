"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  triggerSchedule,
  type Schedule,
  type ScheduleFrequency,
  type CreateSchedulePayload,
  type UpdateSchedulePayload,
} from "../../lib/api";

interface Props {
  initialDomain?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOW_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatHour(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${suffix} UTC`;
}

function formatNextRun(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  return `in ${Math.floor(hrs / 24)}d`;
}

function isNextRunSoon(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff >= 0 && diff < 86400000; // within 24h
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function frequencySummary(s: Schedule): string {
  if (s.frequency === "daily") return `Daily at ${formatHour(s.hour)}`;
  if (s.frequency === "weekly") return `${DOW_LABELS[s.day_of_week ?? 0]}s at ${formatHour(s.hour)}`;
  if (s.frequency === "monthly") return `Day ${s.day_of_month} of month at ${formatHour(s.hour)}`;
  return s.frequency;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CalendarIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PencilIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function CheckCircleIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function PlayIcon({ size = 13, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

// ── Schedule Form Modal ───────────────────────────────────────────────────────

interface FormModalProps {
  initial: Partial<CreateSchedulePayload> | null;
  editId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function ScheduleFormModal({ initial, editId, onClose, onSaved }: FormModalProps) {
  const isEdit = !!editId;
  const [url, setUrl] = useState(initial?.url ?? "");
  const [frequency, setFrequency] = useState<ScheduleFrequency>(initial?.frequency ?? "weekly");
  const [hour, setHour] = useState(initial?.hour ?? 9);
  const [dow, setDow] = useState(initial?.day_of_week ?? 0);
  const [dom, setDom] = useState(initial?.day_of_month ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = {
    background: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    outline: "none",
    borderRadius: 6,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: CreateSchedulePayload = {
        url,
        frequency,
        hour,
        day_of_week: frequency === "weekly" ? dow : undefined,
        day_of_month: frequency === "monthly" ? dom : undefined,
      };
      if (isEdit) {
        const update: UpdateSchedulePayload = {
          frequency,
          hour,
          day_of_week: frequency === "weekly" ? dow : null,
          day_of_month: frequency === "monthly" ? dom : null,
        };
        await updateSchedule(editId, update);
      } else {
        await createSchedule(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,.18)" }}
      >
        {/* Modal header */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ background: "linear-gradient(135deg, #0d9488 0%, #16a34a 100%)", borderBottom: "1px solid rgba(255,255,255,.15)" }}
        >
          <CalendarIcon size={18} color="white" />
          <h2 className="text-sm font-semibold text-white">
            {isEdit ? "Edit Schedule" : "New Scheduled Re-audit"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {/* URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--muted)" }}>
              Website URL
            </label>
            {isEdit ? (
              <div
                className="truncate rounded px-3 py-2 text-xs font-mono"
                style={{ ...inputStyle, color: "var(--foreground)", opacity: 0.7 }}
              >
                {url}
              </div>
            ) : (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full px-3 py-2 text-xs"
                style={inputStyle}
              />
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--muted)" }}>
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
              className="w-full px-3 py-2 text-xs"
              style={inputStyle}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Conditional day fields */}
          {(frequency === "weekly" || frequency === "monthly") && (
            <div
              className="rounded-lg p-3"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="mb-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                {frequency === "weekly" ? "Day of Week" : "Day of Month"}
              </div>
              {frequency === "weekly" ? (
                <select
                  value={dow}
                  onChange={(e) => setDow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs"
                  style={{ ...inputStyle, background: "var(--surface)" }}
                >
                  {DOW_LABELS.map((label, i) => (
                    <option key={i} value={i}>{label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={dom}
                  onChange={(e) => setDom(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs"
                  style={{ ...inputStyle, background: "var(--surface)" }}
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Time */}
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--muted)" }}>
              Time (UTC)
            </label>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs"
              style={inputStyle}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
              style={{
                background: saving ? "var(--border-dark)" : "linear-gradient(135deg, #0d9488, #16a34a)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Schedule Card ─────────────────────────────────────────────────────────────

interface CardProps {
  schedule: Schedule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRunNow: () => void;
  runStatus: "idle" | "running" | "done" | "skipped" | "error";
  confirmingDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
}

function ScheduleCard({
  schedule: s,
  onToggle,
  onEdit,
  onDelete,
  onRunNow,
  runStatus,
  confirmingDelete,
  onRequestDelete,
  onCancelDelete,
}: CardProps) {
  const soon = isNextRunSoon(s.next_run_at);

  const freqColors: Record<ScheduleFrequency, { bg: string; color: string }> = {
    daily:   { bg: "#eff6ff", color: "#3b82f6" },
    weekly:  { bg: "#f0fdf4", color: "#16a34a" },
    monthly: { bg: "#fdf4ff", color: "#9333ea" },
  };
  const fc = freqColors[s.frequency] ?? { bg: "var(--surface-elevated)", color: "var(--muted)" };

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${s.enabled ? "var(--accent)" : "var(--border-dark)"}`,
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        opacity: s.enabled ? 1 : 0.45,
      }}
    >
      {/* Card body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Top row: status dot + domain + toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {/* Status dot */}
            <span
              className="mt-0.5 flex-shrink-0 rounded-full"
              style={{
                width: 8,
                height: 8,
                background: s.enabled ? "#10b981" : "var(--border-dark)",
                marginTop: 4,
              }}
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                {s.domain}
              </div>
              <div className="mt-0.5 truncate text-xs font-mono" style={{ color: "var(--muted)", maxWidth: 240 }}>
                {s.url}
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={onToggle}
            title={s.enabled ? "Disable schedule" : "Enable schedule"}
            className="flex-shrink-0 rounded-full transition-colors"
            style={{
              width: 36,
              height: 20,
              background: s.enabled ? "var(--accent)" : "var(--border-dark)",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <span
              className="absolute top-0.5 rounded-full bg-white transition-transform"
              style={{
                width: 16,
                height: 16,
                left: 2,
                transform: s.enabled ? "translateX(16px)" : "translateX(0)",
              }}
            />
          </button>
        </div>

        {/* Frequency badge + summary */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: fc.bg, color: fc.color }}
          >
            {s.frequency.charAt(0).toUpperCase() + s.frequency.slice(1)}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {frequencySummary(s)}
          </span>
        </div>

        {/* Run times */}
        <div className="grid grid-cols-2 gap-3 text-xs rounded-lg p-2.5" style={{ background: "var(--surface-elevated)" }}>
          <div>
            <div className="mb-0.5 flex items-center gap-1" style={{ color: "var(--muted)" }}>
              <ClockIcon size={11} />
              <span>Next run</span>
            </div>
            <span
              className="font-semibold"
              style={{ color: soon ? "var(--accent)" : "var(--foreground)" }}
              title={s.next_run_at}
            >
              {formatNextRun(s.next_run_at)}
            </span>
          </div>
          <div>
            <div className="mb-0.5 flex items-center gap-1" style={{ color: "var(--muted)" }}>
              <CheckCircleIcon size={11} />
              <span>Last run</span>
            </div>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>
              {s.last_run_at ? formatDate(s.last_run_at) : "Never"}
            </span>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface-elevated)" }}
      >
        {/* Run Now */}
        <button
          onClick={onRunNow}
          disabled={runStatus === "running"}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{
            background:
              runStatus === "done"    ? "#10b981" :
              runStatus === "skipped" ? "#f59e0b" :
              runStatus === "error"   ? "#f43f5e" :
              runStatus === "running" ? "var(--border-dark)" :
              "linear-gradient(135deg, #0d9488, #16a34a)",
            opacity: runStatus === "running" ? 0.7 : 1,
            transition: "background 0.2s",
          }}
        >
          {runStatus === "idle" && <PlayIcon size={11} color="white" />}
          {runStatus === "running" ? "Running…"
            : runStatus === "done"    ? "Queued ✓"
            : runStatus === "skipped" ? "Skipped"
            : runStatus === "error"   ? "Error"
            : "Run Now"}
        </button>

        <div className="flex-1" />

        {/* Edit */}
        <button
          onClick={onEdit}
          title="Edit schedule"
          className="flex items-center justify-center rounded-lg p-1.5"
          style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}
        >
          <PencilIcon size={13} />
        </button>

        {/* Delete / Confirm */}
        {confirmingDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color: "#f43f5e" }}>Delete?</span>
            <button
              onClick={onDelete}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-white"
              style={{ background: "#f43f5e" }}
            >
              Yes
            </button>
            <button
              onClick={onCancelDelete}
              className="rounded-lg px-2 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={onRequestDelete}
            title="Delete schedule"
            className="flex items-center justify-center rounded-lg p-1.5"
            style={{ border: "1px solid var(--border)", color: "#f43f5e", background: "transparent" }}
          >
            <TrashIcon size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "3px solid var(--border)" }}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--border)" }} />
          <div className="h-3 w-32 animate-pulse rounded" style={{ background: "var(--border)" }} />
        </div>
        <div className="h-2.5 w-48 animate-pulse rounded" style={{ background: "var(--border)" }} />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full" style={{ background: "var(--border)" }} />
          <div className="h-5 w-32 animate-pulse rounded" style={{ background: "var(--border)" }} />
        </div>
        <div className="h-14 w-full animate-pulse rounded-lg" style={{ background: "var(--border)" }} />
      </div>
      <div className="h-10 animate-pulse" style={{ background: "var(--surface-elevated)", borderTop: "1px solid var(--border)" }} />
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function SchedulesTab({ initialDomain }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [runStatus, setRunStatus] = useState<Record<string, "running" | "done" | "skipped" | "error">>({});
  const [pendingDelete, setPendingDelete] = useState<Record<string, boolean>>({});
  const [domainFilter, setDomainFilter] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const data = await listSchedules(initialDomain || undefined);
      setSchedules(data.schedules);
      setError(null);
    } catch {
      setError("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [initialDomain]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function handleToggle(s: Schedule) {
    try {
      const updated = await updateSchedule(s.id, { enabled: !s.enabled });
      setSchedules((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((x) => x.id !== id));
      setPendingDelete((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch {
      // ignore
    }
  }

  async function handleRunNow(id: string) {
    setRunStatus((prev) => ({ ...prev, [id]: "running" }));
    try {
      const result = await triggerSchedule(id);
      setRunStatus((prev) => ({ ...prev, [id]: result.status === "queued" ? "done" : "skipped" }));
      load();
      setTimeout(() => setRunStatus((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    } catch {
      setRunStatus((prev) => ({ ...prev, [id]: "error" }));
      setTimeout(() => setRunStatus((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    }
  }

  // Derived stats
  const activeCount = schedules.filter((s) => s.enabled).length;
  const soonest = schedules
    .filter((s) => s.enabled)
    .sort((a, b) => new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime())[0];

  // Unique domains for filter
  const uniqueDomains = Array.from(new Set(schedules.map((s) => s.domain))).sort();

  // Filtered list
  const filtered = domainFilter === "all"
    ? schedules
    : schedules.filter((s) => s.domain === domainFilter);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, background: "linear-gradient(135deg, #0d9488, #16a34a)" }}
          >
            <CalendarIcon size={20} color="white" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
              Scheduled Re-audits
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
              Automatically re-crawl and re-analyze sites on a recurring schedule.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 2px 8px rgba(13,148,136,.3)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Schedule
        </button>
      </div>

      {/* Stats row — only show when loaded with data */}
      {!loading && !error && schedules.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Schedules",
              value: schedules.length,
              icon: <CalendarIcon size={15} color="var(--accent)" />,
            },
            {
              label: "Active",
              value: activeCount,
              icon: (
                <span className="rounded-full" style={{ width: 10, height: 10, background: "#10b981", display: "inline-block" }} />
              ),
            },
            {
              label: "Next Run",
              value: soonest ? formatNextRun(soonest.next_run_at) : "—",
              icon: <ClockIcon size={15} color="var(--accent)" />,
            },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
            >
              <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ width: 32, height: 32, background: "var(--surface-elevated)" }}>
                {icon}
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
                <div className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Domain filter */}
      {!loading && !error && uniqueDomains.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted)" }}>Filter:</span>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="rounded-lg px-2.5 py-1.5 text-xs"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              outline: "none",
            }}
          >
            <option value="all">All domains ({schedules.length})</option>
            {uniqueDomains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs"
          style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      ) : schedules.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{ border: "2px dashed var(--border)" }}
        >
          <div
            className="mb-4 flex items-center justify-center rounded-2xl"
            style={{ width: 64, height: 64, background: "var(--accent-light)" }}
          >
            <CalendarIcon size={32} color="var(--accent)" />
          </div>
          <div className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
            No scheduled audits yet
          </div>
          <div className="mt-1.5 max-w-xs text-xs" style={{ color: "var(--muted)" }}>
            Set up recurring re-audits to track your SEO score over time and catch regressions early.
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 2px 8px rgba(13,148,136,.3)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Your First Schedule
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              runStatus={runStatus[s.id] ?? "idle"}
              confirmingDelete={!!pendingDelete[s.id]}
              onToggle={() => handleToggle(s)}
              onEdit={() => setEditTarget(s)}
              onRunNow={() => handleRunNow(s.id)}
              onRequestDelete={() => setPendingDelete((prev) => ({ ...prev, [s.id]: true }))}
              onCancelDelete={() => setPendingDelete((prev) => { const n = { ...prev }; delete n[s.id]; return n; })}
              onDelete={() => handleDelete(s.id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <ScheduleFormModal
          initial={null}
          editId={null}
          onClose={() => setShowCreate(false)}
          onSaved={load}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <ScheduleFormModal
          initial={{
            url: editTarget.url,
            frequency: editTarget.frequency,
            hour: editTarget.hour,
            day_of_week: editTarget.day_of_week ?? 0,
            day_of_month: editTarget.day_of_month ?? 1,
          }}
          editId={editTarget.id}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
