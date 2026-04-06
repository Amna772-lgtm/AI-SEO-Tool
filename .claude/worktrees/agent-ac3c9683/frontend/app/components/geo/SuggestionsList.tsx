"use client";

import { useState } from "react";
import type { Suggestion, SuggestionsResult } from "../../lib/api";

const PRIORITY_CONFIG = {
  critical: {
    label: "Critical",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    dot: "bg-red-500",
    icon: "✗",
  },
  important: {
    label: "Important",
    color: "#ca8a04",
    bg: "#fffbeb",
    border: "#fde68a",
    dot: "bg-amber-500",
    icon: "!",
  },
  optional: {
    label: "Optional",
    color: "#166534",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    dot: "bg-green-600",
    icon: "→",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  schema:    "Schema",
  eeat:      "E-E-A-T",
  technical: "Technical",
  content:   "Content",
  nlp:       "NLP",
  speed:     "Speed",
};

function SuggestionCard({ item, color }: { item: Suggestion; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-lg border bg-white transition-shadow hover:shadow-sm cursor-pointer"
      style={{ borderColor: open ? color : "var(--border)" }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start gap-3 p-3">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {item.impact[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--foreground)] leading-snug">{item.title}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              {item.category && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
              )}
              <span className="text-[var(--muted)] text-xs">{open ? "▲" : "▼"}</span>
            </div>
          </div>
          {open && (
            <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-2">
              <p className="text-xs text-[var(--muted)] leading-relaxed">{item.description}</p>
              <div className="rounded bg-[var(--surface-elevated)] p-2">
                <p className="text-xs font-medium text-[var(--foreground)] mb-0.5">How to fix</p>
                <p className="text-xs text-[var(--foreground)] leading-relaxed">{item.fix}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  suggestions: SuggestionsResult;
}

export function SuggestionsList({ suggestions }: Props) {
  const [activeTab, setActiveTab] = useState<"critical" | "important" | "optional">("critical");

  const counts = {
    critical: suggestions.critical?.length ?? 0,
    important: suggestions.important?.length ?? 0,
    optional: suggestions.optional?.length ?? 0,
  };

  const totalCritical = counts.critical;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] px-1 pb-2 mb-3">
        {(["critical", "important", "optional"] as const).map((priority) => {
          const cfg = PRIORITY_CONFIG[priority];
          const count = counts[priority];
          const active = activeTab === priority;
          return (
            <button
              key={priority}
              onClick={() => setActiveTab(priority)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                  : { color: "var(--muted)", border: "1px solid transparent" }
              }
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: active ? cfg.color : "#9ca3af" }}
              >
                {count}
              </span>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto space-y-2 pr-1">
        {(suggestions[activeTab] ?? []).length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-[var(--muted)]">
            No {activeTab} items — great job!
          </div>
        ) : (
          (suggestions[activeTab] ?? []).map((item, i) => (
            <SuggestionCard
              key={i}
              item={item}
              color={PRIORITY_CONFIG[activeTab].color}
            />
          ))
        )}
      </div>

      {totalCritical > 0 && activeTab !== "critical" && (
        <button
          onClick={() => setActiveTab("critical")}
          className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
        >
          {totalCritical} critical issue{totalCritical !== 1 ? "s" : ""} need attention
        </button>
      )}
    </div>
  );
}
