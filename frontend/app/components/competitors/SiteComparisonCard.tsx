"use client";
import { GeoScoreRing } from "../geo/GeoScoreRing";
import type { HistoryRecord } from "../../lib/api";

const SITE_COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#d97706", "#0891b2", "#db2777"];

interface Props {
  record: HistoryRecord | null;
  siteIndex: number; // 0 = primary, 1+ = competitors
  domain: string;
  pending?: boolean;
  error?: string | null;
}

export default function SiteComparisonCard({ record, siteIndex, domain, pending, error }: Props) {
  const score = record?.overall_score ?? 0;
  const grade = record?.grade ?? "?";
  const siteType = record?.site_type ?? "—";
  const isPrimary = siteIndex === 0;
  const labelColor = SITE_COLORS[siteIndex % SITE_COLORS.length];
  const label = isPrimary ? "Primary" : `Competitor ${siteIndex}`;

  return (
    <div
      className="flex flex-1 min-w-[180px] items-start gap-4 rounded-lg border border-[var(--border)] p-4"
      style={{ backgroundColor: isPrimary ? `${labelColor}0d` : "var(--surface)" }}
    >
      {/* Score ring + grade badge (rendered inside GeoScoreRing) */}
      <div className="shrink-0">
        {pending ? (
          <div className="flex h-[90px] w-[90px] items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--warning)]" />
          </div>
        ) : error ? (
          <div className="flex h-[90px] w-[90px] items-center justify-center text-xs text-[var(--error)]">{error}</div>
        ) : record ? (
          <GeoScoreRing score={score} grade={grade} size={90} />
        ) : (
          <div className="flex h-[90px] w-[90px] items-center justify-center text-xs text-[var(--muted)]">Pending</div>
        )}
      </div>

      {/* Label badge + domain + site type */}
      <div className="flex flex-col gap-1.5 pt-2">
        <span
          className="self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: labelColor }}
        >
          {label}
        </span>
        <div className="truncate text-sm font-semibold text-[var(--foreground)]" title={domain}>
          {domain}
        </div>
        <div className="text-xs text-[var(--muted)]">{siteType}</div>
      </div>
    </div>
  );
}
