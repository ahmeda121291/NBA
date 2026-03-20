import { cn } from "@/lib/utils";
import { getMetricColor, getMetricBgColor, getConfidenceLevel, formatTrend } from "@/lib/utils";
import { METRIC_LABELS } from "@/lib/constants";
import { ConfidenceIndicator } from "./confidence-indicator";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  metricKey: string;
  score: number;
  confidence: number;
  label?: string;
  trend?: number;
  description?: string;
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
        "rounded-xl border p-4 transition-colors hover:bg-surface-hover",
        getMetricBgColor(score)
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-text-secondary">
            {metricInfo?.short ?? metricKey.toUpperCase()}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={cn("font-stat text-3xl font-bold", getMetricColor(score))}>
              {Math.round(score)}
            </span>
            {trendInfo && trendInfo.direction !== "flat" && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
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

      {label && <p className="mt-1 text-xs font-medium text-text-secondary">{label}</p>}

      {description && (
        <p className="mt-2 text-xs text-text-muted leading-relaxed">{description}</p>
      )}

      <div className="mt-2">
        <p className="text-[10px] text-text-muted">
          {metricInfo?.name ?? metricKey}
        </p>
      </div>
    </div>
  );
}
