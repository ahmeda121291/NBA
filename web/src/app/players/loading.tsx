import { Skeleton, MetricCardSkeleton } from "@/components/ui/skeleton-loader";

export default function PlayersLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-48" />
        <Skeleton variant="text" className="h-4 w-96" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" className="h-7 w-14 rounded-sm" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="text" className="h-7 w-16 rounded-sm" />
          <Skeleton variant="text" className="h-7 w-20 rounded-sm" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="glass-card rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-3 py-3 border-b border-white/[0.06]">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="text" className="h-3 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-3 py-3 border-b border-white/[0.03]">
            <Skeleton variant="text" className="h-4 w-32" />
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} variant="text" className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
