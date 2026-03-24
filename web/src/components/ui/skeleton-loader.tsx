import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "rect" | "card";
}

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton",
        variant === "text" && "h-4 w-full",
        variant === "circle" && "h-10 w-10 rounded-full",
        variant === "rect" && "h-20 w-full",
        variant === "card" && "h-40 w-full rounded-2xl",
        className
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <Skeleton variant="text" className="h-3 w-12" />
      <Skeleton variant="text" className="h-10 w-20" />
      <Skeleton variant="text" className="h-3 w-24" />
    </div>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex justify-between">
        <Skeleton variant="text" className="h-3 w-20" />
        <Skeleton variant="text" className="h-3 w-24" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton variant="text" className="h-8 w-16" />
        <Skeleton variant="text" className="h-4 w-8" />
        <Skeleton variant="text" className="h-8 w-16" />
      </div>
      <Skeleton variant="rect" className="h-2 rounded-full" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" className="h-4" />
        </td>
      ))}
    </tr>
  );
}
