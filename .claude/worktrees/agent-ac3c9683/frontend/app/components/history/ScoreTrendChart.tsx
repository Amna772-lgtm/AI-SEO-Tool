"use client";

import { useState } from "react";

export interface TrendDataPoint {
  date: string;
  overall: number;
  structured_data?: number;
  eeat?: number;
  conversational?: number;
  technical?: number;
  nlp?: number;
  speed?: number;
}

interface Props {
  data: TrendDataPoint[];
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 16, bottom: 48, left: 40 };

const SERIES = [
  { key: "overall",         label: "Overall",       color: "#4f46e5", strokeWidth: 2.5 },
  { key: "structured_data", label: "Schema",         color: "#2563eb", strokeWidth: 1.5 },
  { key: "eeat",            label: "E-E-A-T",        color: "#7c3aed", strokeWidth: 1.5 },
  { key: "conversational",  label: "Content",        color: "#d97706", strokeWidth: 1.5 },
  { key: "technical",       label: "Technical",      color: "#0891b2", strokeWidth: 1.5 },
  { key: "nlp",             label: "NLP",            color: "#db2777", strokeWidth: 1.5 },
  { key: "speed",           label: "Speed",          color: "#16a34a", strokeWidth: 1.5 },
] as const;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function ScoreTrendChart({ data, width = 700, height = 280 }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(
    new Set(["structured_data", "eeat", "conversational", "technical", "nlp", "speed"])
  );

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  if (data.length < 2) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
        Run at least 2 analyses for this domain to see trends.
      </p>
    );
  }

  const xScale = (i: number) =>
    data.length < 2 ? plotW / 2 : (i / (data.length - 1)) * plotW;

  const yScale = (score: number) => plotH - (score / 100) * plotH;

  function makePath(key: string): string {
    const pts = data
      .map((d, i) => {
        const v = (d as Record<string, number | undefined>)[key];
        return v != null ? [xScale(i), yScale(v)] as [number, number] : null;
      })
      .filter((p): p is [number, number] => p !== null);
    if (pts.length === 0) return "";
    return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  }

  const gridYs = [0, 25, 50, 75, 100];

  // Show every x label if ≤ 8 points, otherwise thin out
  const labelStep = data.length <= 8 ? 1 : Math.ceil(data.length / 8);

  function toggleSeries(key: string) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: "visible" }}
        aria-label="Score trend chart"
      >
        <g transform={`translate(${PADDING.left},${PADDING.top})`}>
          {/* Y-axis grid lines + labels */}
          {gridYs.map(y => (
            <g key={y}>
              <line
                x1={0} y1={yScale(y)} x2={plotW} y2={yScale(y)}
                stroke="var(--border)" strokeWidth={1} strokeDasharray={y === 0 ? "0" : "4 3"}
              />
              <text
                x={-6} y={yScale(y) + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted)"
              >
                {y}
              </text>
            </g>
          ))}

          {/* X-axis date labels */}
          {data.map((d, i) => {
            if (i % labelStep !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={i}
                x={xScale(i)}
                y={plotH + 18}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {formatDate(d.date)}
              </text>
            );
          })}

          {/* Series lines + dots */}
          {SERIES.map(({ key, color, strokeWidth }) => {
            if (hidden.has(key)) return null;
            const path = makePath(key);
            if (!path) return null;
            return (
              <g key={key}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {data.map((d, i) => {
                  const v = (d as Record<string, number | undefined>)[key];
                  if (v == null) return null;
                  return (
                    <circle key={i} cx={xScale(i)} cy={yScale(v)} r={3} fill={color}>
                      <title>{`${SERIES.find(s => s.key === key)?.label}: ${v} (${formatDate(d.date)})`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {SERIES.map(({ key, label, color }) => {
          const isHidden = hidden.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleSeries(key)}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                opacity: isHidden ? 0.4 : 1,
                borderColor: isHidden ? "var(--border)" : color,
                backgroundColor: isHidden ? "transparent" : `${color}14`,
                color: isHidden ? "var(--muted)" : color,
              }}
              title={isHidden ? `Show ${label}` : `Hide ${label}`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
