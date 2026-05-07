"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getHistory,
  getHistoryRecord,
  getSite,
  createCompetitorGroup,
  getCompetitorGroup,
  discoverCompetitors,
  addCompetitorSite,
  removeCompetitorSite,
  reauditCompetitorSite,
  extractRadarDimensions,
  type HistoryItem,
  type HistoryRecord,
  type CompetitorGroup,
  type CompetitorSuggestion,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { GeoScoreRing } from "../geo/GeoScoreRing";
import LockedFeature from "../LockedFeature";
import PrimarySiteSelector from "./PrimarySiteSelector";
import CompetitorSuggestionCard from "./CompetitorSuggestionCard";
import CompetitorCard from "./CompetitorCard";
import SiteComparisonCard from "./SiteComparisonCard";
import CompetitorRadarChart from "./CompetitorRadarChart";

const Spinner = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
    <span>{label}</span>
  </div>
);

export default function CompetitorsTab() {
  const { subscription } = useAuth();

  if (subscription?.plan === "free") {
    return (
      <div className="flex items-center justify-center p-16">
        <LockedFeature title="Competitor Tracking" plan="Pro" />
      </div>
    );
  }

  return <CompetitorsTabInner />;
}

function CompetitorsTabInner() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>("");
  const [group, setGroup] = useState<CompetitorGroup | null>(null);
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [manualUrl, setManualUrl] = useState<string>("");
  const [siteRecords, setSiteRecords] = useState<Map<string, HistoryRecord>>(new Map());
  const [discovering, setDiscovering] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<'fallback' | 'error' | 'no-results' | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [addingCompetitors, setAddingCompetitors] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    getHistory({ limit: 50 })
      .then((r) => setHistory(r.items))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    if (!selectedPrimaryId) {
      setGroup(null);
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setDiscoveryStatus(null);
      setAddError(null);
      setHasSearched(false);
      return;
    }

    setHasSearched(false);
    setLoadingGroup(true);
    setAddError(null);

    createCompetitorGroup(selectedPrimaryId)
      .then(async (g) => {
        setGroup(g);
        try {
          const primaryRecord = await getHistoryRecord(selectedPrimaryId);
          setSiteRecords((prev) => new Map(prev).set(selectedPrimaryId, primaryRecord));
        } catch { /* non-fatal */ }
        const completedSites = g.sites.filter((s) => s.analysis_id);
        await Promise.allSettled(
          completedSites.map(async (s) => {
            if (!s.analysis_id) return;
            try {
              const siteStatus = await getSite(s.analysis_id);
              if (siteStatus.status === "completed") {
                const rec = await getHistoryRecord(s.analysis_id);
                setSiteRecords((prev) => new Map(prev).set(s.analysis_id!, rec));
              }
            } catch { /* non-fatal */ }
          })
        );
      })
      .catch(() => setGroup(null))
      .finally(() => setLoadingGroup(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrimaryId]);

  useEffect(() => {
    if (!group || group.sites.length === 0) return;
    const pendingSites = group.sites.filter(
      (s) => s.analysis_id && !siteRecords.has(s.analysis_id)
    );
    if (pendingSites.length === 0) return;
    const intervalId = setInterval(async () => {
      for (const s of pendingSites) {
        if (!s.analysis_id) continue;
        try {
          const siteStatus = await getSite(s.analysis_id);
          if (siteStatus.status === "completed") {
            const rec = await getHistoryRecord(s.analysis_id);
            setSiteRecords((prev) => new Map(prev).set(s.analysis_id!, rec));
          } else if (siteStatus.status === "failed") {
            setSiteRecords((prev) => {
              const next = new Map(prev);
              next.set(s.analysis_id! + "__failed", {} as HistoryRecord);
              return next;
            });
          }
        } catch { /* network error — keep polling */ }
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [group, siteRecords]);

  const handleFindCompetitors = useCallback(async () => {
    if (!selectedPrimaryId) return;
    setHasSearched(true);
    setDiscovering(true);
    setDiscoveryStatus(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const result = await discoverCompetitors(selectedPrimaryId);
      setSuggestions(result.suggestions);
      if (result.fallback) {
        setDiscoveryStatus('fallback');
      } else if (result.suggestions.length === 0) {
        setDiscoveryStatus('no-results');
      }
    } catch {
      setDiscoveryStatus('error');
    } finally {
      setDiscovering(false);
    }
  }, [selectedPrimaryId]);

  const toggleSuggestion = useCallback((domain: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain); else next.add(domain);
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(async () => {
    if (!group) return;
    setAddError(null);
    setAddingCompetitors(true);
    for (const domain of Array.from(selectedSuggestions)) {
      try {
        await addCompetitorSite(group.id, `https://${domain}`);
      } catch (err: unknown) {
        const e = err as Error & { code?: string; cap?: number };
        if (e.code === "competitor_cap_reached") {
          setAddError(e.message || `Plan supports up to ${e.cap ?? "?"} competitors per group.`);
          break;
        }
        if (e.code === "quota_exceeded") {
          setAddError("You've used all your audits for this month. Upgrade or wait for your quota to reset.");
          break;
        }
        setAddError(e.message || "Failed to add competitor.");
        break;
      }
    }
    try {
      const refreshed = await getCompetitorGroup(group.id);
      setGroup(refreshed);
    } catch { /* non-fatal */ }
    setSelectedSuggestions(new Set());
    setSuggestions([]);
    setDiscoveryStatus(null);
    setAddingCompetitors(false);
  }, [group, selectedSuggestions]);

  const handleAddManual = useCallback(async () => {
    if (!group || !manualUrl.trim()) return;
    setAddError(null);
    try {
      await addCompetitorSite(group.id, manualUrl.trim());
      setManualUrl("");
      const refreshed = await getCompetitorGroup(group.id);
      setGroup(refreshed);
      setSuggestions([]);
      setDiscoveryStatus(null);
    } catch (err: unknown) {
      const e = err as Error & { code?: string; cap?: number };
      if (e.code === "competitor_cap_reached") {
        setAddError(e.message || `Plan supports up to ${e.cap ?? "?"} competitors per group.`);
        return;
      }
      if (e.code === "quota_exceeded") {
        setAddError("You've used all your audits for this month. Upgrade or wait for your quota to reset.");
        return;
      }
      setAddError(e.message || "Failed to add competitor.");
    }
  }, [group, manualUrl]);

  const handleReaudit = useCallback(async (siteId: string) => {
    if (!group) return;
    try {
      const updated = await reauditCompetitorSite(group.id, siteId);
      if (updated.analysis_id) {
        setSiteRecords((prev) => { const next = new Map(prev); next.delete(updated.analysis_id!); return next; });
      }
      const refreshed = await getCompetitorGroup(group.id);
      setGroup(refreshed);
    } catch { /* non-fatal */ }
  }, [group]);

  const handleRemove = useCallback(async (siteId: string, analysisId: string | null) => {
    if (!group) return;
    try {
      await removeCompetitorSite(group.id, siteId);
      if (analysisId) {
        setSiteRecords((prev) => { const next = new Map(prev); next.delete(analysisId); return next; });
      }
      const refreshed = await getCompetitorGroup(group.id);
      setGroup(refreshed);
    } catch { /* non-fatal */ }
  }, [group]);

  const getSiteStatus = (analysisId: string | null): "pending" | "complete" | "error" => {
    if (!analysisId) return "pending";
    if (siteRecords.has(analysisId + "__failed")) return "error";
    if (siteRecords.has(analysisId)) return "complete";
    return "pending";
  };

  const primaryRecord = selectedPrimaryId ? siteRecords.get(selectedPrimaryId) ?? null : null;
  const completedCompetitorRecords =
    group?.sites
      .filter((s) => s.analysis_id && getSiteStatus(s.analysis_id) === "complete")
      .map((s) => siteRecords.get(s.analysis_id!)!)
      .filter(Boolean) ?? [];

  const showComparison = primaryRecord !== null && completedCompetitorRecords.length > 0;

  const comparisonRecords = primaryRecord
    ? [primaryRecord, ...completedCompetitorRecords]
    : completedCompetitorRecords;

  const radarSites = comparisonRecords
    .filter((r) => r && r.domain)
    .map((r) => ({ id: r.id, domain: r.domain, dimensions: extractRadarDimensions(r) }));

  // Avg delta for score comparison header
  const avgCompetitorScore =
    completedCompetitorRecords.length > 0
      ? completedCompetitorRecords.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) / completedCompetitorRecords.length
      : null;
  const overallDelta =
    primaryRecord && avgCompetitorScore !== null
      ? Math.round((primaryRecord.overall_score ?? 0) - avgCompetitorScore)
      : null;

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">Audit your site first</p>
        <p className="text-sm text-[var(--muted)]">Run an analysis from the home page before tracking competitors.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Top two panels ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Your Site panel */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Your site
          </label>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <PrimarySiteSelector
                history={history}
                value={selectedPrimaryId}
                onChange={setSelectedPrimaryId}
                disabled={loadingGroup}
                hideLabel
              />
            </div>
            <button
              type="button"
              onClick={handleFindCompetitors}
              disabled={!selectedPrimaryId || discovering || loadingGroup}
              aria-label={discovering ? "Finding competitors, please wait" : "Find competitors"}
              className="btn-gradient shrink-0 px-4 py-2 text-sm disabled:opacity-50"
            >
              {discovering ? <Spinner label="Finding..." /> : "Find competitors"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">Auto-discovers similar sites in your space.</p>
        </div>

        {/* Add Competitor Manually panel */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Add Competitor Manually
          </label>
          <div className="mt-3 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:ring-1 focus-within:ring-[var(--accent)]">
              <span className="text-sm text-[var(--muted)]">+</span>
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
                placeholder="competitor.com"
                className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddManual}
              disabled={!manualUrl.trim() || !group}
              className="btn-gradient shrink-0 px-4 py-2 text-sm disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Up to 5 competitors per audit.</p>
          {addError && <p className="mt-2 text-xs text-[var(--error)]">{addError}</p>}
        </div>
      </div>

      {/* ── Discovery results (suggestions / message) ── */}
      {(suggestions.length > 0 || discoveryStatus) && (
        <div className="flex flex-col gap-4">
          {suggestions.length > 0 && (
            <>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Found {suggestions.length} competitor{suggestions.length !== 1 ? "s" : ""} — select to audit
              </p>
              <div className="flex flex-wrap gap-4">
                {suggestions.map((s) => (
                  <CompetitorSuggestionCard
                    key={s.domain}
                    suggestion={s}
                    checked={selectedSuggestions.has(s.domain)}
                    onToggle={toggleSuggestion}
                  />
                ))}
              </div>
            </>
          )}
          {discoveryStatus === 'fallback' && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <div>
                <p className="font-semibold">AI suggestions unavailable right now</p>
                <p className="mt-0.5 text-amber-800">Use the manual field above to add a competitor directly.</p>
              </div>
            </div>
          )}
          {discoveryStatus === 'error' && (
            <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              <span className="mt-0.5 shrink-0">✕</span>
              <div>
                <p className="font-semibold">Discovery failed</p>
                <p className="mt-0.5 text-red-800">Couldn&apos;t reach the service. Check your connection and try again.</p>
              </div>
            </div>
          )}
          {discoveryStatus === 'no-results' && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <span className="mt-0.5 shrink-0">ℹ️</span>
              <div>
                <p className="font-semibold">No matches found</p>
                <p className="mt-0.5 text-blue-800">AI couldn&apos;t identify direct competitors for this site. Add one manually above.</p>
              </div>
            </div>
          )}
          {selectedSuggestions.size > 0 && (
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={addingCompetitors || !group}
              className="self-start rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingCompetitors ? (
                <Spinner label="Adding..." />
              ) : (
                `Add ${selectedSuggestions.size} Competitor${selectedSuggestions.size !== 1 ? "s" : ""}`
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Tracked competitors ── */}
      {group && (
        <div className="flex flex-col gap-4">
          {group.sites.length === 0 && hasSearched && !discovering && !discoveryStatus ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">No competitors tracked yet</p>
              <p className="text-xs text-[var(--muted)]">
                Click &apos;Find competitors&apos; or add one manually above.
              </p>
            </div>
          ) : group.sites.length > 0 ? (
            <>
              <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--foreground)]">Score comparison</h2>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      Overall GEO performance vs {completedCompetitorRecords.length} competitor{completedCompetitorRecords.length !== 1 ? "s" : ""}.
                    </p>
                  </div>
                  {overallDelta !== null && (
                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        overallDelta >= 0
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-red-100 text-red-900"
                      }`}
                    >
                      {overallDelta >= 0 ? "↗" : "↘"}
                      {overallDelta >= 0 ? `+${overallDelta}` : overallDelta} vs avg
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {/* Primary site card */}
                {primaryRecord && (
                  <div className="flex w-full items-start gap-4 rounded-lg border border-[var(--border)] p-4" style={{ backgroundColor: "#16a34a0d" }}>
                    <div className="shrink-0">
                      <GeoScoreRing score={primaryRecord.overall_score ?? 0} grade={primaryRecord.grade ?? "?"} size={70} />
                    </div>
                    <div className="flex-1 pt-2">
                      <span className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: "#16a34a" }}>
                        Primary
                      </span>
                      <div className="truncate text-sm font-semibold text-[var(--foreground)]" title={primaryRecord.domain}>
                        {primaryRecord.domain}
                      </div>
                      {primaryRecord.site_type && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "#16a34a" }} />
                          <span className="text-xs text-[var(--muted)]">{primaryRecord.site_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {group.sites.map((site, idx) => {
                  const status = getSiteStatus(site.analysis_id);
                  const record = site.analysis_id ? siteRecords.get(site.analysis_id) ?? null : null;
                  return (
                    <CompetitorCard
                      key={site.id}
                      site={site}
                      record={record}
                      status={status}
                      colorIndex={idx + 1}
                      label={`Competitor ${idx + 1}`}
                      onReaudit={() => handleReaudit(site.id)}
                      onRemove={() => handleRemove(site.id, site.analysis_id)}
                    />
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      )}


      {/* ── GEO dimension comparison ── */}
      {showComparison && <CompetitorRadarChart sites={radarSites} />}

      {/* Pending audits message */}
      {!showComparison && group && group.sites.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          <div>
            <span className="font-semibold text-[var(--foreground)]">Auditing competitors…</span>
            <span className="ml-1 text-[var(--muted)]">Scores and the comparison chart will appear once analysis finishes.</span>
          </div>
        </div>
      )}
    </div>
  );
}
