"use client";
export default function AdminSystem() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">System</h1>
        <p className="text-xs text-[var(--muted)]">Queue monitoring, feature flags, and API credentials</p>
      </div>
      <p className="text-xs text-[var(--muted)]">Loading system status...</p>
    </div>
  );
}
