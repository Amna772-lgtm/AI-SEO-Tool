"use client";
import type { RadarDimensions } from "../../lib/api";

interface SiteRadarData {
  id: string;
  domain: string;
  dimensions: RadarDimensions;
}

interface CompetitorRadarChartProps {
  sites: SiteRadarData[];
}

const DIMENSIONS: Array<{ key: keyof RadarDimensions; label: string }> = [
  { key: "nlp",             label: "NLP" },
  { key: "structured_data", label: "Schema" },
  { key: "eeat",            label: "E-E-A-T" },
  { key: "conversational",  label: "Content" },
  { key: "entity",          label: "Entity" },
  { key: "technical",       label: "Technical" },
];

const SITE_COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#d97706", "#0891b2", "#db2777"];

export default function CompetitorRadarChart({ sites }: CompetitorRadarChartProps) {
  if (sites.length === 0) return null;

  const primaryDomain = sites[0]?.domain ?? "";
  const firstCompDomain = sites[1]?.domain ?? "competitors";

  return (
    <div className="flex flex-col gap-5">
      {/* Title + subtitle + legend */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">GEO dimension comparison</h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">Where you lead and where you trail, by category.</p>
        </div>
      </div>

      {/* 2-column dimension grid */}
      <div className="grid grid-cols-2 gap-4">
        {DIMENSIONS.map((dim) => {
          const values = sites.map((s) => Math.max(0, Math.min(100, s.dimensions[dim.key] || 0)));
          const primaryVal = values[0] ?? 0;
          const competitorVals = values.slice(1);
          const avgCompetitor =
            competitorVals.length > 0
              ? competitorVals.reduce((sum, v) => sum + v, 0) / competitorVals.length
              : null;
          const delta = avgCompetitor !== null ? Math.round(primaryVal - avgCompetitor) : null;

          return (
            <div key={dim.key} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              {/* Header row */}
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[var(--foreground)]">{dim.label}</span>
                {delta !== null && (
                  <span
                    className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      delta > 0
                        ? "bg-emerald-100 text-emerald-900"
                        : delta < 0
                        ? "bg-red-100 text-red-900"
                        : "bg-[var(--surface-elevated)] text-[var(--muted)]"
                    }`}
                  >
                    {delta > 0 ? "↗" : delta < 0 ? "↘" : "→"}
                    {delta > 0 ? `+${delta}` : `${delta}`} vs avg
                  </span>
                )}
              </div>

              {/* Bar rows */}
              <div className="flex flex-col gap-2">
                {sites.map((site, i) => {
                  const value = values[i];
                  return (
                    <div key={site.id} className="flex items-center gap-2">
                      <span
                        className="w-[80px] shrink-0 truncate text-right font-mono text-[10px] text-[var(--muted)]"
                        title={site.domain}
                      >
                        {site.domain}
                      </span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ width: `${value}%`, backgroundColor: SITE_COLORS[i % SITE_COLORS.length] }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[11px] font-semibold text-[var(--foreground)]">
                        {Math.round(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
