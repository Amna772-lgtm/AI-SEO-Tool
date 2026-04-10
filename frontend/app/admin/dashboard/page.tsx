"use client";

import { useState, useEffect } from "react";
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

// ── RevenueBarChart ───────────────────────────────────────────────────────────

function RevenueBarChart({ data, title }: { data: AdminRevenueTrendPoint[]; title: string }) {
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

  const maxMrr = Math.max(...data.map((d) => d.mrr), 1);
  const barW = Math.max(2, plotW / data.length - 2);
  const xScale = (i: number) => (i / data.length) * plotW + barW / 2;
  const yScale = (mrr: number) => plotH - (mrr / maxMrr) * plotH;
  const gridYs = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxMrr)))];
  const labelStep = data.length <= 8 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[160px]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{title}</div>
      <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ overflow: "visible" }} aria-label={`${title} bar chart`}>
        <defs>
          <linearGradient id="rev-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.5" />
          </linearGradient>
        </defs>
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
            const x = xScale(i);
            const y = yScale(d.mrr);
            const h = plotH - y;
            return (
              <g key={i}>
                <rect x={x - barW / 2} y={y} width={barW} height={Math.max(h, 1)} fill="url(#rev-bar-grad)" rx={2}>
                  <title>{`${d.date}: $${d.mrr}`}</title>
                </rect>
                {(i % labelStep === 0 || i === data.length - 1) && (
                  <text x={x} y={plotH + 18} textAnchor="middle" fontSize={10} fill="var(--muted)">
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">{title}</div>
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

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Audit Volume filters
  const [auditDays, setAuditDays] = useState<7 | 30 | 90>(30);
  const [auditGroupBy, setAuditGroupBy] = useState<"day" | "week">("day");
  const [auditPlan, setAuditPlan] = useState<"" | "free" | "pro" | "agency">("");
  const [auditScoreMin, setAuditScoreMin] = useState("");
  const [auditScoreMax, setAuditScoreMax] = useState("");

  useEffect(() => {
    setLoading(true);
    const params: Parameters<typeof fetchAdminDashboard>[0] = {
      audit_days: auditDays,
      audit_group_by: auditGroupBy,
    };
    if (auditPlan) params.audit_plan = auditPlan;
    const minN = parseInt(auditScoreMin);
    const maxN = parseInt(auditScoreMax);
    if (!isNaN(minN)) params.audit_score_min = minN;
    if (!isNaN(maxN)) params.audit_score_max = maxN;

    fetchAdminDashboard(params)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auditDays, auditGroupBy, auditPlan, auditScoreMin, auditScoreMax]);

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
        {loading ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <StatCard
              label="Total Users"
              value={data ? String(data.users.total) : "--"}
              accentColor="#0d9488"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
            <StatCard
              label="Total Audits"
              value={data ? String(data.audits.total_audits) : "--"}
              accentColor="#6366f1"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
            />
            <StatCard
              label="MRR"
              value={data ? `$${data.revenue.mrr}` : "--"}
              accentColor="#16a34a"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            />
            <StatCard
              label="Active Paid"
              value={data ? String(data.revenue.active_paid) : "--"}
              accentColor="#f59e0b"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            />
          </>
        )}
      </div>

      {/* Revenue section */}
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">Revenue</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {loading ? (
          <><ChartSkeleton title="MRR Trend" /><ChartSkeleton title="Plan Distribution" /></>
        ) : (
          <>
            <RevenueBarChart data={data?.revenue_trend ?? []} title="MRR Trend" />
            <PlanDonutChart
              distribution={data?.revenue.plan_distribution ?? {}}
              activePaid={data?.revenue.active_paid ?? 0}
              title="Plan Distribution"
            />
          </>
        )}
      </div>

      {/* Audit Volume with filters */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
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
          {/* Score range */}
          <input
            type="number"
            placeholder="Score min"
            min={0}
            max={100}
            value={auditScoreMin}
            onChange={(e) => setAuditScoreMin(e.target.value)}
            className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 w-24 bg-[var(--surface)] text-[var(--muted)]"
          />
          <input
            type="number"
            placeholder="Score max"
            min={0}
            max={100}
            value={auditScoreMax}
            onChange={(e) => setAuditScoreMax(e.target.value)}
            className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 w-24 bg-[var(--surface)] text-[var(--muted)]"
          />
        </div>
        {loading ? (
          <ChartSkeleton title="Audit Volume" />
        ) : (
          <AdminTrendChart data={data?.audit_trend ?? []} title="Audit Volume" color="#6366f1" />
        )}
      </div>

      {/* System health row */}
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">System Health</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <StatCard
              label="Queue Depth"
              value={queueDepth != null ? String(queueDepth) : "--"}
              accentColor="#0891b2"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
            />
            <StatCard
              label="Failed Jobs"
              value={data ? String(data.system.failed_jobs) : "--"}
              accentColor="#dc2626"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            />
            <StatCard
              label="Worker Status"
              value={data ? (data.system.celery.worker_online ? "Online" : "Offline") : "--"}
              accentColor={data?.system.celery.worker_online ? "#16a34a" : "#dc2626"}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
            />
            <StatCard
              label="Redis Memory"
              value={data ? `${data.system.redis_memory_mb} MB` : "--"}
              accentColor="#8b5cf6"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
            />
          </>
        )}
      </div>
    </div>
  );
}
