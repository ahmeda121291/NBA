import { cn } from "@/lib/utils";
import { getMetricColor, getConfidenceLevel } from "@/lib/utils";
import { METRIC_LABELS } from "@/lib/constants";
import { ConfidenceIndicator } from "./confidence-indicator";

interface MetricBadgeProps {
  metricKey: string;
  score: number;
  confidence: number;
  label?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

function getBadgeBg(score: number): string {
  if (score >= 80) return "metric-tier-elite";
  if (score >= 65) return "metric-tier-great";
  if (score >= 50) return "metric-tier-good";
  if (score >= 35) return "metric-tier-average";
  return "metric-tier-poor";
}

export function MetricBadge({
  metricKey,
  score,
  confidence,
  label,
  showLabel = true,
  size = "md",
}: MetricBadgeProps) {
  const metricInfo = METRIC_LABELS[metricKey];
  const displayName = metricInfo?.short ?? metricKey.toUpperCase();

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5",
        getBadgeBg(score),
        size === "sm" && "p-2.5",
        size === "md" && "p-3.5",
        size === "lg" && "p-5"
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        {displayName}
      </span>
      <span
        className={cn(
          "font-stat font-bold mt-0.5",
          getMetricColor(score),
          size === "sm" && "text-xl",
          size === "md" && "text-2xl",
          size === "lg" && "text-4xl"
        )}
      >
        {Math.round(score)}
      </span>
      {showLabel && label && (
        <span className="mt-1.5 text-[10px] font-medium text-text-secondary">{label}</span>
      )}
      <div className="mt-1.5">
        <ConfidenceIndicator level={getConfidenceLevel(confidence)} size="sm" />
      </div>
    </div>
  );
}
