"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  startAnalysis,
  getSite,
  getPages,
  getOverview,
  getAudit,
  getGeo,
  getHistory,
  type Site,
  type PageRow,
  type PagesResponse,
  type OverviewResponse,
  type AuditResponse,
  type AuditResult,
  type PageSpeedResult,
  type SecurityHeadersResult,
  type GeoResponse,
  type HistoryItem,
} from "../lib/api";
import { GeoTab } from "../components/geo/GeoTab";
import { ChecklistPanel } from "../components/geo/ChecklistPanel";
import { SiteStructurePanel } from "../components/geo/SiteStructurePanel";
import { HistoryTab } from "../components/history/HistoryTab";
import { SchedulesTab } from "../components/schedules/SchedulesTab";
import { useAuth } from "../lib/auth";
import LockedFeature from "../components/LockedFeature";
import CompetitorsTab from "../components/competitors/CompetitorsTab";

// ── Types ──────────────────────────────────────────────────────────────────────
type MainTab = "dashboard" | "geo" | "insights" | "history" | "schedules" | "competitors";

// ── Small UI helpers ───────────────────────────────────────────────────────────

function psiErrorMessage(error: string): string {
  if (error.includes("NO_FCP"))
    return "Page blocked automated testing (NO_FCP) — likely bot protection";
  if (error.includes("ERRORED_DOCUMENT_REQUEST")) return "Page failed to load during analysis";
  if (error.includes("FAILED_DOCUMENT_REQUEST")) return "Page request was blocked or timed out";
  if (error.includes("DNS_FAILURE")) return "DNS lookup failed for this domain";
  if (error.includes("NOT_HTML")) return "Page is not HTML — cannot analyze";
  if (error.includes("400")) return `PSI could not analyze this page (${error.split(":")[0]})`;
  return error;
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      {label}
    </div>
  );
}

// ── Semicircle gauge (PageSpeed) ──────────────────────────────────────────────
function SemiGauge({ score, label }: { score: number; label: string }) {
  const r = 44, cx = 60, cy = 58;
  const circ = Math.PI * r;
  const filled = Math.min(score / 100, 1) * circ;
  const color = score >= 90 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const gradId = `gauge-${label.replace(/\s/g, "")}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="128" height="74" viewBox="0 0 128 74">
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="var(--border)" strokeWidth="9" strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={`url(#${gradId})`} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="800"
          fill={color} fontFamily="system-ui">
          {score}
        </text>
      </svg>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
    </div>
  );
}

// ── Security Headers block ─────────────────────────────────────────────────────
function SecurityHeadersBlock({ sh }: { sh: SecurityHeadersResult }) {
  const preferredOrder = [
    "x_content_type_options",
    "x_frame_options",
    "strict_transport_security",
    "content_security_policy",
    "referrer_policy",
  ];
  const displayKeys = [
    ...preferredOrder.filter((k) => sh.headers[k]),
    ...Object.keys(sh.headers).filter((k) => !preferredOrder.includes(k)),
  ];
  const pct = sh.total_count > 0 ? (sh.passed_count / sh.total_count) * 100 : 0;
  const barColor = pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Security Headers</p>
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${barColor}1a`, color: barColor }}>
          {sh.passed_count}/{sh.total_count}
        </span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: barColor, transition: "width 900ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </div>
      {sh.error ? (
        <p className="text-xs text-[var(--warning)]">{sh.error}</p>
      ) : (
        <div className="space-y-1.5">
          {displayKeys.map((key) => {
            const info = sh.headers[key];
            if (!info) return null;
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--surface-elevated)]"
              >
                <span className="flex items-center gap-2 text-[var(--foreground)]">
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: info.present ? "#10b98122" : "#ef444422",
                      color: info.present ? "#10b981" : "#ef4444",
                    }}
                  >
                    {info.present ? "✓" : "✗"}
                  </span>
                  {info.label}
                </span>
                <span className={`font-mono text-[10px] ${info.present ? "text-[var(--success)]" : "text-red-500"}`}>
                  {info.present ? "PASS" : "FAIL"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Donut Chart ────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  HTML:       "#4f46e5",
  Images:     "#0ea5e9",
  CSS:        "#f59e0b",
  JavaScript: "#f97316",
  PDF:        "#8b5cf6",
  Other:      "#94a3b8",
};

function DonutChart({ slices, size = 110 }: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  let cum = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="13" />
      {slices.map((s, i) => {
        const fraction = s.value / total;
        const dash = fraction * C;
        const offset = -(cum * C);
        cum += fraction;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth="13"
            strokeDasharray={`${dash} ${C}`}
            strokeDashoffset={offset}
          />
        );
      })}
    </svg>
  );
}


// ── Crawl History Chart ────────────────────────────────────────────────────────
function CrawlHistoryChart({ items }: { items: HistoryItem[] }) {
  const sorted = [...items]
    .sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime())
    .slice(-30);

  const W = 560, H = 140;
  const PAD = { top: 12, right: 16, bottom: 28, left: 38 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (sorted.length < 2) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          GEO SCORE HISTORY (Past 30 Audits)
        </p>
        <div className="flex flex-1 items-center justify-center text-xs text-[var(--muted)]">
          Run more audits on this domain to see history
        </div>
      </div>
    );
  }

  const maxY = 100;
  const scaleX = (i: number) => PAD.left + (i / (sorted.length - 1)) * innerW;
  const scaleY = (v: number) => PAD.top + innerH - ((v / maxY) * innerH);
  const points = sorted.map((d, i) => ({ x: scaleX(i), y: scaleY(d.overall_score ?? 0) }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;
  const yTicks = [0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.ceil(sorted.length / 5));
  const xLabelIdxs = sorted.reduce<number[]>((acc, _, i) => {
    if (i % step === 0 || i === sorted.length - 1) acc.push(i);
    return acc;
  }, []);

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          GEO SCORE HISTORY (Past 30 Audits)
        </p>
        <span className="text-[10px] text-[var(--muted)]">Historical View →</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }}>
        <defs>
          <linearGradient id="crawlHistGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map(pct => {
          const y = PAD.top + innerH * (1 - pct);
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="var(--border)" strokeWidth="0.5" />
              <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize="7.5" fill="#94a3b8">{Math.round(maxY * pct)}</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#crawlHistGrad)" />
        <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#0d9488" />)}
        {xLabelIdxs.map(i => (
          <text key={i} x={scaleX(i)} y={H - 2} textAnchor="middle" fontSize="7.5" fill="#94a3b8">
            {new Date(sorted[i].analyzed_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </text>
        ))}
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="var(--border)" strokeWidth="0.5" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="var(--border)" strokeWidth="0.5" />
        <text x={W / 2} y={H - 1} textAnchor="middle" fontSize="7.5" fill="#94a3b8">Past 30 Audits</text>
        <text x={9} y={H / 2 - 4} textAnchor="middle" fontSize="7" fill="#94a3b8" transform={`rotate(-90, 9, ${H / 2 - 4})`}>Score</text>
      </svg>
    </div>
  );
}

// ── Issues Breakdown Donut ─────────────────────────────────────────────────────
function DashIssuesDonut({
  overview, audit, pages,
}: {
  overview: OverviewResponse | null;
  audit: AuditResult | null;
  pages: PageRow[];
}) {
  const missingAlt = overview?.images_missing_alt ?? 0;
  const brokenLinks = audit?.broken_links?.count ?? 0;
  const mobilePerfScore = audit?.pagespeed?.mobile?.performance;
  const slowPages = mobilePerfScore != null && mobilePerfScore < 50 ? 1 : 0;
  const noMetaDesc = pages.filter(p => !p.meta_descp).length;
  const noH1 = pages.filter(p => !p.h1).length;

  const issues = [
    { label: "Missing Alt text", value: missingAlt, color: "#ef4444" },
    { label: "Broken Links", value: brokenLinks, color: "#f59e0b" },
    { label: "Slow Pages", value: slowPages, color: "#f97316" },
    { label: "No Meta Decs", value: noMetaDesc, color: "#8b5cf6" },
    { label: "No H1", value: noH1, color: "#0ea5e9" },
  ].filter(i => i.value > 0);
  const total = issues.reduce((s, i) => s + i.value, 0);

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ISSUES BREAKDOWN
      </p>
      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs" style={{ color: "#16a34a" }}>No issues found ✓</div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative shrink-0">
            <DonutChart slices={issues} size={120} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-base font-black tabular-nums">{total}</span>
            </div>
          </div>
          <div className="w-full space-y-1.5 text-xs">
            {issues.map(iss => (
              <div key={iss.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: iss.color }} />
                  <span className="text-[var(--muted)]">{iss.label}</span>
                </div>
                <span className="font-semibold" style={{ color: iss.color }}>{iss.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Speed: Desktop vs Mobile ───────────────────────────────────────────────────
function DashSpeedSection({ pagespeed }: { pagespeed: { desktop: PageSpeedResult; mobile: PageSpeedResult } }) {
  const desk = pagespeed.desktop;
  const mob = pagespeed.mobile;
  function parseVal(v: string | null | undefined): number {
    if (!v) return 0;
    return parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  }
  const metrics = [
    { label: "LCP", desk: parseVal(desk.lcp), mob: parseVal(mob.lcp), max: 10 },
    { label: "FCP", desk: parseVal(desk.fcp), mob: parseVal(mob.fcp), max: 6 },
    { label: "CLS", desk: parseVal(desk.cls), mob: parseVal(mob.cls), max: 1 },
    { label: "FID", desk: parseVal(desk.tbt), mob: parseVal(mob.tbt), max: 500 },
    { label: "SI",  desk: parseVal(desk.speed_index), mob: parseVal(mob.speed_index), max: 15 },
  ];
  const deskScore = desk.performance ?? 0;
  const mobScore = mob.performance ?? 0;
  const deskColor = deskScore >= 90 ? "#10b981" : deskScore >= 50 ? "#f59e0b" : "#ef4444";
  const mobColor = mobScore >= 90 ? "#10b981" : mobScore >= 50 ? "#f59e0b" : "#ef4444";
  const C = 2 * Math.PI * 18;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        SPEED: DESKTOP VS MOBILE
      </p>
      <div className="mb-3 flex items-center gap-4">
        {[{ score: deskScore, color: deskColor, label: "Desktop" }, { score: mobScore, color: mobColor, label: "Mobile" }].map(({ score, color, label }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 44 44" className="h-full w-full" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="5"
                  strokeDasharray={`${(score / 100) * C} ${C}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black" style={{ color }}>{score}</span>
              </div>
            </div>
            <span className="mt-0.5 text-[9px] text-[var(--muted)]">{label}</span>
          </div>
        ))}
        <div className="ml-auto space-y-1 text-[10px]">
          <div className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded" style={{ background: "#6366f1" }} /> Desktop</div>
          <div className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded" style={{ background: "#0ea5e9" }} /> Mobile</div>
        </div>
      </div>
      <div className="space-y-2">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center gap-2 text-xs">
            <span className="w-7 shrink-0 font-medium text-[var(--muted)]">{m.label}</span>
            <div className="flex-1 space-y-0.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.max > 0 ? (m.desk / m.max) * 100 : 0)}%`, background: "#6366f1" }} />
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.max > 0 ? (m.mob / m.max) * 100 : 0)}%`, background: "#0ea5e9" }} />
              </div>
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[10px] text-[var(--muted)]">{m.desk > 0 ? m.desk : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Security Headers (Dashboard variant) ──────────────────────────────────────
function DashSecurityHeaders({ sh }: { sh: SecurityHeadersResult }) {
  const preferredOrder = [
    "x_content_type_options", "x_frame_options",
    "strict_transport_security", "content_security_policy", "referrer_policy",
  ];
  const displayKeys = [
    ...preferredOrder.filter(k => sh.headers[k]),
    ...Object.keys(sh.headers).filter(k => !preferredOrder.includes(k)),
  ];
  const pct = sh.total_count > 0 ? (sh.passed_count / sh.total_count) * 100 : 0;
  const allPass = pct === 100;
  const badgeColor = allPass ? "#16a34a" : pct >= 60 ? "#d97706" : "#ef4444";

  const SHORT_LABELS: Record<string, string> = {
    "X-Content-Type-Options": "X-Content-Type",
    "X-Frame-Options": "X-Frame",
    "Strict-Transport-Security": "HSTS",
    "Content-Security-Policy": "CSP",
    "Referrer-Policy": "Referrer-Policy",
  };

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Security Headers
        </p>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={{ background: allPass ? "#f0fdf4" : pct >= 60 ? "#fffbeb" : "#fef2f2", color: badgeColor }}>
          {allPass ? "All Pass" : `${sh.passed_count}/${sh.total_count}`}
        </span>
      </div>
      {sh.error ? (
        <p className="text-xs text-[var(--warning)]">{sh.error}</p>
      ) : (
        <div className="flex flex-1 flex-col justify-evenly gap-0.5">
          {displayKeys.map(key => {
            const info = sh.headers[key];
            if (!info) return null;
            const pass = info.present;
            return (
              <div key={key}
                className="flex items-center gap-2.5 rounded-md py-1.5 pl-3 pr-2.5 text-xs transition-colors hover:bg-[var(--surface-elevated)]">
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: pass ? "#10b98118" : "#ef444418", color: pass ? "#10b981" : "#ef4444" }}>
                  {pass ? "✓" : "✗"}
                </span>
                <span className="flex-1 truncate font-medium text-[var(--foreground)]" title={info.label}>
                  {SHORT_LABELS[info.label] ?? info.label}
                </span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: pass ? "#10b98115" : "#ef444415", color: pass ? "#10b981" : "#ef4444" }}>
                  {pass ? "OK" : "Missing"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Indexability & Status (Dashboard) ─────────────────────────────────────────
function DashIndexabilityStatus({ overview }: { overview: OverviewResponse }) {
  const indexable = overview.indexability_counts?.indexable ?? 0;
  const nonIndexable = overview.indexability_counts?.non_indexable ?? 0;
  const external = overview.indexability_counts?.external ?? 0;
  const ok = overview.status_counts?.ok ?? 0;
  const redirect = overview.status_counts?.redirect ?? 0;
  const error4xx = overview.status_counts?.error_4xx ?? 0;
  const error5xx = overview.status_counts?.error_5xx ?? 0;

  const r = 26, cx = 34, cy = 34, C = 2 * Math.PI * r;

  type Segment = { count: number; color: string; label: string };

  function MultiRing({ segments, label }: { segments: Segment[]; label: string }) {
    const total = Math.max(segments.reduce((s, g) => s + g.count, 0), 1);
    let cumulative = 0;
    return (
      <div className="flex flex-1 flex-col items-center gap-1.5">
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
          {segments.map((seg, i) => {
            if (seg.count === 0) return null;
            const len = (seg.count / total) * C;
            const offset = C * 0.25 - cumulative;
            cumulative += len;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="7"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={offset} />
            );
          })}
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--foreground)">{total}</text>
        </svg>
        <p className="text-[10px] font-semibold text-[var(--foreground)]">{label}</p>
        <div className="mt-1 w-full flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-2 flex flex-col justify-around">
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center justify-between gap-3 px-1 py-0.5 text-[9px] text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: seg.color }} />
                {seg.label}
              </span>
              <span className="font-semibold text-[var(--foreground)]">{seg.count}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        INDEXABILITY & STATUS
      </p>
      <div className="flex justify-around items-stretch gap-4">
        <MultiRing label="Indexability" segments={[
          { count: indexable,    color: "#0d9488", label: "Indexable" },
          { count: nonIndexable, color: "#ef4444", label: "Non-Indexable" },
          { count: external,     color: "#94a3b8", label: "External" },
        ]} />
        <MultiRing label="Status Codes" segments={[
          { count: ok,       color: "#10b981", label: "2xx" },
          { count: redirect, color: "#f59e0b", label: "3xx" },
          { count: error4xx, color: "#e97171", label: "4xx" },
          { count: error5xx, color: "#f10505", label: "5xx" },
        ]} />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 100;

export default function Home() {
  const [url, setUrl] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [pagesData, setPagesData] = useState<PagesResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageRow | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");
  const [search, setSearch] = useState("");
  const [pageNum, setPageNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"status" | "indexability" | "canonical" | null>(null);
  const defaultFilters = { statusGroup: null as string | null, indexability: null as string | null, hasCanonical: null as boolean | null };
  const [colFilters, setColFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut: handleSignOut, subscription, loading: authLoading } = useAuth();
  const isFree = subscription?.plan === "free";
  const quotaExhausted = subscription
    ? (subscription.plan === "free" && subscription.audit_count >= 1) ||
      (subscription.plan === "pro" && subscription.audit_count >= 10)
    : false;

  // ── Subscription guard (D-13): redirect to /select-plan if no subscription ──
  useEffect(() => {
    if (!authLoading && user && !subscription) {
      window.location.href = "/select-plan";
    }
  }, [authLoading, user, subscription]);

  // ── Crawl status polling ─────────────────────────────────────────────────
  const pollSite = useCallback(async (id: string) => {
    try {
      const s = await getSite(id);
      setSite(s);
      if (s.status === "completed") {
        const [pages, ov] = await Promise.all([getPages(id), getOverview(id)]);
        setPagesData(pages);
        setOverview(ov);
        setSelectedPage(null);
      } else if (s.status === "failed") {
        setError("Crawl failed.");
      } else if (s.status === "processing" || s.status === "queued") {
        const [pages, ov] = await Promise.all([getPages(id), getOverview(id)]);
        setPagesData(pages);
        setOverview(ov);
      }
    } catch {
      setError("Failed to fetch site status.");
    }
  }, []);

  useEffect(() => {
    if (!siteId || !site) return;
    if (site.status === "completed" || site.status === "failed") {
      setIsAnalyzing(false);
      return;
    }
    const t = setInterval(() => pollSite(siteId), 1500);
    return () => clearInterval(t);
  }, [siteId, site?.status, pollSite]);

  // ── Audit polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId || site?.status !== "completed") return;
    if (audit?.audit_status === "completed" || audit?.audit_status === "failed") return;
    const fetchAudit = () => getAudit(siteId).then(setAudit).catch(() => {});
    fetchAudit();
    const t = setInterval(fetchAudit, 3000);
    return () => clearInterval(t);
  }, [siteId, site?.status, audit?.audit_status]);

  // ── GEO polling ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId || site?.status !== "completed") return;
    if (geo?.geo_status === "completed" || geo?.geo_status === "failed") return;
    const fetchGeo = () => getGeo(siteId).then(setGeo).catch(() => {});
    fetchGeo();
    const t = setInterval(fetchGeo, 4000);
    return () => clearInterval(t);
  }, [siteId, site?.status, geo?.geo_status]);

  // ── History for crawl history chart ────────────────────────────────────
  useEffect(() => {
    if (!site?.url) return;
    try {
      const domain = new URL(site.url.startsWith("http") ? site.url : `https://${site.url}`).hostname;
      getHistory({ domain, limit: 30 }).then(r => setHistoryItems(r.items)).catch(() => {});
    } catch { /* invalid URL */ }
  }, [site?.url]);

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  // ── Pages / overview refresh ──────────────────────────────────────────────
  const refreshPages = useCallback(() => {
    if (!siteId) return;
    getPages(siteId, {
      search: search || undefined,
      skip: pageNum * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then(setPagesData)
      .catch(() => setError("Failed to load pages"));
  }, [siteId, search, pageNum]);

  useEffect(() => {
    if (!siteId || !site) return;
    if (site.status !== "completed" && site.status !== "processing") return;
    refreshPages();
  }, [siteId, site?.status, search, pageNum, refreshPages]);

  useEffect(() => {
    if (!siteId || !site) return;
    if (site.status !== "completed" && site.status !== "processing") return;
    getOverview(siteId).then(setOverview).catch(() => {});
  }, [siteId, site?.status]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!url.trim()) return;
    setError(null);
    setLoading(true);
    setIsAnalyzing(true);
    setPagesData(null);
    setOverview(null);
    setSelectedPage(null);
    setAudit(null);
    setGeo(null);
    setPageNum(0);
    setMainTab("dashboard");
    try {
      const result = await startAnalysis(url.trim());
      setSiteId(result.site_id);
      setSite({
        id: result.site_id,
        url: url.trim(),
        status: result.status as Site["status"],
        created_at: null,
        robots_allowed: result.robots_allowed,
        ai_crawler_access: null,
      });
    } catch (e) {
      // Don't show a generic error when quota exceeded — UpgradeModal handles it
      const msg = e instanceof Error ? e.message : "Analysis failed";
      if (!msg.toLowerCase().includes("quota")) {
        setError(msg);
      }
      setSiteId(null);
      setSite(null);
      setIsAnalyzing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSiteId(null);
    setSite(null);
    setPagesData(null);
    setOverview(null);
    setSelectedPage(null);
    setAudit(null);
    setGeo(null);
    setError(null);
    setUrl("");
    setSearch("");
    setDetailSearch("");
    setPageNum(0);
    setMainTab("dashboard");
    setIsAnalyzing(false);
    setColFilters(defaultFilters);
    setDraftFilters(defaultFilters);
  };

  // ── Filter helpers ────────────────────────────────────────────────────────
  function matchesStatusGroup(code: number | null | undefined, group: string): boolean {
    if (code == null) return false;
    if (group === "2xx") return code >= 200 && code < 300;
    if (group === "3xx") return code >= 300 && code < 400;
    if (group === "4xx") return code >= 400 && code < 500;
    if (group === "5xx") return code >= 500;
    return false;
  }

  const filteredDashboardPages = (pagesData?.pages ?? []).filter(page => {
    if (colFilters.statusGroup && !matchesStatusGroup(page.status_code, colFilters.statusGroup)) return false;
    if (colFilters.indexability && (page.indexability ?? "") !== colFilters.indexability) return false;
    if (colFilters.hasCanonical !== null) {
      const hasCanon = !!page.canonical;
      if (colFilters.hasCanonical !== hasCanon) return false;
    }
    return true;
  });

  const displayedDashboardPages = filteredDashboardPages.filter(page => {
    const ct = page.content_type ?? "";
    return !ct.startsWith("image/") && !ct.includes("css") && !ct.includes("javascript") && !ct.includes("font");
  });

  // ── Detail rows for bottom panel ──────────────────────────────────────────
  const filteredDetailRows = selectedPage
    ? Object.entries({
        Address: selectedPage.address,
        Type: selectedPage.type ?? "—",
        "Status Code": selectedPage.status_code ?? "—",
        Indexability: selectedPage.indexability ?? "—",
        Title: selectedPage.title ?? "—",
        "Meta Description": selectedPage.meta_descp ?? "—",
        H1: selectedPage.h1 ?? "—",
        "H2 Headings": selectedPage.h2s?.length ? selectedPage.h2s.join(" · ") : "—",
        "H3 Headings": selectedPage.h3s?.length ? selectedPage.h3s.join(" · ") : "—",
        Canonical: selectedPage.canonical ?? "—",
        "Response Time (ms)": selectedPage.response_time ?? "—",
        Readability: selectedPage.readability ?? "—",
      }).filter(
        ([key, val]) =>
          !detailSearch ||
          key.toLowerCase().includes(detailSearch.toLowerCase()) ||
          String(val).toLowerCase().includes(detailSearch.toLowerCase())
      )
    : [];

  const crawlActive = site?.status === "completed" || site?.status === "processing";
  const geoScore = geo?.score?.overall_score;
  const geoGrade = geo?.score?.grade;

  // ── Dashboard computed stats ──────────────────────────────────────────────
  const typeSlices = overview
    ? Object.entries(overview.by_type)
        .map(([label, value]) => ({ label, value: value as unknown as number, color: TYPE_COLORS[label] ?? "#94a3b8" }))
        .filter((s) => s.value > 0)
    : [];
  const totalTypeCount = typeSlices.reduce((s, d) => s + d.value, 0);

  const indexabilityCounts = {
    indexable:    overview?.indexability_counts?.indexable     ?? 0,
    nonIndexable: overview?.indexability_counts?.non_indexable ?? 0,
    external:     overview?.indexability_counts?.external      ?? 0,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar-dark flex w-52 shrink-0 flex-col" style={{ background: "linear-gradient(160deg, rgb(15, 32, 39), rgb(30, 58, 58), rgb(15, 32, 39))", borderRight: "1px solid rgba(255, 255, 255, 0.08)" }}>
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
        <nav className="flex flex-col gap-0.5 p-2 pt-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Main menu</p>
          {(
            [
              { id: "dashboard", label: "Dashboard", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
{ id: "geo",       label: "GEO Analysis", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
              { id: "insights",  label: "Insights",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              { id: "history",   label: "History",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg> },
              { id: "schedules", label: "Schedules", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { id: "competitors", label: "Competitors", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="4"/><circle cx="17" cy="17" r="4"/><line x1="12.5" y1="12.5" x2="13.5" y2="13.5"/></svg> },
            ] as { id: MainTab; label: string; icon: React.ReactNode }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setMainTab(item.id)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all"
              style={mainTab === item.id ? {
                background: "linear-gradient(135deg, #0d9488, #16a34a)",
                color: "#ffffff", fontWeight: 600,
                boxShadow: "0 2px 8px rgba(13,148,136,.35)"
              } : {
                color: "#94a3b8"
              }}
              onMouseEnter={e => { if (mainTab !== item.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
              onMouseLeave={e => { if (mainTab !== item.id) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; } }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
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
                onClick={() => { void handleSignOut(); }}
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

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Top header ────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div className="flex shrink-0 items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#0d9488" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
              <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-xs font-bold tracking-wide" style={{ color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.5px" }}>Analyze</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,.04)" }}>
            <span className="shrink-0 text-xs font-medium" style={{ color: "#94a3b8" }}>URL</span>
            <input
              type="url"
              placeholder="https://example.com/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !quotaExhausted && handleStart()}
              disabled={quotaExhausted}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button onClick={handleStart} disabled={quotaExhausted} className="shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: "#94a3b8" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#0d9488"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleStart}
              disabled={loading || isAnalyzing || quotaExhausted}
              className="btn-gradient px-5 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Starting…" : "Start →"}
            </button>
            <button onClick={handleClear} disabled={quotaExhausted} className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed" style={{ borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", color: "#16a34a" }}>
              Clear
            </button>
            {site?.status === "completed" && (
              <button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)]">
                Done
              </button>
            )}
          </div>
        </header>

        {/* Error bar */}
        {error && (
          <div className="shrink-0 border-b border-[var(--error)] bg-[var(--error)]/10 px-4 py-2 text-sm text-[var(--error)]">
            {error}
          </div>
        )}

        {/* ── Tab content ───────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

          {/* Loading state — wait for auth + subscription before rendering tabs */}
          {authLoading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
            </div>
          )}

          {/* ── Quota-exhausted gate for all tabs except history ── */}
          {!authLoading && quotaExhausted && mainTab !== "history" && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto bg-[var(--background)] p-8">
              <LockedFeature
                title={subscription?.plan === "pro" ? "Monthly Audit Limit Reached" : "Audit Limit Reached"}
                plan={subscription?.plan === "pro" ? "Agency" : "Pro"}
              />
              <p className="mt-4 text-xs text-[var(--muted)]">
                Your past audits are still available in the <button onClick={() => setMainTab("history")} className="underline text-[var(--accent)]">History</button> tab.
              </p>
            </div>
          )}

          {/* ── DASHBOARD TAB ── */}
          {!authLoading && mainTab === "dashboard" && !quotaExhausted && (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              {!site ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center space-y-4 max-w-md px-6">
                    <div className="flex justify-center">
                      <div style={{
                        width: 64, height: 64, borderRadius: 18,
                        background: "linear-gradient(135deg, #0d9488, #16a34a)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 30, boxShadow: "0 8px 24px rgba(13,148,136,.35)"
                      }}>🤖</div>
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight mb-2" style={{ color: "#0f172a", fontFamily: "Inter, sans-serif" }}>
                        Ready to analyze your site?
                      </h2>
                      <p className="text-sm" style={{ color: "#64748b", lineHeight: 1.6 }}>
                        Enter a URL above to crawl every page, run a full technical audit, and get your <strong style={{ color: "#0d9488" }}>AI Citation Readiness Score</strong>.
                      </p>
                    </div>
                    <div className="flex justify-center gap-4 pt-2">
                      {[["📊", "GEO Score"], ["🔍", "Deep Crawl"], ["🛡️", "E-E-A-T"]].map(([icon, label]) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                          <span className="text-lg">{icon}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">

                  {/* Row 1: 4 summary cards */}
                  <div className="grid grid-cols-4 gap-3">

                    {/* URLs Crawled */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ boxShadow: "var(--card-shadow)" }}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">URLs Crawled</p>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#f0fdf4" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                      </div>
                      <div className="text-3xl font-black tabular-nums" style={{ color: "#0f172a" }}>{(overview?.total_urls ?? 0).toLocaleString()}</div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs text-[var(--muted)]">{(pagesData?.total ?? 0).toLocaleString()} unique pages</p>
                        {site.js_rendering && (
                          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "#eff6ff", color: "#2563eb" }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                            JS Rendered
                          </span>
                        )}
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        {site.status === "processing" ? (
                          <div className="progress-indeterminate h-full w-1/3 rounded-full" style={{ background: "linear-gradient(90deg,#0d9488,#16a34a)" }} />
                        ) : (
                          <div className="h-full w-full rounded-full" style={{ background: "linear-gradient(90deg,#0d9488,#16a34a)" }} />
                        )}
                      </div>
                    </div>

                    {/* GEO Score */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ boxShadow: "var(--card-shadow)" }}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">GEO Score</p>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#f0fdf4" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </div>
                      </div>
                      {geoScore != null ? (() => {
                        const color = geoScore >= 80 ? "#16a34a" : geoScore >= 65 ? "#f59e0b" : "#ef4444";
                        const r = 24, cx = 30, cy = 30, C = 2 * Math.PI * r;
                        const geoLabel = geoScore >= 80 ? "Excellent" : geoScore >= 65 ? "Good" : geoScore >= 50 ? "Fair" : "Poor";
                        return (
                          <div className="flex items-center gap-3">
                            <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
                                strokeDasharray={`${(geoScore / 100) * C} ${C}`}
                                transform={`rotate(-90 ${cx} ${cy})`}
                                style={{ transition: "stroke-dasharray 900ms" }} />
                              <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>{geoScore}</text>
                            </svg>
                            <div>
                              <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{geoScore} / 100 {geoGrade}</p>
                              <span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={{ background: geoScore >= 80 ? "#f0fdf4" : geoScore >= 65 ? "#fffbeb" : "#fef2f2", color }}>
                                {geoLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="flex h-14 items-center gap-2 text-xs text-[var(--muted)]">
                          {site.status === "completed" ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />Analyzing…</> : "Awaiting crawl"}
                        </div>
                      )}
                    </div>

                    {/* Site Health */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ boxShadow: "var(--card-shadow)" }}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Site Health</p>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#f0fdf4" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                      </div>
                      {audit?.audit ? (() => {
                        const checks = [audit.audit.https.passed, audit.audit.sitemap.found, audit.audit.broken_links.count === 0, audit.audit.missing_canonicals.missing_count === 0];
                        const passed = checks.filter(Boolean).length;
                        const pct = Math.round((passed / checks.length) * 100);
                        const color = pct === 100 ? "#16a34a" : pct >= 75 ? "#f59e0b" : "#ef4444";
                        const label = pct === 100 ? "Excellent" : pct >= 75 ? "Good" : pct >= 50 ? "Fair" : "Poor";
                        const r = 24, cx = 30, cy = 30, C = 2 * Math.PI * r;
                        return (
                          <div className="flex items-center gap-3">
                            <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
                                strokeDasharray={pct === 100 ? undefined : `${(pct / 100) * C} ${C}`}
                                transform={`rotate(-90 ${cx} ${cy})`} />
                              <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>{pct}%</text>
                            </svg>
                            <div>
                              <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{passed} / {checks.length} Checks</p>
                              <span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={{ background: pct === 100 ? "#f0fdf4" : pct >= 75 ? "#fffbeb" : "#fef2f2", color }}>{label}</span>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="flex h-14 items-center gap-2 text-xs text-[var(--muted)]">
                          {site.status === "completed" ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />Analyzing…</> : "Awaiting crawl"}
                        </div>
                      )}
                    </div>

                    {/* Image SEO */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ boxShadow: "var(--card-shadow)" }}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Image SEO</p>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#fffbeb" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      </div>
                      {overview ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--muted)]">Total images</span>
                            <span className="font-bold" style={{ color: "#0f172a" }}>{overview.images_total.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: "#d97706" }}>Missing Alt Text</span>
                            <span className="font-bold" style={{ color: "#d97706" }}>{overview.images_missing_alt.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--muted)]">Optimized</span>
                            <span className="font-bold" style={{ color: "#0f172a" }}>{(overview.images_optimized ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-16 items-center justify-center text-xs text-[var(--muted)]">Loading…</div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Crawl History + Issues Breakdown */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: "3fr 2fr" }}>
                    <CrawlHistoryChart items={historyItems} />
                    <DashIssuesDonut overview={overview} audit={audit?.audit ?? null} pages={pagesData?.pages ?? []} />
                  </div>

                  {/* Row 3: Status badges */}
                  {audit?.audit && (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { title: "HTTPS", ok: audit.audit.https.passed, badge: audit.audit.https.passed ? "Secure" : "Not Secure", color: "#6366f1",
                          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
                        { title: "Sitemap", ok: audit.audit.sitemap.found, badge: audit.audit.sitemap.found ? "Found" : "Not Found", color: "#0ea5e9",
                          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg> },
                        { title: "Broken Links", ok: audit.audit.broken_links.count === 0, badge: audit.audit.broken_links.count === 0 ? "None Found" : `${audit.audit.broken_links.count} found`, color: "#ef4444",
                          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg> },
                        { title: "Canonicals", ok: audit.audit.missing_canonicals.missing_count === 0, badge: audit.audit.missing_canonicals.missing_count === 0 ? "All OK" : `${audit.audit.missing_canonicals.missing_count} missing`, color: "#8b5cf6",
                          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
                      ].map(item => (
                        <div key={item.title} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3" style={{ boxShadow: "var(--card-shadow)" }}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${item.color}18`, color: item.color }}>
                              {item.icon}
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{item.title}</p>
                              <p className="text-sm font-bold text-[var(--foreground)]">{item.badge}</p>
                            </div>
                          </div>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                            style={{ background: item.ok ? "#10b98118" : "#ef444418", color: item.ok ? "#10b981" : "#ef4444" }}>
                            {item.ok ? "✓" : "!"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Row 4: Speed + Security Headers + Indexability & Status */}
                  {audit?.audit && overview && (
                    <div className="grid grid-cols-3 gap-3">
                      <DashSpeedSection pagespeed={audit.audit.pagespeed} />
                      {audit.audit.security_headers
                        ? <DashSecurityHeaders sh={audit.audit.security_headers} />
                        : <div className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-xs text-[var(--muted)]">Security headers unavailable</div>
                      }
                      <DashIndexabilityStatus overview={overview} />
                    </div>
                  )}

                  {/* Row 5: Full crawl table + detail drawer */}
                  {crawlActive && (
                    <div className="flex gap-1 min-h-0">
                      {/* Table side */}
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col min-w-0" style={{ flex: selectedPage ? "0 0 60%" : "1", transition: "flex 200ms ease", overflow: "hidden" }}>
                        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2" ref={dropdownRef}>
                          <input
                            type="text"
                            placeholder="Search URLs…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPageNum(0); }}
                            className="w-40 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                          />
                          {/* Status filter */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (openDropdown === "status") { setOpenDropdown(null); }
                                else { setOpenDropdown("status"); }
                              }}
                              className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                            >
                              {draftFilters.statusGroup ? `${draftFilters.statusGroup}` : "Status"}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openDropdown === "status" && (
                              <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg" style={{ minWidth: 170 }}>
                                <div className="py-1">
                                  {([["2xx", "OK"], ["3xx", "Redirects"], ["4xx", "Client Errors"], ["5xx", "Server Errors"]] as const).map(([g, label]) => (
                                    <button
                                      key={g}
                                      type="button"
                                      onClick={() => { setDraftFilters(d => ({ ...d, statusGroup: g })); setOpenDropdown(null); }}
                                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-elevated)] ${
                                        draftFilters.statusGroup === g ? "text-[var(--accent)] font-medium" : "text-[var(--foreground)]"
                                      }`}
                                    >
                                      <span className="font-mono text-[10px] text-[var(--muted)]">{g}</span> {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Indexability filter */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (openDropdown === "indexability") { setOpenDropdown(null); }
                                else { setOpenDropdown("indexability"); }
                              }}
                              className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                            >
                              {draftFilters.indexability ? `${draftFilters.indexability}` : "Indexability"}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openDropdown === "indexability" && (
                              <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg" style={{ minWidth: 160 }}>
                                <div className="py-1">
                                  {(["Indexable", "Non-Indexable"] as const).map((val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => { setDraftFilters(d => ({ ...d, indexability: val })); setOpenDropdown(null); }}
                                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-elevated)] ${
                                        draftFilters.indexability === val ? "text-[var(--accent)] font-medium" : "text-[var(--foreground)]"
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Canonical filter */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (openDropdown === "canonical") { setOpenDropdown(null); }
                                else { setOpenDropdown("canonical"); }
                              }}
                              className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                            >
                              {draftFilters.hasCanonical === true ? "Has" : draftFilters.hasCanonical === false ? "Missing" : "Canonical"}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openDropdown === "canonical" && (
                              <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg" style={{ minWidth: 170 }}>
                                <div className="py-1">
                                  {([["has", "Has Canonical", true], ["missing", "Missing Canonical", false]] as const).map(([key, label, val]) => (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => { setDraftFilters(d => ({ ...d, hasCanonical: val })); setOpenDropdown(null); }}
                                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-elevated)] ${
                                        draftFilters.hasCanonical === val ? "text-[var(--accent)] font-medium" : "text-[var(--foreground)]"
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => { setColFilters({ ...draftFilters }); setOpenDropdown(null); }}
                            className="rounded bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                          >
                            Filter
                          </button>
                          <button
                            onClick={() => { setDraftFilters(defaultFilters); setColFilters(defaultFilters); setOpenDropdown(null); }}
                            className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            Clear
                          </button>
                          <span className="ml-auto shrink-0 text-xs text-[var(--muted)]">
                            {displayedDashboardPages.length} URL{displayedDashboardPages.length !== 1 ? "s" : ""}
                            {(colFilters.statusGroup || colFilters.indexability || colFilters.hasCanonical !== null) && ` of ${pagesData?.total ?? 0}`}
                            {site?.status === "processing" && " (updating…)"}
                          </span>
                        </div>
                        <div className="overflow-auto" style={{ maxHeight: "400px" }}>
                          <table className="w-full border-collapse text-xs" style={{ minWidth: "1200px" }}>
                            <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
                              <tr>
                                <th className="w-10 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">#</th>
                                <th className="min-w-[180px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Address</th>
                                <th className="w-16 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Type</th>
                                <th className="w-16 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Status</th>
                                <th className="w-24 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Indexability</th>
                                <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Title</th>
                                <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Meta Desc</th>
                                <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">H1</th>
                                <th className="min-w-[120px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Canonical</th>
                                <th className="w-18 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Resp. Time</th>
                                <th className="w-20 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Readability</th>
                              </tr>
                            </thead>
                            <tbody>
                              {site.status === "processing" && (!pagesData || pagesData.pages.length === 0) && (
                                <tr><td colSpan={13} className="px-3 py-8 text-center">
                                  <div className="flex items-center justify-center gap-2 text-[var(--muted)]">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                                    Discovering URLs…
                                  </div>
                                </td></tr>
                              )}
                              {displayedDashboardPages.length === 0 && site?.status !== "processing" && (
                                <tr><td colSpan={13} className="px-3 py-8 text-center text-xs text-[var(--muted)]">
                                  No URLs match the applied filters.
                                </td></tr>
                              )}
                              {displayedDashboardPages.map((page, i) => (
                                <tr
                                  key={`${page.id}-${page.address}`}
                                  onClick={() => setSelectedPage(selectedPage?.id === page.id && selectedPage?.address === page.address ? null : page)}
                                  className={`cursor-pointer border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--surface-elevated)] ${
                                    selectedPage?.id === page.id && selectedPage?.address === page.address
                                      ? "bg-[var(--accent-light)]"
                                      : ""
                                  }`}
                                >
                                  <td className="px-2 py-2 text-[var(--muted)]">{i + 1}</td>
                                  <td className="min-w-[180px] max-w-[280px] truncate px-2 py-2 text-[var(--accent)]" title={page.address}>{page.address}</td>
                                  <td className="px-2 py-2 text-[var(--muted)]">{page.type ?? "—"}</td>
                                  <td className="px-2 py-2">
                                    {page.status_code != null ? (
                                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                                        page.status_code < 300
                                          ? "bg-[var(--success)]/15 text-[var(--success)]"
                                          : page.status_code < 400
                                          ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                                          : "bg-red-500/15 text-red-400"
                                      }`}>
                                        {page.status_code}
                                      </span>
                                    ) : "—"}
                                  </td>
                                  <td className="px-2 py-2 text-[var(--muted)]">{page.indexability ?? "—"}</td>
                                  <td className="min-w-[100px] max-w-[160px] truncate px-2 py-2" title={page.title ?? ""}>{page.title ?? "—"}</td>
                                  <td className="min-w-[80px] max-w-[140px] truncate px-2 py-2 text-[var(--muted)]" title={page.meta_descp ?? ""}>{page.meta_descp ?? "—"}</td>
                                  <td className="min-w-[80px] max-w-[140px] truncate px-2 py-2" title={page.h1 ?? ""}>{page.h1 ?? "—"}</td>
                                  <td className="min-w-[120px] max-w-[200px] truncate px-2 py-2 text-[var(--muted)]" title={page.canonical ?? ""}>{page.canonical ?? "—"}</td>
                                  <td className="px-2 py-2 text-[var(--muted)]">{page.response_time ?? "—"}</td>
                                  <td className="w-20 px-2 py-2 text-[var(--muted)]">{page.readability ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Pagination */}
                        {(pagesData?.total ?? 0) > PAGE_SIZE && (
                          <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                            <button
                              onClick={() => setPageNum((p) => Math.max(0, p - 1))}
                              disabled={pageNum === 0}
                              className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface)] disabled:opacity-40"
                            >
                              ← Prev
                            </button>
                            <span className="text-xs text-[var(--muted)]">
                              Page {pageNum + 1} of {Math.ceil((pagesData?.total ?? 0) / PAGE_SIZE)}
                              {" "}· {(pagesData?.total ?? 0).toLocaleString()} total
                            </span>
                            <button
                              onClick={() => setPageNum((p) => p + 1)}
                              disabled={(pageNum + 1) * PAGE_SIZE >= (pagesData?.total ?? 0)}
                              className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface)] disabled:opacity-40"
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Detail drawer */}
                      {selectedPage && (
                        <div
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0"
                          style={{ width: "40%", maxHeight: "460px" }}
                        >
                          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 rounded-t-lg">
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--foreground)]" title={selectedPage.address}>
                              {selectedPage.address}
                            </span>
                            <button
                              onClick={() => { setSelectedPage(null); setDetailSearch(""); }}
                              className="shrink-0 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                              title="Close"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                          <div className="min-h-0 flex-1 overflow-auto p-3">
                            <table className="w-full text-xs">
                              <tbody>
                                {filteredDetailRows.map(([key, val]) => (
                                  <tr key={key} className="border-b border-[var(--border)]/50">
                                    <td className="w-36 shrink-0 py-1.5 pr-3 text-[var(--muted)] align-top font-medium">{key}</td>
                                    <td className="min-w-0 break-all py-1.5">{String(val)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

{/* ── INSIGHTS TAB ── */}
        {mainTab === "insights" && !quotaExhausted && (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[var(--background)] p-4">
            {isFree ? (
              <LockedFeature title="Insights" />
            ) : !site || site.status !== "completed" ? (
              <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
                Complete a crawl to view Insights.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* Checklist */}
                <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
                  <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 rounded-t-xl">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">SEO Checklist</h2>
                    <p className="text-[10px] text-[var(--muted)]">Track your fixes — state saved locally</p>
                  </div>
                  <div className="p-4">
                    {geo && (geo.schema || geo.eeat || geo.content || geo.nlp) ? (
                      <ChecklistPanel geo={geo} siteId={siteId!} />
                    ) : (
                      <div className="flex items-center gap-2 py-6 text-xs text-[var(--muted)]">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                        Waiting for GEO analysis…
                      </div>
                    )}
                  </div>
                </div>

                {/* Site Structure */}
                <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
                  <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 rounded-t-xl">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">Site Structure</h2>
                    <p className="text-[10px] text-[var(--muted)]">URL path hierarchy from crawled pages</p>
                  </div>
                  <div className="p-4">
                    <SiteStructurePanel pages={pagesData?.pages ?? []} siteUrl={site.url} queryPatterns={geo?.nlp?.query_patterns} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {mainTab === "history" && (
          <HistoryTab initialDomain={site?.url ? new URL(site.url).hostname.replace(/^www\./, "") : ""} />
        )}

        {/* ── SCHEDULES TAB ── */}
        {mainTab === "schedules" && !quotaExhausted && (
          isFree ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[var(--background)] p-4">
              <LockedFeature title="Scheduled Re-audits" />
            </div>
          ) : (
            <SchedulesTab initialDomain={site?.url ? new URL(site.url).hostname.replace(/^www\./, "") : ""} />
          )
        )}

        {/* ── COMPETITORS TAB ── */}
        {mainTab === "competitors" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[var(--background)]">
            <CompetitorsTab />
          </div>
        )}

        {/* ── GEO TAB ── */}
        {mainTab === "geo" && !quotaExhausted && (
          <div className="flex min-h-0 flex-1 flex-col bg-[var(--background)]">
            {!site || site.status !== "completed" ? (
              <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
                Complete a crawl to view the GEO analysis.
              </div>
            ) : !geo ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner label="Starting GEO analysis…" />
              </div>
            ) : (
              <GeoTab geo={geo} siteId={siteId!} siteUrl={site?.url ?? ""} pages={pagesData?.pages ?? []} isFree={isFree} plan={subscription?.plan} />
            )}
          </div>
        )}

        </div>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <footer className="flex shrink-0 items-center border-t border-[var(--border)] bg-[var(--surface-elevated)]">
        <div className="flex flex-1 items-center gap-3 px-4 py-1.5 text-xs text-[var(--muted)]">
          {site ? (
            <>
              <span className="capitalize">{site.status}</span>
              {site.robots_allowed === false && (
                <span className="text-amber-600">· Crawling disallowed by robots.txt</span>
              )}
              {pagesData && (
                <span>
                  · {pagesData.total} URL{pagesData.total !== 1 ? "s" : ""} crawled
                  {site.js_rendering && (
                    <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "#eff6ff", color: "#2563eb" }}>JS Rendered</span>
                  )}
                </span>
              )}
              {audit?.audit_status === "completed" && <span>· Audit complete</span>}
              {geo?.geo_status === "completed" && geo.score && (
                <span className="font-medium text-[var(--accent)]">
                  · GEO Score: {geo.score.overall_score}/100 ({geo.score.grade})
                </span>
              )}
              {geo?.geo_status === "running" && <span>· GEO analysis running…</span>}
            </>
          ) : (
            "Ready — enter a URL to start"
          )}
        </div>
      </footer>
      </div>
    </div>
  );
}
