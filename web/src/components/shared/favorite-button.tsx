"use client";
import { Star } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";

export function FavoritePlayerButton({ playerId }: { playerId: number }) {
  const { isPlayerFavorite, addPlayer, removePlayer } = useWatchlist();
  const isFav = isPlayerFavorite(playerId);

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); isFav ? removePlayer(playerId) : addPlayer(playerId); }}
      className={`p-1 rounded transition-colors ${isFav ? "text-amber-400" : "text-text-muted/20 hover:text-amber-400/50"}`}
      title={isFav ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star className="h-3.5 w-3.5" fill={isFav ? "currentColor" : "none"} />
    </button>
  );
}

export function FavoriteTeamButton({ teamId }: { teamId: number }) {
  const { isTeamFavorite, addTeam, removeTeam } = useWatchlist();
  const isFav = isTeamFavorite(teamId);

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); isFav ? removeTeam(teamId) : addTeam(teamId); }}
      className={`p-1 rounded transition-colors ${isFav ? "text-amber-400" : "text-text-muted/20 hover:text-amber-400/50"}`}
      title={isFav ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star className="h-3.5 w-3.5" fill={isFav ? "currentColor" : "none"} />
    </button>
  );
}
