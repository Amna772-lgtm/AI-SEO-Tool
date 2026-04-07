"use client";

import { useState, useMemo } from "react";
import type { PageRow, QueryPatterns } from "../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TreeNode {
  segment: string;
  fullPath: string;
  pages: PageRow[];
  children: Map<string, TreeNode>;
}

// ── Tree builder ──────────────────────────────────────────────────────────────

function buildTree(pages: PageRow[]): TreeNode {
  const root: TreeNode = { segment: "/", fullPath: "/", pages: [], children: new Map() };

  for (const page of pages) {
    if (page.type !== "internal") continue;
    try {
      const url = new URL(page.address);
      const parts = url.pathname.split("/").filter(Boolean);

      if (parts.length === 0) {
        root.pages.push(page);
        continue;
      }

      let node = root;
      let path = "";
      for (const part of parts) {
        path += "/" + part;
        if (!node.children.has(part)) {
          node.children.set(part, { segment: part, fullPath: path, pages: [], children: new Map() });
        }
        node = node.children.get(part)!;
      }
      node.pages.push(page);
    } catch {}
  }

  return root;
}

function countDescendants(node: TreeNode): number {
  let count = node.pages.length;
  for (const child of node.children.values()) count += countDescendants(child);
  return count;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function statusColor(pages: PageRow[]): string {
  if (pages.length === 0) return "#6b7280";
  const codes = pages.map((p) => p.status_code ?? 0);
  if (codes.some((c) => c >= 400)) return "#dc2626";
  if (codes.some((c) => c >= 300)) return "#ca8a04";
  if (codes.every((c) => c === 200)) return "#16a34a";
  return "#6b7280";
}

function statusLabel(code: number | null): string {
  if (code === null) return "—";
  if (code === 200) return "200";
  if (code >= 300 && code < 400) return `${code} ↗`;
  if (code >= 400) return `${code} ✗`;
  return String(code);
}

// ── TreeNodeRow ───────────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
  defaultOpen,
}: {
  node: TreeNode;
  depth: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children.size > 0;
  const totalCount = countDescendants(node);
  const dotColor = statusColor(node.pages);

  return (
    <div>
      {/* Row */}
      <div
        className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[var(--surface-elevated)] cursor-default group"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {/* Expand toggle */}
        <button
          className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px] text-[var(--muted)]"
          onClick={() => hasChildren && setOpen(!open)}
          style={{ cursor: hasChildren ? "pointer" : "default", opacity: hasChildren ? 1 : 0 }}
        >
          {open ? "▾" : "▸"}
        </button>

        {/* Status dot */}
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />

        {/* Segment label */}
        <span className="flex-1 truncate text-[11px] font-mono text-[var(--foreground)]">
          {node.segment === "/" ? "/" : node.segment}
        </span>

        {/* Page count badge */}
        {totalCount > 0 && (
          <span className="shrink-0 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-1.5 text-[9px] text-[var(--muted)]">
            {totalCount}
          </span>
        )}
      </div>

      {/* Inline pages at this node */}
      {open && node.pages.length > 0 && (
        <div style={{ paddingLeft: `${depth * 14 + 26}px` }}>
          {node.pages.slice(0, 5).map((page, i) => {
            const code = page.status_code;
            const codeColor = !code ? "#6b7280" : code >= 400 ? "#dc2626" : code >= 300 ? "#ca8a04" : "#16a34a";
            const shortUrl = page.address.replace(/^https?:\/\/[^/]+/, "") || "/";
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0" />
                <span className="flex-1 truncate text-[10px] text-[var(--muted)] font-mono">{shortUrl}</span>
                <span className="shrink-0 text-[9px] font-medium tabular-nums" style={{ color: codeColor }}>
                  {statusLabel(code)}
                </span>
              </div>
            );
          })}
          {node.pages.length > 5 && (
            <p className="py-0.5 text-[9px] text-[var(--muted)]">+{node.pages.length - 5} more</p>
          )}
        </div>
      )}

      {/* Children */}
      {open && hasChildren && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => countDescendants(b) - countDescendants(a))
            .map((child) => (
              <TreeNodeRow key={child.segment} node={child} depth={depth + 1} defaultOpen={true} />
            ))}
        </div>
      )}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: "#16a34a", label: "200 OK" },
    { color: "#ca8a04", label: "3xx Redirect" },
    { color: "#dc2626", label: "4xx/5xx Error" },
    { color: "#6b7280", label: "Unknown" },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] text-[var(--muted)]">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const PATTERN_LABELS: Array<{ key: keyof QueryPatterns; label: string }> = [
  { key: "how_to",     label: "How-to" },
  { key: "what_is",   label: "What is" },
  { key: "why",       label: "Why" },
  { key: "best",      label: "Best / Top" },
  { key: "comparison", label: "Comparison" },
];

interface Props {
  pages: PageRow[];
  siteUrl: string;
  queryPatterns?: QueryPatterns;
}

export function SiteStructurePanel({ pages, siteUrl, queryPatterns }: Props) {
  const origin = useMemo(() => {
    try { return new URL(siteUrl).origin; } catch { return ""; }
  }, [siteUrl]);

  const tree = useMemo(() => buildTree(pages), [pages]);

  const internalHtml = pages.filter((p) => p.type === "internal");
  const ok = internalHtml.filter((p) => p.status_code === 200).length;
  const broken = internalHtml.filter((p) => (p.status_code ?? 0) >= 400).length;
  const redirects = internalHtml.filter((p) => {
    const c = p.status_code ?? 0;
    return c >= 300 && c < 400;
  }).length;

  const depth1Nodes = Array.from(tree.children.values()).sort(
    (a, b) => countDescendants(b) - countDescendants(a)
  );

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-base font-bold text-green-600">{ok}</p>
          <p className="text-[10px] text-[var(--muted)]">OK pages</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-base font-bold text-amber-500">{redirects}</p>
          <p className="text-[10px] text-[var(--muted)]">Redirects</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-elevated)] p-2.5 text-center">
          <p className="text-base font-bold text-red-600">{broken}</p>
          <p className="text-[10px] text-[var(--muted)]">Broken</p>
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Tree */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        {/* Root */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5">
          <span className="text-[10px] font-mono text-[var(--muted)] truncate">{origin || siteUrl}</span>
        </div>

        <div className="max-h-[340px] overflow-y-auto py-1 px-1">
          {/* Homepage */}
          {tree.pages.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-0.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor(tree.pages) }} />
              <span className="text-[11px] font-mono text-[var(--foreground)]">/ (homepage)</span>
              <span className="ml-auto text-[9px] font-medium tabular-nums" style={{ color: statusColor(tree.pages) }}>
                {statusLabel(tree.pages[0]?.status_code ?? null)}
              </span>
            </div>
          )}

          {depth1Nodes.map((child) => (
            <TreeNodeRow key={child.segment} node={child} depth={0} defaultOpen={true} />
          ))}

          {depth1Nodes.length === 0 && tree.pages.length === 0 && (
            <p className="py-6 text-center text-xs text-[var(--muted)]">No internal pages crawled yet.</p>
          )}
        </div>
      </div>

      <p className="text-[10px] text-[var(--muted)]">
        Showing structure from {internalHtml.length} internal page{internalHtml.length !== 1 ? "s" : ""} crawled.
      </p>

      {/* Query patterns */}
      {queryPatterns && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">Query patterns detected</p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {PATTERN_LABELS.map(({ key, label }) => {
              const active = queryPatterns[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1"
                  style={{
                    backgroundColor: active ? "#dcfce7" : "var(--surface-elevated)",
                    border: `1px solid ${active ? "#86efac" : "var(--border)"}`,
                  }}
                >
                  <span className="text-[10px]" style={{ color: active ? "#16a34a" : "#9ca3af" }}>
                    {active ? "✓" : "✗"}
                  </span>
                  <span className="text-[10px]" style={{ color: active ? "#15803d" : "var(--muted)" }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
