"use client";

import { AutoRefresh } from "@/components/shared/auto-refresh";

interface Props {
  /** Whether any games on this date are live (in-progress) */
  hasLiveGames: boolean;
  /** Whether any games on this date are scheduled (future) */
  hasScheduledGames: boolean;
  /** Whether viewing today or a future date */
  isTodayOrFuture: boolean;
}

/**
 * Determines auto-refresh behavior for the games page:
 * - Live games: refresh every 30s (scores changing)
 * - Scheduled games today: refresh every 60s (injury updates, lineup changes)
 * - Future dates: refresh every 5min (roster/injury updates)
 * - Past dates (all final): no auto-refresh
 */
export function GamesRefresh({ hasLiveGames, hasScheduledGames, isTodayOrFuture }: Props) {
  if (hasLiveGames) {
    return <AutoRefresh intervalSeconds={30} enabled label="Live updates" />;
  }
  if (hasScheduledGames && isTodayOrFuture) {
    return <AutoRefresh intervalSeconds={60} enabled label="Pre-game updates" />;
  }
  if (isTodayOrFuture) {
    return <AutoRefresh intervalSeconds={300} enabled label="Auto-refresh" />;
  }
  return null;
}
