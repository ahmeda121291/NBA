import { Skeleton } from "@/components/ui/skeleton-loader";

export default function CompareLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <Skeleton variant="text" className="h-8 w-40" />
        <Skeleton variant="text" className="h-4 w-72 mt-2" />
      </div>

      {/* Two player selector cards side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-6">
            <Skeleton variant="text" className="h-8 w-full mb-4 rounded" />
            <div className="flex flex-col items-center gap-3 py-4">
              <Skeleton variant="rect" className="h-16 w-16 rounded-sm" />
              <Skeleton variant="text" className="h-5 w-32" />
              <Skeleton variant="text" className="h-3 w-20" />
              <Skeleton variant="circle" className="h-12 w-12 rounded-full mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Radar chart placeholder */}
      <div className="glass-card rounded-2xl p-6">
        <Skeleton variant="text" className="h-3 w-28 mb-4" />
        <div className="flex justify-center">
          <Skeleton variant="circle" className="h-[240px] w-[240px] rounded-full" />
        </div>
      </div>

      {/* Comparison table placeholder */}
      <div className="glass-card rounded-2xl p-6 space-y-3">
        <Skeleton variant="text" className="h-3 w-36 mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4" style={{ animationDelay: `${i * 80}ms` }}>
            <Skeleton variant="text" className="h-4 w-12" />
            <Skeleton variant="text" className="h-4 w-10" />
            <Skeleton variant="rect" className="h-1.5 flex-1 rounded-full" />
            <Skeleton variant="text" className="h-4 w-10" />
            <Skeleton variant="text" className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
