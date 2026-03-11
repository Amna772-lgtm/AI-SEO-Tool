"use client";

interface GeoScoreRingProps {
  score: number;
  grade: string;
  size?: number;
}

export function GeoScoreRing({ score, grade, size = 140 }: GeoScoreRingProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;

  const color =
    score >= 80 ? "#16a34a"
    : score >= 65 ? "#ca8a04"
    : score >= 50 ? "#ea580c"
    : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={10}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${gap}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        {/* Center text — counter-rotate so it reads correctly */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
          fill={color}
          fontSize={size * 0.24}
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {score}
        </text>
        <text
          x="50%"
          y="67%"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
          fill="var(--muted)"
          fontSize={size * 0.1}
          fontFamily="system-ui, sans-serif"
        >
          / 100
        </text>
      </svg>
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {grade}
      </div>
    </div>
  );
}
