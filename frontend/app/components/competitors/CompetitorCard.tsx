"use client";
import { useState } from "react";
import { GeoScoreRing } from "../geo/GeoScoreRing";
import type { CompetitorSite, HistoryRecord } from "../../lib/api";

interface Props {
  site: CompetitorSite;
  record: HistoryRecord | null;  // null while audit pending
  status: "pending" | "complete" | "error";
  errorMessage?: string | null;
  onReaudit: () => void;
  onRemove: () => void;
}

export default function CompetitorCard({ site, record, status, errorMessage, onReaudit, onRemove }: Props) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const domain = (() => {
    try { return new URL(site.url).hostname.replace(/^www\./, ""); } catch { return site.url; }
  })();

  if (confirmingRemove) {
    return (
      <div className="flex w-[200px] flex-col gap-2 rounded-lg border border-[var(--error)] bg-[var(--surface)] p-4">
        <div className="text-xs text-[var(--foreground)]">
          Remove <span className="font-mono">{domain}</span>? This cannot be undone.
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="flex-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Keep Competitor
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex-1 rounded bg-[var(--error)] px-2 py-1 text-xs font-semibold text-white"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-[200px] flex-col items-center gap-2 rounded-lg border p-4 ${
        status === "error" ? "border-[var(--error)]" : "border-[var(--border)]"
      } bg-[var(--surface)]`}
    >
      {status === "pending" && (
        <>
          <div className="flex h-[100px] w-[100px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--warning)]" />
          </div>
          <div className="text-xs text-[var(--warning)]">Auditing...</div>
        </>
      )}
      {status === "complete" && record && (
        <GeoScoreRing score={record.overall_score ?? 0} grade={record.grade ?? "?"} size={100} />
      )}
      {status === "error" && (
        <>
          <div className="text-xs font-semibold text-[var(--error)]">Audit failed</div>
          <div className="text-[10px] text-[var(--muted)]">{errorMessage || "Check the URL and try again"}</div>
        </>
      )}
      <div className="mt-1 w-full truncate text-center font-mono text-xs text-[var(--foreground)]" title={domain}>
        {domain}
      </div>
      {status === "complete" && record && (
        <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
          {record.site_type || "—"}
        </span>
      )}
      {status !== "pending" && (
        <div className="mt-2 flex w-full gap-2">
          <button
            type="button"
            onClick={onReaudit}
            className="flex-1 rounded border border-[var(--accent)] px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
          >
            Re-audit
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            className="text-xs text-[var(--error)] hover:underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
