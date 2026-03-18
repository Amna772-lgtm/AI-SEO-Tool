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
function ScoreChip({ score }: { score?: number }) {
  if (score == null) return <span className="text-[var(--muted)]">—</span>;
  const color =
    score >= 90 ? "text-[var(--success)]" : score >= 50 ? "text-[var(--warning)]" : "text-[var(--error)]";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}

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

// ── PageSpeed block ────────────────────────────────────────────────────────────
function PsiBlock({ psi, label }: { psi: PageSpeedResult; label: string }) {
  return (
    <div className="rounded border border-[var(--border)] p-2 text-xs space-y-1">
      <div className="font-medium text-[var(--foreground)] mb-1">{label}</div>
      {psi.error ? (
        <p className="text-[var(--warning)] leading-snug">{psiErrorMessage(psi.error)}</p>
      ) : (
        <>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Performance</span>
            <ScoreChip score={psi.performance} />
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Accessibility</span>
            <ScoreChip score={psi.accessibility} />
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Best Practices</span>
            <ScoreChip score={psi.best_practices} />
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">SEO</span>
            <ScoreChip score={psi.seo} />
          </div>
          <div className="border-t border-[var(--border)] mt-1 pt-1 space-y-0.5 text-[var(--muted)]">
            {psi.fcp && (
              <div className="flex justify-between">
                <span>FCP</span>
                <span>{psi.fcp}</span>
              </div>
            )}
            {psi.lcp && (
              <div className="flex justify-between">
                <span>LCP</span>
                <span>{psi.lcp}</span>
              </div>
            )}
            {psi.tbt && (
              <div className="flex justify-between">
                <span>TBT</span>
                <span>{psi.tbt}</span>
              </div>
            )}
            {psi.cls && (
              <div className="flex justify-between">
                <span>CLS</span>
                <span>{psi.cls}</span>
              </div>
            )}
            {psi.speed_index && (
              <div className="flex justify-between">
                <span>Speed Index</span>
                <span>{psi.speed_index}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Security Headers block ─────────────────────────────────────────────────────
function SecurityHeadersBlock({ sh }: { sh: SecurityHeadersResult }) {
  const headerOrder = [
    "strict_transport_security",
    "content_security_policy",
    "x_frame_options",
    "x_content_type_options",
    "referrer_policy",
  ];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
        Security Headers
        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
          {sh.passed_count}/{sh.total_count} present
        </span>
      </h3>
      {sh.error ? (
        <p className="text-xs text-[var(--warning)]">{sh.error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {headerOrder.map((key) => {
            const info = sh.headers[key];
            if (!info) return null;
            return (
              <div
                key={key}
                className="flex flex-col items-center rounded border border-[var(--border)] px-2 py-2 text-center text-xs"
                title={info.value ?? undefined}
              >
                <span
                  className={`text-base font-bold ${info.present ? "text-green-600" : "text-red-500"}`}
                >
                  {info.present ? "✓" : "✗"}
                </span>
                <span className="mt-0.5 text-[var(--muted)] leading-tight">{info.label}</span>
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

  function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            ok
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Row label="HTTPS" ok={https.passed} value={https.passed ? "✓ Secure" : "✗ Not Secure"} />
        <Row label="Sitemap" ok={sitemap.found} value={sitemap.found ? "✓ Found" : "✗ Not Found"} />
        <Row
          label="Broken Links"
          ok={broken_links.count === 0}
          value={broken_links.count === 0 ? "✓ None" : `✗ ${broken_links.count} broken`}
        />
        <Row
          label="Missing Canonicals"
          ok={missing_canonicals.missing_count === 0}
          value={
            missing_canonicals.missing_count === 0
              ? "✓ None"
              : `${missing_canonicals.missing_count} / ${missing_canonicals.total_html_pages}`
          }
        />
      </div>

      {/* Broken links list */}
      {broken_links.urls.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Broken Links</h3>
          <div className="max-h-40 overflow-auto space-y-1">
            {broken_links.urls.map((url, i) => (
              <p key={i} className="truncate rounded bg-red-50 px-2 py-1 text-xs text-red-600" title={url}>
                {url}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* PageSpeed */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">PageSpeed Insights</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PsiBlock psi={pagespeed.desktop} label="Desktop" />
          <PsiBlock psi={pagespeed.mobile} label="Mobile" />
        </div>
      </div>

      {/* Security Headers */}
      {audit.security_headers && (
        <SecurityHeadersBlock sh={audit.security_headers} />
      )}
    </div>
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
        "Content Type": selectedPage.content_type ?? "—",
        "Status Code": selectedPage.status_code ?? "—",
        Status: selectedPage.status ?? "—",
        Indexability: selectedPage.indexability ?? "—",
        "Indexability Status": selectedPage.indexability_status ?? "—",
        Title: selectedPage.title ?? "—",
        "Title Length": selectedPage.title_length ?? "—",
        "Meta Description": selectedPage.meta_descp ?? "—",
        H1: selectedPage.h1 ?? "—",
        "H2 Headings": selectedPage.h2s?.length ? selectedPage.h2s.join(" · ") : "—",
        "H3 Headings": selectedPage.h3s?.length ? selectedPage.h3s.join(" · ") : "—",
        Canonical: selectedPage.canonical ?? "—",
        "Crawl Depth": selectedPage.crawl_depth ?? "—",
        "Response Time (ms)": selectedPage.response_time ?? "—",
        Language: selectedPage.language ?? "—",
        "Last Modified": selectedPage.last_modified ?? "—",
        "Redirect URL": selectedPage.redirect_url ?? "—",
        "Redirect Type": selectedPage.redirect_type ?? "—",
        "HTTP Version": selectedPage.http_version ?? "—",
        Readability: selectedPage.readability ?? "—",
        "Alt Text": selectedPage.alt_text ?? "—",
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

          {/* AI Crawlers info */}
          {site?.ai_crawler_access && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-[var(--muted)]">AI crawlers:</span>
              {Object.entries(site.ai_crawler_access)
                .slice(0, 4)
                .map(([bot, allowed]) => (
                  <span
                    key={bot}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={
                      allowed
                        ? { backgroundColor: "#dcfce7", color: "#166534" }
                        : { backgroundColor: "#fee2e2", color: "#991b1b" }
                    }
                  >
                    {bot} {allowed ? "✓" : "✗"}
                  </span>
                ))}
            </div>
          )}
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
                    <table className="w-full border-collapse text-sm" style={{ minWidth: "2200px" }}>
                      <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-elevated)] shadow-[0_1px_0_0_var(--border)]">
                        <tr>
                          <th className="w-12 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">#</th>
                          <th className="min-w-[220px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Address</th>
                          <th className="w-20 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Type</th>
                          <th className="min-w-[140px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Content Type</th>
                          <th className="min-w-[140px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Image Alt Text</th>
                          <th className="w-20 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Status Code</th>
                          <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Status</th>
                          <th className="w-24 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Indexability</th>
                          <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Index. Status</th>
                          <th className="min-w-[120px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Title</th>
                          <th className="w-16 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Title Len</th>
                          <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Meta Desc</th>
                          <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">H1</th>
                          <th className="min-w-[180px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Canonical</th>
                          <th className="w-14 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Depth</th>
                          <th className="w-20 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Resp. Time</th>
                          <th className="w-16 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Language</th>
                          <th className="min-w-[120px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Last Modified</th>
                          <th className="min-w-[180px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Redirect URL</th>
                          <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Redirect Type</th>
                          <th className="w-14 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">HTTP Ver</th>
                          <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Readability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {site?.status === "processing" && pagesData?.pages?.length === 0 && (
                          <tr>
                            <td colSpan={12} className="h-[300px]">
                              <div className="flex items-center justify-center gap-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
                                <span className="text-sm text-[var(--muted)]">Discovering URLs…</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {(pagesData?.pages ?? []).map((page, i) => (
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
                            <td className="min-w-[140px] max-w-[180px] truncate px-2 py-2 text-[var(--muted)]" title={page.content_type ?? ""}>
                              {page.content_type ?? "—"}
                            </td>
                            <td
                              className={`min-w-[140px] max-w-[200px] truncate px-2 py-2 ${
                                page.content_type?.includes("image") &&
                                (page.alt_text == null || page.alt_text === "")
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--muted)]"
                              }`}
                              title={page.alt_text ?? ""}
                            >
                              {page.content_type?.includes("image")
                                ? page.alt_text != null
                                  ? page.alt_text || "empty"
                                  : "missing"
                                : "—"}
                            </td>
                            <td className="px-2 py-2">{page.status_code ?? "—"}</td>
                            <td className="min-w-[100px] max-w-[140px] truncate px-2 py-2 text-[var(--muted)]" title={page.status ?? ""}>
                              {page.status ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-[var(--muted)]">{page.indexability ?? "—"}</td>
                            <td className="min-w-[80px] px-2 py-2 text-[var(--muted)]">{page.indexability_status ?? "—"}</td>
                            <td className="min-w-[120px] max-w-[200px] truncate px-2 py-2" title={page.title ?? ""}>
                              {page.title ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-[var(--muted)]">{page.title_length ?? "—"}</td>
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
                            <td className="px-2 py-2 text-[var(--muted)]">{page.language ?? "—"}</td>
                            <td className="min-w-[120px] max-w-[180px] truncate px-2 py-2 text-[var(--muted)]" title={page.last_modified ?? ""}>
                              {page.last_modified ?? "—"}
                            </td>
                            <td className="min-w-[180px] max-w-[280px] truncate px-2 py-2 text-[var(--muted)]" title={page.redirect_url ?? ""}>
                              {page.redirect_url ?? "—"}
                            </td>
                            <td className="min-w-[80px] px-2 py-2 text-[var(--muted)]">{page.redirect_type ?? "—"}</td>
                            <td className="px-2 py-2 text-[var(--muted)]">{page.http_version ?? "—"}</td>
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
              <aside className="flex w-56 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)] overflow-auto">
                <h3 className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Overview
                </h3>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between rounded-lg bg-[var(--surface-elevated)] px-3 py-2">
                    <span className="text-[var(--muted)]">Total URLs</span>
                    <span className="font-semibold">{overview.total_urls}</span>
                  </div>
                  {overview.images_total > 0 && (
                    <div className="flex justify-between rounded-lg bg-[var(--surface-elevated)] px-3 py-2">
                      <span className="text-[var(--muted)]">Missing Alt</span>
                      <span
                        className={`font-semibold ${
                          overview.images_missing_alt > 0 ? "text-[var(--warning)]" : "text-[var(--success)]"
                        }`}
                      >
                        {overview.images_missing_alt}
                      </span>
                    </div>
                  )}
                  <p className="pt-1 text-[var(--muted)]">By type</p>
                  {overview.by_type.map((t, i) => (
                    <div key={`${t.label}-${i}`} className="flex justify-between px-1">
                      <span>{t.label}</span>
                      <span className="text-[var(--muted)]">
                        {t.count} ({t.percent}%)
                      </span>
                    </div>
                  ))}

                  {/* Robots.txt disallowed paths */}
                  {site?.disallowed_paths && site.disallowed_paths.length > 0 && (
                    <>
                      <p className="pt-2 text-[var(--muted)]">Robots.txt blocked</p>
                      {site.disallowed_paths.slice(0, 8).map((p, i) => (
                        <div
                          key={i}
                          className="truncate rounded bg-amber-50 px-2 py-1 text-amber-700"
                          title={p}
                        >
                          {p}
                        </div>
                      ))}
                      {site.disallowed_paths.length > 8 && (
                        <p className="text-[var(--muted)] px-1">
                          +{site.disallowed_paths.length - 8} more paths
                        </p>
                      )}
                    </>
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
