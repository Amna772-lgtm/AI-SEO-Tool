"use client";

import type { SchemaResult } from "../../lib/api";

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={
        ok
          ? { backgroundColor: "#dcfce7", color: "#166534" }
          : { backgroundColor: "#f3f4f6", color: "#6b7280" }
      }
    >
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

interface Props {
  schema: SchemaResult;
}

export function SchemaPanel({ schema }: Props) {
  const coverageColor =
    schema.coverage_percent >= 80 ? "#16a34a"
    : schema.coverage_percent >= 50 ? "#ca8a04"
    : "#dc2626";

  return (
    <div className="space-y-4">
      {/* Format badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge ok={schema.has_json_ld} label="JSON-LD" />
        <Badge ok={schema.has_microdata} label="Microdata" />
        <Badge ok={schema.has_rdfa} label="RDFa" />
      </div>

      {/* Coverage bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">Schema coverage</span>
          <span className="font-semibold tabular-nums" style={{ color: coverageColor }}>
            {schema.coverage_percent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${schema.coverage_percent}%`, backgroundColor: coverageColor }}
          />
        </div>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          {schema.pages_with_schema} of {schema.pages_analyzed} pages have schema
        </p>
      </div>

      {/* Schema types found */}
      {schema.schema_types.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">Types detected</p>
          <div className="flex flex-wrap gap-1">
            {schema.schema_types.map((t) => (
              <span
                key={t}
                className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing recommended */}
      {schema.missing_recommended.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">
            Missing recommended schemas
          </p>
          <div className="flex flex-wrap gap-1">
            {schema.missing_recommended.map((t) => (
              <span
                key={t}
                className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[10px] font-medium text-[#dc2626]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Completeness issues */}
      {schema.completeness_issues.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">Completeness issues</p>
          <div className="space-y-1">
            {schema.completeness_issues.slice(0, 4).map((issue, i) => (
              <div key={i} className="rounded bg-[var(--surface-elevated)] p-2 text-[10px]">
                <span className="font-medium text-[var(--foreground)]">{issue.type}</span>
                <span className="text-[var(--muted)]"> — missing: </span>
                <span className="text-amber-600">{issue.missing_fields.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
