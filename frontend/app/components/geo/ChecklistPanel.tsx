"use client";

import { useState, useEffect } from "react";
import type { GeoResponse } from "../../lib/api";

interface ChecklistItem {
  id: string;
  category: "schema" | "eeat" | "content" | "nlp";
  title: string;
  passed: boolean;
  detail?: string;
}

const CATEGORY_CONFIG = {
  schema:  { label: "Schema",  color: "#166534", bg: "#dcfce7", border: "#86efac" },
  eeat:    { label: "E-E-A-T", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  content: { label: "Content", color: "#7e22ce", bg: "#f3e8ff", border: "#d8b4fe" },
  nlp:     { label: "NLP",     color: "#c2410c", bg: "#ffedd5", border: "#fdba74" },
} as const;

function buildItems(geo: GeoResponse): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // ── Schema ──────────────────────────────────────────────────────────────────
  if (geo.schema) {
    const s = geo.schema;
    items.push({ id: "s_jsonld",    category: "schema", title: "Has JSON-LD structured data", passed: s.has_json_ld });
    items.push({ id: "s_coverage",  category: "schema", title: "Schema coverage ≥ 80%",        passed: s.coverage_percent >= 80,
      detail: `Currently ${s.coverage_percent}% (${s.pages_with_schema}/${s.pages_analyzed} pages)` });
    items.push({ id: "s_microdata", category: "schema", title: "Has Microdata or RDFa markup",  passed: s.has_microdata || s.has_rdfa });

    s.missing_recommended.forEach((type, i) => {
      items.push({ id: `s_miss_${i}`, category: "schema", title: `Add ${type} schema`, passed: false,
        detail: `Recommended for this site type but not found` });
    });

    if (s.completeness_issues.length > 0) {
      items.push({ id: "s_complete", category: "schema", title: "Fix schema completeness issues", passed: false,
        detail: `${s.completeness_issues.length} schema(s) have missing required fields` });
    }

    if ((s.semantic_issues ?? []).length > 0) {
      items.push({ id: "s_semantic", category: "schema", title: "Fix schema semantic mismatches", passed: false,
        detail: `${s.semantic_issues!.length} field value(s) don't match actual page content` });
    }
  }

  // ── E-E-A-T ──────────────────────────────────────────────────────────────────
  if (geo.eeat) {
    const e = geo.eeat;
    items.push({ id: "e_about",   category: "eeat", title: "Has About page",       passed: e.has_about_page });
    items.push({ id: "e_contact", category: "eeat", title: "Has Contact page",      passed: e.has_contact_page });
    items.push({ id: "e_privacy", category: "eeat", title: "Has Privacy Policy",    passed: e.has_privacy_policy });
    items.push({ id: "e_faq",     category: "eeat", title: "Has FAQ page",          passed: e.has_faq_page });
    items.push({ id: "e_author",  category: "eeat", title: "Author credentials found", passed: e.author_credentials_found });
    items.push({ id: "e_cite",    category: "eeat", title: "Citations / references found", passed: e.citations_found });
    items.push({ id: "e_cases",   category: "eeat", title: "Has case studies",      passed: e.has_case_studies });
    items.push({ id: "e_fresh",   category: "eeat", title: "Content freshness signals present", passed: e.content_freshness });
  }

  // ── Content ──────────────────────────────────────────────────────────────────
  if (geo.content) {
    const c = geo.content;
    items.push({ id: "c_words",  category: "content", title: "Avg word count ≥ 300", passed: c.avg_word_count >= 300,
      detail: `Currently ${c.avg_word_count} words/page` });
    items.push({ id: "c_thin",   category: "content", title: "No thin content pages", passed: c.thin_content_pages === 0,
      detail: c.thin_content_pages > 0 ? `${c.thin_content_pages} thin pages detected` : undefined });
    items.push({ id: "c_faq",    category: "content", title: "FAQ content present", passed: c.pages_with_faq > 0,
      detail: `${c.pages_with_faq} of ${c.pages_analyzed} pages have FAQs` });
    items.push({ id: "c_conv",   category: "content", title: "Conversational tone score ≥ 30%", passed: c.conversational_tone_score >= 0.3,
      detail: `Currently ${Math.round(c.conversational_tone_score * 100)}%` });
    items.push({ id: "c_read",   category: "content", title: "Reading level ≤ High School", passed: ["Elementary", "Middle School", "High School"].includes(c.reading_level),
      detail: `Currently: ${c.reading_level}` });
  }

  // ── NLP ──────────────────────────────────────────────────────────────────────
  if (geo.nlp) {
    const n = geo.nlp;
    items.push({ id: "n_ready",  category: "nlp", title: "AI snippet readiness: High or Medium", passed: n.ai_snippet_readiness !== "Low" && n.ai_snippet_readiness !== "Unknown",
      detail: `Currently: ${n.ai_snippet_readiness}` });
    items.push({ id: "n_qdense", category: "nlp", title: "Question density > 0.3 / 100 words", passed: (n.question_density ?? 0) > 0.3,
      detail: `Currently: ${n.question_density}` });
    items.push({ id: "n_answer", category: "nlp", title: "Answer blocks detected", passed: (n.answer_blocks_detected ?? 0) > 0 });
    if (n.synonym_richness) {
      items.push({ id: "n_syn", category: "nlp", title: "High synonym richness", passed: n.synonym_richness === "High",
        detail: `Currently: ${n.synonym_richness}` });
    }
  }

  return items;
}

type FilterMode = "all" | "todo" | "done";

interface Props {
  geo: GeoResponse;
  siteId: string;
}

export function ChecklistPanel({ geo, siteId }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<FilterMode>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`geo-checklist-${siteId}`);
      if (stored) setChecked(JSON.parse(stored));
    } catch {}
  }, [siteId]);

  const toggle = (id: string, currentPassed: boolean) => {
    const next = { ...checked };
    // If already passed, toggling marks it as "needs review"; if failed, marks as "fixed"
    next[id] = !(checked[id] ?? currentPassed);
    setChecked(next);
    try { localStorage.setItem(`geo-checklist-${siteId}`, JSON.stringify(next)); } catch {}
  };

  const allItems = buildItems(geo);
  const isComplete = (item: ChecklistItem) => checked[item.id] ?? item.passed;

  const categories = ["all", "schema", "eeat", "content", "nlp"] as const;
  const visibleItems = allItems
    .filter(item => activeCategory === "all" || item.category === activeCategory)
    .filter(item => {
      if (filter === "todo") return !isComplete(item);
      if (filter === "done") return isComplete(item);
      return true;
    });

  const totalDone = allItems.filter(isComplete).length;
  const total = allItems.length;
  const pct = total > 0 ? Math.round((totalDone / total) * 100) : 0;
  const pctColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#ca8a04" : "#dc2626";

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">Overall progress</span>
          <span className="font-semibold tabular-nums" style={{ color: pctColor }}>
            {totalDone} / {total} resolved
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: pctColor }}
          />
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <div className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5">
          {(["all", "todo", "done"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded px-2.5 py-1 text-[10px] font-medium capitalize transition-colors"
              style={filter === f
                ? { backgroundColor: "var(--accent-light)", color: "var(--accent)" }
                : { color: "var(--muted)" }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => {
            const cfg = cat === "all" ? null : CATEGORY_CONFIG[cat];
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize border transition-colors"
                style={active && cfg
                  ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }
                  : active
                  ? { backgroundColor: "var(--surface-elevated)", color: "var(--foreground)", borderColor: "var(--accent)" }
                  : { backgroundColor: "transparent", color: "var(--muted)", borderColor: "var(--border)" }}
              >
                {cat === "all" ? "All" : CATEGORY_CONFIG[cat].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklist items */}
      {visibleItems.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--muted)]">
          {filter === "todo" ? "All items resolved — great job!" : "No items in this view."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const done = isComplete(item);
            const cfg = CATEGORY_CONFIG[item.category];
            return (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition-colors hover:bg-[var(--surface-elevated)]"
                style={{ borderColor: done ? "#bbf7d0" : "var(--border)", backgroundColor: done ? "#f0fdf4" : undefined }}
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(item.id, item.passed)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-green-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs leading-snug ${done ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}
                    >
                      {item.title}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  {item.detail && (
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">{item.detail}</p>
                  )}
                </div>
                {item.passed && !checked[item.id] && (
                  <span className="mt-0.5 shrink-0 text-[10px] font-medium text-green-600">Auto ✓</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
