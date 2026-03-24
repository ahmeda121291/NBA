import { Skeleton } from "@/components/ui/skeleton-loader";

export default function GameDetailLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back nav + title */}
      <div>
        <Skeleton variant="text" className="h-3 w-24 mb-3" />
        <Skeleton variant="text" className="h-3 w-32 mb-1" />
        <Skeleton variant="text" className="h-8 w-56" />
      </div>

      {/* Score hero card */}
      <div className="glass-card rounded-2xl p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Skeleton variant="text" className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <Skeleton variant="circle" className="h-20 w-20 rounded-xl" />
            <Skeleton variant="text" className="h-5 w-32" />
            <Skeleton variant="text" className="h-3 w-16" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton variant="text" className="h-12 w-36" />
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <Skeleton variant="circle" className="h-20 w-20 rounded-xl" />
            <Skeleton variant="text" className="h-5 w-32" />
            <Skeleton variant="text" className="h-3 w-16" />
          </div>
        </div>
      </div>

      {/* Projection + Matchup cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <Skeleton variant="text" className="h-4 w-40" />
          <Skeleton variant="rect" className="h-2 rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="rect" className="h-16 rounded" />
            <Skeleton variant="rect" className="h-16 rounded" />
          </div>
          <Skeleton variant="text" className="h-3 w-48" />
        </div>
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <Skeleton variant="text" className="h-4 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="text" className="h-4 w-10" />
              <Skeleton variant="rect" className="h-2 flex-1 rounded-full" />
              <Skeleton variant="text" className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Box score table skeleton */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <Skeleton variant="text" className="h-4 w-24" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-8" />
        ))}
      </div>
    </div>
  );
}
