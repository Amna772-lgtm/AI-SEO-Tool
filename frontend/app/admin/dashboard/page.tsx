"use client";

import { useState, useEffect, useRef } from "react";
import {
  fetchAdminDashboard,
  AdminUserMetrics,
  AdminAuditMetrics,
  AdminRevenueMetrics,
  AdminSystemHealth,
  AdminTrendPoint,
  AdminRevenueTrendPoint,
} from "../../lib/api";

// ── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, delta, accentColor, icon,
}: {
  label: string;
  value: string;
  delta?: string;
  accentColor?: string;
  icon?: React.ReactNode;
}) {
  const color = accentColor ?? "#0d9488";
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
          {icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}18`, color }}>
              {icon}
            </span>
          )}
        </div>
        <div className="text-2xl font-black tabular-nums" style={{ color: "#0f172a", fontFamily: "Inter, sans-serif" }}>{value}</div>
        {delta && <div className="mt-1 text-xs font-medium" style={{ color: "#16a34a" }}>{delta}</div>}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-[var(--border)]" />
      <div className="p-4">
        <div className="h-3 w-24 rounded bg-[var(--border)] mb-3" />
        <div className="h-7 w-16 rounded bg-[var(--border)]" />
      </div>
    </div>
  );
}

// ── MiniDonutChart ────────────────────────────────────────────────────────────

const MINI_DONUT_COLORS: Record<string, string> = {
  admin: "#0d9488",
  free: "#94a3b8",
  pro: "#6366f1",
  agency: "#f59e0b",
};

function MiniDonutChart({
  data,
}: {
  data: { key: string; label: string; value: number; displayValue?: string; color?: string }[];
}) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0) || 1;
  const SIZE = 80;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 32;
  const r = 20;

  let angle = -Math.PI / 2;
  const slices = filtered.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const startAngle = angle;
    angle += sweep;
    return { ...d, startAngle, sweep };
  });

  const arcPath = (sa: number, sweep: number) => {
    if (sweep >= 2 * Math.PI - 0.001) {
      // Full circle: outer ring + inner cutout via evenodd fill rule
      return [
        `M ${cx - R} ${cy}`,
        `a ${R} ${R} 0 1 0 ${2 * R} 0`,
        `a ${R} ${R} 0 1 0 ${-2 * R} 0`,
        `M ${cx - r} ${cy}`,
        `a ${r} ${r} 0 1 0 ${2 * r} 0`,
        `a ${r} ${r} 0 1 0 ${-2 * r} 0`,
      ].join(" ");
    }
    const ea = sa + sweep;
    const x1 = cx + R * Math.cos(sa);
    const y1 = cy + R * Math.sin(sa);
    const x2 = cx + R * Math.cos(ea);
    const y2 = cy + R * Math.sin(ea);
    const ix1 = cx + r * Math.cos(ea);
    const iy1 = cy + r * Math.sin(ea);
    const ix2 = cx + r * Math.cos(sa);
    const iy2 = cy + r * Math.sin(sa);
    const large = sweep > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`;
  };

  if (filtered.length === 0) {
    return <div className="flex items-center justify-center h-16 text-[10px] text-[var(--muted)]">No data</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        {slices.map((s) => (
          <path
            key={s.key}
            d={arcPath(s.startAngle, s.sweep)}
            fill={s.color ?? MINI_DONUT_COLORS[s.key] ?? "#94a3b8"}
            fillRule="evenodd"
            opacity={0.9}
          >
            <title>{`${s.label}: ${s.displayValue ?? s.value}`}</title>
          </path>
        ))}
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {filtered.map((d) => (
          <div key={d.key} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: d.color ?? MINI_DONUT_COLORS[d.key] ?? "#94a3b8" }}
            />
            <span className="text-[10px] text-[var(--muted)] truncate">{d.label}</span>
            <span className="text-[10px] font-bold tabular-nums ml-auto pl-1" style={{ color: "#0f172a" }}>
              {d.displayValue ?? d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StatCardWithDonut ─────────────────────────────────────────────────────────

function StatCardWithDonut({
  label,
  value,
  accentColor,
  icon,
  chart,
}: {
  label: string;
  value: string;
  accentColor?: string;
  icon?: React.ReactNode;
  chart?: React.ReactNode;
}) {
  const color = accentColor ?? "#0d9488";
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
          {icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}18`, color }}>
              {icon}
            </span>
          )}
        </div>
        <div className="text-2xl font-black tabular-nums mb-3" style={{ color: "#0f172a", fontFamily: "Inter, sans-serif" }}>
          {value}
        </div>
        {chart && <div className="border-t border-[var(--border)] pt-3">{chart}</div>}
      </div>
    </div>
  );
}

function StatCardWithDonutSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-[var(--border)]" />
      <div className="p-4">
        <div className="h-3 w-24 rounded bg-[var(--border)] mb-2" />
        <div className="h-7 w-16 rounded bg-[var(--border)] mb-3" />
        <div className="border-t border-[var(--border)] pt-3 flex items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-[var(--border)] flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-2 w-full rounded bg-[var(--border)]" />
            <div className="h-2 w-3/4 rounded bg-[var(--border)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

const PLAN_PRICES_FE: Record<string, number> = { pro: 29, agency: 99 };

// ── AdminTrendChart ───────────────────────────────────────────────────────────

const CHART_PADDING = { top: 20, right: 16, bottom: 48, left: 40 };
const CHART_W = 600;
const CHART_H = 200;

function formatChartDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return iso.slice(5, 10);
  }
}

function AdminTrendChart({
  data,
  title,
  color,
}: {
  data: AdminTrendPoint[];
  title: string;
  color: string;
}) {
  const plotW = CHART_W - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = CHART_H - CHART_PADDING.top - CHART_PADDING.bottom;

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[160px] flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{title}</div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[var(--muted)]">No data</span>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const xScale = (i: number) =>
    data.length < 2 ? plotW / 2 : (i / (data.length - 1)) * plotW;
  const yScale = (count: number) => plotH - (count / maxCount) * plotH;

  const points = data.map((d, i) => [xScale(i), yScale(d.count)] as [number, number]);
  const pathD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const gridYs = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxCount)))];
  const labelStep = data.length <= 8 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[160px]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{title}</div>
      <svg
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        style={{ overflow: "visible" }}
        aria-label={`${title} trend chart`}
      >
        <defs>
          <linearGradient id={`grad-${title.replace(/\s/g,"")}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <g transform={`translate(${CHART_PADDING.left},${CHART_PADDING.top})`}>
          {gridYs.map((val) => {
            const y = yScale(val);
            return (
              <g key={val}>
                <line x1={0} y1={y} x2={plotW} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray={val === 0 ? "0" : "4 3"} />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)">{val}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            if (i % labelStep !== 0 && i !== data.length - 1) return null;
            return (
              <text key={i} x={xScale(i)} y={plotH + 18} textAnchor="middle" fontSize={10} fill="var(--muted)">
                {formatChartDate(d.date)}
              </text>
            );
          })}
          <path d={pathD} fill="none" stroke={`url(#grad-${title.replace(/\s/g,"")})`} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5}>
              <title>{`${data[i].date}: ${data[i].count}`}</title>
            </circle>
          ))}
        </g>
      </svg>
    </div>
  );
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[160px] animate-pulse">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{title}</div>
      <div className="h-28 rounded-lg bg-[var(--border)]" />
    </div>
  );
}

// ── RevenueStackedBarChart ────────────────────────────────────────────────────

function RevenueStackedBarChart({ data }: { data: AdminRevenueTrendPoint[] }) {
  const plotW = CHART_W - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = CHART_H - CHART_PADDING.top - CHART_PADDING.bottom;

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[140px]">
        <span className="text-xs text-[var(--muted)]">No data</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.pro, d.agency)), 1);
  // Each date group gets a slot; 30% is inter-group gap, 70% is the two bars
  const groupW = plotW / data.length;
  const usableW = groupW * 0.7;
  const barW = Math.max(2, usableW / 2 - 1);
  const groupCx = (i: number) => i * groupW + groupW / 2;
  const yScale = (val: number) => plotH - (val / maxVal) * plotH;
  const gridYs = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxVal)))];
  const labelStep = data.length <= 8 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="flex-1 min-w-0">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#6366f1" }} />
          <span className="text-xs text-[var(--muted)] font-medium">Pro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#f59e0b" }} />
          <span className="text-xs text-[var(--muted)] font-medium">Agency</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ overflow: "visible" }} aria-label="MRR Trend grouped bar chart">
        <g transform={`translate(${CHART_PADDING.left},${CHART_PADDING.top})`}>
          {gridYs.map((val) => {
            const y = yScale(val);
            return (
              <g key={val}>
                <line x1={0} y1={y} x2={plotW} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray={val === 0 ? "0" : "4 3"} />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)">${val}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const cx = groupCx(i);
            // Pro bar — left of center
            const proY = yScale(d.pro);
            const proH = Math.max(plotH - proY, d.pro > 0 ? 1 : 0);
            // Agency bar — right of center
            const agencyY = yScale(d.agency);
            const agencyH = Math.max(plotH - agencyY, d.agency > 0 ? 1 : 0);
            return (
              <g key={i}>
                <rect x={cx - barW - 1.5} y={proY} width={barW} height={proH} fill="#6366f1" rx={2}>
                  <title>{`${d.date} Pro: $${d.pro}`}</title>
                </rect>
                <rect x={cx + 1.5} y={agencyY} width={barW} height={agencyH} fill="#f59e0b" rx={2}>
                  <title>{`${d.date} Agency: $${d.agency}`}</title>
                </rect>
                {(i % labelStep === 0 || i === data.length - 1) && (
                  <text x={cx} y={plotH + 18} textAnchor="middle" fontSize={10} fill="var(--muted)">
                    {formatChartDate(d.date)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ── PlanDonutChart ────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free: "#0d9488",
  pro: "#6366f1",
  agency: "#f59e0b",
};

function PlanDonutChart({
  distribution,
  activePaid,
  title,
}: {
  distribution: Record<string, number>;
  activePaid: number;
  title: string;
}) {
  const entries = Object.entries(distribution).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  const SIZE = 160;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 60;
  const r = 38;

  let angle = -Math.PI / 2;
  const slices = entries.map(([plan, count]) => {
    const sweep = (count / total) * 2 * Math.PI;
    const startAngle = angle;
    angle += sweep;
    return { plan, count, startAngle, sweep };
  });

  const arcPath = (sa: number, sweep: number) => {
    const ea = sa + sweep;
    const x1 = cx + R * Math.cos(sa);
    const y1 = cy + R * Math.sin(sa);
    const x2 = cx + R * Math.cos(ea);
    const y2 = cy + R * Math.sin(ea);
    const ix1 = cx + r * Math.cos(ea);
    const iy1 = cy + r * Math.sin(ea);
    const ix2 = cx + r * Math.cos(sa);
    const iy2 = cy + r * Math.sin(sa);
    const large = sweep > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`;
  };

  return (
    <div>
      {title && <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">{title}</div>}
      {total === 0 || entries.length === 0 ? (
        <div className="flex items-center justify-center h-28 text-xs text-[var(--muted)]">No data</div>
      ) : (
        <div className="flex items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
            {slices.map(({ plan, startAngle, sweep }) => (
              <path
                key={plan}
                d={arcPath(startAngle, sweep)}
                fill={PLAN_COLORS[plan] ?? "#94a3b8"}
                opacity={0.9}
              >
                <title>{`${plan}: ${distribution[plan]}`}</title>
              </path>
            ))}
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={800} fill="#0f172a">{activePaid}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="#64748b">paid users</text>
          </svg>
          <div className="flex flex-col gap-2">
            {entries.map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PLAN_COLORS[plan] ?? "#94a3b8" }} />
                <span className="text-xs capitalize font-medium text-[var(--muted)]">{plan}</span>
                <span className="text-xs font-bold tabular-nums ml-auto pl-3" style={{ color: "#0f172a" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type DashboardData = {
  users: AdminUserMetrics;
  audits: AdminAuditMetrics;
  revenue: AdminRevenueMetrics;
  system: AdminSystemHealth;
  audit_trend: AdminTrendPoint[];
  revenue_trend: AdminRevenueTrendPoint[];
};

// Module-level cache — persists across navigations within the same session
let _dashboardCache: DashboardData | null = null;

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(_dashboardCache);
  const [cardsLoading, setCardsLoading] = useState(_dashboardCache === null);
  const [auditChartLoading, setAuditChartLoading] = useState(false);
  const [revenueChartLoading, setRevenueChartLoading] = useState(false);
  const initialLoadDone = useRef(_dashboardCache !== null);

  // Revenue filters
  const [revenueDays, setRevenueDays] = useState<7 | 30 | 365>(7);

  // Audit Volume filters
  const [auditDays, setAuditDays] = useState<7 | 30 | 90>(7);
  const [auditGroupBy, setAuditGroupBy] = useState<"day" | "week">("day");
  const [auditPlan, setAuditPlan] = useState<"" | "free" | "pro" | "agency">("");

  // Initial load — fetches everything including summary cards
  useEffect(() => {
    // If cached data exists, show it immediately and refresh silently in background
    if (_dashboardCache === null) setCardsLoading(true);
    const params: Parameters<typeof fetchAdminDashboard>[0] = {
      audit_days: auditDays,
      audit_group_by: auditGroupBy,
      revenue_days: revenueDays,
    };
    if (auditPlan) params.audit_plan = auditPlan;
    fetchAdminDashboard(params)
      .then((d) => { _dashboardCache = d; setData(d); })
      .catch(() => {})
      .finally(() => {
        setCardsLoading(false);
        initialLoadDone.current = true;
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Audit filter changes — only refreshes the audit chart
  useEffect(() => {
    if (!initialLoadDone.current) return;
    setAuditChartLoading(true);
    const params: Parameters<typeof fetchAdminDashboard>[0] = {
      audit_days: auditDays,
      audit_group_by: auditGroupBy,
      revenue_days: revenueDays,
    };
    if (auditPlan) params.audit_plan = auditPlan;
    fetchAdminDashboard(params)
      .then((d) => {
        setData((prev) => {
          const next = prev ? { ...prev, audit_trend: d.audit_trend } : d;
          _dashboardCache = next;
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setAuditChartLoading(false));
  }, [auditDays, auditGroupBy, auditPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revenue filter changes — only refreshes the revenue chart
  useEffect(() => {
    if (!initialLoadDone.current) return;
    setRevenueChartLoading(true);
    fetchAdminDashboard({
      audit_days: auditDays,
      audit_group_by: auditGroupBy,
      revenue_days: revenueDays,
    })
      .then((d) => {
        setData((prev) => {
          const next = prev ? { ...prev, revenue_trend: d.revenue_trend } : d;
          _dashboardCache = next;
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setRevenueChartLoading(false));
  }, [revenueDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const queueDepth = data
    ? data.system.celery.active_tasks + data.system.celery.pending_tasks
    : null;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #0d9488, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 4px 12px rgba(13,148,136,.3)"
          }}>📊</div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: "#0f172a", fontFamily: "Inter, sans-serif" }}>Dashboard</h1>
            <p className="text-xs text-[var(--muted)]">Platform-wide analytics and system health</p>
          </div>
        </div>
      </div>

      {/* Summary cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cardsLoading ? (
          <>
            <StatCardWithDonutSkeleton />
            <StatCardWithDonutSkeleton />
            <StatCardWithDonutSkeleton />
            <StatCardWithDonutSkeleton />
          </>
        ) : (
          <>
            {/* Card 1 — Total Users */}
            <StatCardWithDonut
              label="Total Users"
              value={data ? String(data.users.total) : "--"}
              accentColor="#0d9488"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              chart={
                <MiniDonutChart
                  data={[
                    { key: "free", label: "Free Users", value: Math.max(0, (data?.users.plan_distribution?.free ?? 0) - (data?.users.admin_count ?? 0)) },
                    { key: "pro", label: "Pro Users", value: data?.users.plan_distribution?.pro ?? 0 },
                    { key: "agency", label: "Agency Users", value: data?.users.plan_distribution?.agency ?? 0 },
                    { key: "admin", label: "Admin", value: data?.users.admin_count ?? 0 },
                  ]}
                />
              }
            />

            {/* Card 2 — Total Audits */}
            <StatCardWithDonut
              label="Total Audits"
              value={data ? String(data.audits.total_audits) : "--"}
              accentColor="#6366f1"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
              chart={
                <MiniDonutChart
                  data={[
                    { key: "free", label: "Free Audits", value: data?.audits.plan_distribution?.free ?? 0 },
                    { key: "pro", label: "Pro Audits", value: data?.audits.plan_distribution?.pro ?? 0 },
                    { key: "agency", label: "Agency Audits", value: data?.audits.plan_distribution?.agency ?? 0 },
                  ]}
                />
              }
            />

            {/* Card 3 — MRR */}
            {(() => {
              const proMrr = (data?.revenue.plan_distribution?.pro ?? 0) * PLAN_PRICES_FE.pro;
              const agencyMrr = (data?.revenue.plan_distribution?.agency ?? 0) * PLAN_PRICES_FE.agency;
              return (
                <StatCardWithDonut
                  label="MRR"
                  value={data ? `$${data.revenue.mrr}` : "--"}
                  accentColor="#16a34a"
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                  chart={
                    <MiniDonutChart
                      data={[
                        { key: "pro", label: "Pro", value: proMrr, displayValue: `$${proMrr}` },
                        { key: "agency", label: "Agency", value: agencyMrr, displayValue: `$${agencyMrr}` },
                      ]}
                    />
                  }
                />
              );
            })()}

            {/* Card 4 — Plan Distribution */}
            <StatCardWithDonut
              label="Plan Distribution"
              value={data ? String(data.revenue.active_paid) + " paid" : "--"}
              accentColor="#f59e0b"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              chart={
                <MiniDonutChart
                  data={[
                    { key: "free", label: "Free", value: Math.max(0, (data?.users.plan_distribution?.free ?? 0) - (data?.users.admin_count ?? 0)) },
                    { key: "pro", label: "Pro", value: data?.revenue.plan_distribution?.pro ?? 0 },
                    { key: "agency", label: "Agency", value: data?.revenue.plan_distribution?.agency ?? 0 },
                  ]}
                />
              }
            />
          </>
        )}
      </div>

      {/* Revenue + Audit Volume — same row */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Revenue card */}
        <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Revenue</p>
            <select
              value={revenueDays}
              onChange={(e) => setRevenueDays(Number(e.target.value) as 7 | 30 | 365)}
              className="text-xs border border-[var(--border)] rounded-md px-2 py-1 bg-[var(--surface)] text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          {revenueChartLoading ? (
            <div className="h-[200px] rounded-lg bg-[var(--border)] animate-pulse" />
          ) : (
            <RevenueStackedBarChart data={data?.revenue_trend ?? []} />
          )}
        </div>

        {/* Audit Volume card */}
        <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)] mr-auto">Audit Volume</p>
            {/* Time range */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setAuditDays(d)}
                  className="px-3 py-1 text-xs font-semibold transition-colors"
                  style={{
                    background: auditDays === d ? "#6366f1" : "transparent",
                    color: auditDays === d ? "#fff" : "var(--muted)",
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
            {/* Group by */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              {(["day", "week"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setAuditGroupBy(g)}
                  className="px-3 py-1 text-xs font-semibold capitalize transition-colors"
                  style={{
                    background: auditGroupBy === g ? "#6366f1" : "transparent",
                    color: auditGroupBy === g ? "#fff" : "var(--muted)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            {/* Plan filter */}
            <select
              value={auditPlan}
              onChange={(e) => setAuditPlan(e.target.value as typeof auditPlan)}
              className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 bg-[var(--surface)] text-[var(--muted)]"
            >
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          {auditChartLoading ? (
            <div className="h-[200px] rounded-lg bg-[var(--border)] animate-pulse" />
          ) : (
            <AdminTrendChart data={data?.audit_trend ?? []} title="" color="#6366f1" />
          )}
        </div>
      </div>

    </div>
  );
}
