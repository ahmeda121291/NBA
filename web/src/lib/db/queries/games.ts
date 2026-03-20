import { eq, and, desc } from "drizzle-orm";
import { db } from "..";
import { games, teams, gameProjections, playerGameProjections, players, playerInjuries } from "../schema";

export async function getGamesByDate(date: string) {
  return db
    .select()
    .from(games)
    .where(eq(games.gameDate, date))
    .orderBy(games.gameTime);
}

export async function getGameById(id: number) {
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, id))
    .limit(1);
  return game ?? null;
}

export async function getGameWithTeams(id: number) {
  const result = await db
    .select({
      game: games,
      homeTeam: teams,
    })
    .from(games)
    .innerJoin(teams, eq(games.homeTeamId, teams.id))
    .where(eq(games.id, id))
    .limit(1);

  if (result.length === 0) return null;

  const [awayTeam] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, result[0].game.awayTeamId))
    .limit(1);

  return {
    ...result[0].game,
    homeTeam: result[0].homeTeam,
    awayTeam,
  };
}

export async function getGameProjection(gameId: number) {
  const [projection] = await db
    .select()
    .from(gameProjections)
    .where(eq(gameProjections.gameId, gameId))
    .limit(1);
  return projection ?? null;
}

export async function getPlayerProjectionsForGame(gameId: number) {
  return db
    .select({
      projection: playerGameProjections,
      player: players,
    })
    .from(playerGameProjections)
    .innerJoin(players, eq(playerGameProjections.playerId, players.id))
    .where(eq(playerGameProjections.gameId, gameId))
    .orderBy(desc(playerGameProjections.gipImpact));
}

export async function getInjuriesForGame(homeTeamId: number, awayTeamId: number) {
  return db
    .select({
      injury: playerInjuries,
      player: players,
    })
    .from(playerInjuries)
    .innerJoin(players, eq(playerInjuries.playerId, players.id))
    .where(
      and(
        eq(playerInjuries.isCurrent, true),
      )
    );
}
