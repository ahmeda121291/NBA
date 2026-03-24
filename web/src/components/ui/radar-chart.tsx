"use client";

import { cn } from "@/lib/utils";

interface RadarChartProps {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
  }>;
  maxValue?: number;
  size?: number;
  className?: string;
}

export function RadarChart({
  labels,
  datasets,
  maxValue = 100,
  size = 280,
  className,
}: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) - 40;
  const angleStep = (2 * Math.PI) / labels.length;
  const levels = 4;

  const getPoint = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / maxValue) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = radius + 22;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("w-full max-w-xs mx-auto", className)}
    >
      {/* Grid rings */}
      {Array.from({ length: levels }).map((_, i) => {
        const r = (radius / levels) * (i + 1);
        const points = labels.map((_, j) => {
          const angle = angleStep * j - Math.PI / 2;
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(" ");

        return (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="rgba(26, 39, 68, 0.6)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {labels.map((_, i) => {
        const point = getPoint(maxValue, i);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(26, 39, 68, 0.4)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygons */}
      {datasets.map((dataset, di) => {
        const points = dataset.data.map((v, i) => {
          const p = getPoint(v, i);
          return `${p.x},${p.y}`;
        }).join(" ");

        return (
          <g key={di}>
            <polygon
              points={points}
              fill={dataset.color}
              fillOpacity="0.12"
              stroke={dataset.color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Data point dots */}
            {dataset.data.map((v, i) => {
              const p = getPoint(v, i);
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill={dataset.color} opacity="0.3" />
                  <circle cx={p.x} cy={p.y} r="3" fill={dataset.color} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Labels */}
      {labels.map((label, i) => {
        const p = getLabelPoint(i);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="500"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
