import { cn } from "@/lib/utils";

interface CourtSvgProps {
  className?: string;
  showLabels?: boolean;
  highlights?: Array<{
    x: number;
    y: number;
    value: number;
    label?: string;
    color?: string;
  }>;
}

export function CourtSvg({ className, highlights = [] }: CourtSvgProps) {
  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 500 470"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Court background */}
        <rect
          x="0"
          y="0"
          width="500"
          height="470"
          rx="8"
          fill="rgba(12, 18, 32, 0.6)"
        />

        {/* Court floor subtle gradient */}
        <defs>
          <radialGradient id="courtGlow" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="rgba(249, 115, 22, 0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(194, 136, 64, 0.3)" />
            <stop offset="100%" stopColor="rgba(194, 136, 64, 0.15)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="500" height="470" rx="8" fill="url(#courtGlow)" />

        {/* Baseline */}
        <line x1="30" y1="450" x2="470" y2="450" stroke="url(#lineGrad)" strokeWidth="2" />

        {/* Sidelines */}
        <line x1="30" y1="0" x2="30" y2="450" stroke="url(#lineGrad)" strokeWidth="2" />
        <line x1="470" y1="0" x2="470" y2="450" stroke="url(#lineGrad)" strokeWidth="2" />

        {/* Free throw lane */}
        <rect x="170" y="310" width="160" height="140" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" />

        {/* Free throw circle */}
        <circle cx="250" cy="310" r="60" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" />

        {/* Three-point arc */}
        <path
          d="M 70 450 L 70 340 Q 70 120 250 100 Q 430 120 430 340 L 430 450"
          stroke="url(#lineGrad)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Restricted area */}
        <path
          d="M 210 450 Q 210 380 250 370 Q 290 380 290 450"
          stroke="url(#lineGrad)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Basket */}
        <circle cx="250" cy="425" r="8" stroke="rgba(249, 115, 22, 0.5)" strokeWidth="2" fill="none" />
        <rect x="235" y="440" width="30" height="3" fill="rgba(249, 115, 22, 0.3)" rx="1" />

        {/* Backboard */}
        <line x1="220" y1="440" x2="280" y2="440" stroke="rgba(194, 136, 64, 0.4)" strokeWidth="2" />

        {/* Highlight zones */}
        {highlights.map((h, i) => (
          <g key={i}>
            {/* Glow */}
            <circle
              cx={h.x}
              cy={h.y}
              r="28"
              fill={h.color || "rgba(59, 130, 246, 0.15)"}
              className="animate-pulse-glow"
            />
            {/* Point */}
            <circle
              cx={h.x}
              cy={h.y}
              r="6"
              fill={h.color || "rgba(59, 130, 246, 0.8)"}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            {/* Value label */}
            <text
              x={h.x}
              y={h.y - 16}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              {h.value}
            </text>
            {h.label && (
              <text
                x={h.x}
                y={h.y + 22}
                textAnchor="middle"
                fill="rgba(148, 163, 184, 0.8)"
                fontSize="9"
                fontFamily="Inter, sans-serif"
              >
                {h.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
