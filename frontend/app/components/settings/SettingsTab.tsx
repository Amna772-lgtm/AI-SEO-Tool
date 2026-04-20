"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import {
  updateProfile,
  changePassword,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKey,
  type ApiKeyCreated,
} from "../../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 12px",
  borderRadius: 8,
  border: "1.5px solid var(--border)",
  background: "var(--surface)",
  fontSize: "0.85rem",
  color: "var(--foreground)",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  boxSizing: "border-box",
};

const inputReadonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: "var(--surface-elevated)",
  color: "var(--muted)",
  cursor: "not-allowed",
};

const btnGradient: React.CSSProperties = {
  background: "linear-gradient(135deg, #0d9488, #16a34a)",
  color: "#fff",
  border: "none",
  borderRadius: 50,
  padding: "7px 16px",
  fontWeight: 700,
  fontSize: "0.82rem",
  cursor: "pointer",
  boxShadow: "0 4px 16px rgba(13,148,136,.3)",
  transition: "transform .15s, box-shadow .15s",
};

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
      padding: "9px 13px", color: "#dc2626", fontSize: "0.82rem", marginTop: 8,
    }}>
      {msg}
    </div>
  );
}

function SuccessMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
      padding: "9px 13px", color: "#16a34a", fontSize: "0.82rem", marginTop: 8,
    }}>
      {msg}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>
      {children}
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)",
      padding: "14px 18px", boxShadow: "var(--card-shadow)",
    }}>
      <h3 style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 700, color: "var(--foreground)" }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Profile Section ────────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { setName(user?.name ?? ""); }, [user?.name]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Name cannot be empty"); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      await updateProfile(trimmed);
      await refresh();
      setSuccess("Name updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Profile">
      <form onSubmit={(e) => { void handleSave(e); }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <Label>Display Name</Label>
            <input
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "#0d9488"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(13,148,136,.1)"; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = ""; (e.target as HTMLInputElement).style.boxShadow = ""; }}
              placeholder="Your name"
              maxLength={100}
              disabled={saving}
            />
          </div>
          <div>
            <Label>
              Email
              <span style={{ marginLeft: 6, fontSize: "0.7rem", fontWeight: 500, color: "#94a3b8", textTransform: "none", letterSpacing: 0 }}>
                — cannot be changed
              </span>
            </Label>
            <div style={{ position: "relative" }}>
              <input
                style={inputReadonlyStyle}
                value={user?.email ?? ""}
                readOnly
                tabIndex={-1}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
        {error && <ErrorMsg msg={error} />}
        {success && <SuccessMsg msg={success} />}
        <div style={{ marginTop: 10 }}>
          <button
            type="submit"
            style={{ ...btnGradient, opacity: saving ? 0.7 : 1 }}
            disabled={saving}
            onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(13,148,136,.45)"; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(13,148,136,.3)"; }}
          >
            {saving ? "Saving…" : "Save Name"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Security Section ───────────────────────────────────────────────────────────

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 8) { setError("New password must be at least 8 characters"); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      await changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      setSuccess("Password changed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  const pwInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#0d9488";
    e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,.1)";
  };
  const pwInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "";
    e.target.style.boxShadow = "";
  };

  return (
    <SectionCard title="Change Password">
      <form onSubmit={(e) => { void handleSubmit(e); }}>
        <div style={{ display: "grid", gap: 8 }}>
          {([
            { label: "Current Password", value: current, setter: setCurrent },
            { label: "New Password", value: next, setter: setNext },
            { label: "Confirm New Password", value: confirm, setter: setConfirm },
          ] as { label: string; value: string; setter: (v: string) => void }[]).map(({ label, value, setter }) => (
            <div key={label}>
              <Label>{label}</Label>
              <input
                type="password"
                style={inputStyle}
                value={value}
                onChange={e => setter(e.target.value)}
                onFocus={pwInputFocus}
                onBlur={pwInputBlur}
                disabled={saving}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        {error && <ErrorMsg msg={error} />}
        {success && <SuccessMsg msg={success} />}
        <div style={{ marginTop: 10 }}>
          <button
            type="submit"
            style={{ ...btnGradient, opacity: saving ? 0.7 : 1 }}
            disabled={saving}
            onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(13,148,136,.45)"; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(13,148,136,.3)"; }}
          >
            {saving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Plan Section ───────────────────────────────────────────────────────────────

function PlanSection() {
  const { user, subscription } = useAuth();
  const plan = subscription?.plan ?? (user as (typeof user & { plan?: string }) | null)?.plan ?? "free";

  const planLabel: Record<string, string> = { free: "Free", pro: "Pro", agency: "Agency" };
  const planColor: Record<string, string> = { free: "#64748b", pro: "#0d9488", agency: "#7c3aed" };
  const auditLimit = subscription?.plan === "pro" ? 10 : subscription?.plan === "agency" ? null : 1;
  const auditCount = subscription?.audit_count ?? 0;

  return (
    <SectionCard title="Plan & Usage">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "4px 14px", borderRadius: 50,
          background: planColor[plan] + "20",
          color: planColor[plan],
          fontSize: "0.85rem", fontWeight: 700,
          border: `1px solid ${planColor[plan]}40`,
        }}>
          {planLabel[plan] ?? plan}
        </span>
        <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          {auditLimit === null
            ? `${auditCount} audits used (unlimited)`
            : `${auditCount} / ${auditLimit} audits used`}
        </span>
      </div>

      {auditLimit !== null && (
        <div style={{ height: 6, borderRadius: 99, background: "var(--surface-elevated)", overflow: "hidden", marginBottom: 16 }}>
          <div style={{
            height: "100%",
            borderRadius: 99,
            background: "linear-gradient(135deg, #0d9488, #16a34a)",
            width: `${Math.min(100, (auditCount / auditLimit) * 100)}%`,
            transition: "width .4s ease",
          }} />
        </div>
      )}

      {plan === "free" && (
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 14px" }}>
          Upgrade to <strong style={{ color: "#0d9488" }}>Pro</strong> or <strong style={{ color: "#7c3aed" }}>Agency</strong> for more audits and advanced features.
        </p>
      )}
      <button
        type="button"
        style={{ ...btnGradient, alignSelf: "flex-start" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(13,148,136,.45)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(13,148,136,.3)"; }}
        onClick={() => window.dispatchEvent(new CustomEvent("quota:exceeded", { detail: { plan } }))}
      >
        Upgrade Plan
      </button>
    </SectionCard>
  );
}

// ── API Keys Section ───────────────────────────────────────────────────────────

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    void fetchApiKeys().then(setKeys).catch(() => setKeys([])).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newKeyName.trim();
    if (!trimmed) return;
    setCreating(true); setError(null); setCreatedKey(null);
    try {
      const created = await createApiKey(trimmed);
      setKeys(prev => [created, ...prev]);
      setCreatedKey(created);
      setNewKeyName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setRevoking(id);
    try {
      await revokeApiKey(id);
      setKeys(prev => prev.filter(k => k.id !== id));
      if (createdKey?.id === id) setCreatedKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  }

  function handleCopy() {
    if (!createdKey) return;
    void navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SectionCard title="API Keys">
      <form onSubmit={(e) => { void handleCreate(e); }} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Key name (e.g. My Integration)"
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          onFocus={e => { e.target.style.borderColor = "#0d9488"; e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,.1)"; }}
          onBlur={e => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
          maxLength={100}
          disabled={creating}
        />
        <button
          type="submit"
          style={{ ...btnGradient, borderRadius: 10, padding: "9px 16px", opacity: creating || !newKeyName.trim() ? 0.6 : 1 }}
          disabled={creating || !newKeyName.trim()}
        >
          {creating ? "Creating…" : "Create Key"}
        </button>
      </form>

      {createdKey && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
          padding: "12px 14px", marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.8rem", fontWeight: 600, color: "#16a34a" }}>
            Key created — copy it now, it won&apos;t be shown again
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{
              flex: 1, background: "#fff", border: "1px solid #bbf7d0", borderRadius: 8,
              padding: "8px 12px", fontSize: "0.78rem", wordBreak: "break-all", color: "#0f172a",
            }}>
              {createdKey.key}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                flexShrink: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid #bbf7d0",
                background: copied ? "#dcfce7" : "#fff", color: copied ? "#16a34a" : "#64748b",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {error && <ErrorMsg msg={error} />}

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Loading keys…</p>
      ) : keys.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>No API keys yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {keys.map(k => (
            <div
              key={k.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface-elevated)",
              }}
            >
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{k.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                  Created {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at ? ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { void handleDelete(k.id); }}
                disabled={revoking === k.id}
                style={{
                  padding: "5px 12px", borderRadius: 8,
                  border: "1px solid #fecaca", background: "#fef2f2",
                  color: "#dc2626", fontSize: "0.78rem", fontWeight: 600,
                  cursor: revoking === k.id ? "not-allowed" : "pointer",
                  opacity: revoking === k.id ? 0.6 : 1,
                }}
              >
                {revoking === k.id ? "Revoking…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ── Main Settings Tab ──────────────────────────────────────────────────────────

export function SettingsTab() {
  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: "0 0 2px", fontSize: "1.05rem", fontWeight: 800, color: "var(--foreground)" }}>Settings</h2>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>Manage your profile, security, and API access</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ProfileSection />
        <SecuritySection />
        <PlanSection />
        <ApiKeysSection />
      </div>
    </div>
  );
}
