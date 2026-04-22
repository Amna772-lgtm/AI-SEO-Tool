"use client";

import { useState, useRef } from "react";

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

function formatTooltipDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  } catch {
    return iso.slice(0, 10);
  }
}

export function ScoreTrendChart({ data, width = 700, height = 280 }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(
    new Set(["structured_data", "eeat", "conversational", "technical", "nlp", "speed"])
  );
  const [tooltip, setTooltip] = useState<{ idx: number; px: number; py: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
        const v = (d as unknown as Record<string, number | undefined>)[key];
        return v != null ? [xScale(i), yScale(v)] as [number, number] : null;
      })
      .filter((p): p is [number, number] => p !== null);
    if (pts.length === 0) return "";
    return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  }

  function makeAreaPath(key: string): string {
    const pts = data
      .map((d, i) => {
        const v = (d as unknown as Record<string, number | undefined>)[key];
        return v != null ? [xScale(i), yScale(v)] as [number, number] : null;
      })
      .filter((p): p is [number, number] => p !== null);
    if (pts.length < 2) return "";
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    return `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${plotH.toFixed(1)} L ${pts[0][0].toFixed(1)} ${plotH.toFixed(1)} Z`;
  }

  const gridYs = [0, 25, 50, 75, 100];
  const labelStep = data.length <= 8 ? 1 : Math.ceil(data.length / 8);

  function toggleSeries(key: string) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handlePlotMouseMove(e: React.MouseEvent<SVGRectElement>) {
    const rectEl = e.currentTarget.getBoundingClientRect();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    // Fraction across the plot area → nearest data index
    const fraction = Math.max(0, Math.min(1, (e.clientX - rectEl.left) / rectEl.width));
    const idx = Math.round(fraction * (data.length - 1));
    // Tooltip position relative to wrapper
    const wrapperRect = wrapper.getBoundingClientRect();
    const px = e.clientX - wrapperRect.left;
    const py = e.clientY - wrapperRect.top;
    setTooltip({ idx, px, py });
  }

  function handlePlotMouseLeave() {
    setTooltip(null);
  }

  const visibleSeries = SERIES.filter(s => !hidden.has(s.key));
  const tooltipData = tooltip != null ? data[tooltip.idx] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Chart wrapper — position:relative anchors the tooltip */}
      <div ref={wrapperRef} style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ overflow: "visible", display: "block" }}
          aria-label="Score trend chart"
        >
          <g transform={`translate(${PADDING.left},${PADDING.top})`}>
            {/* Y-axis grid lines + labels */}
            {gridYs.map(y => (
              <g key={y}>
                <line
                  x1={0} y1={yScale(y)} x2={plotW} y2={yScale(y)}
                  stroke="var(--border)" strokeWidth={1} strokeDasharray={y === 0 ? "0" : "5 4"}
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

            {/* Hover hairline */}
            {tooltip != null && (
              <line
                x1={xScale(tooltip.idx)} y1={0}
                x2={xScale(tooltip.idx)} y2={plotH}
                stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3"
                pointerEvents="none"
              />
            )}

            {/* Area fills — rendered behind lines */}
            {SERIES.map(({ key, color }) => {
              if (hidden.has(key)) return null;
              const areaPath = makeAreaPath(key);
              if (!areaPath) return null;
              return (
                <path
                  key={`area-${key}`}
                  d={areaPath}
                  fill={color}
                  fillOpacity={key === "overall" ? 0.10 : 0.06}
                  stroke="none"
                />
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
                    const v = (d as unknown as Record<string, number | undefined>)[key];
                    if (v == null) return null;
                    const isHovered = tooltip?.idx === i;
                    return (
                      <circle
                        key={i}
                        cx={xScale(i)} cy={yScale(v)}
                        r={isHovered ? 5.5 : 4}
                        fill={color} stroke="white"
                        strokeWidth={isHovered ? 2 : 1.5}
                        style={{ transition: "r 80ms, stroke-width 80ms" }}
                      />
                    );
                  })}
                </g>
              );
            })}
            {/* Transparent hit area — covers only the plot region */}
            <rect
              x={0} y={0} width={plotW} height={plotH}
              fill="transparent"
              onMouseMove={handlePlotMouseMove}
              onMouseLeave={handlePlotMouseLeave}
            />
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip != null && tooltipData != null && visibleSeries.length > 0 && (() => {
          const rows = visibleSeries
            .map(s => ({ ...s, value: (tooltipData as unknown as Record<string, number | undefined>)[s.key] }))
            .filter(s => s.value != null);
          if (rows.length === 0) return null;

          // Flip left if near right edge
          const flipLeft = tooltip.px > (wrapperRef.current?.offsetWidth ?? 0) * 0.65;

          return (
            <div
              style={{
                position: "absolute",
                top: Math.max(0, tooltip.py - 16),
                left: flipLeft ? tooltip.px - 148 : tooltip.px + 12,
                pointerEvents: "none",
                zIndex: 20,
                minWidth: 140,
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxShadow: "0 4px 16px rgba(0,0,0,.10)",
                padding: "8px 12px",
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>
                {formatTooltipDate(tooltipData.date)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {rows.map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color, minWidth: 24, textAlign: "right" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

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
