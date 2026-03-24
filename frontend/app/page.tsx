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

// ── Types ──────────────────────────────────────────────────────────────────────
type MainTab = "crawl" | "audit" | "geo" | "insights" | "history";
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
export default function Home() {
  const [url, setUrl] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [pagesData, setPagesData] = useState<PagesResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageRow | null>(null);
  const [typeTab, setTypeTab] = useState<TypeTab>("all");
  const [mainTab, setMainTab] = useState<MainTab>("crawl");
  const [search, setSearch] = useState("");
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
    getPages(siteId, { type: typeParam, search: search || undefined, limit: 100000 })
      .then(setPagesData)
      .catch(() => setError("Failed to load pages"));
  }, [siteId, typeTab, search]);

  useEffect(() => {
    if (!siteId || !site) return;
    if (site.status !== "completed" && site.status !== "processing") return;
    refreshPages();
  }, [siteId, site?.status, typeTab, search, refreshPages]);

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
    setMainTab("crawl");
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
    setMainTab("crawl");
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">AI SEO TOOL</span>
          {geo?.score && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
              GEO {geoScore}
            </span>
          )}
        </div>
        <div className="flex flex-1 items-center gap-2">
          <input
            type="url"
            placeholder="https://example.com/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            className="min-w-[320px] flex-1 rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 outline-none focus:border-white focus:ring-1 focus:ring-white"
          />
          <button
            onClick={handleStart}
            disabled={loading}
            className="rounded bg-white px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-white/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Starting…" : "Start"}
          </button>
          <button
            onClick={handleClear}
            className="rounded border border-white/50 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Progress bar */}
        {site && (site.status === "processing" || site.status === "completed") && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="w-24 h-5 rounded bg-white/20 overflow-hidden relative flex items-center justify-center">
              {site.status === "completed" ? (
                <div className="absolute inset-y-0 left-0 right-0 rounded bg-white" />
              ) : (
                <div className="absolute inset-y-0 left-0 w-full rounded bg-white/60 animate-pulse" />
              )}
              <span className="relative z-10 text-xs font-medium text-[var(--accent)]">
                {site.status === "completed" ? "Done" : `${pagesData?.total ?? 0} URLs`}
              </span>
            </div>
          </div>
        )}
        {site && (
          <span className="text-xs opacity-90 shrink-0">
            <span className="capitalize font-medium">{site.status}</span>
          </span>
        )}
      </header>

      {/* Error bar */}
      {error && (
        <div className="shrink-0 border-b border-[var(--error)] bg-[var(--error)]/10 px-4 py-2 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {/* ── Main tab navigation ─────────────────────────────────────────── */}
      {site && (
        <nav className="flex shrink-0 items-center gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-4">
          {/* Crawl tab */}
          <button
            onClick={() => setMainTab("crawl")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mainTab === "crawl"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Crawl
            {pagesData && (
              <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium">
                {pagesData.total}
              </span>
            )}
          </button>

          {/* Technical Audit tab */}
          <button
            onClick={() => setMainTab("audit")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mainTab === "audit"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Technical Audit
            {audit?.audit_status === "completed" && (
              <span className="rounded-full bg-green-100 border border-green-200 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                Done
              </span>
            )}
            {(!audit || audit.audit_status === "running" || audit.audit_status === "pending") &&
              site?.status === "completed" && (
                <span className="h-2 w-2 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
              )}
          </button>

          {/* GEO Analysis tab */}
          <button
            onClick={() => setMainTab("geo")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mainTab === "geo"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            GEO Analysis
            {geo?.geo_status === "completed" && geo.score && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor:
                    geo.score.overall_score >= 80 ? "#dcfce7"
                    : geo.score.overall_score >= 60 ? "#fef9c3"
                    : "#fee2e2",
                  color:
                    geo.score.overall_score >= 80 ? "#166534"
                    : geo.score.overall_score >= 60 ? "#854d0e"
                    : "#991b1b",
                }}
              >
                {geo.score.overall_score}
              </span>
            )}
            {geo?.geo_status === "running" && (
              <span className="h-2 w-2 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
            )}
            {(!geo || geo.geo_status === "pending") && site?.status === "completed" && (
              <span className="h-2 w-2 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
            )}
          </button>

          {/* Insights tab */}
          <button
            onClick={() => setMainTab("insights")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mainTab === "insights"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Insights
          </button>

          {/* History tab */}
          <button
            onClick={() => setMainTab("history")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mainTab === "history"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            History
          </button>

        </nav>
      )}

      {/* ── Tab content area ─────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

        {/* ── CRAWL TAB ── */}
        {mainTab === "crawl" && (
          <div className="flex min-h-0 flex-1">
            {/* Main table */}
            <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
              {crawlActive && (
                <>
                  <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                    {/* Type tabs */}
                    <div className="flex gap-1">
                      {(["all", "internal", "external"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setTypeTab(tab)}
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
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {pagesData?.total ?? 0} URL{(pagesData?.total ?? 0) !== 1 ? "s" : ""}
                      {site?.status === "processing" && " (updating…)"}
                    </span>
                  </div>
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

            {/* Right sidebar: Overview */}
            {crawlActive && overview && (
              <aside className="flex w-100 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--background)] overflow-auto">
                <div className="p-3 space-y-3 text-xs">

                  {/* Summary card */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="mb-3 text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">Summary</p>

                    {/* Donut chart + stats vertical */}
                    {(() => {
                      const sc = overview.status_counts;
                      const ok      = sc?.ok        ?? 0;
                      const r3xx    = sc?.redirect  ?? 0;
                      const r4xx    = sc?.error_4xx ?? 0;
                      const r5xx    = sc?.error_5xx ?? 0;
                      const known   = ok + r3xx + r4xx + r5xx;
                      const unknown = Math.max(0, overview.total_urls - known);

                      const sliceDefs = [
                        { label: "200 OK",       value: ok,      color: "#10b981", cls: "font-bold text-[var(--success)]" },
                        { label: "3xx Redirect", value: r3xx,    color: "#f59e0b", cls: "font-bold text-[var(--warning)]" },
                        { label: "4xx Error",    value: r4xx,    color: "#f43f5e", cls: "font-bold text-rose-500" },
                        { label: "5xx Error",    value: r5xx,    color: "#dc2626", cls: "font-bold text-red-600" },
                        { label: "Unknown",      value: unknown, color: "#94a3b8", cls: "font-bold text-[var(--muted)]" },
                      ];

                      const pieSlices = sliceDefs.filter(s => s.value > 0);

                      return (
                        <div className="flex flex-col items-center gap-3">
                          {/* Donut with total in center */}
                          <div className="relative">
                            <DonutChart slices={pieSlices} size={140} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-xl font-black tabular-nums text-[var(--foreground)]">{overview.total_urls}</span>
                              <span className="text-[10px] text-[var(--muted)]">Total URLs</span>
                            </div>
                          </div>

                          {/* Stats list */}
                          <div className="w-full space-y-1.5">
                            {sliceDefs.map(r => (
                              <div key={r.label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                                  <span className="text-[var(--muted)]">{r.label}</span>
                                </div>
                                <span className={r.cls}>{r.value}</span>
                              </div>
                            ))}
                            {overview.images_total > 0 && (
                              <>
                                <div className="my-1 border-t border-[var(--border)]" />
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--muted)]">Images</span>
                                  </div>
                                  <span className="font-bold text-sky-500">{overview.images_total}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--muted)]">Missing Alt</span>
                                  </div>
                                  <span className={`font-bold ${overview.images_missing_alt > 0 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                                    {overview.images_missing_alt}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* AI Crawler Access card */}
                  {site?.ai_crawler_access && Object.keys(site.ai_crawler_access).length > 0 && (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                      <p className="mb-3 text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">AI Crawler Access</p>
                      <div className="space-y-2.5">
                        {Object.entries(site.ai_crawler_access).map(([bot, allowed]) => (
                          <div key={bot} className="flex justify-between">
                            <span className="text-[var(--foreground)]">{bot}</span>
                            <span className={`font-bold ${allowed ? "text-[var(--success)]" : "text-red-500"}`}>
                              {allowed ? "Allowed" : "Blocked"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Robots.txt disallowed paths card */}
                  {site?.disallowed_paths && site.disallowed_paths.length > 0 && (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Robots.txt Blocked</p>
                      <div className="space-y-1.5">
                        {site.disallowed_paths.slice(0, 8).map((p, i) => (
                          <p key={i} className="truncate font-mono text-[var(--warning)]" title={p}>{p}</p>
                        ))}
                        {site.disallowed_paths.length > 8 && (
                          <p className="text-[var(--muted)]">+{site.disallowed_paths.length - 8} more</p>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </aside>
            )}
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
  );
}
