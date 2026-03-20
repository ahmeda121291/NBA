import { cn } from "@/lib/utils";
import { getMetricColor, getMetricBgColor, getConfidenceLevel } from "@/lib/utils";
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
        "flex flex-col items-center rounded-xl border p-3",
        getMetricBgColor(score),
        size === "sm" && "p-2",
        size === "lg" && "p-4"
      )}
    >
      <span className="text-xs font-medium text-text-secondary">{displayName}</span>
      <span
        className={cn(
          "font-stat text-2xl font-bold",
          getMetricColor(score),
          size === "sm" && "text-lg",
          size === "lg" && "text-3xl"
        )}
      >
        {Math.round(score)}
      </span>
      {showLabel && label && (
        <span className="mt-1 text-xs text-text-muted">{label}</span>
      )}
      <ConfidenceIndicator level={getConfidenceLevel(confidence)} size="sm" />
    </div>
  );
}
