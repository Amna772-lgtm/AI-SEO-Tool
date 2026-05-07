"use client";
import { useState } from "react";
import { GeoScoreRing } from "../geo/GeoScoreRing";
import type { CompetitorSite, HistoryRecord } from "../../lib/api";

const SITE_COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#d97706", "#0891b2", "#db2777"];

interface Props {
  site: CompetitorSite;
  record: HistoryRecord | null;
  status: "pending" | "complete" | "error";
  errorMessage?: string | null;
  colorIndex?: number;
  label?: string;
  onReaudit: () => void;
  onRemove: () => void;
}

const IconReaudit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
    <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function CompetitorCard({ site, record, status, errorMessage, colorIndex = 1, label, onReaudit, onRemove }: Props) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const domain = (() => {
    try { return new URL(site.url).hostname.replace(/^www\./, ""); } catch { return site.url; }
  })();
  const dotColor = SITE_COLORS[colorIndex % SITE_COLORS.length];

  if (confirmingRemove) {
    return (
      <div className="flex w-full flex-col overflow-hidden rounded-lg border border-[var(--error)] bg-[var(--surface)]">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-[var(--foreground)]">
            Remove <span className="font-mono font-semibold">{domain}</span>?
          </span>
        </div>
        <div className="flex border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="flex flex-1 items-center justify-center py-2 text-xs text-[var(--muted)] transition-colors hover:bg-gray-100 hover:text-[var(--foreground)]"
          >
            Keep
          </button>
          <div className="w-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={onRemove}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[var(--error)] transition-colors hover:bg-red-50"
          >
            <IconTrash /> Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full flex-col overflow-hidden rounded-lg border ${
      status === "error" ? "border-[var(--error)]" : "border-[var(--border)]"
    } bg-[var(--surface)]`}>

      {/* Main content */}
      <div className="flex items-start gap-4 p-4">
        {/* Score ring */}
        <div className="shrink-0">
          {status === "pending" && (
            <div className="flex h-[70px] w-[70px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--warning)]" />
            </div>
          )}
          {status === "complete" && record && (
            <GeoScoreRing score={record.overall_score ?? 0} grade={record.grade ?? "?"} size={70} />
          )}
          {status === "error" && (
            <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full border-2 border-[var(--error)] text-sm font-bold text-[var(--error)]">
              !
            </div>
          )}
        </div>

        {/* Domain + site type */}
        <div className="flex-1 pt-2">
          {label && (
            <span
              className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: dotColor }}
            >
              {label}
            </span>
          )}
          <div className="truncate text-sm font-semibold text-[var(--foreground)]" title={domain}>
            {domain}
          </div>
          {status === "complete" && record?.site_type && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
              <span className="text-xs text-[var(--muted)]">{record.site_type}</span>
            </div>
          )}
          {status === "pending" && (
            <div className="mt-1 text-xs text-[var(--warning)]">Auditing...</div>
          )}
          {status === "error" && (
            <div className="mt-1 text-xs text-[var(--error)]">{errorMessage || "Audit failed"}</div>
          )}
        </div>
      </div>

      {/* Action footer */}
      {status !== "pending" && (
        <div className="flex border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onReaudit}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs text-[var(--muted)] transition-colors hover:bg-gray-100 hover:text-[var(--foreground)]"
          >
            <IconReaudit />
            Re-audit
          </button>
          <div className="w-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs text-[var(--error)] transition-colors hover:bg-red-50"
          >
            <IconTrash />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
