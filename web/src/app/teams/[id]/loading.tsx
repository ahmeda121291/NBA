import { Skeleton } from "@/components/ui/skeleton-loader";

export default function TeamDetailLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back nav + header */}
      <div>
        <Skeleton variant="text" className="h-3 w-24 mb-4" />
        <div className="flex items-center gap-5">
          <Skeleton variant="rect" className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-8 w-52" />
            <Skeleton variant="text" className="h-4 w-64" />
            <Skeleton variant="text" className="h-3 w-32" />
            <div className="flex items-center gap-4 mt-2">
              <Skeleton variant="text" className="h-6 w-14" />
              <Skeleton variant="text" className="h-4 w-14" />
              <Skeleton variant="text" className="h-4 w-14" />
            </div>
          </div>
        </div>
      </div>

      {/* TSC orb + metric cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-6 lg:col-span-1 flex flex-col items-center justify-center">
          <Skeleton variant="circle" className="h-24 w-24 rounded-full" />
          <Skeleton variant="text" className="h-3 w-36 mt-3" />
        </div>
        <div className="lg:col-span-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card rounded-lg p-4 space-y-2" style={{ animationDelay: `${i * 80}ms` }}>
              <Skeleton variant="text" className="h-3 w-12" />
              <Skeleton variant="text" className="h-7 w-14" />
              <Skeleton variant="text" className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Season stats */}
      <div className="glass-card rounded-2xl p-6">
        <Skeleton variant="text" className="h-3 w-24 mb-4" />
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton variant="text" className="h-3 w-8 mx-auto" />
              <Skeleton variant="text" className="h-6 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Advanced stats */}
      <div className="glass-card rounded-2xl p-6">
        <Skeleton variant="text" className="h-3 w-28 mb-4" />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton variant="text" className="h-3 w-8 mx-auto" />
              <Skeleton variant="text" className="h-5 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Roster table skeleton */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <Skeleton variant="text" className="h-3 w-28" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-10" />
        ))}
      </div>
    </div>
  );
}
