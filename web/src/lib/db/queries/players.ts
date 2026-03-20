import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { db } from "..";
import {
  players,
  playerSeasonStats,
  playerMetricSnapshots,
  playerGameLogs,
  playerRollingWindows,
  playerGameProjections,
  playerInjuries,
  rosters,
  teams,
} from "../schema";

export async function getAllPlayers(limit = 50, offset = 0) {
  return db
    .select()
    .from(players)
    .where(eq(players.isActive, true))
    .orderBy(players.lastName)
    .limit(limit)
    .offset(offset);
}

export async function getPlayerById(id: number) {
  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.id, id))
    .limit(1);
  return player ?? null;
}

export async function getPlayerWithTeam(id: number, seasonId: number) {
  const result = await db
    .select({
      player: players,
      team: teams,
    })
    .from(players)
    .innerJoin(rosters, eq(players.id, rosters.playerId))
    .innerJoin(teams, eq(rosters.teamId, teams.id))
    .where(and(eq(players.id, id), eq(rosters.seasonId, seasonId)))
    .limit(1);

  return result[0] ?? null;
}

export async function getPlayerSeasonStats(playerId: number, seasonId: number) {
  const [stats] = await db
    .select()
    .from(playerSeasonStats)
    .where(
      and(eq(playerSeasonStats.playerId, playerId), eq(playerSeasonStats.seasonId, seasonId))
    )
    .limit(1);
  return stats ?? null;
}

export async function getPlayerMetrics(playerId: number, seasonId: number) {
  const [metrics] = await db
    .select()
    .from(playerMetricSnapshots)
    .where(
      and(
        eq(playerMetricSnapshots.playerId, playerId),
        eq(playerMetricSnapshots.seasonId, seasonId)
      )
    )
    .orderBy(desc(playerMetricSnapshots.asOfDate))
    .limit(1);
  return metrics ?? null;
}

export async function getPlayerGameLog(playerId: number, seasonId: number, limit = 20) {
  return db
    .select()
    .from(playerGameLogs)
    .where(
      and(eq(playerGameLogs.playerId, playerId), eq(playerGameLogs.seasonId, seasonId))
    )
    .orderBy(desc(playerGameLogs.gameId))
    .limit(limit);
}

export async function getPlayerRollingWindows(playerId: number, seasonId: number, windowSize: number) {
  return db
    .select()
    .from(playerRollingWindows)
    .where(
      and(
        eq(playerRollingWindows.playerId, playerId),
        eq(playerRollingWindows.seasonId, seasonId),
        eq(playerRollingWindows.windowSize, windowSize)
      )
    )
    .orderBy(desc(playerRollingWindows.asOfDate))
    .limit(30);
}

export async function getPlayerProjection(playerId: number, gameId: number) {
  const [projection] = await db
    .select()
    .from(playerGameProjections)
    .where(
      and(
        eq(playerGameProjections.playerId, playerId),
        eq(playerGameProjections.gameId, gameId)
      )
    )
    .limit(1);
  return projection ?? null;
}

export async function getPlayerCurrentInjury(playerId: number) {
  const [injury] = await db
    .select()
    .from(playerInjuries)
    .where(
      and(eq(playerInjuries.playerId, playerId), eq(playerInjuries.isCurrent, true))
    )
    .limit(1);
  return injury ?? null;
}

export async function searchPlayers(query: string, limit = 10) {
  return db
    .select()
    .from(players)
    .where(
      and(
        eq(players.isActive, true),
        or(
          ilike(players.fullName, `%${query}%`),
          ilike(players.lastName, `%${query}%`)
        )
      )
    )
    .limit(limit);
}

export async function getLeaderboard(
  metric: string,
  seasonId: number,
  limit = 25,
  position?: string
) {
  const metricColumn = getMetricColumn(metric);
  if (!metricColumn) return [];

  let query = db
    .select({
      player: players,
      metrics: playerMetricSnapshots,
    })
    .from(playerMetricSnapshots)
    .innerJoin(players, eq(playerMetricSnapshots.playerId, players.id))
    .where(eq(playerMetricSnapshots.seasonId, seasonId))
    .orderBy(desc(sql`${metricColumn}`))
    .limit(limit);

  return query;
}

function getMetricColumn(metric: string) {
  const map: Record<string, typeof playerMetricSnapshots.bisScore> = {
    bis: playerMetricSnapshots.bisScore,
    rda: playerMetricSnapshots.rdaScore,
    goi: playerMetricSnapshots.goiScore,
    drs: playerMetricSnapshots.drsScore,
    sps: playerMetricSnapshots.spsScore,
    lfi: playerMetricSnapshots.lfiScore,
  };
  return map[metric] ?? null;
}
