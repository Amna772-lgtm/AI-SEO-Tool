"use client";
import { useState, useEffect } from "react";
import {
  fetchAdminSettings,
  updateAdminSetting,
  fetchBannedDomains,
  adminBanDomain,
  adminUnbanDomain,
  fetchQuotaOverrides,
  adminSetQuotaOverride,
  adminRemoveQuotaOverride,
  type BannedDomain,
  type QuotaOverride,
} from "@/app/lib/api";

// ── Toggle ────────────────────────────────────────────────────────────────────

function ToggleRow({
  label, description, enabled, onChange, saving,
}: {
  label: string; description: string; enabled: boolean; onChange: (val: boolean) => void; saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex-1 mr-8">
        <div className="text-sm font-medium mb-0.5" style={{ color: "var(--foreground)" }}>{label}</div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{description}</div>
      </div>
      <button onClick={() => onChange(!enabled)} disabled={saving} aria-pressed={enabled} aria-label={`Toggle ${label}`}
        className="relative shrink-0 transition-all duration-200"
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: enabled ? "linear-gradient(135deg, #0d9488, #16a34a)" : "rgba(148,163,184,0.25)",
          boxShadow: enabled ? "0 2px 8px rgba(13,148,136,.35)" : "none",
          opacity: saving ? 0.5 : 1,
        }}>
        <span className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200"
          style={{ left: enabled ? 24 : 4 }} />
      </button>
    </div>
  );
}

// ── MaskedApiKey ──────────────────────────────────────────────────────────────

function MaskedApiKey({ label, settingKey, currentValue, icon }: {
  label: string; settingKey: string; currentValue: string; icon?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const masked = currentValue ? currentValue.slice(0, 10) + "••••••••••••" : null;

  async function handleSave() {
    setSaving(true);
    try {
      await updateAdminSetting(settingKey, value);
      setFeedback("saved");
      setEditing(false);
    } catch {
      setFeedback("error");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "rgba(148,163,184,0.1)", color: "var(--muted)" }}>
            {icon}
          </div>
        )}
        <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</div>
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input type="password" value={value} onChange={(e) => setValue(e.target.value)}
              placeholder="Paste new key..."
              className="rounded-lg px-3 py-1.5 text-xs font-mono w-64"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--surface-elevated)", color: masked ? "var(--foreground)" : "var(--muted)" }}>
              {masked ?? "Not configured"}
            </span>
            <button onClick={() => { setEditing(true); setValue(""); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "#0d9488", background: "rgba(13,148,136,0.08)" }}>
              {currentValue ? "Update" : "Set Key"}
            </button>
          </>
        )}
        {feedback === "saved" && <span className="text-xs font-medium" style={{ color: "#059669" }}>Saved</span>}
        {feedback === "error" && <span className="text-xs font-medium" style={{ color: "#dc2626" }}>Failed</span>}
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ title, accent = "#0d9488", icon, action, children, className = "mb-5" }: {
  title: string; accent?: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${accent}18`, color: accent }}>
            {icon}
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{title}</span>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSystem() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const [bannedDomains, setBannedDomains] = useState<BannedDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainReason, setNewDomainReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);

  const [quotaOverrides, setQuotaOverrides] = useState<QuotaOverride[]>([]);
  const [newOverrideUserId, setNewOverrideUserId] = useState("");
  const [newOverrideQuota, setNewOverrideQuota] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [editingOverride, setEditingOverride] = useState<string | null>(null);
  const [editingQuotaVal, setEditingQuotaVal] = useState("");

  async function loadData() {
    const s = await fetchAdminSettings().catch(() => ({}));
    setSettings(s);
  }

  useEffect(() => {
    loadData();
    fetchBannedDomains().then(setBannedDomains).catch(() => {});
    fetchQuotaOverrides().then(setQuotaOverrides).catch(() => {});
  }, []);

  async function handleToggle(key: string, val: boolean) {
    setSavingKey(key);
    setSettings((prev) => ({ ...prev, [key]: val ? "true" : "false" }));
    try {
      await updateAdminSetting(key, val ? "true" : "false");
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      setSettings((prev) => ({ ...prev, [key]: val ? "false" : "true" }));
    } finally {
      setSavingKey(null);
    }
  }

  async function handleBanDomain() {
    if (!newDomain.trim()) return;
    setBanLoading(true);
    try {
      await adminBanDomain(newDomain.trim(), newDomainReason.trim() || undefined);
      setNewDomain(""); setNewDomainReason("");
      setBannedDomains(await fetchBannedDomains());
    } catch { /* ignore */ } finally { setBanLoading(false); }
  }

  async function handleUnbanDomain(domain: string) {
    await adminUnbanDomain(domain).catch(() => {});
    setBannedDomains(await fetchBannedDomains().catch(() => []));
  }

  async function handleSetQuota() {
    if (!newOverrideUserId.trim() || !newOverrideQuota.trim()) return;
    setOverrideLoading(true);
    try {
      await adminSetQuotaOverride(newOverrideUserId.trim(), parseInt(newOverrideQuota, 10));
      setNewOverrideUserId(""); setNewOverrideQuota("");
      setQuotaOverrides(await fetchQuotaOverrides());
    } catch { /* ignore */ } finally { setOverrideLoading(false); }
  }

  async function handleRemoveQuota(userId: string) {
    await adminRemoveQuotaOverride(userId).catch(() => {});
    setQuotaOverrides(await fetchQuotaOverrides().catch(() => []));
  }

  async function handleSaveQuotaEdit(userId: string) {
    if (!editingQuotaVal.trim()) return;
    await adminSetQuotaOverride(userId, parseInt(editingQuotaVal, 10)).catch(() => {});
    setEditingOverride(null); setEditingQuotaVal("");
    setQuotaOverrides(await fetchQuotaOverrides().catch(() => []));
  }

  const maintenanceOn = settings["feature_maintenance_mode"] === "true";

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #0d9488, #16a34a)", boxShadow: "0 4px 12px rgba(13,148,136,.35)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--foreground)", letterSpacing: "-0.3px" }}>Settings</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Feature flags, API credentials, domain blocklist, and rate limit overrides</p>
        </div>
      </div>

      {/* Maintenance mode banner */}
      {maintenanceOn && (
        <div role="alert" aria-live="polite"
          className="flex items-center gap-3 mb-5 rounded-xl px-4 py-3"
          style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: "#ca8a04" }}>
            Maintenance mode is ON — all regular users are blocked from accessing the tool.
          </span>
        </div>
      )}

      {/* Feature Toggles + API Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <SectionCard
          className=""
          title="Feature Toggles"
          accent="#8b5cf6"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
              <circle cx="8" cy="12" r="3" />
            </svg>
          }
          action={savedKey ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: "#059669", background: "rgba(16,185,129,0.1)" }}>
              Saved
            </span>
          ) : undefined}>
          <div>
            <ToggleRow
              label="Competitor Tracking"
              description="Allow users to access the competitor tracking feature"
              enabled={settings["feature_competitor_tracking"] === "true"}
              onChange={(val) => handleToggle("feature_competitor_tracking", val)}
              saving={savingKey === "feature_competitor_tracking"}
            />
            <div style={{ borderBottom: "none" }}>
              <ToggleRow
                label="Maintenance Mode"
                description="Block all regular user access to the tool (admins still have access)"
                enabled={settings["feature_maintenance_mode"] === "true"}
                onChange={(val) => handleToggle("feature_maintenance_mode", val)}
                saving={savingKey === "feature_maintenance_mode"}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          className=""
          title="API Credentials"
          accent="#f59e0b"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }>
          <div>
            <MaskedApiKey
              label="Google PageSpeed API Key"
              settingKey="api_key_google_psi"
              currentValue={settings["api_key_google_psi"] ?? ""}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              }
            />
            <div style={{ borderBottom: "none" }}>
              <MaskedApiKey
                label="Anthropic API Key"
                settingKey="api_key_anthropic"
                currentValue={settings["api_key_anthropic"] ?? ""}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                }
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Domain Blocklist + Rate Limit Overrides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Domain Blocklist */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #ef4444, #dc262655)" }} />
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Domain Blocklist</span>
              {bannedDomains.length > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626" }}>
                  {bannedDomains.length}
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-2 mb-4">
              <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
                placeholder="domain.com" className="rounded-lg px-3 py-2.5 text-xs font-mono"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
              <div className="flex gap-2">
                <input type="text" value={newDomainReason} onChange={(e) => setNewDomainReason(e.target.value)}
                  placeholder="Reason (optional)" className="flex-1 rounded-lg px-3 py-2.5 text-xs"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
                <button onClick={handleBanDomain} disabled={banLoading || !newDomain.trim()} aria-label="Ban domain"
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 6px rgba(239,68,68,.25)" }}>
                  {banLoading ? "..." : "Ban"}
                </button>
              </div>
            </div>
            {bannedDomains.length === 0 ? (
              <div className="rounded-xl py-6 text-center" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--foreground)" }}>No blocked domains</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Banned domains will appear here.</div>
              </div>
            ) : (
              <div className="max-h-64 overflow-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
                {bannedDomains.map((bd, i) => (
                  <div key={bd.domain} className="flex items-start justify-between px-4 py-3 transition-colors"
                    style={{ borderBottom: i < bannedDomains.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-elevated)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                    <div>
                      <div className="font-mono text-xs font-semibold" style={{ color: "var(--foreground)" }}>{bd.domain}</div>
                      {bd.reason && <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{bd.reason}</div>}
                      {bd.banned_at && (
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{bd.banned_at.slice(0, 10)}</div>
                      )}
                    </div>
                    <button onClick={() => handleUnbanDomain(bd.domain)} aria-label={`Unban ${bd.domain}`}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-lg ml-3 shrink-0 transition-colors"
                      style={{ color: "#dc2626", background: "rgba(239,68,68,0.06)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; }}>
                      Unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rate Limit Overrides */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #8b5cf6, #7c3aed55)" }} />
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "rgba(139,92,246,0.1)", color: "#7c3aed" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Rate Limit Overrides</span>
              {quotaOverrides.length > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(139,92,246,0.08)", color: "#7c3aed" }}>
                  {quotaOverrides.length}
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-2 mb-4">
              <input type="text" value={newOverrideUserId} onChange={(e) => setNewOverrideUserId(e.target.value)}
                placeholder="User ID" className="rounded-lg px-3 py-2.5 text-xs font-mono"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
              <div className="flex gap-2">
                <input type="number" value={newOverrideQuota} onChange={(e) => setNewOverrideQuota(e.target.value)}
                  placeholder="Quota limit" min="0"
                  className="flex-1 rounded-lg px-3 py-2.5 text-xs"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
                <button onClick={handleSetQuota}
                  disabled={overrideLoading || !newOverrideUserId.trim() || !newOverrideQuota.trim()}
                  aria-label="Apply quota override"
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", boxShadow: "0 2px 6px rgba(139,92,246,.25)" }}>
                  {overrideLoading ? "..." : "Apply"}
                </button>
              </div>
            </div>
            {quotaOverrides.length === 0 ? (
              <div className="rounded-xl py-6 text-center" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--foreground)" }}>No overrides set</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Users are on their plan&apos;s default quota.</div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "var(--surface-elevated)" }}>
                      {["User Email", "Plan", "Quota", ""].map((col, i) => (
                        <th key={i} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider"
                          style={{ color: "var(--muted)", fontSize: "10px", borderBottom: "1px solid var(--border)" }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotaOverrides.map((qo) => (
                      <tr key={qo.user_id} style={{ borderTop: "1px solid var(--border)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-elevated)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: "11px", color: "var(--foreground)" }}>{qo.user_email}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>{qo.plan}</td>
                        <td className="px-3 py-2.5">
                          {editingOverride === qo.user_id ? (
                            <input type="number" value={editingQuotaVal} onChange={(e) => setEditingQuotaVal(e.target.value)}
                              min="0" autoFocus className="rounded-lg px-2 py-1 text-xs w-20"
                              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} />
                          ) : (
                            <span className="font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{qo.override_quota}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {editingOverride === qo.user_id ? (
                              <>
                                <button onClick={() => handleSaveQuotaEdit(qo.user_id)} aria-label="Save quota override"
                                  className="text-[10px] font-semibold px-2 py-1 rounded-md"
                                  style={{ color: "#7c3aed", background: "rgba(139,92,246,0.08)" }}>
                                  Save
                                </button>
                                <button onClick={() => { setEditingOverride(null); setEditingQuotaVal(""); }}
                                  aria-label="Cancel edit" className="text-[10px] font-medium px-2 py-1 rounded-md"
                                  style={{ color: "var(--muted)", background: "rgba(148,163,184,0.08)" }}>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingOverride(qo.user_id); setEditingQuotaVal(String(qo.override_quota)); }}
                                  aria-label={`Edit quota for ${qo.user_email}`}
                                  className="text-[10px] font-semibold px-2 py-1 rounded-md"
                                  style={{ color: "#7c3aed", background: "rgba(139,92,246,0.08)" }}>
                                  Edit
                                </button>
                                <button onClick={() => handleRemoveQuota(qo.user_id)}
                                  aria-label={`Remove quota for ${qo.user_email}`}
                                  className="text-[10px] font-semibold px-2 py-1 rounded-md"
                                  style={{ color: "#dc2626", background: "rgba(239,68,68,0.08)" }}>
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
      </div>

    </div>
  );
}
