"use client";
export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-xs text-[var(--muted)]">Platform-wide analytics and system health</p>
      </div>
      <p className="text-xs text-[var(--muted)]">Loading dashboard data...</p>
    </div>
  );
}
