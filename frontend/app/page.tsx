"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "./lib/api";
import { GeoTab } from "./components/geo/GeoTab";
import { ChecklistPanel } from "./components/geo/ChecklistPanel";
import { SiteStructurePanel } from "./components/geo/SiteStructurePanel";
import { HistoryTab } from "./components/history/HistoryTab";
import { SchedulesTab } from "./components/schedules/SchedulesTab";

// ── Types ──────────────────────────────────────────────────────────────────────
type MainTab = "dashboard" | "crawl" | "audit" | "geo" | "insights" | "history" | "schedules";
type TypeTab = "all" | "internal" | "external";

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
        const offset = C * (1 - cum);
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
  const [typeTab, setTypeTab] = useState<TypeTab>("all");
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");
  const [search, setSearch] = useState("");
  const [pageNum, setPageNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [geo, setGeo] = useState<GeoResponse | null>(null);

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
    if (site.status === "completed" || site.status === "failed") return;
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

  // ── Pages / overview refresh ──────────────────────────────────────────────
  const refreshPages = useCallback(() => {
    if (!siteId) return;
    const typeParam = typeTab === "all" ? undefined : typeTab;
    getPages(siteId, {
      type: typeParam,
      search: search || undefined,
      skip: pageNum * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then(setPagesData)
      .catch(() => setError("Failed to load pages"));
  }, [siteId, typeTab, search, pageNum]);

  useEffect(() => {
    if (!siteId || !site) return;
    if (site.status !== "completed" && site.status !== "processing") return;
    refreshPages();
  }, [siteId, site?.status, typeTab, search, pageNum, refreshPages]);

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
      setError(e instanceof Error ? e.message : "Analysis failed");
      setSiteId(null);
      setSite(null);
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
  };

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
        "Crawl Depth": selectedPage.crawl_depth ?? "—",
        "Response Time (ms)": selectedPage.response_time ?? "—",
        "Redirect URL": selectedPage.redirect_url ?? "—",
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
      <aside className="flex w-48 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--accent)]">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span className="text-sm font-bold tracking-tight text-[var(--accent)]">AI SEO TOOL</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 pt-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Main menu</p>
          {(
            [
              { id: "dashboard", label: "Dashboard", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
              { id: "crawl",     label: "Spider",    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/></svg> },
              { id: "audit",     label: "Technical Audit", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
              { id: "geo",       label: "GEO Analysis", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
              { id: "insights",  label: "Insights",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              { id: "history",   label: "History",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg> },
              { id: "schedules", label: "Schedules", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            ] as { id: MainTab; label: string; icon: React.ReactNode }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setMainTab(item.id)}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                mainTab === item.id
                  ? "bg-[var(--accent)] font-medium text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Top header ────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
          <div className="flex shrink-0 items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span className="text-sm font-semibold text-[var(--accent)]">AI SEO TOOL</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5">
            <span className="shrink-0 text-xs text-[var(--muted)]">URL:</span>
            <input
              type="url"
              placeholder="https://example.com/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            />
            <button onClick={handleStart} className="shrink-0 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={handleStart}
              disabled={loading}
              className="rounded bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {loading ? "Starting…" : "Start"}
            </button>
            <button className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0"/><path d="M4.93 19.07a10 10 0 0 0 14.14 0"/>
              </svg>
              Config
            </button>
            <button onClick={handleClear} className="rounded border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition-colors hover:opacity-80" style={{ backgroundColor: "#DCFCE7" }}>
              Clear
            </button>
            {site?.status === "completed" && (
              <button className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)]">
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

          {/* ── DASHBOARD TAB ── */}
          {mainTab === "dashboard" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              {!site ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="space-y-3 text-center">
                    <p className="text-2xl font-bold text-[var(--accent)]">AI SEO Tool</p>
                    <p className="max-w-sm text-sm text-[var(--muted)]">
                      Enter a URL above to crawl a website, run a technical audit, and get your AI Citation Score.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">

                  {/* Row 1: 3 summary cards */}
                  <div className="grid grid-cols-3 gap-3">

                    {/* URLs Crawled */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="mb-2 text-xs font-medium text-[var(--muted)]">URLs Crawled</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black tabular-nums">{(overview?.total_urls ?? 0).toLocaleString()}</span>
                        <span className="mb-0.5 text-xs font-medium text-[var(--success)]">Total URLs</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{(pagesData?.total ?? 0).toLocaleString()} Crawled</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        {site.status === "processing" ? (
                          <div className="progress-indeterminate h-full w-1/3 rounded-full bg-[var(--accent)]" />
                        ) : (
                          <div className="h-full w-full rounded-full bg-[var(--accent)]" />
                        )}
                      </div>
                    </div>

                    {/* Image SEO Issues */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="mb-3 text-xs font-medium text-[var(--muted)]">Image SEO Issues</p>
                      {overview ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black tabular-nums">{overview.images_total.toLocaleString()}</span>
                            <span className="text-xs text-[var(--muted)]">Total image</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-[var(--warning)]">{overview.images_missing_alt.toLocaleString()}</span>
                            <span className="text-xs text-[var(--warning)]">Missing Alt Text</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-[var(--success)]">
                              {(overview.images_optimized ?? 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-[var(--success)]" title="Has alt text + modern format (WebP/AVIF), lazy loading, or explicit dimensions">Optimized Images ⓘ</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-16 items-center justify-center text-xs text-[var(--muted)]">Loading…</div>
                      )}
                    </div>

                    {/* SEO Score */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="mb-2 text-xs font-medium text-[var(--muted)]">SEO Score</p>
                      {geoScore != null ? (
                        <>
                          <div className="flex items-end gap-1">
                            <span className="text-3xl font-black tabular-nums">{geoScore}</span>
                            <span className="mb-1 text-sm text-[var(--muted)]">/100</span>
                          </div>
                          <p className={`text-sm font-medium ${
                            geoScore >= 80 ? "text-[var(--success)]"
                            : geoScore >= 60 ? "text-[var(--warning)]"
                            : "text-red-500"
                          }`}>
                            Status: {geoScore >= 80 ? "Good" : geoScore >= 60 ? "Fair" : "Poor"}
                          </p>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="text-xl font-black text-[var(--muted)]">—/100</div>
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

                  {/* Row 3: All URL table */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
                      <p className="text-sm font-semibold">All URL</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--muted)]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm3 7h12a1 1 0 0 1 0 2H6a1 1 0 0 1 0-2zm3 7h6a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2z"/></svg>
                          All <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--muted)]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Export <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        <div className="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input type="text" placeholder="Search URLs" value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-32 bg-transparent text-xs outline-none placeholder:text-[var(--muted)]" />
                        </div>
                        <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--muted)]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                          Filter <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-auto" style={{ maxHeight: "300px" }}>
                      <table className="w-full border-collapse text-xs" style={{ minWidth: "900px" }}>
                        <thead className="sticky top-0 z-10 bg-[var(--surface-elevated)]">
                          <tr>
                            {["Address", "Type", "Content Type", "Status Code", "Status", "Indexability", "Title"].map((h) => (
                              <th key={h} className="border-b border-[var(--border)] px-3 py-2 text-left font-medium text-[var(--muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {site.status === "processing" && (!pagesData || pagesData.pages.length === 0) && (
                            <tr><td colSpan={7} className="px-3 py-8 text-center">
                              <div className="flex items-center justify-center gap-2 text-[var(--muted)]">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                                Discovering URLs…
                              </div>
                            </td></tr>
                          )}
                          {(pagesData?.pages ?? []).map((page, i) => (
                            <tr key={`${i}-${page.address}`}
                              onClick={() => { setSelectedPage(page); setMainTab("crawl"); }}
                              className="cursor-pointer border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--surface-elevated)]">
                              <td className="max-w-[260px] truncate px-3 py-2 text-[var(--accent)]" title={page.address}>{page.address}</td>
                              <td className="px-3 py-2 text-[var(--muted)]">{page.type ?? "—"}</td>
                              <td className="px-3 py-2 text-[var(--muted)]">{page.content_type ? page.content_type.split(";")[0] : "—"}</td>
                              <td className="px-3 py-2">
                                {page.status_code != null ? (
                                  <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                                    page.status_code < 300 ? "bg-[var(--success)]/15 text-[var(--success)]"
                                    : page.status_code < 400 ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                                    : "bg-red-500/15 text-red-400"
                                  }`}>{page.status_code}</span>
                                ) : "—"}
                              </td>
                              <td className="px-3 py-2 text-[var(--muted)]">{page.status ?? "—"}</td>
                              <td className="px-3 py-2 text-[var(--muted)]">{page.indexability ?? "—"}</td>
                              <td className="max-w-[200px] truncate px-3 py-2" title={page.title ?? ""}>{page.title ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        {/* ── CRAWL TAB ── */}
        {mainTab === "crawl" && (
          <div className="flex min-h-0 flex-1">
            {/* Main table */}
            <div className="flex min-w-0 flex-1 flex-col bg-[var(--surface)]">
              {crawlActive && (
                <>
                  <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                    {/* Type tabs */}
                    <div className="flex gap-1">
                      {(["all", "internal", "external"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => { setTypeTab(tab); setPageNum(0); }}
                          className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                            typeTab === tab
                              ? "bg-[var(--accent-light)] text-[var(--accent)] font-medium"
                              : "text-[var(--muted)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Search URLs…"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPageNum(0); }}
                      className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {pagesData?.total ?? 0} URL{(pagesData?.total ?? 0) !== 1 ? "s" : ""}
                      {site?.status === "processing" && " (updating…)"}
                    </span>
                  </div>
                  {/* Inventory banner — shown for large sites using Two-Phase strategy */}
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
                  <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full border-collapse text-sm" style={{ minWidth: "1600px" }}>
                      <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-elevated)] shadow-[0_1px_0_0_var(--border)]">
                        <tr>
                          <th className="w-12 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">#</th>
                          <th className="min-w-[220px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Address</th>
                          <th className="w-20 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Type</th>
                          <th className="w-20 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Status</th>
                          <th className="w-24 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Indexability</th>
                          <th className="min-w-[120px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Title</th>
                          <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Meta Desc</th>
                          <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">H1</th>
                          <th className="min-w-[180px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Canonical</th>
                          <th className="w-14 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Depth</th>
                          <th className="w-20 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Resp. Time</th>
                          <th className="min-w-[180px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Redirect URL</th>
                          <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Readability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {site?.status === "processing" && pagesData?.pages?.length === 0 && (
                          <tr>
                            <td colSpan={14} className="h-[300px]">
                              <div className="flex items-center justify-center gap-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
                                <span className="text-sm text-[var(--muted)]">Discovering URLs…</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {(pagesData?.pages ?? []).filter(page => {
                          const ct = page.content_type ?? "";
                          return !ct.startsWith("image/") && !ct.includes("css") && !ct.includes("javascript") && !ct.includes("font");
                        }).map((page, i) => (
                          <tr
                            key={`${page.id}-${page.address}`}
                            onClick={() => setSelectedPage(page)}
                            className={`cursor-pointer border-b border-[var(--border)]/50 hover:bg-[var(--surface-elevated)] transition-colors ${
                              selectedPage?.id === page.id && selectedPage?.address === page.address
                                ? "bg-[var(--accent-light)]"
                                : ""
                            }`}
                          >
                            <td className="px-2 py-2 text-[var(--muted)]">{i + 1}</td>
                            <td className="min-w-[220px] max-w-[360px] truncate px-2 py-2" title={page.address}>
                              {page.address}
                            </td>
                            <td className="px-2 py-2 text-[var(--muted)]">{page.type ?? "—"}</td>
                            <td className="px-2 py-2">
                              {page.status_code != null ? (
                                <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
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
                            <td className="min-w-[120px] max-w-[200px] truncate px-2 py-2" title={page.title ?? ""}>
                              {page.title ?? "—"}
                            </td>
                            <td className="min-w-[100px] max-w-[180px] truncate px-2 py-2 text-[var(--muted)]" title={page.meta_descp ?? ""}>
                              {page.meta_descp ?? "—"}
                            </td>
                            <td className="min-w-[100px] max-w-[160px] truncate px-2 py-2" title={page.h1 ?? ""}>
                              {page.h1 ?? "—"}
                            </td>
                            <td className="min-w-[180px] max-w-[280px] truncate px-2 py-2 text-[var(--muted)]" title={page.canonical ?? ""}>
                              {page.canonical ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-[var(--muted)]">{page.crawl_depth ?? "—"}</td>
                            <td className="px-2 py-2 text-[var(--muted)]">{page.response_time ?? "—"}</td>
                            <td className="min-w-[180px] max-w-[280px] truncate px-2 py-2 text-[var(--muted)]" title={page.redirect_url ?? ""}>
                              {page.redirect_url ?? "—"}
                            </td>
                            <td className="min-w-[80px] px-2 py-2 text-[var(--muted)]">{page.readability ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination controls */}
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
                </>
              )}
              {site && !crawlActive && (
                <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
                  {site.status === "queued" ? "Starting crawl…" : "Crawling…"}
                </div>
              )}
              {!site && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center space-y-3">
                    <p className="text-2xl font-bold text-[var(--accent)]">AI SEO Tool</p>
                    <p className="text-[var(--muted)] text-sm max-w-sm">
                      Enter a URL above to crawl a website, run a technical audit, and get your AI Citation Score.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AUDIT TAB ── */}
        {mainTab === "audit" && (
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
        {mainTab === "insights" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[var(--background)] p-4">
            {!site || site.status !== "completed" ? (
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
        {mainTab === "schedules" && (
          <SchedulesTab initialDomain={site?.url ? new URL(site.url).hostname.replace(/^www\./, "") : ""} />
        )}

        {/* ── GEO TAB ── */}
        {mainTab === "geo" && (
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
              <GeoTab geo={geo} siteId={siteId!} siteUrl={site?.url ?? ""} pages={pagesData?.pages ?? []} />
            )}
          </div>
        )}

        </div>

      {/* ── URL detail panel (bottom, crawl tab only) ─────────────────── */}
      {mainTab === "crawl" && crawlActive && (
        <div
          className="flex shrink-0 flex-col border-t border-[var(--border)] bg-[var(--surface)]"
          style={{ maxHeight: "240px" }}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--muted)]">URL details</span>
            {selectedPage && (
              <input
                type="text"
                placeholder="Filter details…"
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                className="ml-2 max-w-xs flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
              />
            )}
            {selectedPage && (
              <button
                onClick={() => { setSelectedPage(null); setDetailSearch(""); }}
                className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {selectedPage ? (
              <table className="w-full min-w-[400px] text-xs">
                <tbody>
                  {filteredDetailRows.map(([key, val]) => (
                    <tr key={key} className="border-b border-[var(--border)]/50">
                      <td className="w-40 shrink-0 py-1 pr-4 text-[var(--muted)] align-top">{key}</td>
                      <td className="min-w-0 break-all py-1">{String(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[var(--muted)]">Select a row above to view details.</p>
            )}
          </div>
        </div>
      )}

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
