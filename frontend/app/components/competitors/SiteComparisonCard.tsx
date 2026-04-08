"use client";
import { GeoScoreRing } from "../geo/GeoScoreRing";
import { EngineScores } from "../geo/EngineScores";
import type { HistoryRecord } from "../../lib/api";

interface Props {
  record: HistoryRecord | null;
  label?: "Primary" | "Competitor";
  domain: string;
  pending?: boolean;
  error?: string | null;
}

export default function SiteComparisonCard({ record, label, domain, pending, error }: Props) {
  const score = record?.overall_score ?? 0;
  const grade = record?.grade ?? "?";
  const siteType = record?.site_type ?? "—";

  return (
    <div className="flex min-w-[220px] flex-1 flex-col items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {label}
        </span>
      )}
      {pending ? (
        <div className="flex h-[100px] w-[100px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--warning)]" />
        </div>
      ) : error ? (
        <div className="flex h-[100px] items-center text-xs text-[var(--error)]">{error}</div>
      ) : record ? (
        <GeoScoreRing score={score} grade={grade} size={100} />
      ) : (
        <div className="text-xs text-[var(--muted)]">Score pending</div>
      )}
      <div className="truncate font-mono text-xs text-[var(--foreground)]" title={domain}>
        {domain}
      </div>
      <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
        {siteType}
      </span>
      {record?.geo_data?.score && (
        <div className="w-full">
          <EngineScores score={record.geo_data.score} />
        </div>
      )}
    </div>
  );
}
