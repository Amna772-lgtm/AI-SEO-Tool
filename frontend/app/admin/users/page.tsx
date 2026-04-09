"use client";
export default function AdminUsers() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Users</h1>
        <p className="text-xs text-[var(--muted)]">Manage user accounts, plans, and access</p>
      </div>
      <p className="text-xs text-[var(--muted)]">Loading users...</p>
    </div>
  );
}
