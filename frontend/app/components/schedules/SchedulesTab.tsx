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
const DOW_SHORT  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHour(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${suffix} UTC`;
}

function formatNextRun(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "Overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  return `in ${Math.floor(hrs / 24)}d`;
}

function isNextRunSoon(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff >= 0 && diff < 86400000;
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
  } catch { return iso; }
}

function frequencySummary(s: Schedule): string {
  if (s.frequency === "daily")   return `Daily at ${formatHour(s.hour)}`;
  if (s.frequency === "weekly")  return `${DOW_LABELS[s.day_of_week ?? 0]}s at ${formatHour(s.hour)}`;
  if (s.frequency === "monthly") return `Day ${s.day_of_month} · ${formatHour(s.hour)}`;
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

function PlayIcon({ size = 13, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function GlobeIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function RepeatIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function CheckIcon({ size = 12, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Frequency config ──────────────────────────────────────────────────────────

const FREQ_CONFIG: Record<ScheduleFrequency, { label: string; color: string; bg: string; dot: string }> = {
  daily:   { label: "Daily",   color: "#3b82f6", bg: "#eff6ff", dot: "#3b82f6" },
  weekly:  { label: "Weekly",  color: "#16a34a", bg: "#f0fdf4", dot: "#16a34a" },
  monthly: { label: "Monthly", color: "#9333ea", bg: "#fdf4ff", dot: "#9333ea" },
};

// ── Schedule Form Modal ───────────────────────────────────────────────────────

interface FormModalProps {
  initial: Partial<CreateSchedulePayload> | null;
  editId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function ScheduleFormModal({ initial, editId, onClose, onSaved }: FormModalProps) {
  const isEdit = !!editId;
  const [url, setUrl]           = useState(initial?.url ?? "");
  const [frequency, setFrequency] = useState<ScheduleFrequency>(initial?.frequency ?? "weekly");
  const [hour, setHour]         = useState(initial?.hour ?? 9);
  const [dow, setDow]           = useState(initial?.day_of_week ?? 0);
  const [dom, setDom]           = useState(initial?.day_of_month ?? 1);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const inputStyle = {
    background: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    outline: "none",
    borderRadius: 8,
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
        day_of_week:  frequency === "weekly"  ? dow : undefined,
        day_of_month: frequency === "monthly" ? dom : undefined,
      };
      if (isEdit) {
        const update: UpdateSchedulePayload = {
          frequency,
          hour,
          day_of_week:  frequency === "weekly"  ? dow : null,
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

  const freqCfg = FREQ_CONFIG[frequency];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: "linear-gradient(135deg, #0d9488, #16a34a)" }}
            >
              <CalendarIcon size={16} color="white" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                {isEdit ? "Edit Schedule" : "New Scheduled Re-audit"}
              </h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {isEdit ? "Update frequency or time" : "Automate recurring SEO audits"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5">
          {/* URL */}
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              Website URL
            </label>
            {isEdit ? (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{ ...inputStyle, opacity: 0.7 }}
              >
                <GlobeIcon size={13} color="var(--muted)" />
                <span className="truncate text-xs font-mono" style={{ color: "var(--foreground)" }}>{url}</span>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <GlobeIcon size={13} color="var(--muted)" />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full pl-8 pr-3 py-2.5 text-xs"
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Frequency — segmented pills */}
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              Frequency
            </label>
            <div
              className="grid grid-cols-3 gap-1.5 rounded-xl p-1"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              {(["daily", "weekly", "monthly"] as ScheduleFrequency[]).map((f) => {
                const cfg = FREQ_CONFIG[f];
                const active = frequency === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className="rounded-lg py-2 text-xs font-semibold transition-all"
                    style={{
                      background: active ? cfg.bg : "transparent",
                      color: active ? cfg.color : "var(--muted)",
                      border: active ? `1px solid ${cfg.color}30` : "1px solid transparent",
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day selector */}
          {frequency === "weekly" && (
            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                Day of Week
              </label>
              <div className="grid grid-cols-7 gap-1">
                {DOW_SHORT.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDow(i)}
                    className="flex flex-col items-center justify-center rounded-lg py-2 text-xs transition-all"
                    style={{
                      background: dow === i ? FREQ_CONFIG.weekly.bg : "var(--surface-elevated)",
                      color: dow === i ? FREQ_CONFIG.weekly.color : "var(--muted)",
                      border: dow === i ? `1px solid ${FREQ_CONFIG.weekly.color}40` : "1px solid var(--border)",
                      fontWeight: dow === i ? 700 : 500,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequency === "monthly" && (
            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                Day of Month
              </label>
              <select
                value={dom}
                onChange={(e) => setDom(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-xs"
                style={inputStyle}
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}{i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} of each month
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time */}
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              Time (UTC)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ClockIcon size={13} color="var(--muted)" />
              </div>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2.5 text-xs"
                style={inputStyle}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary preview */}
          {url && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5"
              style={{ background: `${freqCfg.color}08`, border: `1px solid ${freqCfg.color}25` }}
            >
              <RepeatIcon size={13} color={freqCfg.color} />
              <span className="text-xs font-medium" style={{ color: freqCfg.color }}>
                Will run {frequency === "daily" ? "every day" : frequency === "weekly" ? `every ${DOW_LABELS[dow]}` : `on day ${dom} of each month`} at {formatHour(hour)}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-white"
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

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? "Disable schedule" : "Enable schedule"}
      className="flex-shrink-0 rounded-full transition-colors"
      style={{
        width: 38,
        height: 22,
        background: enabled ? "var(--accent)" : "var(--border-dark)",
        position: "relative",
        flexShrink: 0,
        border: "none",
        cursor: "pointer",
      }}
    >
      <span
        className="absolute rounded-full bg-white"
        style={{
          width: 18,
          height: 18,
          top: 2,
          left: 2,
          transform: enabled ? "translateX(16px)" : "translateX(0)",
          transition: "transform 0.18s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }}
      />
    </button>
  );
}

// ── Schedule Row (table view) ─────────────────────────────────────────────────

interface RowProps {
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

function ScheduleRow({
  schedule: s,
  onToggle, onEdit, onDelete, onRunNow,
  runStatus, confirmingDelete, onRequestDelete, onCancelDelete,
}: RowProps) {
  const fc  = FREQ_CONFIG[s.frequency] ?? FREQ_CONFIG.weekly;
  const soon    = isNextRunSoon(s.next_run_at);
  const overdue = isOverdue(s.next_run_at);

  const nextRunColor = overdue ? "#f43f5e" : soon ? "#f59e0b" : "var(--foreground)";

  return (
    <div
      className="group flex items-center gap-4 px-5 py-4 transition-colors"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        opacity: s.enabled ? 1 : 0.55,
      }}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <div
          className="rounded-full"
          style={{
            width: 9,
            height: 9,
            background: s.enabled ? "#10b981" : "var(--border-dark)",
            boxShadow: s.enabled ? "0 0 0 3px #10b98120" : "none",
          }}
        />
      </div>

      {/* Domain + URL */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-bold" style={{ color: "var(--foreground)" }}>
          {s.domain}
        </span>
        <span className="truncate text-xs font-mono" style={{ color: "var(--muted)", maxWidth: 280 }}>
          {s.url}
        </span>
      </div>

      {/* Frequency badge */}
      <div className="hidden sm:block flex-shrink-0 w-28">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: fc.bg, color: fc.color }}
        >
          <span className="rounded-full" style={{ width: 5, height: 5, background: fc.color, display: "inline-block" }} />
          {fc.label}
        </span>
      </div>

      {/* Schedule summary */}
      <div className="hidden md:block flex-shrink-0 w-44">
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {frequencySummary(s)}
        </span>
      </div>

      {/* Next run */}
      <div className="flex-shrink-0 w-24 text-right hidden sm:block">
        <span className="text-xs font-semibold" style={{ color: nextRunColor }} title={s.next_run_at}>
          {formatNextRun(s.next_run_at)}
        </span>
        {overdue && (
          <div className="text-[10px]" style={{ color: "#f43f5e" }}>check scheduler</div>
        )}
      </div>

      {/* Last run */}
      <div className="flex-shrink-0 w-24 text-right hidden lg:block">
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {formatDateShort(s.last_run_at)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <Toggle enabled={s.enabled} onToggle={onToggle} />

        {/* Run Now */}
        <button
          onClick={onRunNow}
          disabled={runStatus === "running"}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-all"
          style={{
            background:
              runStatus === "done"    ? "#10b981" :
              runStatus === "skipped" ? "#f59e0b" :
              runStatus === "error"   ? "#f43f5e" :
              runStatus === "running" ? "var(--border-dark)" :
              "linear-gradient(135deg, #0d9488, #16a34a)",
            opacity: runStatus === "running" ? 0.7 : 1,
            minWidth: 72,
            justifyContent: "center",
            display: "flex",
          }}
        >
          {runStatus === "idle" && <PlayIcon size={10} color="white" />}
          <span>
            {runStatus === "running" ? "Running…"
              : runStatus === "done"    ? "Queued ✓"
              : runStatus === "skipped" ? "Skipped"
              : runStatus === "error"   ? "Error"
              : "Run Now"}
          </span>
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          title="Edit schedule"
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 30, height: 30,
            border: "1px solid var(--border)",
            color: "var(--muted)",
            background: "transparent",
          }}
        >
          <PencilIcon size={13} />
        </button>

        {/* Delete / Confirm */}
        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium" style={{ color: "#f43f5e" }}>Delete?</span>
            <button
              onClick={onDelete}
              className="rounded-lg px-2 py-1 text-xs font-bold text-white"
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
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: 30, height: 30,
              border: "1px solid var(--border)",
              color: "#f43f5e",
              background: "transparent",
            }}
          >
            <TrashIcon size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Skeleton Row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="h-2.5 w-2.5 animate-pulse rounded-full flex-shrink-0" style={{ background: "var(--border)" }} />
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="h-3 w-32 animate-pulse rounded" style={{ background: "var(--border)" }} />
        <div className="h-2.5 w-52 animate-pulse rounded" style={{ background: "var(--border)" }} />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full flex-shrink-0 hidden sm:block" style={{ background: "var(--border)" }} />
      <div className="h-3 w-36 animate-pulse rounded flex-shrink-0 hidden md:block" style={{ background: "var(--border)" }} />
      <div className="h-3 w-16 animate-pulse rounded flex-shrink-0 hidden sm:block" style={{ background: "var(--border)" }} />
      <div className="h-3 w-16 animate-pulse rounded flex-shrink-0 hidden lg:block" style={{ background: "var(--border)" }} />
      <div className="flex gap-2 flex-shrink-0">
        <div className="h-6 w-9 animate-pulse rounded-full" style={{ background: "var(--border)" }} />
        <div className="h-7 w-18 animate-pulse rounded-lg" style={{ background: "var(--border)" }} />
        <div className="h-7 w-7 animate-pulse rounded-lg" style={{ background: "var(--border)" }} />
        <div className="h-7 w-7 animate-pulse rounded-lg" style={{ background: "var(--border)" }} />
      </div>
    </div>
  );
}

// ── Filter Pills ──────────────────────────────────────────────────────────────

function FilterPills({
  options, selected, onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map(({ value, label }) => {
        const active = selected === value;
        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all"
            style={{
              background: active ? "var(--accent)" : "var(--surface-elevated)",
              color: active ? "white" : "var(--muted)",
              border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function SchedulesTab({ initialDomain }: Props) {
  const [schedules, setSchedules]       = useState<Schedule[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState<Schedule | null>(null);
  const [runStatus, setRunStatus]       = useState<Record<string, "running" | "done" | "skipped" | "error">>({});
  const [pendingDelete, setPendingDelete] = useState<Record<string, boolean>>({});
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [freqFilter, setFreqFilter]     = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((x) => x.id !== id));
      setPendingDelete((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch { /* ignore */ }
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
  const activeCount   = schedules.filter((s) => s.enabled).length;
  const inactiveCount = schedules.length - activeCount;
  const soonest       = schedules
    .filter((s) => s.enabled)
    .sort((a, b) => new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime())[0];
  const lastRan       = schedules
    .filter((s) => s.last_run_at)
    .sort((a, b) => new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime())[0];

  // Unique domains for filter
  const uniqueDomains = Array.from(new Set(schedules.map((s) => s.domain))).sort();

  // Filtered list
  const filtered = schedules
    .filter((s) => domainFilter === "all" || s.domain === domainFilter)
    .filter((s) => freqFilter   === "all" || s.frequency === freqFilter)
    .filter((s) => statusFilter === "all" || (statusFilter === "active" ? s.enabled : !s.enabled));

  const domainOptions = [
    { value: "all", label: `All domains` },
    ...uniqueDomains.map((d) => ({ value: d, label: d })),
  ];

  const freqOptions = [
    { value: "all",     label: "All frequencies" },
    { value: "daily",   label: "Daily" },
    { value: "weekly",  label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  const statusOptions = [
    { value: "all",      label: "All statuses" },
    { value: "active",   label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: 0 }}>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: 38, height: 38, background: "linear-gradient(135deg, #0d9488, #16a34a)" }}
          >
            <CalendarIcon size={18} color="white" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
              Scheduled Re-audits
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Automatically re-crawl and score sites on a recurring schedule
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 2px 10px rgba(13,148,136,.3)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Schedule
        </button>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      {!loading && !error && schedules.length > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px"
          style={{ background: "var(--border)", borderBottom: "1px solid var(--border)" }}
        >
          {[
            {
              label: "Total",
              value: schedules.length,
              sub: "schedules",
              icon: <CalendarIcon size={14} color="var(--accent)" />,
            },
            {
              label: "Active",
              value: activeCount,
              sub: "enabled",
              icon: <span className="rounded-full inline-block" style={{ width: 8, height: 8, background: "#10b981" }} />,
              valueColor: activeCount > 0 ? "#10b981" : "var(--foreground)",
            },
            {
              label: "Next run",
              value: soonest ? formatNextRun(soonest.next_run_at) : "—",
              sub: soonest ? soonest.domain : "no active schedules",
              icon: <ClockIcon size={14} color="var(--accent)" />,
            },
            {
              label: "Last ran",
              value: lastRan?.last_run_at ? formatDateShort(lastRan.last_run_at) : "Never",
              sub: lastRan ? lastRan.domain : "no runs yet",
              icon: <CheckIcon size={12} color="var(--accent)" />,
            },
          ].map(({ label, value, sub, icon, valueColor }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-5 py-3.5"
              style={{ background: "var(--surface)" }}
            >
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ width: 30, height: 30, background: "var(--surface-elevated)" }}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</div>
                <div className="text-sm font-bold truncate" style={{ color: valueColor ?? "var(--foreground)" }}>{value}</div>
                <div className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      {!loading && !error && schedules.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-elevated)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Filter:</span>
          {uniqueDomains.length > 1 && (
            <FilterPills options={domainOptions} selected={domainFilter} onSelect={setDomainFilter} />
          )}
          <FilterPills options={freqOptions} selected={freqFilter} onSelect={setFreqFilter} />
          <FilterPills options={statusOptions} selected={statusFilter} onSelect={setStatusFilter} />
          {(domainFilter !== "all" || freqFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => { setDomainFilter("all"); setFreqFilter("all"); setStatusFilter("all"); }}
              className="text-xs underline"
              style={{ color: "var(--muted)" }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div
          className="overflow-hidden rounded-none"
          style={{ background: "var(--surface)", border: "none" }}
        >
          {/* Table header */}
          <div
            className="flex items-center gap-4 px-5 py-2.5"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            {["", "Site", "Frequency", "Schedule", "Next run", "Last run", "Actions"].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", flex: h === "Site" ? 1 : "none", width: h === "Frequency" ? 112 : h === "Schedule" ? 176 : h === "Next run" || h === "Last run" ? 96 : h === "" ? 9 : undefined }}>
                {h}
              </div>
            ))}
          </div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 m-5 rounded-xl px-4 py-3 text-xs" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      ) : schedules.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div
            className="mb-5 flex items-center justify-center rounded-2xl"
            style={{ width: 72, height: 72, background: "linear-gradient(135deg, #0d948810, #16a34a10)", border: "1px solid #0d948820" }}
          >
            <CalendarIcon size={34} color="var(--accent)" />
          </div>
          <div className="text-base font-bold" style={{ color: "var(--foreground)" }}>
            No scheduled audits yet
          </div>
          <div className="mt-2 max-w-sm text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            Set up recurring re-audits to track your AI Citation Score over time and catch regressions before they hurt your rankings.
          </div>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 4px 14px rgba(13,148,136,.3)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Your First Schedule
            </button>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
              {["Daily", "Weekly", "Monthly"].map((f) => {
                const cfg = FREQ_CONFIG[f.toLowerCase() as ScheduleFrequency];
                return (
                  <span key={f} className="flex items-center gap-1">
                    <span className="rounded-full inline-block" style={{ width: 6, height: 6, background: cfg.color }} />
                    {f}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>No matching schedules</div>
          <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Try adjusting the filters above.</div>
          <button
            onClick={() => { setDomainFilter("all"); setFreqFilter("all"); setStatusFilter("all"); }}
            className="mt-3 text-xs font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* ── Table ── */
        <div style={{ background: "var(--surface)" }}>
          {/* Table header */}
          <div
            className="flex items-center gap-4 px-5 py-2.5"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            <div style={{ width: 9, flexShrink: 0 }} />
            <div className="flex-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Site</div>
            <div className="hidden sm:block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", width: 112 }}>Frequency</div>
            <div className="hidden md:block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", width: 176 }}>Schedule</div>
            <div className="hidden sm:block text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", width: 96 }}>Next run</div>
            <div className="hidden lg:block text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)", width: 96 }}>Last run</div>
            <div className="text-right text-[10px] font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: "var(--muted)" }}>Actions</div>
          </div>

          {filtered.map((s) => (
            <ScheduleRow
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

          {/* Footer count */}
          <div
            className="px-5 py-3 text-xs"
            style={{ color: "var(--muted)", borderTop: "1px solid var(--border)", background: "var(--surface-elevated)" }}
          >
            Showing {filtered.length} of {schedules.length} schedule{schedules.length !== 1 ? "s" : ""}
            {inactiveCount > 0 && ` · ${inactiveCount} inactive`}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <ScheduleFormModal
          initial={null}
          editId={null}
          onClose={() => setShowCreate(false)}
          onSaved={load}
        />
      )}
      {editTarget && (
        <ScheduleFormModal
          initial={{
            url: editTarget.url,
            frequency: editTarget.frequency,
            hour: editTarget.hour,
            day_of_week:  editTarget.day_of_week  ?? 0,
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
