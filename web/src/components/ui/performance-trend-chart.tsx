"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  ReferenceLine,
  XAxis,
} from "recharts";

interface TrendDataPoint {
  game: number;
  label: string;
  pts: number;
  reb: number;
  ast: number;
}

interface PerformanceTrendChartProps {
  data: TrendDataPoint[];
  avgPts: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0d1117]/95 px-3 py-2 shadow-lg backdrop-blur-md">
      <p className="text-[10px] text-text-muted/60 mb-1">{d.label}</p>
      <div className="flex items-center gap-3">
        <span className="font-stat text-sm font-bold text-indigo-400">{d.pts} PTS</span>
        <span className="font-stat text-[11px] text-text-muted">{d.reb} REB</span>
        <span className="font-stat text-[11px] text-text-muted">{d.ast} AST</span>
      </div>
    </div>
  );
}

export function PerformanceTrendChart({ data, avgPts }: PerformanceTrendChartProps) {
  if (data.length < 2) return null;

  const allPts = data.map((d) => d.pts);
  const minPts = Math.min(...allPts, avgPts);
  const maxPts = Math.max(...allPts, avgPts);
  const yPad = Math.max(5, Math.round((maxPts - minPts) * 0.15));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <YAxis
          domain={[Math.floor(minPts - yPad), Math.ceil(maxPts + yPad)]}
          hide
        />
        <XAxis dataKey="game" hide />
        <ReferenceLine
          y={avgPts}
          stroke="rgba(129,140,248,0.25)"
          strokeDasharray="4 4"
          label={{
            value: `${avgPts.toFixed(1)} PPG avg`,
            position: "right",
            fill: "rgba(129,140,248,0.5)",
            fontSize: 10,
            fontFamily: "var(--font-stat)",
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Line
          type="monotone"
          dataKey="pts"
          stroke="#818cf8"
          strokeWidth={2}
          dot={{ r: 3, fill: "#818cf8", stroke: "#0d1117", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "#818cf8", stroke: "#a5b4fc", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
