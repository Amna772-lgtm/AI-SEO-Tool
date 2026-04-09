"use client";
export default function AdminModeration() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Moderation</h1>
        <p className="text-xs text-[var(--muted)]">Audit records, domain blocklist, and rate limit overrides</p>
      </div>
      <p className="text-xs text-[var(--muted)]">Loading moderation data...</p>
    </div>
  );
}
