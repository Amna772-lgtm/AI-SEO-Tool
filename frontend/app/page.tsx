"use client";

import { useState, useEffect, useCallback } from "react";
import {
  startAnalysis,
  getSite,
  getPages,
  getOverview,
  type Site,
  type PageRow,
  type PagesResponse,
  type OverviewResponse,
} from "./lib/api";

type TabType = "all" | "internal" | "external";

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
    setError(null);
    setUrl("");
    setSearch("");
    setDetailSearch("");
  };

  const refreshPages = useCallback(() => {
    if (!siteId) return;
    const typeParam = typeTab === "all" ? undefined : typeTab;
    getPages(siteId, { type: typeParam, search: search || undefined, limit: 5000 })
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

        {/* Overview sidebar - scrollable */}
        {(site?.status === "completed" || site?.status === "processing") && overview && (
          <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
            <h3 className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">
              Overview
            </h3>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between rounded bg-[var(--surface-elevated)] px-3 py-2">
                  <span className="text-[var(--muted)]">Total URLs</span>
                  <span className="font-medium">{overview.total_urls}</span>
                </div>
                <div className="mt-3 text-[var(--muted)]">By resource type</div>
                {overview.by_type.map((t) => (
                  <div key={t.content_type} className="flex justify-between rounded px-2 py-1">
                    <span>{t.label}</span>
                    <span>
                      {t.count} <span className="text-[var(--muted)]">({t.percent}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
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

      {/* Status bar + progress bar */}
      <footer className="flex shrink-0 flex-col border-t border-[var(--border)] bg-[var(--surface-elevated)]">
        {/* Progress bar */}
        {site && (site.status === "processing" || site.status === "completed") && (
          <div className="flex items-center gap-2 px-4 pt-2">
            <div className="flex-1 h-5 rounded bg-[var(--border)] overflow-hidden relative">
              {site.status === "completed" && pagesData ? (
                <div className="h-full rounded bg-[var(--accent)] flex items-center justify-center text-xs font-medium text-white w-full">
                  Completed {pagesData.total} of {pagesData.total} (100%)
                </div>
              ) : (
                <>
                  <div
                    className="progress-indeterminate absolute inset-y-0 w-1/3 rounded bg-[var(--accent)]"
                    style={{ minWidth: "30%" }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[var(--foreground)]">
                    Crawling… {pagesData?.total ?? 0} URL{(pagesData?.total ?? 0) !== 1 ? "s" : ""} found
                  </span>
                </>
              )}
            </div>
          </div>
        )}
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
