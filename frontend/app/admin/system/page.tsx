"use client";
import { useState, useEffect } from "react";
import {
  fetchAdminSystemHealth,
  fetchAdminSettings,
  updateAdminSetting,
  fetchAdminJobs,
  adminRetryJob,
  adminCancelJob,
  type AdminSystemHealth,
  type AdminJob,
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

// ── ToggleRow ─────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  saving,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-b-0">
      <div>
        <div className="text-sm text-[var(--foreground)]">{label}</div>
        <div className="text-xs text-[var(--muted)]">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={saving}
        aria-pressed={enabled}
        aria-label={`Toggle ${label}`}
        className={`relative w-9 h-5 rounded-full transition-all duration-150 ${
          enabled ? "bg-[var(--accent)]" : "bg-[#9ca3af]"
        } ${saving ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-150 ${
            enabled ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ── MaskedApiKey ──────────────────────────────────────────────────────────────

function MaskedApiKey({
  label,
  settingKey,
  currentValue,
}: {
  label: string;
  settingKey: string;
  currentValue: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const masked = currentValue ? currentValue.slice(0, 8) + "..." : "Not set";

  async function handleSave() {
    setSaving(true);
    try {
      await updateAdminSetting(settingKey, value);
      setFeedback("Saved");
      setEditing(false);
    } catch {
      setFeedback("Failed to save. Check that the key is valid and try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-b-0">
      <div className="text-sm text-[var(--foreground)]">{label}</div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded border border-[var(--border)] px-2 py-1 text-xs font-mono bg-[var(--surface)] w-64"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded px-3 py-1 text-xs font-semibold text-white bg-[var(--accent)]"
            >
              {saving ? "..." : "Save Key"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded px-3 py-1 text-xs border border-[var(--border)] text-[var(--muted)]"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-xs text-[var(--foreground)]">{masked}</span>
            <button
              onClick={() => {
                setEditing(true);
                setValue("");
              }}
              className="text-xs text-[var(--accent)] underline"
            >
              Edit
            </button>
          </>
        )}
        {feedback && (
          <span
            className={`text-xs ${
              feedback === "Saved" ? "text-[var(--success)]" : "text-[var(--error)]"
            }`}
          >
            {feedback}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSystem() {
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminJob | null>(null);

  async function loadData() {
    setLoading(true);
    const [h, s, j] = await Promise.all([
      fetchAdminSystemHealth().catch(() => null),
      fetchAdminSettings().catch(() => ({})),
      fetchAdminJobs().catch(() => ({ jobs: [] })),
    ]);
    setHealth(h);
    setSettings(s);
    setJobs(j.jobs || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleToggle(key: string, val: boolean) {
    setSavingKey(key);
    setSettings((prev) => ({ ...prev, [key]: val ? "true" : "false" }));
    try {
      await updateAdminSetting(key, val ? "true" : "false");
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      // revert on error
      setSettings((prev) => ({ ...prev, [key]: val ? "false" : "true" }));
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRetry(taskId: string) {
    await adminRetryJob(taskId).catch(() => {});
    const j = await fetchAdminJobs().catch(() => ({ jobs: [] }));
    setJobs(j.jobs || []);
  }

  async function handleCancel(taskId: string) {
    await adminCancelJob(taskId).catch(() => {});
    setCancelTarget(null);
    const j = await fetchAdminJobs().catch(() => ({ jobs: [] }));
    setJobs(j.jobs || []);
  }

  const workerOnline = health?.celery?.worker_online ?? false;
  const maintenanceOn = settings["feature_maintenance_mode"] === "true";

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">System</h1>
        <p className="text-xs text-[var(--muted)]">Queue monitoring, feature flags, and API credentials</p>
      </div>

      {/* Maintenance mode banner */}
      {maintenanceOn && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-lg border border-[var(--warning)] bg-yellow-50 p-3 text-xs text-[var(--warning)]"
        >
          Maintenance mode is ON -- the tool is blocked for all regular users.
        </div>
      )}

      {/* Section 1: Celery Queue */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            QUEUE STATUS
          </span>
          <button
            onClick={loadData}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-[var(--muted)] animate-pulse">Loading queue status...</div>
        ) : workerOnline ? (
          <div className="flex gap-6 mb-4">
            <div>
              <div className="text-xs text-[var(--muted)]">Active tasks</div>
              <div className="text-lg font-mono font-semibold text-[var(--foreground)]">
                {health?.celery?.active_tasks ?? "--"}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">Pending tasks</div>
              <div className="text-lg font-mono font-semibold text-[var(--foreground)]">
                {health?.celery?.pending_tasks ?? "--"}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">Worker status</div>
              <span className="inline-block bg-[#d1fae5] text-[#166534] rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Worker Online
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex gap-6 mb-2">
              <div>
                <div className="text-xs text-[var(--muted)]">Active tasks</div>
                <div className="text-lg font-mono font-semibold text-[var(--foreground)]">--</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Pending tasks</div>
                <div className="text-lg font-mono font-semibold text-[var(--foreground)]">--</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Worker status</div>
                <span className="inline-block bg-[#fee2e2] text-[#991b1b] rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  Worker Offline
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--warning)]">Worker offline. Queue stats unavailable.</p>
          </div>
        )}

        {/* Active Jobs List (per D-21) */}
        <div className="mt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
            ACTIVE JOBS
          </div>
          {jobs.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No active jobs. The queue is idle.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-elevated)] text-[var(--muted)] uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Task ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">State</th>
                    <th className="px-3 py-2 text-left">Worker</th>
                    <th className="px-3 py-2 text-left">Started</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.task_id}
                      className="border-t border-[var(--border)] hover:bg-[var(--surface-elevated)]"
                    >
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--muted)]">
                        {job.task_id.slice(0, 12)}...
                      </td>
                      <td className="px-3 py-2">{job.name}</td>
                      <td className="px-3 py-2">
                        {job.state === "active" ? (
                          <span className="inline-block bg-[#d1fae5] text-[#166534] rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            active
                          </span>
                        ) : (
                          <span className="inline-block bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            pending
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px]">{job.worker || "--"}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">
                        {job.started_at
                          ? new Date(job.started_at).toLocaleTimeString()
                          : "--"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleRetry(job.task_id)}
                            aria-label={`Retry job ${job.task_id}`}
                            className="text-xs text-[var(--accent)] hover:underline"
                          >
                            Retry
                          </button>
                          <button
                            onClick={() => setCancelTarget(job)}
                            aria-label={`Cancel job ${job.task_id}`}
                            className="text-xs text-[var(--error)] hover:underline"
                          >
                            Cancel
                          </button>
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

      {/* Section 2: Feature Toggles */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            FEATURE TOGGLES
          </span>
          {savedKey && (
            <span className="text-xs text-[var(--success)]">Saved</span>
          )}
        </div>
        <ToggleRow
          label="Competitor Tracking"
          description="Allow users to use the competitor tracking feature"
          enabled={settings["feature_competitor_tracking"] === "true"}
          onChange={(val) => handleToggle("feature_competitor_tracking", val)}
          saving={savingKey === "feature_competitor_tracking"}
        />
        <ToggleRow
          label="New User Signups"
          description="Accept new user registrations"
          enabled={settings["feature_new_signups"] === "true"}
          onChange={(val) => handleToggle("feature_new_signups", val)}
          saving={savingKey === "feature_new_signups"}
        />
        <ToggleRow
          label="Maintenance Mode"
          description="Block all regular user access to the tool"
          enabled={settings["feature_maintenance_mode"] === "true"}
          onChange={(val) => handleToggle("feature_maintenance_mode", val)}
          saving={savingKey === "feature_maintenance_mode"}
        />
      </div>

      {/* Section 3: API Credentials */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
          API CREDENTIALS
        </div>
        <MaskedApiKey
          label="Google PSI API Key"
          settingKey="api_key_google_psi"
          currentValue={settings["api_key_google_psi"] ?? ""}
        />
        <MaskedApiKey
          label="Anthropic API Key"
          settingKey="api_key_anthropic"
          currentValue={settings["api_key_anthropic"] ?? ""}
        />
      </div>

      {/* Cancel job confirmation dialog */}
      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this job?"
          message={`This will terminate the task ${cancelTarget.task_id}. The crawl will stop and partial results may be lost.`}
          confirmLabel="Cancel Job"
          onConfirm={() => handleCancel(cancelTarget.task_id)}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
