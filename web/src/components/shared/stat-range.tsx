import { cn } from "@/lib/utils";
import type { StatRange as StatRangeType } from "@/lib/types";

interface StatRangeProps {
  range: StatRangeType;
  decimals?: number;
  className?: string;
}

export function StatRange({ range, decimals = 1, className }: StatRangeProps) {
  return (
    <span className={cn("font-stat", className)}>
      <span className="font-semibold">{range.center.toFixed(decimals)}</span>
      <span className="ml-1 text-text-muted text-xs">
        ({range.low.toFixed(decimals)}-{range.high.toFixed(decimals)})
      </span>
    </span>
  );
}
