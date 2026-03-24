import { Skeleton, GameCardSkeleton } from "@/components/ui/skeleton-loader";

export default function GamesLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="text" className="h-4 w-80" />
        </div>
        <Skeleton variant="rect" className="h-10 w-36" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
