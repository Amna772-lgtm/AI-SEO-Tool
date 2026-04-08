"use client";
import type { RadarDimensions } from "../../lib/api";

interface SiteRadarData {
  id: string;
  domain: string;
  dimensions: RadarDimensions;
}

interface CompetitorRadarChartProps {
  sites: SiteRadarData[];          // primary site first, then competitors
}

const AXES: Array<{ key: keyof RadarDimensions; label: string }> = [
  { key: "nlp",             label: "NLP" },
  { key: "structured_data", label: "Schema" },
  { key: "eeat",            label: "E-E-A-T" },
  { key: "conversational",  label: "Content" },
  { key: "entity",          label: "Entity" },
  { key: "technical",       label: "Technical" },
];

const SERIES_COLORS = ["#4f46e5", "#2563eb", "#7c3aed", "#d97706", "#0891b2", "#db2777"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function CompetitorRadarChart({ sites }: CompetitorRadarChartProps) {
  const cx = 200, cy = 200, radius = 140;
  const levels = [0.25, 0.5, 0.75, 1.0];
  const axisCount = AXES.length;

  const axisPoints = AXES.map((_, i) => polarToCartesian(cx, cy, radius, (360 / axisCount) * i));

  const buildPolygon = (dims: RadarDimensions) =>
    AXES.map((axis, i) => {
      const score = Math.max(0, Math.min(100, dims[axis.key] || 0));
      const r = radius * (score / 100);
      const p = polarToCartesian(cx, cy, r, (360 / axisCount) * i);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");

  return (
    <div className="flex flex-col gap-4">
      <svg
        viewBox="0 0 400 430"
        width="100%"
        role="img"
        aria-label="GEO dimension comparison chart"
        className="max-w-[480px] mx-auto"
      >
        <title>GEO Dimension Comparison</title>
        {/* Grid rings */}
        {levels.map((lvl, i) => {
          const points = AXES.map((_, ax) => {
            const p = polarToCartesian(cx, cy, radius * lvl, (360 / axisCount) * ax);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(" ");
          return (
            <polygon
              key={`grid-${i}`}
              points={points}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={lvl === 1 ? "" : "2 2"}
            />
          );
        })}
        {/* Axis lines */}
        {axisPoints.map((p, i) => (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        {/* Axis labels */}
        {AXES.map((axis, i) => {
          const lp = polarToCartesian(cx, cy, radius + 18, (360 / axisCount) * i);
          return (
            <text
              key={`label-${i}`}
              x={lp.x}
              y={lp.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs"
              fill="var(--muted)"
              fontSize={11}
            >
              {axis.label}
            </text>
          );
        })}
        {/* Site polygons */}
        {sites.map((site, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          return (
            <polygon
              key={site.id}
              points={buildPolygon(site.dimensions)}
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeWidth={2}
            />
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        {sites.map((site, i) => (
          <div key={site.id} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            <span className="font-mono text-[var(--foreground)]">{site.domain}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
