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
import LockedFeature from "../LockedFeature";
import PrimarySiteSelector from "./PrimarySiteSelector";
import CompetitorSuggestionCard from "./CompetitorSuggestionCard";
import CompetitorCard from "./CompetitorCard";
import SiteComparisonCard from "./SiteComparisonCard";
import CompetitorRadarChart from "./CompetitorRadarChart";

// Inline spinner reused from page.tsx pattern
const Spinner = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
    <span>{label}</span>
  </div>
);

export default function CompetitorsTab() {
  const { subscription } = useAuth();

  // Free plan gate — tab stays visible in nav (D-01), gate lives inside component
  if (subscription?.plan === "free") {
    return (
      <div className="flex items-center justify-center p-16">
        <LockedFeature title="Competitor Tracking" plan="Pro" />
      </div>
    );
  }

  return <CompetitorsTabInner />;
}

// Inner component avoids hook ordering issues with early return
function CompetitorsTabInner() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>("");
  const [group, setGroup] = useState<CompetitorGroup | null>(null);
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [manualUrl, setManualUrl] = useState<string>("");
  const [siteRecords, setSiteRecords] = useState<Map<string, HistoryRecord>>(new Map());
  const [discovering, setDiscovering] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [addingCompetitors, setAddingCompetitors] = useState(false);

  // Load history on mount
  useEffect(() => {
    getHistory({ limit: 50 })
      .then((r) => setHistory(r.items))
      .catch(() => setHistory([]));
  }, []);

  // When selectedPrimaryId changes: get-or-create group, load primary record
  useEffect(() => {
    if (!selectedPrimaryId) {
      setGroup(null);
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setDiscoveryMessage(null);
      setAddError(null);
      return;
    }

    setLoadingGroup(true);
    setAddError(null);

    createCompetitorGroup(selectedPrimaryId)
      .then(async (g) => {
        setGroup(g);
        // Load primary site record
        try {
          const primaryRecord = await getHistoryRecord(selectedPrimaryId);
          setSiteRecords((prev) => new Map(prev).set(selectedPrimaryId, primaryRecord));
        } catch {
          // non-fatal
        }
        // Load records for existing completed competitor sites
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
            } catch {
              // non-fatal
            }
          })
        );
      })
      .catch(() => {
        setGroup(null);
      })
      .finally(() => setLoadingGroup(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrimaryId]);

  // Polling: watch group sites for pending audits
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
            // Mark failed by storing a sentinel — use null-ish map entry
            setSiteRecords((prev) => {
              const next = new Map(prev);
              // Store with analysis_id key pointing to a failed placeholder so polling stops
              next.set(s.analysis_id! + "__failed", {} as HistoryRecord);
              return next;
            });
          }
        } catch {
          // network error — keep polling
        }
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [group, siteRecords]);

  const handleFindCompetitors = useCallback(async () => {
    if (!selectedPrimaryId) return;
    setDiscovering(true);
    setDiscoveryMessage(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const result = await discoverCompetitors(selectedPrimaryId);
      setSuggestions(result.suggestions);
      if (result.fallback || result.suggestions.length === 0) {
        setDiscoveryMessage(
          result.message ||
            "Couldn't find suggestions right now. Add competitors manually using the field below."
        );
      }
    } catch {
      setDiscoveryMessage(
        "Couldn't find suggestions right now. Add competitors manually using the field below."
      );
    } finally {
      setDiscovering(false);
    }
  }, [selectedPrimaryId]);

  const toggleSuggestion = useCallback((domain: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(async () => {
    if (!group) return;
    setAddError(null);
    setAddingCompetitors(true);
    const domains = Array.from(selectedSuggestions);
    for (const domain of domains) {
      try {
        await addCompetitorSite(group.id, `https://${domain}`);
      } catch (err: unknown) {
        const e = err as Error & { code?: string; cap?: number };
        if (e.code === "competitor_cap_reached") {
          setAddError(
            `${e.message || `Plan supports up to ${e.cap ?? "?"} competitors per group.`}`
          );
          break;
        }
        if (e.code === "quota_exceeded") {
          setAddError(
            "You've used all your audits for this month. Upgrade or wait for your quota to reset."
          );
          break;
        }
        // surface generic error
        setAddError(e.message || "Failed to add competitor.");
        break;
      }
    }
    // Refetch group after adds
    try {
      const refreshed = await getCompetitorGroup(group.id);
      setGroup(refreshed);
    } catch {
      // non-fatal
    }
    setSelectedSuggestions(new Set());
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
    } catch (err: unknown) {
      const e = err as Error & { code?: string; cap?: number };
      if (e.code === "competitor_cap_reached") {
        setAddError(
          `${e.message || `Plan supports up to ${e.cap ?? "?"} competitors per group.`}`
        );
        return;
      }
      if (e.code === "quota_exceeded") {
        setAddError(
          "You've used all your audits for this month. Upgrade or wait for your quota to reset."
        );
        return;
      }
      setAddError(e.message || "Failed to add competitor.");
    }
  }, [group, manualUrl]);

  const handleReaudit = useCallback(async (siteId: string) => {
    if (!group) return;
    try {
      const updated = await reauditCompetitorSite(group.id, siteId);
      // Drop cached record so polling picks it up again
      if (updated.analysis_id) {
        setSiteRecords((prev) => {
          const next = new Map(prev);
          next.delete(updated.analysis_id!);
          return next;
        });
      }
      const refreshed = await getCompetitorGroup(group.id);
      setGroup(refreshed);
    } catch {
      // non-fatal
    }
  }, [group]);

  const handleRemove = useCallback(async (siteId: string, analysisId: string | null) => {
    if (!group) return;
    try {
      await removeCompetitorSite(group.id, siteId);
      if (analysisId) {
        setSiteRecords((prev) => {
          const next = new Map(prev);
          next.delete(analysisId);
          return next;
        });
      }
      const refreshed = await getCompetitorGroup(group.id);
      setGroup(refreshed);
    } catch {
      // non-fatal
    }
  }, [group]);

  // Determine status for a competitor site
  const getSiteStatus = (analysisId: string | null): "pending" | "complete" | "error" => {
    if (!analysisId) return "pending";
    if (siteRecords.has(analysisId + "__failed")) return "error";
    if (siteRecords.has(analysisId)) return "complete";
    return "pending";
  };

  // Build comparison data
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
    .map((r) => ({
      id: r.id,
      domain: r.domain,
      dimensions: extractRadarDimensions(r),
    }));

  // Empty history state
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">Audit your site first</p>
        <p className="text-sm text-[var(--muted)]">
          Run an analysis from the home page before tracking competitors.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Section 1: Selector bar */}
      <div className="flex flex-wrap items-end gap-4 border-b border-[var(--border)] pb-4">
        <PrimarySiteSelector
          history={history}
          value={selectedPrimaryId}
          onChange={setSelectedPrimaryId}
          disabled={loadingGroup}
        />
        <button
          type="button"
          onClick={handleFindCompetitors}
          disabled={!selectedPrimaryId || discovering || loadingGroup}
          aria-label={discovering ? "Finding competitors, please wait" : "Find Competitors"}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {discovering ? (
            <Spinner label="Finding competitors..." />
          ) : (
            "Find Competitors"
          )}
        </button>
      </div>

      {/* Section 2: Discovery results */}
      {(suggestions.length > 0 || discoveryMessage) && (
        <div className="flex flex-col gap-4">
          {suggestions.length > 0 && (
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Found {suggestions.length} competitor{suggestions.length !== 1 ? "s" : ""} — select to audit
            </p>
          )}
          {discoveryMessage && (
            <p className="text-sm text-[var(--muted)]">{discoveryMessage}</p>
          )}
          {suggestions.length > 0 && (
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
          )}
          {/* Manual URL input row */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Add a competitor URL manually"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              type="button"
              onClick={handleAddManual}
              disabled={!manualUrl.trim() || !group}
              className="rounded border border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add URL
            </button>
          </div>
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
          {addError && (
            <p className="text-xs text-[var(--error)]">{addError}</p>
          )}
        </div>
      )}

      {/* Section 3: Competitor row */}
      {group && (
        <div className="flex flex-col gap-4">
          {group.sites.length === 0 && suggestions.length === 0 && !discoveryMessage ? (
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-[var(--foreground)]">No competitors tracked yet</p>
              <p className="text-sm text-[var(--muted)]">
                Select your site above and click &apos;Find Competitors&apos; to let AI suggest who you&apos;re competing with.
              </p>
              {/* Show manual input when no suggestions shown */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="Add a competitor URL manually"
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={handleAddManual}
                  disabled={!manualUrl.trim()}
                  className="rounded border border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add URL
                </button>
              </div>
              {addError && (
                <p className="text-xs text-[var(--error)]">{addError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {group.sites.map((site) => {
                const status = getSiteStatus(site.analysis_id);
                const record = site.analysis_id ? siteRecords.get(site.analysis_id) ?? null : null;
                return (
                  <CompetitorCard
                    key={site.id}
                    site={site}
                    record={record}
                    status={status}
                    onReaudit={() => handleReaudit(site.id)}
                    onRemove={() => handleRemove(site.id, site.analysis_id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 4: Comparison view */}
      {showComparison ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-base font-semibold text-[var(--foreground)]">Score Comparison</p>
            <div className="flex flex-wrap gap-4">
              {primaryRecord && (
                <SiteComparisonCard
                  record={primaryRecord}
                  label="Primary"
                  domain={primaryRecord.domain}
                />
              )}
              {completedCompetitorRecords.map((r) => (
                <SiteComparisonCard
                  key={r.id}
                  record={r}
                  label="Competitor"
                  domain={r.domain}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-base font-semibold text-[var(--foreground)]">GEO Dimension Comparison</p>
            <CompetitorRadarChart sites={radarSites} />
          </div>
        </div>
      ) : (
        selectedPrimaryId && group && group.sites.length > 0 && !showComparison && (
          <div className="flex flex-col gap-2 text-center">
            <p className="text-base font-semibold text-[var(--foreground)]">No competitors tracked yet</p>
            <p className="text-sm text-[var(--muted)]">
              Select your site above and click &apos;Find Competitors&apos; to let AI suggest who you&apos;re competing with.
            </p>
          </div>
        )
      )}
    </div>
  );
}
