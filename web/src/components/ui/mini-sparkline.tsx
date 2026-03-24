"use client";

import { cn } from "@/lib/utils";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  showDots?: boolean;
  filled?: boolean;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color = "#3b82f6",
  className,
  showDots = false,
  filled = true,
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  const lastPoint = points[points.length - 1];
  const trending = data[data.length - 1] > data[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      {filled && (
        <path
          d={areaD}
          fill={`url(#sparkGrad-${color.replace("#", "")})`}
        />
      )}

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot with glow */}
      {showDots && (
        <>
          <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={color} opacity="0.3" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="2" fill={color} />
        </>
      )}
    </svg>
  );
}
