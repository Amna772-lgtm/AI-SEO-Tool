"use client";
import { useMemo } from "react";
import type { HistoryItem } from "../../lib/api";

interface Props {
  history: HistoryItem[];
  value: string;   // analysis_id of selected site
  onChange: (analysisId: string) => void;
  disabled?: boolean;
}

export default function PrimarySiteSelector({ history, value, onChange, disabled }: Props) {
  // Pitfall 6: dedupe by domain, keep most-recent analysis per domain
  const options = useMemo(() => {
    const seen = new Map<string, HistoryItem>();
    for (const item of history) {
      const existing = seen.get(item.domain);
      if (!existing || new Date(item.analyzed_at) > new Date(existing.analyzed_at)) {
        seen.set(item.domain, item);
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime()
    );
  }, [history]);

  const empty = options.length === 0;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Your site
      </label>
      <select
        className="max-w-[320px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || empty}
      >
        {empty ? (
          <option value="">No audited sites yet — run an audit first</option>
        ) : (
          <>
            <option value="">Select an audited site...</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.domain}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}
