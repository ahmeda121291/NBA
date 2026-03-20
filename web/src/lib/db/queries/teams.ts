import { eq, desc, and } from "drizzle-orm";
import { db } from "..";
import {
  teams,
  teamSeasonStats,
  teamMetricSnapshots,
  teamRollingWindows,
  rosters,
  players,
  playerMetricSnapshots,
  seasons,
} from "../schema";

export async function getAllTeams() {
  return db.select().from(teams).orderBy(teams.name);
}

export async function getTeamById(id: number) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);
  return team ?? null;
}

export async function getTeamByAbbreviation(abbr: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.abbreviation, abbr.toUpperCase()))
    .limit(1);
  return team ?? null;
}

export async function getTeamSeasonStats(teamId: number, seasonId: number) {
  const [stats] = await db
    .select()
    .from(teamSeasonStats)
    .where(
      and(eq(teamSeasonStats.teamId, teamId), eq(teamSeasonStats.seasonId, seasonId))
    )
    .limit(1);
  return stats ?? null;
}

export async function getTeamMetrics(teamId: number, seasonId: number) {
  const [metrics] = await db
    .select()
    .from(teamMetricSnapshots)
    .where(
      and(
        eq(teamMetricSnapshots.teamId, teamId),
        eq(teamMetricSnapshots.seasonId, seasonId)
      )
    )
    .orderBy(desc(teamMetricSnapshots.asOfDate))
    .limit(1);
  return metrics ?? null;
}

export async function getTeamRoster(teamId: number, seasonId: number) {
  return db
    .select({
      roster: rosters,
      player: players,
    })
    .from(rosters)
    .innerJoin(players, eq(rosters.playerId, players.id))
    .where(
      and(eq(rosters.teamId, teamId), eq(rosters.seasonId, seasonId))
    );
}

export async function getTeamRollingWindows(teamId: number, seasonId: number, windowSize: number) {
  return db
    .select()
    .from(teamRollingWindows)
    .where(
      and(
        eq(teamRollingWindows.teamId, teamId),
        eq(teamRollingWindows.seasonId, seasonId),
        eq(teamRollingWindows.windowSize, windowSize)
      )
    )
    .orderBy(desc(teamRollingWindows.asOfDate))
    .limit(30);
}

export async function getCurrentSeason() {
  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isCurrent, true))
    .limit(1);
  return season ?? null;
}
