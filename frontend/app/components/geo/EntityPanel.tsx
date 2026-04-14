"use client";

import type { EntityResult } from "../../lib/api";

interface Props {
  entity: EntityResult;
}

function scoreColor(s: number) {
  return s >= 65 ? "#047857" : s >= 35 ? "#b45309" : "#dc2626";
}

const ORG_FIELD_LABELS: Record<string, string> = {
  name:         "Name",
  url:          "URL",
  logo:         "Logo",
  description:  "Description",
  sameAs:       "sameAs links",
  address:      "Address",
  telephone:    "Phone",
  foundingDate: "Founding date",
};

export function EntityPanel({ entity }: Props) {
  const color  = scoreColor(entity.entity_score);
  const label  = entity.establishment_label;
  const breakdown = entity.score_breakdown;

  return (
    <div className="space-y-4">

      {/* ── Score hero ───────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full"
            style={{ background: color }}
          >
            <span className="text-lg font-black leading-none text-white">{entity.entity_score}</span>
            <span className="text-[9px] font-semibold text-white opacity-80">/ 100</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color }}>
                Entity: {label}
              </p>
              {entity.brand_name && (
                <span className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                  {entity.brand_name}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              Wikipedia · sameAs profiles · Organisation schema · Authority links
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${entity.entity_score}%`, background: color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Score breakdown bars ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(breakdown).map(([key, { pts, max }]) => {
          const pct    = max > 0 ? Math.round((pts / max) * 100) : 0;
          const bColor = scoreColor(pct);
          const labels: Record<string, string> = {
            wikipedia:       "Wikipedia article",
            same_as:         "sameAs profile links",
            org_schema:      "Organisation schema",
            authority_links: "Authority outbound links",
          };
          return (
            <div
              key={key}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
            >
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-medium text-[var(--foreground)]">{labels[key] ?? key}</span>
                <span className="font-bold tabular-nums" style={{ color: bColor }}>
                  {pts} / {max}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: bColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Signal grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* Wikipedia */}
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Wikipedia</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={entity.wikipedia_found
                ? { background: "#ecfdf5", color: "#047857" }
                : { background: "#fef2f2", color: "#dc2626" }}
            >
              {entity.wikipedia_found ? "Found" : "Not found"}
            </span>
          </div>
          <div className="bg-white px-4 py-3">
            {entity.wikipedia_found && entity.wikipedia_url ? (
              <a
                href={entity.wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[11px] text-[var(--accent)] underline"
              >
                {entity.wikipedia_url}
              </a>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                No Wikipedia article found for &ldquo;{entity.brand_name}&rdquo;. Creating one (when notable) is the single highest-impact entity signal.
              </p>
            )}
          </div>
        </div>

        {/* sameAs profiles */}
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">sameAs profiles</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={entity.same_as_pts >= 10
                ? { background: "#ecfdf5", color: "#047857" }
                : entity.same_as_pts > 0
                  ? { background: "#fffbeb", color: "#b45309" }
                  : { background: "#fef2f2", color: "#dc2626" }}
            >
              {entity.same_as_pts} / 30 pts
            </span>
          </div>
          <div className="bg-white px-4 py-3">
            {Object.keys(entity.same_as_platforms).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(entity.same_as_platforms).map(([platform, pts]) => (
                  <span
                    key={platform}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]"
                  >
                    {platform}
                    <span className="ml-1 text-emerald-600">+{pts as number}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                No sameAs links in schema. Add links to Wikipedia, LinkedIn, and Crunchbase in your Organization JSON-LD.
              </p>
            )}
          </div>
        </div>

        {/* Organisation schema */}
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Organisation schema</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={entity.org_pts >= 15
                ? { background: "#ecfdf5", color: "#047857" }
                : entity.org_pts >= 8
                  ? { background: "#fffbeb", color: "#b45309" }
                  : { background: "#fef2f2", color: "#dc2626" }}
            >
              {entity.org_fields_present.length} / 8 fields
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {["name", "url", "logo", "description", "sameAs", "address", "telephone", "foundingDate"].map(field => {
              const present = entity.org_fields_present.includes(field);
              return (
                <div key={field} className="flex items-center justify-between bg-white px-4 py-2">
                  <span className="text-[11px]" style={{ color: present ? "var(--foreground)" : "var(--muted)" }}>
                    {ORG_FIELD_LABELS[field] ?? field}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: present ? "#047857" : "#dc2626" }}
                  >
                    {present ? "✓" : "✗"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Authority links */}
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Authority links found</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={entity.authority_pts >= 8
                ? { background: "#ecfdf5", color: "#047857" }
                : entity.authority_pts > 0
                  ? { background: "#fffbeb", color: "#b45309" }
                  : { background: "#fef2f2", color: "#dc2626" }}
            >
              {entity.authority_pts} / 15 pts
            </span>
          </div>
          <div className="bg-white px-4 py-3">
            {entity.authority_links.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {entity.authority_links.map(domain => (
                  <span
                    key={domain}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                No outbound links to authoritative domains found. Linking to Wikipedia, government, or academic sources signals credibility to AI models.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
