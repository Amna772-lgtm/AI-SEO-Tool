"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/moderation",
    label: "Audit Records",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    href: "/admin/system",
    label: "Settings",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside
      className="flex w-52 shrink-0 flex-col"
      style={{
        background: "linear-gradient(160deg, #0f2027, #1e3a3a, #0f2027)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: "linear-gradient(135deg, #0d9488, #16a34a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0, boxShadow: "0 4px 12px rgba(13,148,136,.4)"
        }}>🤖</div>
        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#ffffff", letterSpacing: "-0.3px" }}>AI SEO Tool</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-2 pt-3">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Admin Menu</p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all"
              style={isActive ? {
                background: "linear-gradient(135deg, #0d9488, #16a34a)",
                color: "#ffffff", fontWeight: 600,
                boxShadow: "0 2px 8px rgba(13,148,136,.35)"
              } : {
                color: "#94a3b8",
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; } }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      {user && (
        <div className="mt-auto p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-xs font-semibold"
                style={{ color: "#e2e8f0" }}
                title={user.name}
              >
                {user.name}
              </div>
              <div
                className="truncate text-[10px]"
                style={{ color: "#64748b" }}
                title={user.email}
              >
                {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { void signOut(); }}
              title="Sign out"
              aria-label="Sign out"
              className="shrink-0 transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
