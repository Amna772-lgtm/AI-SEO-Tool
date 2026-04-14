"use client";

import type { SchemaResult, SchemaSemanticIssue } from "../../lib/api";

interface Props {
  schema: SchemaResult;
}

function statusColor(pct: number) {
  if (pct >= 80) return "#047857";
  if (pct >= 50) return "#b45309";
  return "#dc2626";
}

export function SchemaPanel({ schema }: Props) {
  const pct = schema.coverage_percent;
  const color = statusColor(pct);

  const formats = [
    { label: "JSON-LD",   ok: schema.has_json_ld,   desc: "Recommended" },
    { label: "Microdata", ok: schema.has_microdata,  desc: "Legacy" },
    { label: "RDFa",      ok: schema.has_rdfa,       desc: "Semantic" },
  ];

  return (
    <div className="space-y-4">

      {/* ── Coverage + Format detection ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">

        {/* Coverage bar */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">Schema coverage</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                {schema.pages_with_schema} of {schema.pages_analyzed ?? (schema as any).pages_count ?? "?"} pages have structured data
              </p>
            </div>
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>

        {/* Format cards */}
        <div className="flex gap-2">
          {formats.map(({ label, ok, desc }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-center"
              style={{ minWidth: 72 }}
            >
              <span
                className="mb-1 text-sm font-bold"
                style={{ color: ok ? "#047857" : "var(--muted)" }}
              >
                {ok ? "✓" : "—"}
              </span>
              <span className="text-[11px] font-semibold text-[var(--foreground)]">{label}</span>
              <span className="mt-0.5 text-[10px] text-[var(--muted)]">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Types detected + Missing recommended ────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {schema.schema_types.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--foreground)]">Types detected</p>
              <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                {schema.schema_types.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {schema.schema_types.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {schema.missing_recommended.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--foreground)]">Missing recommended</p>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                {schema.missing_recommended.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {schema.missing_recommended.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-red-100 bg-white px-2.5 py-1 text-[11px] font-medium text-red-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Completeness issues ──────────────────────────────────────────── */}
      {schema.completeness_issues.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Completeness issues</p>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {schema.completeness_issues.length}
            </span>
          </div>
          <div className="max-h-52 divide-y divide-[var(--border)] overflow-y-auto">
            {schema.completeness_issues.map((issue, i) => (
              <div key={i} className="flex items-center gap-3 bg-white px-4 py-2.5">
                <span className="shrink-0 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {issue.type}
                </span>
                <span className="text-[10px] text-[var(--muted)]">missing:</span>
                <span className="text-[11px] font-medium text-[var(--foreground)]">
                  {issue.missing_fields.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Semantic mismatches ──────────────────────────────────────────── */}
      {(schema.semantic_issues ?? []).length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Semantic mismatches</p>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
              {(schema.semantic_issues as SchemaSemanticIssue[]).length}
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(schema.semantic_issues as SchemaSemanticIssue[]).slice(0, 4).map((issue, i) => (
              <div key={i} className="bg-white px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                    {issue.type}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--foreground)]">{issue.field}</span>
                </div>
                <p className="mb-0.5 text-[11px] text-[var(--muted)]">{issue.issue}</p>
                <p className="truncate text-[10px] italic text-[var(--muted)]">
                  Value: &ldquo;{issue.schema_value}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
