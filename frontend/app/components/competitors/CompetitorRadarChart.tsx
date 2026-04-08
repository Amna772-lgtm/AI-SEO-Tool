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

const SERIES_COLORS = ["var(--accent)", "#2563eb", "#7c3aed", "#d97706", "#0891b2", "#db2777"];

export default function CompetitorRadarChart({ sites }: CompetitorRadarChartProps) {
  if (sites.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {DIMENSIONS.map((dim) => (
        <div key={dim.key} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--foreground)]">{dim.label}</span>
          {sites.map((site, i) => {
            const value = Math.max(0, Math.min(100, site.dimensions[dim.key] || 0));
            return (
              <div key={site.id} className="flex items-center gap-2">
                <span
                  className="w-[90px] truncate text-right font-mono text-[10px] text-[var(--muted)]"
                  title={site.domain}
                >
                  {site.domain}
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${value}%`,
                      backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length],
                    }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] font-semibold text-[var(--foreground)]">
                  {Math.round(value)}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-3 text-xs">
        {sites.map((site, i) => (
          <div key={site.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            <span className="font-mono text-[var(--foreground)]">{site.domain}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
