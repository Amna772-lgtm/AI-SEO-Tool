"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminDashboard,
  AdminUserMetrics,
  AdminAuditMetrics,
  AdminRevenueMetrics,
  AdminSystemHealth,
  AdminTrendPoint,
} from "../../lib/api";

// ── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--foreground)] font-mono">{value}</div>
      {delta && <div className="mt-1 text-xs text-[var(--success)]">{delta}</div>}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 animate-pulse">
      <div className="h-3 w-24 rounded bg-[var(--border)] mb-2" />
      <div className="h-7 w-16 rounded bg-[var(--border)]" />
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
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[160px] flex flex-col">
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

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxCount));
  const labelStep = data.length <= 8 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[160px]">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{title}</div>
      <svg
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        style={{ overflow: "visible" }}
        aria-label={`${title} trend chart`}
      >
        <g transform={`translate(${CHART_PADDING.left},${CHART_PADDING.top})`}>
          {/* Y-axis grid lines + labels */}
          {gridYs.map((val) => {
            const y = yScale(val);
            return (
              <g key={val}>
                <line
                  x1={0}
                  y1={y}
                  x2={plotW}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray={val === 0 ? "0" : "4 3"}
                />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
                  {val}
                </text>
              </g>
            );
          })}

          {/* X-axis date labels */}
          {data.map((d, i) => {
            if (i % labelStep !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={i}
                x={xScale(i)}
                y={plotH + 18}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {formatChartDate(d.date)}
              </text>
            );
          })}

          {/* Data line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data dots */}
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3} fill={color}>
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[160px] animate-pulse">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{title}</div>
      <div className="h-28 rounded bg-[var(--border)]" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type DashboardData = {
  users: AdminUserMetrics;
  audits: AdminAuditMetrics;
  revenue: AdminRevenueMetrics;
  system: AdminSystemHealth;
  signup_trend: AdminTrendPoint[];
  audit_trend: AdminTrendPoint[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const queueDepth = data
    ? data.system.celery.active_tasks + data.system.celery.pending_tasks
    : null;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-xs text-[var(--muted)]">Platform-wide analytics and system health</p>
      </div>

      {/* Summary cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Users"
              value={data ? String(data.users.total) : "--"}
            />
            <StatCard
              label="Total Audits"
              value={data ? String(data.audits.total_audits) : "--"}
            />
            <StatCard
              label="MRR"
              value={data ? `$${data.revenue.mrr}` : "--"}
            />
            <StatCard
              label="Active Paid"
              value={data ? String(data.revenue.active_paid) : "--"}
            />
          </>
        )}
      </div>

      {/* Trend charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {loading ? (
          <>
            <ChartSkeleton title="Signup Trend" />
            <ChartSkeleton title="Audit Volume" />
          </>
        ) : (
          <>
            <AdminTrendChart
              data={data?.signup_trend ?? []}
              title="Signup Trend"
              color="#166534"
            />
            <AdminTrendChart
              data={data?.audit_trend ?? []}
              title="Audit Volume"
              color="#0891b2"
            />
          </>
        )}
      </div>

      {/* System health row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Queue Depth"
              value={queueDepth != null ? String(queueDepth) : "--"}
            />
            <StatCard
              label="Failed Jobs"
              value={data ? String(data.system.failed_jobs) : "--"}
            />
            <StatCard
              label="Worker Status"
              value={
                data
                  ? data.system.celery.worker_online
                    ? "Online"
                    : "Offline"
                  : "--"
              }
            />
            <StatCard
              label="Redis Memory"
              value={data ? `${data.system.redis_memory_mb} MB` : "--"}
            />
          </>
        )}
      </div>
    </div>
  );
}
