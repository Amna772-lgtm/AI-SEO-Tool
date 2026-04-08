"use client";
import type { CompetitorSuggestion } from "../../lib/api";

interface Props {
  suggestion: CompetitorSuggestion;
  checked: boolean;
  onToggle: (domain: string) => void;
}

export default function CompetitorSuggestionCard({ suggestion, checked, onToggle }: Props) {
  return (
    <label
      className={`relative flex min-w-[240px] max-w-[280px] cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors ${
        checked
          ? "border-[var(--accent)] bg-[var(--surface-elevated)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
      }`}
    >
      <input
        type="checkbox"
        className="absolute right-3 top-3 h-6 w-6 cursor-pointer accent-[var(--accent)]"
        checked={checked}
        onChange={() => onToggle(suggestion.domain)}
        aria-label={`Select ${suggestion.domain}`}
      />
      <div className="pr-8 font-mono text-sm font-semibold text-[var(--foreground)]">
        {suggestion.domain}
      </div>
      <div className="line-clamp-2 text-xs text-[var(--muted)]">
        {suggestion.reason}
      </div>
    </label>
  );
}
