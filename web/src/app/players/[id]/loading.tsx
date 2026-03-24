import { Skeleton } from "@/components/ui/skeleton-loader";

export default function PlayerDetailLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back nav + header */}
      <div>
        <Skeleton variant="text" className="h-3 w-28 mb-4" />
        <div className="flex items-start gap-5">
          <Skeleton variant="rect" className="h-28 w-28 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-8 w-56" />
            <Skeleton variant="text" className="h-4 w-40" />
            <div className="flex items-center gap-4 mt-3">
              <Skeleton variant="text" className="h-6 w-16" />
              <Skeleton variant="text" className="h-4 w-12" />
              <Skeleton variant="text" className="h-4 w-12" />
              <Skeleton variant="text" className="h-4 w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Radar + metric cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-6 lg:col-span-1 flex flex-col items-center justify-center">
          <Skeleton variant="text" className="h-3 w-28 mb-3" />
          <Skeleton variant="circle" className="h-[200px] w-[200px] rounded-full" />
          <Skeleton variant="text" className="h-6 w-12 mt-3" />
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-lg p-4 space-y-2" style={{ animationDelay: `${i * 80}ms` }}>
              <Skeleton variant="text" className="h-3 w-12" />
              <Skeleton variant="text" className="h-7 w-14" />
              <Skeleton variant="text" className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Season averages */}
      <div className="glass-card rounded-2xl p-6">
        <Skeleton variant="text" className="h-3 w-28 mb-4" />
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton variant="text" className="h-3 w-8 mx-auto" />
              <Skeleton variant="text" className="h-5 w-10 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Game log table skeleton */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <Skeleton variant="text" className="h-3 w-28" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-8" />
        ))}
      </div>
    </div>
  );
}
