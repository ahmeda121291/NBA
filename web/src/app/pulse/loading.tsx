import { Skeleton, MetricCardSkeleton } from "@/components/ui/skeleton-loader";

export default function PulseLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-32" />
        <Skeleton variant="text" className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Skeleton variant="text" className="h-4 w-32" />
          <div className="glass-card rounded-lg p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="circle" className="h-8 w-8" />
                <div className="flex-1 space-y-1">
                  <Skeleton variant="text" className="h-4 w-32" />
                  <Skeleton variant="text" className="h-3 w-20" />
                </div>
                <Skeleton variant="text" className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton variant="text" className="h-4 w-32" />
          <div className="glass-card rounded-lg p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="circle" className="h-8 w-8" />
                <div className="flex-1 space-y-1">
                  <Skeleton variant="text" className="h-4 w-32" />
                  <Skeleton variant="text" className="h-3 w-20" />
                </div>
                <Skeleton variant="text" className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
