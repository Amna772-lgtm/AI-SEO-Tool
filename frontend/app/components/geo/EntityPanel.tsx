"use client";

import type { EntityResult } from "../../lib/api";

interface Props {
  entity: EntityResult;
}

function scoreColor(s: number) {
  return s >= 65 ? "#16a34a" : s >= 35 ? "#ca8a04" : "#dc2626";
}
function scoreBg(s: number) {
  return s >= 65 ? "#f0fdf4" : s >= 35 ? "#fefce8" : "#fef2f2";
}

const ESTABLISHMENT_CONFIG = {
  Established: { color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  Emerging:    { color: "#ca8a04", bg: "#fefce8", border: "#fde047" },
  Unknown:     { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

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
  const color = scoreColor(entity.entity_score);
  const bg    = scoreBg(entity.entity_score);
  const estCfg = ESTABLISHMENT_CONFIG[entity.establishment_label] ?? ESTABLISHMENT_CONFIG["Unknown"];

  const breakdown = entity.score_breakdown;

  return (
    <div className="space-y-5">

      {/* ── Score hero ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 rounded-xl p-4"
        style={{ background: bg, borderTop: `1px solid ${color}30`, borderRight: `1px solid ${color}30`, borderBottom: `1px solid ${color}30`, borderLeft: `4px solid ${color}` }}
      >
        {/* Score circle */}
        <div
          className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-full"
          style={{ background: color, color: "#fff" }}
        >
          <span className="text-xl font-black leading-none">{entity.entity_score}</span>
          <span className="text-[9px] font-semibold opacity-80">/ 100</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold" style={{ color }}>Entity: {entity.establishment_label}</p>
            {entity.brand_name && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                {entity.brand_name}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted)" }}>
            Wikipedia · sameAs profiles · Organisation schema · Authority links
          </p>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full" style={{ background: `${color}25` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${entity.entity_score}%`, background: color }}
            />
          </div>
        </div>
      </div>

      {/* ── Score breakdown bars ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(breakdown).map(([key, { pts, max }]) => {
          const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
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
              className="rounded-xl p-3"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{labels[key] ?? key}</span>
                <span className="font-bold tabular-nums" style={{ color: bColor }}>
                  {pts} / {max}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Wikipedia */}
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Wikipedia</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={entity.wikipedia_found
                ? { background: "#d1fae5", color: "#166534" }
                : { background: "#fee2e2", color: "#991b1b" }}
            >
              {entity.wikipedia_found ? "Found" : "Not found"}
            </span>
          </div>
          <div className="px-3 py-3">
            {entity.wikipedia_found && entity.wikipedia_url ? (
              <a
                href={entity.wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] underline break-all"
                style={{ color: "var(--accent)" }}
              >
                {entity.wikipedia_url}
              </a>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                No Wikipedia article found for &ldquo;{entity.brand_name}&rdquo;. Creating one (when notable) is the single highest-impact entity signal.
              </p>
            )}
          </div>
        </div>

        {/* sameAs profiles */}
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>sameAs profiles</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={entity.same_as_pts >= 10
                ? { background: "#d1fae5", color: "#166534" }
                : entity.same_as_pts > 0
                  ? { background: "#fef9c3", color: "#92400e" }
                  : { background: "#fee2e2", color: "#991b1b" }}
            >
              {entity.same_as_pts} / 30 pts
            </span>
          </div>
          <div className="px-3 py-2.5">
            {Object.keys(entity.same_as_platforms).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(entity.same_as_platforms).map(([platform, pts]) => (
                  <span
                    key={platform}
                    className="rounded-lg px-2 py-0.5 text-[10px] font-medium"
                    style={{ background: "#dcfce7", color: "#166534" }}
                  >
                    {platform} +{pts}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                No sameAs links in schema. Add links to Wikipedia, LinkedIn, and Crunchbase in your Organization JSON-LD.
              </p>
            )}
          </div>
        </div>

        {/* Organisation schema */}
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Organisation schema</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={entity.org_pts >= 15
                ? { background: "#d1fae5", color: "#166534" }
                : entity.org_pts >= 8
                  ? { background: "#fef9c3", color: "#92400e" }
                  : { background: "#fee2e2", color: "#991b1b" }}
            >
              {entity.org_fields_present.length} / 8 fields
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {["name", "url", "logo", "description", "sameAs", "address", "telephone", "foundingDate"].map(field => {
              const present = entity.org_fields_present.includes(field);
              return (
                <div key={field} className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[11px]" style={{ color: present ? "var(--foreground)" : "var(--muted)" }}>
                    {ORG_FIELD_LABELS[field] ?? field}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: present ? "#16a34a" : "#dc2626" }}
                  >
                    {present ? "✓" : "✗"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Authority outbound links */}
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: "var(--surface-elevated)", borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Authority links found</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={entity.authority_pts >= 8
                ? { background: "#d1fae5", color: "#166534" }
                : entity.authority_pts > 0
                  ? { background: "#fef9c3", color: "#92400e" }
                  : { background: "#fee2e2", color: "#991b1b" }}
            >
              {entity.authority_pts} / 15 pts
            </span>
          </div>
          <div className="px-3 py-2.5">
            {entity.authority_links.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {entity.authority_links.map(domain => (
                  <span
                    key={domain}
                    className="rounded-lg px-2 py-0.5 text-[10px] font-medium"
                    style={{ background: "#eff6ff", color: "#1d4ed8" }}
                  >
                    {domain}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                No outbound links to authoritative domains found. Linking to Wikipedia, government, or academic sources signals credibility to AI models.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
