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
  high: "bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.5)]",
  moderate: "bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.5)]",
  low: "bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]",
  very_low: "bg-rose-400 shadow-[0_0_4px_rgba(244,63,94,0.5)]",
};

const inactiveColor = "bg-white/[0.06]";

export function ConfidenceIndicator({ level, size = "md" }: ConfidenceIndicatorProps) {
  const active = dotCount[level];
  const total = 4;

  return (
    <div className="flex items-center gap-1" title={`${level} confidence`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            size === "sm" ? "h-1 w-1" : "h-1.5 w-1.5",
            i < active ? dotColors[level] : inactiveColor
          )}
        />
      ))}
    </div>
  );
}
