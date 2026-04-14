"use client";

import { useState } from "react";
import type { GeoResponse, SiteTypeResult, PageRow } from "../../lib/api";
import { getGeoExportUrl } from "../../lib/api";
import { GeoScoreRing } from "./GeoScoreRing";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { SuggestionsList } from "./SuggestionsList";
import { SchemaPanel } from "./SchemaPanel";
import { EeatPanel } from "./EeatPanel";
import { ContentPanel } from "./ContentPanel";
import { NlpPanel } from "./NlpPanel";
import { ProbePanel } from "./ProbePanel";
import { PageScoresPanel } from "./PageScoresPanel";
import { EngineScores } from "./EngineScores";
import { EntityPanel } from "./EntityPanel";
import LockedFeature from "../LockedFeature";


const SITE_TYPE_ICONS: Record<string, string> = {
  ecommerce:      "🛒",
  blog:           "✍",
  news:           "📰",
  saas:           "⚙",
  local_business: "📍",
  portfolio:      "🎨",
  informational:  "📄",
  other:          "🌐",
};

function SiteTypeBadge({ siteType }: { siteType: SiteTypeResult }) {
  const icon = SITE_TYPE_ICONS[siteType.site_type] ?? "🌐";
  const label = siteType.site_type.replace("_", " ");
  const confidence = Math.round(siteType.confidence * 100);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-xs font-semibold capitalize text-[var(--foreground)]">{label}</p>
        <p className="text-[10px] text-[var(--muted)]">{confidence}% confidence</p>
      </div>
    </div>
  );
}

type DetailTab = "schema" | "content" | "eeat" | "nlp" | "visibility" | "entity" | "pages";

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "schema",     label: "Schema" },
  { key: "content",    label: "Content" },
  { key: "eeat",       label: "E-E-A-T" },
  { key: "nlp",        label: "NLP" },
  { key: "visibility", label: "Visibility" },
  { key: "entity",     label: "Entity" },
  { key: "pages",      label: "Pages" },
];

interface LoadingCardProps {
  label: string;
}
function LoadingCard({ label }: LoadingCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-6 text-sm text-[var(--muted)]">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      Running {label}…
    </div>
  );
}

interface Props {
  geo: GeoResponse;
  siteId: string;
  siteUrl: string;
  pages: PageRow[];
  isFree?: boolean;
  plan?: "free" | "pro" | "agency";
}

export function GeoTab({ geo, siteId, siteUrl, pages, isFree = false, plan }: Props) {
  const isAgency = plan === "agency";
  const [detailTab, setDetailTab] = useState<DetailTab>("schema");
const isLoading = geo.geo_status === "running" || geo.geo_status === "pending";

  const score = geo.score;
  const suggestions = geo.suggestions;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      {/* ── Row 1: Score hero + Suggestions ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr] xl:items-stretch">

        {/* Score card */}
        <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
          <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 rounded-t-xl">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">AI Citation Score</h2>
            <p className="text-[10px] text-[var(--muted)]">Readiness to be cited by AI engines</p>
          </div>
          <div className="p-4">
            {isLoading && !score ? (
              <LoadingCard label="citation scoring" />
            ) : score ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <GeoScoreRing score={score.overall_score} grade={score.grade} size={120} />
                  <div className="flex-1">
                    {geo.site_type && <SiteTypeBadge siteType={geo.site_type} />}
                    <p className="mt-2 text-[10px] text-[var(--muted)] leading-relaxed">
                      Weighted across 6 categories including structured data, E-E-A-T signals, and NLP readiness.
                    </p>
                  </div>
                </div>
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="mb-2 text-xs font-medium text-[var(--foreground)]">Score breakdown</p>
                  {isFree ? <LockedFeature title="Score Breakdown" /> : <ScoreBreakdown score={score} />}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Score not available.</p>
            )}
          </div>
        </div>

        {/* Right column: Recommendations + Engine Scores stacked */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Per-engine scores card */}
          {!isFree && (
            <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
              <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 rounded-t-xl">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Per-Engine Citation Scores</h2>
                <p className="text-[10px] text-[var(--muted)]">Each AI model weighs signals differently — target the engines most relevant to your audience</p>
              </div>
              <div className="p-4">
                {score ? (
                  <EngineScores score={score} inline />
                ) : (
                  <LoadingCard label="engine scores" />
                )}
              </div>
            </div>
          )}

          {/* Recommendations card */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm flex flex-col flex-1">
            <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Prioritized Recommendations</h2>
                <p className="text-[10px] text-[var(--muted)]">Actionable improvements sorted by impact</p>
              </div>
              <div className="flex gap-2">
                {isAgency ? (
                  <>
                    <a
                      href={getGeoExportUrl(siteId, "csv")}
                      download
                      className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
                    >
                      ↓ CSV
                    </a>
                    <a
                      href={getGeoExportUrl(siteId, "pdf")}
                      download
                      className="rounded-md border border-[var(--accent)] bg-[var(--accent-light)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                    >
                      ↓ PDF
                    </a>
                  </>
                ) : (
                  <>
                    <button disabled title="Available on Agency plan" className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] opacity-50 cursor-not-allowed">
                      ↓ CSV
                    </button>
                    <button disabled title="Available on Agency plan" className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] opacity-50 cursor-not-allowed">
                      ↓ PDF
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isFree ? (
                <LockedFeature title="Prioritized Recommendations" />
              ) : isLoading && !suggestions ? (
                <LoadingCard label="suggestions" />
              ) : suggestions ? (
                <SuggestionsList suggestions={suggestions} />
              ) : (
                <p className="text-sm text-[var(--muted)]">Suggestions not available.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Row 2: Detail tabs (Schema / Content / E-E-A-T / NLP) ────────── */}
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 rounded-t-xl">
          {DETAIL_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDetailTab(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                detailTab === key
                  ? "bg-[var(--accent-light)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Status indicator */}
          {isLoading && (
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <div className="h-2 w-2 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
              Analysis running…
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {isFree ? (
            <LockedFeature title={(DETAIL_TABS.find(t => t.key === detailTab)?.label ?? "GEO") + " Analysis"} />
          ) : (
            <>
              {detailTab === "schema" && (
                geo.schema ? <SchemaPanel schema={geo.schema} /> : <LoadingCard label="schema analysis" />
              )}
              {detailTab === "content" && (
                geo.content ? <ContentPanel content={geo.content} /> : <LoadingCard label="content analysis" />
              )}
              {detailTab === "eeat" && (
                geo.eeat ? <EeatPanel eeat={geo.eeat} /> : <LoadingCard label="E-E-A-T analysis" />
              )}
              {detailTab === "nlp" && (
                geo.nlp ? <NlpPanel nlp={geo.nlp} /> : <LoadingCard label="NLP analysis" />
              )}
              {detailTab === "visibility" && (
                geo.probe ? <ProbePanel probe={geo.probe} /> : <LoadingCard label="AI visibility probe" />
              )}
              {detailTab === "entity" && (
                geo.entity ? <EntityPanel entity={geo.entity} /> : <LoadingCard label="entity analysis" />
              )}
              {detailTab === "pages" && (
                geo.page_scores ? <PageScoresPanel pageScores={geo.page_scores} /> : <LoadingCard label="per-page scoring" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
