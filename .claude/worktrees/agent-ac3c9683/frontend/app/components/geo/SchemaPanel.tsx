"use client";

import type { SchemaResult, SchemaSemanticIssue } from "../../lib/api";

interface Props {
  schema: SchemaResult;
}

function coverageColor(pct: number): string {
  if (pct >= 80) return "#16a34a";
  if (pct >= 50) return "#ca8a04";
  return "#dc2626";
}

function coverageBg(pct: number): string {
  if (pct >= 80) return "#d1fae5";
  if (pct >= 50) return "#fef3c7";
  return "#ffe4e6";
}

export function SchemaPanel({ schema }: Props) {
  const color = coverageColor(schema.coverage_percent);
  const bg = coverageBg(schema.coverage_percent);

  const formats = [
    { label: "JSON-LD",    ok: schema.has_json_ld,    desc: "Recommended" },
    { label: "Microdata",  ok: schema.has_microdata,  desc: "Legacy" },
    { label: "RDFa",       ok: schema.has_rdfa,       desc: "Semantic" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Row 1: Format cards + Coverage ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">

        {/* Format detection cards */}
        <div className="flex gap-2">
          {formats.map(({ label, ok, desc }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center rounded-xl px-4 py-3 text-center"
              style={{
                minWidth: 76,
                background: ok ? "#f0fdf4" : "var(--surface-elevated)",
                borderTop: `1px solid ${ok ? "#bbf7d0" : "var(--border)"}`,
                borderRight: `1px solid ${ok ? "#bbf7d0" : "var(--border)"}`,
                borderBottom: `1px solid ${ok ? "#bbf7d0" : "var(--border)"}`,
                borderLeft: `1px solid ${ok ? "#bbf7d0" : "var(--border)"}`,
              }}
            >
              <span
                className="mb-1 text-base font-bold"
                style={{ color: ok ? "#16a34a" : "var(--muted)" }}
              >
                {ok ? "✓" : "✗"}
              </span>
              <span className="text-xs font-semibold" style={{ color: ok ? "#166534" : "var(--foreground)" }}>
                {label}
              </span>
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Coverage card */}
        <div
          className="flex flex-col justify-center rounded-xl p-4"
          style={{ background: bg, borderTop: `1px solid ${color}30`, borderRight: `1px solid ${color}30`, borderBottom: `1px solid ${color}30`, borderLeft: `4px solid ${color}` }}
        >
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Schema coverage</p>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                {schema.pages_with_schema} of {schema.pages_analyzed ?? (schema as any).pages_count ?? "?"} pages have schema
              </p>
            </div>
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>
              {schema.coverage_percent}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: `${color}25` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${schema.coverage_percent}%`, background: color }}
            />
          </div>
        </div>
      </div>

      {/* ── Row 2: Detected types + Missing ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Types detected */}
        {schema.schema_types.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: "var(--surface-elevated)" }}>
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              <span style={{ color: "#16a34a" }}>⬡</span> Types detected
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: "#d1fae5", color: "#166534" }}
              >
                {schema.schema_types.length}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {schema.schema_types.map((t) => (
                <span
                  key={t}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: "#dcfce7", color: "#166534" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing recommended */}
        {schema.missing_recommended.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: "#fff7f7", borderTop: "1px solid #fecaca", borderRight: "1px solid #fecaca", borderBottom: "1px solid #fecaca", borderLeft: "3px solid #dc2626" }}>
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              <span style={{ color: "#dc2626" }}>⚠</span> Missing recommended
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: "#fee2e2", color: "#dc2626" }}
              >
                {schema.missing_recommended.length}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {schema.missing_recommended.map((t) => (
                <span
                  key={t}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
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
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            <span style={{ color: "#ca8a04" }}>◎</span> Completeness issues
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "#fef9c3", color: "#854d0e" }}
            >
              {schema.completeness_issues.length}
            </span>
          </p>
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
              {schema.completeness_issues.map((issue, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)",
                    borderBottom: i < schema.completeness_issues.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span
                    className="flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: "#fef9c3", color: "#854d0e" }}
                  >
                    {issue.type}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>missing:</span>
                  <span className="text-[11px] font-medium" style={{ color: "#92400e" }}>
                    {issue.missing_fields.join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Semantic issues ──────────────────────────────────────────────── */}
      {(schema.semantic_issues ?? []).length > 0 && (
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            <span style={{ color: "#ea580c" }}>⬡</span> Semantic mismatches
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "#ffedd5", color: "#9a3412" }}
            >
              {(schema.semantic_issues as SchemaSemanticIssue[]).length}
            </span>
          </p>
          <div className="space-y-2">
            {(schema.semantic_issues as SchemaSemanticIssue[]).slice(0, 4).map((issue, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{ background: "#fff7ed", borderTop: "1px solid #fed7aa", borderRight: "1px solid #fed7aa", borderBottom: "1px solid #fed7aa", borderLeft: "3px solid #ea580c" }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "#ffedd5", color: "#9a3412" }}>
                    {issue.type}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: "#c2410c" }}>{issue.field}</span>
                </div>
                <p className="mb-1 text-[11px]" style={{ color: "#9a3412" }}>{issue.issue}</p>
                <p className="truncate text-[10px] italic" style={{ color: "var(--muted)" }}>
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
