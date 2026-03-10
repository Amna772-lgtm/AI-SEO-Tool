"use client";

import { useState, useEffect, useCallback } from "react";
import {
  startAnalysis,
  getSite,
  getPages,
  getOverview,
  getAudit,
  type Site,
  type PageRow,
  type PagesResponse,
  type OverviewResponse,
  type AuditResponse,
  type AuditResult,
  type PageSpeedResult,
} from "./lib/api";

type TabType = "all" | "internal" | "external";

function ScoreChip({ score }: { score?: number }) {
  if (score == null) return <span className="text-[var(--muted)]">—</span>;
  const color =
    score >= 90 ? "text-[var(--success)]" : score >= 50 ? "text-[var(--warning)]" : "text-[var(--error)]";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}

function psiErrorMessage(error: string): string {
  if (error.includes("NO_FCP")) return "Page blocked automated testing (NO_FCP) — likely bot protection (e.g. Cloudflare)";
  if (error.includes("ERRORED_DOCUMENT_REQUEST")) return "Page failed to load during analysis";
  if (error.includes("FAILED_DOCUMENT_REQUEST")) return "Page request was blocked or timed out";
  if (error.includes("DNS_FAILURE")) return "DNS lookup failed for this domain";
  if (error.includes("NOT_HTML")) return "Page is not HTML — cannot analyze";
  if (error.includes("400")) return `PSI could not analyze this page (${error.split(":")[0]})`;
  return error;
}

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
            {psi.fcp && <div className="flex justify-between"><span>FCP</span><span>{psi.fcp}</span></div>}
            {psi.lcp && <div className="flex justify-between"><span>LCP</span><span>{psi.lcp}</span></div>}
            {psi.tbt && <div className="flex justify-between"><span>TBT</span><span>{psi.tbt}</span></div>}
            {psi.cls && <div className="flex justify-between"><span>CLS</span><span>{psi.cls}</span></div>}
            {psi.speed_index && <div className="flex justify-between"><span>Speed Index</span><span>{psi.speed_index}</span></div>}
          </div>
        </>
      )}
    </div>
  );
}

function AuditPanel({ audit }: { audit: AuditResult }) {
  const { https, sitemap, broken_links, missing_canonicals, pagespeed } = audit;
  return (
    <div className="p-3 space-y-3 text-xs">
      {/* HTTPS */}
      <div className="flex justify-between items-center">
        <span className="text-[var(--muted)]">HTTPS</span>
        <span className={https.passed ? "text-[var(--success)] font-medium" : "text-[var(--error)] font-medium"}>
          {https.passed ? "✓ Secure" : "✗ Not Secure"}
        </span>
      </div>

      {/* Sitemap */}
      <div className="flex justify-between items-center">
        <span className="text-[var(--muted)]">Sitemap</span>
        <span className={sitemap.found ? "text-[var(--success)] font-medium" : "text-[var(--warning)] font-medium"}>
          {sitemap.found ? "✓ Found" : "✗ Not Found"}
        </span>
      </div>

      {/* Broken links */}
      <div className="flex justify-between items-center">
        <span className="text-[var(--muted)]">Broken Links</span>
        <span className={broken_links.count === 0 ? "text-[var(--success)] font-medium" : "text-[var(--error)] font-medium"}>
          {broken_links.count === 0 ? "✓ None" : `✗ ${broken_links.count}`}
        </span>
      </div>

      {/* Missing canonicals */}
      <div className="flex justify-between items-center">
        <span className="text-[var(--muted)]">Missing Canonicals</span>
        <span className={missing_canonicals.missing_count === 0 ? "text-[var(--success)] font-medium" : "text-[var(--warning)] font-medium"}>
          {missing_canonicals.missing_count === 0
            ? "✓ None"
            : `${missing_canonicals.missing_count} / ${missing_canonicals.total_html_pages}`}
        </span>
      </div>

      {/* PageSpeed */}
      <div className="space-y-2 pt-1">
        <div className="text-[var(--muted)]">PageSpeed Insights</div>
        <PsiBlock psi={pagespeed.desktop} label="Desktop" />
        <PsiBlock psi={pagespeed.mobile} label="Mobile" />
      </div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [pagesData, setPagesData] = useState<PagesResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageRow | null>(null);
  const [typeTab, setTypeTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [audit, setAudit] = useState<AuditResponse | null>(null);

  const CenterLoader = () => (
    <div className="flex items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
      <span className="text-sm text-[var(--muted)]">Discovering URLs...</span>
    </div>
  );

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
        // Show data in parallel with DB: fetch pages and overview during crawl
        const [pages, ov] = await Promise.all([getPages(id), getOverview(id)]);
        setPagesData(pages);
        setOverview(ov);
      }
    } catch {
      setError("Failed to fetch site status.");
    }
  }, []);

  // Poll audit separately after crawl completes (PSI takes 30-60s)
  useEffect(() => {
    if (!siteId || site?.status !== "completed") return;
    if (audit?.audit_status === "completed" || audit?.audit_status === "failed") return;
    const fetchAudit = () => getAudit(siteId).then(setAudit).catch(() => {});
    fetchAudit();
    const t = setInterval(fetchAudit, 3000);
    return () => clearInterval(t);
  }, [siteId, site?.status, audit?.audit_status]);

  useEffect(() => {
    if (!siteId || !site) return;
    if (site.status === "completed" || site.status === "failed") return;
    const t = setInterval(() => pollSite(siteId), 1500);
    return () => clearInterval(t);
  }, [siteId, site?.status, pollSite]);

  const handleStart = async () => {
    if (!url.trim()) return;
    setError(null);
    setLoading(true);
    setPagesData(null);
    setOverview(null);
    setSelectedPage(null);
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
    setError(null);
    setUrl("");
    setSearch("");
    setDetailSearch("");
  };

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
        Canonical: selectedPage.canonical ?? "—",
        "Crawl Depth": selectedPage.crawl_depth ?? "—",
        "Response Time (ms)": selectedPage.response_time ?? "—",
        Language: selectedPage.language ?? "—",
        "Last Modified": selectedPage.last_modified ?? "—",
        "Redirect URL": selectedPage.redirect_url ?? "—",
        "Redirect Type": selectedPage.redirect_type ?? "—",
        "HTTP Version": selectedPage.http_version ?? "—",
        Readability: selectedPage.readability ?? "—",
      }).filter(
        ([key, val]) =>
          !detailSearch ||
          key.toLowerCase().includes(detailSearch.toLowerCase()) ||
          String(val).toLowerCase().includes(detailSearch.toLowerCase())
      )
    : [];

  return (
    <div className="flex h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">AI SEO TOOL</span>
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
            className="rounded bg-white px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? "Starting…" : "Start"}
          </button>
          <button
            onClick={handleClear}
            className="rounded border border-white/50 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Clear
          </button>
        </div>
        {/* Progress indicator: pulsing bar while crawling, filled when done */}
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
          <span className="text-xs opacity-90">
            Status: <span className="capitalize font-medium">{site.status}</span>
          </span>
        )}
      </header>

      {error && (
        <div className="shrink-0 border-b border-[var(--error)] bg-[var(--error)]/10 px-4 py-2 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {/* Type tabs */}
      {site && (
        <div className="flex shrink-0 gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
          {(["all", "internal", "external"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTypeTab(tab)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                typeTab === tab
                  ? "bg-[var(--accent-light)] text-[var(--accent)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Main content: table + sidebar */}
      <div className="flex min-h-0 flex-1">
        {/* Table area - scrollable with sticky header */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
          {(site?.status === "completed" || site?.status === "processing") && (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                <input
                  type="text"
                  placeholder="Search URLs…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
                <span className="text-xs text-[var(--muted)]">
                  {pagesData?.total ?? 0} URL{(pagesData?.total ?? 0) !== 1 ? "s" : ""}
                  {site?.status === "processing" && " (updating…)"}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm" style={{ minWidth: "2200px" }}>
                  <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-elevated)] shadow-[0_1px_0_0_var(--border)]">
                    <tr>
                      <th className="w-12 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">#</th>
                      <th className="min-w-[220px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Address</th>
                      <th className="w-20 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Type</th>
                      <th className="min-w-[140px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Content Type</th>
                      <th className="w-20 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Status Code</th>
                      <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Status</th>
                      <th className="w-24 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Indexability</th>
                      <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Index. Status</th>
                      <th className="min-w-[120px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Title</th>
                      <th className="w-16 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Title Len</th>
                      <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Meta Desc</th>
                      <th className="min-w-[100px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">H1</th>
                      <th className="min-w-[180px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Canonical</th>
                      <th className="w-14 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Depth</th>
                      <th className="w-20 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Resp. Time</th>
                      <th className="w-16 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Language</th>
                      <th className="min-w-[120px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Last Modified</th>
                      <th className="min-w-[180px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Redirect URL</th>
                      <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Redirect Type</th>
                      <th className="w-14 shrink-0 px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">HTTP Ver</th>
                      <th className="min-w-[80px] px-2 py-2 text-left text-xs font-medium text-[var(--muted)]">Readability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site?.status === "processing" && pagesData?.pages?.length === 0 && (
                      <tr>
                        <td colSpan={12} className="h-[300px]">
                          <CenterLoader />
                        </td>
                      </tr>
                    )}
                    {(pagesData?.pages ?? []).map((page, i) => (
                      <tr
                        key={`${page.id}-${page.address}`}
                        onClick={() => setSelectedPage(page)}
                        className={`cursor-pointer border-b border-[var(--border)]/50 hover:bg-[var(--surface-elevated)] ${
                          selectedPage?.id === page.id && selectedPage?.address === page.address ? "bg-[var(--accent-light)]" : ""
                        }`}
                      >
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{i + 1}</td>
                        <td className="min-w-[220px] max-w-[360px] truncate px-2 py-2" title={page.address}>{page.address}</td>
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{page.type ?? "—"}</td>
                        <td className="min-w-[140px] max-w-[180px] truncate px-2 py-2 text-[var(--muted)]" title={page.content_type ?? ""}>{page.content_type ?? "—"}</td>
                        <td className="shrink-0 px-2 py-2">{page.status_code ?? "—"}</td>
                        <td className="min-w-[100px] max-w-[140px] truncate px-2 py-2 text-[var(--muted)]" title={page.status ?? ""}>{page.status ?? "—"}</td>
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{page.indexability ?? "—"}</td>
                        <td className="min-w-[80px] px-2 py-2 text-[var(--muted)]">{page.indexability_status ?? "—"}</td>
                        <td className="min-w-[120px] max-w-[200px] truncate px-2 py-2" title={page.title ?? ""}>{page.title ?? "—"}</td>
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{page.title_length ?? "—"}</td>
                        <td className="min-w-[100px] max-w-[180px] truncate px-2 py-2 text-[var(--muted)]" title={page.meta_descp ?? ""}>{page.meta_descp ?? "—"}</td>
                        <td className="min-w-[100px] max-w-[160px] truncate px-2 py-2" title={page.h1 ?? ""}>{page.h1 ?? "—"}</td>
                        <td className="min-w-[180px] max-w-[280px] truncate px-2 py-2 text-[var(--muted)]" title={page.canonical ?? ""}>{page.canonical ?? "—"}</td>
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{page.crawl_depth ?? "—"}</td>
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{page.response_time ?? "—"}</td>
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{page.language ?? "—"}</td>
                        <td className="min-w-[120px] max-w-[180px] truncate px-2 py-2 text-[var(--muted)]" title={page.last_modified ?? ""}>{page.last_modified ?? "—"}</td>
                        <td className="min-w-[180px] max-w-[280px] truncate px-2 py-2 text-[var(--muted)]" title={page.redirect_url ?? ""}>{page.redirect_url ?? "—"}</td>
                        <td className="min-w-[80px] px-2 py-2 text-[var(--muted)]">{page.redirect_type ?? "—"}</td>
                        <td className="shrink-0 px-2 py-2 text-[var(--muted)]">{page.http_version ?? "—"}</td>
                        <td className="min-w-[80px] px-2 py-2 text-[var(--muted)]">{page.readability ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {site && site.status !== "completed" && site.status !== "processing" && (
            <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
              Crawling… {site.status === "queued" && "Starting…"}
            </div>
          )}
          {!site && (
            <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
              Enter a URL and click Start to crawl a site.
            </div>
          )}
        </div>

        {/* Right sidebar: Overview + Audit */}
        {(site?.status === "completed" || site?.status === "processing") && (
          <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)] overflow-auto">
            {/* Overview section */}
            {overview && (
              <>
                <h3 className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                  Overview
                </h3>
                <div className="p-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between rounded bg-[var(--surface-elevated)] px-3 py-2">
                      <span className="text-[var(--muted)]">Total URLs</span>
                      <span className="font-medium">{overview.total_urls}</span>
                    </div>
                    <div className="mt-3 text-[var(--muted)]">By resource type</div>
                    {overview.by_type.map((t, i) => (
                      <div key={`${t.label}-${i}`} className="flex justify-between rounded px-2 py-1">
                        <span>{t.label}</span>
                        <span>
                          {t.count} <span className="text-[var(--muted)]">({t.percent}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Audit section — appears after crawl completes */}
            {site?.status === "completed" && (
              <>
                <h3 className="shrink-0 border-y border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                  Technical Audit
                </h3>
                {(!audit || audit.audit_status === "pending" || audit.audit_status === "running") ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-xs text-[var(--muted)]">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                    Running audit…
                  </div>
                ) : audit.audit_status === "failed" || !audit.audit ? (
                  <p className="px-4 py-3 text-xs text-[var(--error)]">Audit failed.</p>
                ) : (
                  <AuditPanel audit={audit.audit} />
                )}
              </>
            )}
          </aside>
        )}
      </div>

      {/* Details panel - scrollable with sticky header */}
      {(site?.status === "completed" || site?.status === "processing") && (
        <div className="flex shrink-0 flex-col border-t border-[var(--border)] bg-[var(--surface)]" style={{ maxHeight: "280px" }}>
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
            <span className="text-sm font-medium text-[var(--muted)]">URL details</span>
            {selectedPage && (
              <input
                type="text"
                placeholder="Filter details…"
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                className="ml-2 flex-1 max-w-xs rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm outline-none focus:border-[var(--accent)]"
              />
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {selectedPage ? (
              <table className="w-full min-w-[400px] text-sm">
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
              <p className="text-sm text-[var(--muted)]">Select a row above to view details.</p>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <footer className="flex shrink-0 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
        <div className="px-4 py-1.5 text-xs text-[var(--muted)]">
          {site ? (
            <>
              <span className="capitalize">{site.status}</span>
              {site.robots_allowed === false && " · Crawling disallowed by robots.txt"}
              {pagesData && (
                <>
                  {" · "}
                  {pagesData.total} URL{pagesData.total !== 1 ? "s" : ""} loaded
                </>
              )}
            </>
          ) : (
            "Ready"
          )}
        </div>
      </footer>
    </div>
  );
}
