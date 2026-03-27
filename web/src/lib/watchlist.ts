"use client";
import { create } from "zustand";

interface WatchlistState {
  playerIds: number[];
  teamIds: number[];
  addPlayer: (id: number) => void;
  removePlayer: (id: number) => void;
  addTeam: (id: number) => void;
  removeTeam: (id: number) => void;
  isPlayerFavorite: (id: number) => boolean;
  isTeamFavorite: (id: number) => boolean;
}

// Load from localStorage
function loadWatchlist(): { playerIds: number[]; teamIds: number[] } {
  if (typeof window === "undefined") return { playerIds: [], teamIds: [] };
  try {
    const saved = localStorage.getItem("courtvision_watchlist");
    return saved ? JSON.parse(saved) : { playerIds: [], teamIds: [] };
  } catch { return { playerIds: [], teamIds: [] }; }
}

function saveWatchlist(playerIds: number[], teamIds: number[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("courtvision_watchlist", JSON.stringify({ playerIds, teamIds }));
}

export const useWatchlist = create<WatchlistState>((set, get) => {
  const initial = loadWatchlist();
  return {
    playerIds: initial.playerIds,
    teamIds: initial.teamIds,
    addPlayer: (id) => set((s) => {
      const next = [...new Set([...s.playerIds, id])];
      saveWatchlist(next, s.teamIds);
      return { playerIds: next };
    }),
    removePlayer: (id) => set((s) => {
      const next = s.playerIds.filter((x) => x !== id);
      saveWatchlist(next, s.teamIds);
      return { playerIds: next };
    }),
    addTeam: (id) => set((s) => {
      const next = [...new Set([...s.teamIds, id])];
      saveWatchlist(s.playerIds, next);
      return { teamIds: next };
    }),
    removeTeam: (id) => set((s) => {
      const next = s.teamIds.filter((x) => x !== id);
      saveWatchlist(s.playerIds, next);
      return { teamIds: next };
    }),
    isPlayerFavorite: (id) => get().playerIds.includes(id),
    isTeamFavorite: (id) => get().teamIds.includes(id),
  };
});
