import { Skeleton, TableRowSkeleton } from "@/components/ui/skeleton-loader";

export default function TeamsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-40" />
        <Skeleton variant="text" className="h-4 w-80" />
      </div>
      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={8} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
