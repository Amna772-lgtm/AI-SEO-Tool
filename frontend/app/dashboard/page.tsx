"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  startAnalysis,
  getSite,
  getPages,
  getOverview,
  getAudit,
  getGeo,
  type Site,
  type PageRow,
  type PagesResponse,
  type OverviewResponse,
  type AuditResponse,
  type AuditResult,
  type PageSpeedResult,
  type SecurityHeadersResult,
  type GeoResponse,
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
type MainTab = "dashboard" | "audit" | "geo" | "insights" | "history" | "schedules" | "competitors";

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
  const r = 36, cx = 56, cy = 48;
  const circ = Math.PI * r;
  const filled = Math.min(score / 100, 1) * circ;
  const color = score >= 90 ? "var(--success)" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="112" height="58" viewBox="0 0 112 58">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="var(--border)" strokeWidth="7" strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="22" fontWeight="bold"
          fill={color} fontFamily="monospace">
          {score}
        </text>
      </svg>
      <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</span>
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
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Security Headers
        </p>
        <span className={`font-mono text-xs font-bold ${
          sh.passed_count === sh.total_count ? "text-[var(--success)]" : "text-[var(--warning)]"
        }`}>
          {sh.passed_count}/{sh.total_count}
        </span>
      </div>
      {sh.error ? (
        <p className="text-xs text-[var(--warning)]">{sh.error}</p>
      ) : (
        <div className="space-y-2.5">
          {displayKeys.map((key) => {
            const info = sh.headers[key];
            if (!info) return null;
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-[var(--foreground)]">{info.label}</span>
                <span className={info.present ? "text-[var(--success)]" : "text-red-500"}>
                  {info.present ? "✓" : "✗"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Technical Audit Panel ──────────────────────────────────────────────────────
function AuditFullPanel({ audit }: { audit: AuditResult }) {
  const { https, sitemap, broken_links, missing_canonicals, pagespeed } = audit;
  const desk = pagespeed.desktop;
  const mob = pagespeed.mobile;

  function StatusCard({
    icon, title, ok, badge,
  }: {
    icon: React.ReactNode; title: string; ok: boolean; badge: string;
  }) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2">
          <span className={ok ? "text-[var(--success)]" : "text-[var(--warning)]"}>{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</span>
        </div>
        <span className={`self-start rounded px-3 py-1 text-xs font-bold ${
          ok
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-red-500/15 text-red-400"
        }`}>
          {badge}
        </span>
      </div>
    );
  }

  const cwvMetrics: { key: keyof PageSpeedResult; label: string }[] = [
    { key: "fcp", label: "FCP" },
    { key: "lcp", label: "LCP" },
    { key: "tbt", label: "TBT" },
    { key: "cls", label: "CLS" },
    { key: "speed_index", label: "SI" },
  ];

  const hasSecHeaders = !!audit.security_headers;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      {/* Top: 4 status cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusCard
          title="HTTPS"
          ok={https.passed}
          badge={https.passed ? "Secure" : "Not Secure"}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
        />
        <StatusCard
          title="Sitemap"
          ok={sitemap.found}
          badge={sitemap.found ? "Found" : "Not Found"}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          }
        />
        <StatusCard
          title="Broken Links"
          ok={broken_links.count === 0}
          badge={broken_links.count === 0 ? "None" : `${broken_links.count} found`}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <StatusCard
          title="Canonicals"
          ok={missing_canonicals.missing_count === 0}
          badge={missing_canonicals.missing_count === 0 ? "OK" : `${missing_canonicals.missing_count} missing`}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          }
        />
      </div>

      {/* Broken links list */}
      {broken_links.urls.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <p className="border-b border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--warning)]">
            Broken Links
          </p>
          <div className="max-h-40 overflow-auto">
            {broken_links.urls.map((u, i) => (
              <p key={i} className="truncate border-b border-[var(--border)]/40 px-4 py-1.5 font-mono text-xs text-red-400" title={u}>
                {u}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Missing canonicals list */}
      {missing_canonicals.missing_count > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <p className="border-b border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--warning)]">
            Missing Canonicals ({missing_canonicals.missing_count} / {missing_canonicals.total_html_pages})
          </p>
          <div className="max-h-40 overflow-auto">
            {missing_canonicals.urls.map((u, i) => (
              <p key={i} className="truncate border-b border-[var(--border)]/40 px-4 py-1.5 font-mono text-xs text-[var(--muted)]" title={u}>
                {u}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Bottom: Security Headers + PageSpeed */}
      <div className={`grid gap-4 ${hasSecHeaders ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {hasSecHeaders && <SecurityHeadersBlock sh={audit.security_headers!} />}

        {/* PageSpeed */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Pagespeed</p>
          {desk.error && mob.error ? (
            <p className="text-xs text-[var(--warning)]">{psiErrorMessage(desk.error)}</p>
          ) : (
            <>
              <div className="flex justify-around mb-5">
                {!desk.error && desk.performance != null && <SemiGauge score={desk.performance} label="Desktop" />}
                {!mob.error && mob.performance != null && <SemiGauge score={mob.performance} label="Mobile" />}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[var(--surface-elevated)] px-4 py-3 space-y-2">
                  {cwvMetrics.map(({ key, label }) => {
                    const val = desk[key];
                    if (!val) return null;
                    return (
                      <div key={label} className="flex justify-between">
                        <span className="text-[var(--muted)]">{label}</span>
                        <span className="font-mono text-[var(--accent)]">{val}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg bg-[var(--surface-elevated)] px-4 py-3 space-y-2">
                  {cwvMetrics.map(({ key, label }) => {
                    const val = mob[key];
                    if (!val) return null;
                    return (
                      <div key={label} className="flex justify-between">
                        <span className="text-[var(--muted)]">{label}</span>
                        <span className="font-mono text-[var(--accent)]">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
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
  const defaultFilters = { statusGroup: [] as string[], indexability: [] as string[], hasCanonical: null as boolean | null };
  const [colFilters, setColFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    if (colFilters.statusGroup.length > 0 && !colFilters.statusGroup.some(g => matchesStatusGroup(page.status_code, g))) return false;
    if (colFilters.indexability.length > 0 && !colFilters.indexability.includes(page.indexability ?? "")) return false;
    if (colFilters.hasCanonical !== null) {
      const hasCanon = !!page.canonical;
      if (colFilters.hasCanonical !== hasCanon) return false;
    }
    return true;
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
              { id: "audit",     label: "Technical Audit", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
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
            <button disabled={quotaExhausted} className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] disabled:opacity-50 disabled:cursor-not-allowed">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0"/><path d="M4.93 19.07a10 10 0 0 0 14.14 0"/>
              </svg>
              Config
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

                  {/* Row 1: 3 summary cards */}
                  <div className="grid grid-cols-3 gap-3">

                    {/* URLs Crawled */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
                      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #0d9488, #16a34a)" }} />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">URLs Crawled</p>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a" }}>Total</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-black tabular-nums" style={{ color: "#0f172a" }}>{(overview?.total_urls ?? 0).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">{(pagesData?.total ?? 0).toLocaleString()} pages crawled</p>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                          {site.status === "processing" ? (
                            <div className="progress-indeterminate h-full w-1/3 rounded-full" style={{ background: "linear-gradient(90deg,#0d9488,#16a34a)" }} />
                          ) : (
                            <div className="h-full w-full rounded-full" style={{ background: "linear-gradient(90deg,#0d9488,#16a34a)" }} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Image SEO Issues */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
                      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #f97316)" }} />
                      <div className="p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Image SEO</p>
                        {overview ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[var(--muted)]">Total images</span>
                              <span className="text-lg font-black tabular-nums" style={{ color: "#0f172a" }}>{overview.images_total.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: "#d97706" }}>Missing alt text</span>
                              <span className="text-sm font-bold" style={{ color: "#d97706" }}>{overview.images_missing_alt.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: "#16a34a" }}>Optimized ⓘ</span>
                              <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{(overview.images_optimized ?? 0).toLocaleString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-16 items-center justify-center text-xs text-[var(--muted)]">Loading…</div>
                        )}
                      </div>
                    </div>

                    {/* GEO Score */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
                      <div className="h-1 w-full" style={{ background: geoScore != null ? (geoScore >= 80 ? "linear-gradient(90deg,#16a34a,#0d9488)" : geoScore >= 60 ? "linear-gradient(90deg,#f59e0b,#f97316)" : "linear-gradient(90deg,#ef4444,#dc2626)") : "linear-gradient(90deg,#e2e8f0,#cbd5e1)" }} />
                      <div className="p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">GEO Score</p>
                        {geoScore != null ? (
                          <>
                            <div className="flex items-end gap-1">
                              <span className="text-3xl font-black tabular-nums" style={{ color: "#0f172a" }}>{geoScore}</span>
                              <span className="mb-1 text-sm text-[var(--muted)]">/100</span>
                              {geoGrade && <span className="mb-1 ml-1 text-sm font-black" style={{ color: geoScore >= 80 ? "#16a34a" : geoScore >= 60 ? "#d97706" : "#dc2626" }}>{geoGrade}</span>}
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1" style={{
                              background: geoScore >= 80 ? "#f0fdf4" : geoScore >= 60 ? "#fffbeb" : "#fef2f2",
                              color: geoScore >= 80 ? "#16a34a" : geoScore >= 60 ? "#d97706" : "#dc2626"
                            }}>
                              {geoScore >= 80 ? "✓ Excellent" : geoScore >= 65 ? "▲ Good" : geoScore >= 50 ? "~ Fair" : "✗ Poor"}
                            </span>
                          </>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="text-2xl font-black" style={{ color: "#94a3b8" }}>—/100</div>
                            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                              {site.status === "completed" ? (
                                <>
                                  <div className="h-2.5 w-2.5 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
                                  Analyzing…
                                </>
                              ) : "Awaiting crawl"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Status code cards */}
                  <div className="grid grid-cols-2 gap-3">

                    {/* Status Codes donut */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="mb-3 text-xs font-medium text-[var(--muted)]">Status Codes</p>
                      {overview ? (() => {
                        const sc = overview.status_counts;
                        const ok    = sc?.ok        ?? 0;
                        const r3xx  = sc?.redirect  ?? 0;
                        const r4xx  = sc?.error_4xx ?? 0;
                        const r5xx  = sc?.error_5xx ?? 0;
                        const blocked = Math.max(0, overview.total_urls - ok - r3xx - r4xx - r5xx);
                        const sliceDefs = [
                          { label: "2xx Success",           value: ok,      color: "#10b981" },
                          { label: "3xx Redirection",       value: r3xx,    color: "#f59e0b" },
                          { label: "4xx Client Error",      value: r4xx,    color: "#f43f5e" },
                          { label: "5xx Server Error",      value: r5xx,    color: "#dc2626" },
                          { label: "Blocked by robots.txt", value: blocked, color: "#94a3b8" },
                        ].filter((s) => s.value > 0);
                        return (
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <DonutChart slices={sliceDefs} size={110} />
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <span className="text-base font-black tabular-nums">{overview.total_urls.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex-1 space-y-1.5 text-xs">
                              {sliceDefs.map((s) => (
                                <div key={s.label} className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                                    <span className="text-[var(--muted)]">{s.label}</span>
                                  </div>
                                  <span className="font-semibold" style={{ color: s.color }}>{s.value.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            {(r3xx > 0 || r4xx > 0) && (
                              <div className="shrink-0 space-y-2 border-l border-[var(--border)] pl-3 text-xs">
                                {r3xx > 0 && <div><p className="font-medium text-[var(--warning)]">3xx Redirection</p><p className="font-bold text-[var(--warning)]">{r3xx}</p></div>}
                                {r4xx > 0 && <div><p className="font-medium text-red-500">4xx Client Error</p><p className="font-bold text-red-500">{r4xx}</p></div>}
                              </div>
                            )}
                          </div>
                        );
                      })() : <div className="flex h-20 items-center justify-center text-xs text-[var(--muted)]">Loading…</div>}
                    </div>

                    {/* Indexability ring */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="mb-3 text-xs font-medium text-[var(--muted)]">Indexability</p>
                      {overview?.indexability_counts ? (() => {
                        const idxSlices = [
                          { label: "Indexable",     value: indexabilityCounts.indexable,    color: "#10b981" },
                          { label: "Non-Indexable", value: indexabilityCounts.nonIndexable, color: "#f43f5e" },
                          { label: "External",      value: indexabilityCounts.external,     color: "#f59e0b" },
                        ].filter((s) => s.label === "External" || s.value > 0);
                        const idxTotal = idxSlices.reduce((acc, s) => acc + s.value, 0);
                        return (
                          <div className="flex items-center gap-3">
                            <DonutChart slices={idxSlices} size={110} />
                            <div className="flex-1 space-y-1.5 text-xs">
                              {idxSlices.map((s) => (
                                <div key={s.label} className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                                    <span className="text-[var(--muted)]">{s.label}</span>
                                  </div>
                                  <span className="font-semibold" style={{ color: s.color }}>
                                    {idxTotal > 0 ? Math.round((s.value / idxTotal) * 100) : 0}% → {s.value.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })() : <div className="flex h-20 items-center justify-center text-xs text-[var(--muted)]">Loading…</div>}
                    </div>
                  </div>

                  {/* Row 3: Full crawl table + detail drawer */}
                  {crawlActive && (
                    <div className="flex gap-3 min-h-0">
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
                                else { setDraftFilters({ ...colFilters }); setOpenDropdown("status"); }
                              }}
                              className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
                                colFilters.statusGroup.length > 0
                                  ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-medium"
                                  : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--foreground)]"
                              }`}
                            >
                              Status{colFilters.statusGroup.length > 0 ? ` · ${colFilters.statusGroup.length}` : ""}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openDropdown === "status" && (
                              <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg" style={{ minWidth: 170 }}>
                                <div className="px-3 py-2 space-y-1.5">
                                  {([["2xx", "OK"], ["3xx", "Redirects"], ["4xx", "Client Errors"], ["5xx", "Server Errors"]] as const).map(([g, label]) => (
                                    <label key={g} className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)] hover:text-[var(--accent)]">
                                      <input
                                        type="checkbox"
                                        checked={draftFilters.statusGroup.includes(g)}
                                        onChange={() => setDraftFilters(d => ({
                                          ...d,
                                          statusGroup: d.statusGroup.includes(g) ? d.statusGroup.filter(x => x !== g) : [...d.statusGroup, g]
                                        }))}
                                        className="accent-[var(--accent)]"
                                      />
                                      <span className="font-mono text-[10px] text-[var(--muted)]">{g}</span> {label}
                                    </label>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5">
                                  <button onClick={() => { setDraftFilters(d => ({ ...d, statusGroup: [] })); setColFilters(f => ({ ...f, statusGroup: [] })); setOpenDropdown(null); }} className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]">Clear</button>
                                  <button onClick={() => { setColFilters(f => ({ ...f, statusGroup: draftFilters.statusGroup })); setOpenDropdown(null); }} className="rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] text-white">Apply</button>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Indexability filter */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (openDropdown === "indexability") { setOpenDropdown(null); }
                                else { setDraftFilters({ ...colFilters }); setOpenDropdown("indexability"); }
                              }}
                              className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
                                colFilters.indexability.length > 0
                                  ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-medium"
                                  : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--foreground)]"
                              }`}
                            >
                              Indexability{colFilters.indexability.length > 0 ? ` · ${colFilters.indexability.length}` : ""}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openDropdown === "indexability" && (
                              <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg" style={{ minWidth: 160 }}>
                                <div className="px-3 py-2 space-y-1.5">
                                  {(["Indexable", "Non-Indexable"] as const).map((val) => (
                                    <label key={val} className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)] hover:text-[var(--accent)]">
                                      <input
                                        type="checkbox"
                                        checked={draftFilters.indexability.includes(val)}
                                        onChange={() => setDraftFilters(d => ({
                                          ...d,
                                          indexability: d.indexability.includes(val) ? d.indexability.filter(x => x !== val) : [...d.indexability, val]
                                        }))}
                                        className="accent-[var(--accent)]"
                                      />
                                      {val}
                                    </label>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5">
                                  <button onClick={() => { setDraftFilters(d => ({ ...d, indexability: [] })); setColFilters(f => ({ ...f, indexability: [] })); setOpenDropdown(null); }} className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]">Clear</button>
                                  <button onClick={() => { setColFilters(f => ({ ...f, indexability: draftFilters.indexability })); setOpenDropdown(null); }} className="rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] text-white">Apply</button>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Canonical filter */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (openDropdown === "canonical") { setOpenDropdown(null); }
                                else { setDraftFilters({ ...colFilters }); setOpenDropdown("canonical"); }
                              }}
                              className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
                                colFilters.hasCanonical !== null
                                  ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-medium"
                                  : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--foreground)]"
                              }`}
                            >
                              Canonical{colFilters.hasCanonical !== null ? " · 1" : ""}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            {openDropdown === "canonical" && (
                              <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg" style={{ minWidth: 170 }}>
                                <div className="px-3 py-2 space-y-1.5">
                                  {([["any", "Any", null], ["has", "Has Canonical", true], ["missing", "Missing Canonical", false]] as const).map(([key, label, val]) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)] hover:text-[var(--accent)]">
                                      <input
                                        type="radio"
                                        name="canonical-filter"
                                        checked={draftFilters.hasCanonical === val}
                                        onChange={() => setDraftFilters(d => ({ ...d, hasCanonical: val }))}
                                        className="accent-[var(--accent)]"
                                      />
                                      {label}
                                    </label>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5">
                                  <button onClick={() => { setDraftFilters(d => ({ ...d, hasCanonical: null })); setColFilters(f => ({ ...f, hasCanonical: null })); setOpenDropdown(null); }} className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]">Clear</button>
                                  <button onClick={() => { setColFilters(f => ({ ...f, hasCanonical: draftFilters.hasCanonical })); setOpenDropdown(null); }} className="rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] text-white">Apply</button>
                                </div>
                              </div>
                            )}
                          </div>
                          <span className="ml-auto shrink-0 text-xs text-[var(--muted)]">
                            {pagesData?.total ?? 0} URL{(pagesData?.total ?? 0) !== 1 ? "s" : ""}
                            {site?.status === "processing" && " (updating…)"}
                          </span>
                        </div>
                        {/* Inventory banner */}
                        {site?.inventory_total && site.inventory_total >= 100 && (
                          <div className="shrink-0 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--accent-light)] px-3 py-1.5 text-[10px] text-[var(--accent)]">
                            <span className="font-semibold">
                              Sitemap: {site.inventory_total.toLocaleString()} URLs found
                            </span>
                            {site.inventory_sample_size && (
                              <span>· Analyzing representative sample of {site.inventory_sample_size.toLocaleString()} pages</span>
                            )}
                            {site.inventory_sections && Object.keys(site.inventory_sections).length > 0 && (
                              <span>
                                ·{" "}
                                {Object.entries(site.inventory_sections)
                                  .slice(0, 4)
                                  .map(([s, n]) => `/${s} (${n.toLocaleString()})`)
                                  .join(" · ")}
                              </span>
                            )}
                          </div>
                        )}
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
                              {filteredDashboardPages.filter(page => {
                                const ct = page.content_type ?? "";
                                return !ct.startsWith("image/") && !ct.includes("css") && !ct.includes("javascript") && !ct.includes("font");
                              }).map((page, i) => (
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
                          style={{ width: "38%", maxHeight: "460px" }}
                        >
                          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 rounded-t-lg">
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--foreground)]" title={selectedPage.address}>
                              {selectedPage.address}
                            </span>
                            <input
                              type="text"
                              placeholder="Filter…"
                              value={detailSearch}
                              onChange={(e) => setDetailSearch(e.target.value)}
                              className="w-24 shrink-0 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                            />
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

        {/* ── AUDIT TAB ── */}
        {mainTab === "audit" && !quotaExhausted && (
          <div className="flex min-h-0 flex-1 flex-col bg-[var(--background)]">
            {!site || site.status !== "completed" ? (
              <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
                Complete a crawl to view the technical audit.
              </div>
            ) : !audit || audit.audit_status === "pending" || audit.audit_status === "running" ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner label="Running technical audit… (PageSpeed Insights may take 30–60s)" />
              </div>
            ) : audit.audit_status === "failed" || !audit.audit ? (
              <div className="flex flex-1 items-center justify-center text-[var(--error)]">
                Audit failed. Please try again.
              </div>
            ) : (
              <AuditFullPanel audit={audit.audit} />
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
