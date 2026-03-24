import { cn } from "@/lib/utils";
import type { StatRange as StatRangeType } from "@/lib/types";

interface StatRangeProps {
  range: StatRangeType;
  decimals?: number;
  className?: string;
}

export function StatRange({ range, decimals = 1, className }: StatRangeProps) {
  return (
    <span className={cn("font-stat inline-flex items-baseline gap-1", className)}>
      <span className="font-bold text-text-primary">{range.center.toFixed(decimals)}</span>
      <span className="text-text-muted/60 text-[10px]">
        ({range.low.toFixed(decimals)}-{range.high.toFixed(decimals)})
      </span>
    </span>
  );
}
