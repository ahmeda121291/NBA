import { Skeleton, MetricCardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton-loader";

export default function LeaderboardsLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-56" />
        <Skeleton variant="text" className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={6} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
