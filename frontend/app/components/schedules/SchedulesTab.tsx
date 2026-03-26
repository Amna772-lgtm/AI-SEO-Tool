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
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-lg p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {isEdit ? "Edit Schedule" : "New Scheduled Re-audit"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* URL */}
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
              URL
            </label>
            {isEdit ? (
              <div className="truncate text-xs" style={{ color: "var(--foreground)" }}>{url}</div>
            ) : (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full rounded px-3 py-2 text-xs"
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  outline: "none",
                }}
              />
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
              className="w-full rounded px-3 py-2 text-xs"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Hour */}
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
              Time (UTC)
            </label>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full rounded px-3 py-2 text-xs"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>

          {/* Day of week (weekly only) */}
          {frequency === "weekly" && (
            <div>
              <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
                Day of Week
              </label>
              <select
                value={dow}
                onChange={(e) => setDow(Number(e.target.value))}
                className="w-full rounded px-3 py-2 text-xs"
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {DOW_LABELS.map((label, i) => (
                  <option key={i} value={i}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day of month (monthly only) */}
          {frequency === "monthly" && (
            <div>
              <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>
                Day of Month
              </label>
              <select
                value={dom}
                onChange={(e) => setDom(Number(e.target.value))}
                className="w-full rounded px-3 py-2 text-xs"
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: "#fef2f2", color: "#dc2626" }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs"
              style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: saving ? "var(--border-dark)" : "var(--accent)" }}
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
}

function ScheduleCard({ schedule: s, onToggle, onEdit, onDelete, onRunNow, runStatus }: CardProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: s.enabled ? 1 : 0.6,
      }}
    >
      {/* Top row: domain + enabled toggle */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium" style={{ color: "var(--foreground)" }}>
            {s.domain}
          </div>
          <div className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)", maxWidth: 280 }}>
            {s.url}
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={onToggle}
          title={s.enabled ? "Disable" : "Enable"}
          className="flex-shrink-0 rounded-full transition-colors"
          style={{
            width: 36, height: 20,
            background: s.enabled ? "var(--accent)" : "var(--border-dark)",
            position: "relative",
          }}
        >
          <span
            className="absolute top-0.5 rounded-full bg-white transition-transform"
            style={{
              width: 16, height: 16,
              left: 2,
              transform: s.enabled ? "translateX(16px)" : "translateX(0)",
            }}
          />
        </button>
      </div>

      {/* Frequency + timing */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: "var(--accent)", color: "#ffffff" }}
        >
          {s.frequency.charAt(0).toUpperCase() + s.frequency.slice(1)}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {frequencySummary(s)}
        </span>
      </div>

      {/* Run times */}
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--muted)" }}>
        <div>
          <span className="block font-medium" style={{ color: "var(--foreground)" }}>Next run</span>
          <span title={s.next_run_at}>{formatNextRun(s.next_run_at)}</span>
        </div>
        <div>
          <span className="block font-medium" style={{ color: "var(--foreground)" }}>Last run</span>
          <span>{formatDate(s.last_run_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRunNow}
          disabled={runStatus === "running"}
          className="rounded px-2.5 py-1 text-xs font-medium"
          style={{
            background: runStatus === "done" ? "#10b981"
              : runStatus === "skipped" ? "#f59e0b"
              : runStatus === "error" ? "#f43f5e"
              : "var(--accent)",
            color: "white",
            opacity: runStatus === "running" ? 0.6 : 1,
          }}
        >
          {runStatus === "running" ? "Running…"
            : runStatus === "done" ? "Queued ✓"
            : runStatus === "skipped" ? "Skipped"
            : runStatus === "error" ? "Error"
            : "Run Now"}
        </button>
        <button
          onClick={onEdit}
          className="rounded px-2.5 py-1 text-xs"
          style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded px-2.5 py-1 text-xs"
          style={{ border: "1px solid var(--border)", color: "#f43f5e" }}
        >
          Delete
        </button>
      </div>
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
    if (!confirm("Delete this schedule?")) return;
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((x) => x.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleRunNow(id: string) {
    setRunStatus((prev) => ({ ...prev, [id]: "running" }));
    try {
      const result = await triggerSchedule(id);
      setRunStatus((prev) => ({ ...prev, [id]: result.status === "queued" ? "done" : "skipped" }));
      // Refresh to get updated last_run_at
      load();
      setTimeout(() => setRunStatus((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    } catch {
      setRunStatus((prev) => ({ ...prev, [id]: "error" }));
      setTimeout(() => setRunStatus((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Scheduled Re-audits
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
            Automatically re-crawl and re-analyze sites on a recurring schedule.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded px-3 py-1.5 text-xs font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          + Add Schedule
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-xs" style={{ color: "var(--muted)" }}>Loading…</div>
      ) : error ? (
        <div className="text-xs" style={{ color: "#f43f5e" }}>{error}</div>
      ) : schedules.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg py-16 text-center"
          style={{ border: "1px dashed var(--border)" }}
        >
          <div className="mb-2 text-2xl">📅</div>
          <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            No schedules yet
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Create a schedule to automatically re-audit a site daily, weekly, or monthly.
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 rounded px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            + Add Schedule
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              runStatus={runStatus[s.id] ?? "idle"}
              onToggle={() => handleToggle(s)}
              onEdit={() => setEditTarget(s)}
              onDelete={() => handleDelete(s.id)}
              onRunNow={() => handleRunNow(s.id)}
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
