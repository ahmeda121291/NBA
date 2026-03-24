import { cn } from "@/lib/utils";
import { getMetricColor, getConfidenceLevel, formatTrend } from "@/lib/utils";
import { METRIC_LABELS } from "@/lib/constants";
import { ConfidenceIndicator } from "./confidence-indicator";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  metricKey: string;
  score: number;
  confidence: number;
  label?: string;
  trend?: number;
  description?: string;
}

function getGlowClass(score: number): string {
  if (score >= 80) return "glow-emerald metric-tier-elite";
  if (score >= 65) return "glow-blue metric-tier-great";
  if (score >= 50) return "glow-amber metric-tier-good";
  if (score >= 35) return "glow-orange metric-tier-average";
  return "glow-rose metric-tier-poor";
}

export function MetricCard({
  metricKey,
  score,
  confidence,
  label,
  trend,
  description,
}: MetricCardProps) {
  const metricInfo = METRIC_LABELS[metricKey];
  const trendInfo = trend !== undefined ? formatTrend(trend) : null;

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden",
        getGlowClass(score)
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {metricInfo?.short ?? metricKey.toUpperCase()}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn("font-stat text-3xl font-bold tracking-tight", getMetricColor(score))}>
                {Math.round(score)}
              </span>
              {trendInfo && trendInfo.direction !== "flat" && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[11px] font-semibold",
                    trendInfo.direction === "up" ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {trendInfo.direction === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trendInfo.text}
                </span>
              )}
            </div>
          </div>
          <ConfidenceIndicator level={getConfidenceLevel(confidence)} />
        </div>

        {label && (
          <p className="mt-2 text-[11px] font-medium text-text-secondary">{label}</p>
        )}

        {description && (
          <p className="mt-2 text-[11px] text-text-muted leading-relaxed">{description}</p>
        )}

        <div className="mt-3 pt-2 border-t border-white/[0.04]">
          <p className="text-[10px] text-text-muted/60 truncate">
            {metricInfo?.name ?? metricKey}
          </p>
        </div>
      </div>
    </div>
  );
}
