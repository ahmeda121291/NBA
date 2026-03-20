import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/lib/types";

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  size?: "sm" | "md";
}

const dotCount: Record<ConfidenceLevel, number> = {
  high: 4,
  moderate: 3,
  low: 2,
  very_low: 1,
};

const dotColors: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-400",
  moderate: "bg-blue-400",
  low: "bg-amber-400",
  very_low: "bg-rose-400",
};

export function ConfidenceIndicator({ level, size = "md" }: ConfidenceIndicatorProps) {
  const active = dotCount[level];
  const total = 4;

  return (
    <div className="flex items-center gap-0.5" title={`${level} confidence`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full",
            size === "sm" ? "h-1 w-1" : "h-1.5 w-1.5",
            i < active ? dotColors[level] : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
