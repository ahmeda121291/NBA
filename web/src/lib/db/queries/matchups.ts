/**
 * Player vs Team matchup queries.
 *
 * Uses player_game_logs joined to games to compute how a player
 * performs against a specific opponent team.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface PlayerMatchupSplit {
  opponent_team_id: number;
  opponent_abbr: string;
  opponent_name: string;
  games: number;
  avg_pts: number;
  avg_reb: number;
  avg_ast: number;
  avg_stl: number;
  avg_blk: number;
  avg_min: number;
  avg_plus_minus: number;
  fg_pct: number;
  fg3_pct: number;
  ts_pct: number;
  // Comparison to season avg
  pts_diff: number;  // positive = better than season avg vs this opponent
  reb_diff: number;
  ast_diff: number;
}

export interface PlayerVsTeamDetail {
  game_date: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  minutes: number;
  fg_pct: number;
  fg3_pct: number;
  plus_minus: number;
  home_team_abbr: string;
  away_team_abbr: string;
  result: string; // "W" or "L"
}

/**
 * Get a player's aggregated stats against every opponent team they've faced.
 * Sorted by biggest over/under-performance vs season average.
 */
export async function getPlayerMatchupSplits(
  playerId: number
): Promise<PlayerMatchupSplit[]> {
  const rows = await db.execute(sql`
    WITH season_avg AS (
      SELECT ppg, rpg, apg
      FROM player_season_stats
      WHERE player_id = ${playerId}
      ORDER BY season_id DESC
      LIMIT 1
    ),
    matchup_stats AS (
      SELECT
        opp.id AS opponent_team_id,
        opp.abbreviation AS opponent_abbr,
        opp.name AS opponent_name,
        COUNT(*) AS games,
        AVG(pgl.pts) AS avg_pts,
        AVG(pgl.reb) AS avg_reb,
        AVG(pgl.ast) AS avg_ast,
        AVG(pgl.stl) AS avg_stl,
        AVG(pgl.blk) AS avg_blk,
        AVG(pgl.minutes::numeric) AS avg_min,
        AVG(pgl.plus_minus) AS avg_plus_minus,
        CASE WHEN SUM(pgl.fga) > 0 THEN SUM(pgl.fgm)::numeric / SUM(pgl.fga) ELSE 0 END AS fg_pct,
        CASE WHEN SUM(pgl.fg3a) > 0 THEN SUM(pgl.fg3m)::numeric / SUM(pgl.fg3a) ELSE 0 END AS fg3_pct,
        CASE WHEN SUM(pgl.fga + 0.44 * pgl.fta) > 0
          THEN SUM(pgl.pts)::numeric / (2 * SUM(pgl.fga + 0.44 * pgl.fta))
          ELSE 0 END AS ts_pct
      FROM player_game_logs pgl
      JOIN games g ON g.id = pgl.game_id
      JOIN teams opp ON opp.id = CASE
        WHEN g.home_team_id = pgl.team_id THEN g.away_team_id
        ELSE g.home_team_id
      END
      WHERE pgl.player_id = ${playerId}
        AND g.status = 'final'
      GROUP BY opp.id, opp.abbreviation, opp.name
    )
    SELECT
      ms.*,
      ROUND((ms.avg_pts - COALESCE(sa.ppg::numeric, 0))::numeric, 1) AS pts_diff,
      ROUND((ms.avg_reb - COALESCE(sa.rpg::numeric, 0))::numeric, 1) AS reb_diff,
      ROUND((ms.avg_ast - COALESCE(sa.apg::numeric, 0))::numeric, 1) AS ast_diff
    FROM matchup_stats ms
    CROSS JOIN season_avg sa
    ORDER BY ABS(ms.avg_pts - COALESCE(sa.ppg::numeric, 0)) DESC
  `);

  return rows.map((r: any) => ({
    opponent_team_id: Number(r.opponent_team_id),
    opponent_abbr: String(r.opponent_abbr),
    opponent_name: String(r.opponent_name),
    games: Number(r.games),
    avg_pts: Math.round(Number(r.avg_pts) * 10) / 10,
    avg_reb: Math.round(Number(r.avg_reb) * 10) / 10,
    avg_ast: Math.round(Number(r.avg_ast) * 10) / 10,
    avg_stl: Math.round(Number(r.avg_stl) * 10) / 10,
    avg_blk: Math.round(Number(r.avg_blk) * 10) / 10,
    avg_min: Math.round(Number(r.avg_min) * 10) / 10,
    avg_plus_minus: Math.round(Number(r.avg_plus_minus) * 10) / 10,
    fg_pct: Math.round(Number(r.fg_pct) * 1000) / 1000,
    fg3_pct: Math.round(Number(r.fg3_pct) * 1000) / 1000,
    ts_pct: Math.round(Number(r.ts_pct) * 1000) / 1000,
    pts_diff: Number(r.pts_diff),
    reb_diff: Number(r.reb_diff),
    ast_diff: Number(r.ast_diff),
  }));
}

/**
 * Get game-by-game detail for a player vs a specific team.
 */
export async function getPlayerVsTeam(
  playerId: number,
  opponentTeamId: number
): Promise<PlayerVsTeamDetail[]> {
  const rows = await db.execute(sql`
    SELECT
      g.game_date,
      pgl.pts, pgl.reb, pgl.ast, pgl.stl, pgl.blk,
      pgl.minutes::numeric AS minutes,
      CASE WHEN pgl.fga > 0 THEN pgl.fgm::numeric / pgl.fga ELSE 0 END AS fg_pct,
      CASE WHEN pgl.fg3a > 0 THEN pgl.fg3m::numeric / pgl.fg3a ELSE 0 END AS fg3_pct,
      pgl.plus_minus,
      ht.abbreviation AS home_team_abbr,
      at.abbreviation AS away_team_abbr,
      CASE
        WHEN (pgl.team_id = g.home_team_id AND g.home_score > g.away_score)
          OR (pgl.team_id = g.away_team_id AND g.away_score > g.home_score)
        THEN 'W' ELSE 'L'
      END AS result
    FROM player_game_logs pgl
    JOIN games g ON g.id = pgl.game_id
    JOIN teams ht ON ht.id = g.home_team_id
    JOIN teams at ON at.id = g.away_team_id
    WHERE pgl.player_id = ${playerId}
      AND g.status = 'final'
      AND CASE
        WHEN g.home_team_id = pgl.team_id THEN g.away_team_id
        ELSE g.home_team_id
      END = ${opponentTeamId}
    ORDER BY g.game_date DESC
  `);

  return rows.map((r: any) => ({
    game_date: String(r.game_date),
    pts: Number(r.pts),
    reb: Number(r.reb),
    ast: Number(r.ast),
    stl: Number(r.stl),
    blk: Number(r.blk),
    minutes: Math.round(Number(r.minutes) * 10) / 10,
    fg_pct: Math.round(Number(r.fg_pct) * 1000) / 1000,
    fg3_pct: Math.round(Number(r.fg3_pct) * 1000) / 1000,
    plus_minus: Number(r.plus_minus),
    home_team_abbr: String(r.home_team_abbr),
    away_team_abbr: String(r.away_team_abbr),
    result: String(r.result),
  }));
}

/**
 * Get key matchup players for a game: top players from each team
 * with their performance splits against the opponent.
 */
export async function getGameKeyMatchups(
  gameId: number
): Promise<{
  home_matchups: (PlayerMatchupSplit & { player_name: string; player_id: number; bis_score: number | null })[];
  away_matchups: (PlayerMatchupSplit & { player_name: string; player_id: number; bis_score: number | null })[];
}> {
  // Get the teams in this game
  const gameRows = await db.execute(sql`
    SELECT home_team_id, away_team_id FROM games WHERE id = ${gameId} LIMIT 1
  `);
  if (gameRows.length === 0) return { home_matchups: [], away_matchups: [] };

  const homeTeamId = Number(gameRows[0].home_team_id);
  const awayTeamId = Number(gameRows[0].away_team_id);

  // Get top players per team with their vs-opponent stats
  async function getTeamMatchups(teamId: number, opponentId: number) {
    const rows = await db.execute(sql`
      WITH team_players AS (
        SELECT p.id, p.full_name, pms.bis_score
        FROM players p
        JOIN player_season_stats pss ON p.id = pss.player_id
        LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
        WHERE pss.team_id = ${teamId} AND pss.games_played > 10
        ORDER BY COALESCE(pms.bis_score::numeric, pss.ppg::numeric) DESC
        LIMIT 5
      ),
      player_vs AS (
        SELECT
          tp.id AS player_id,
          tp.full_name AS player_name,
          tp.bis_score,
          COUNT(*) AS games,
          AVG(pgl.pts) AS avg_pts,
          AVG(pgl.reb) AS avg_reb,
          AVG(pgl.ast) AS avg_ast,
          AVG(pgl.stl) AS avg_stl,
          AVG(pgl.blk) AS avg_blk,
          AVG(pgl.minutes::numeric) AS avg_min,
          AVG(pgl.plus_minus) AS avg_plus_minus,
          CASE WHEN SUM(pgl.fga) > 0 THEN SUM(pgl.fgm)::numeric / SUM(pgl.fga) ELSE 0 END AS fg_pct,
          CASE WHEN SUM(pgl.fg3a) > 0 THEN SUM(pgl.fg3m)::numeric / SUM(pgl.fg3a) ELSE 0 END AS fg3_pct,
          CASE WHEN SUM(pgl.fga + 0.44 * pgl.fta) > 0
            THEN SUM(pgl.pts)::numeric / (2 * SUM(pgl.fga + 0.44 * pgl.fta))
            ELSE 0 END AS ts_pct
        FROM team_players tp
        LEFT JOIN player_game_logs pgl ON pgl.player_id = tp.id
        LEFT JOIN games g ON g.id = pgl.game_id AND g.status = 'final'
          AND CASE
            WHEN g.home_team_id = pgl.team_id THEN g.away_team_id
            ELSE g.home_team_id
          END = ${opponentId}
        GROUP BY tp.id, tp.full_name, tp.bis_score
      ),
      season AS (
        SELECT player_id, ppg, rpg, apg
        FROM player_season_stats
        WHERE team_id = ${teamId}
      )
      SELECT
        pv.*,
        ROUND((pv.avg_pts - COALESCE(s.ppg::numeric, 0))::numeric, 1) AS pts_diff,
        ROUND((pv.avg_reb - COALESCE(s.rpg::numeric, 0))::numeric, 1) AS reb_diff,
        ROUND((pv.avg_ast - COALESCE(s.apg::numeric, 0))::numeric, 1) AS ast_diff
      FROM player_vs pv
      LEFT JOIN season s ON s.player_id = pv.player_id
      ORDER BY COALESCE(pv.bis_score::numeric, pv.avg_pts) DESC
    `);

    return rows.map((r: any) => ({
      player_id: Number(r.player_id),
      player_name: String(r.player_name),
      bis_score: r.bis_score ? Number(r.bis_score) : null,
      opponent_team_id: opponentId,
      opponent_abbr: "",
      opponent_name: "",
      games: Number(r.games || 0),
      avg_pts: Math.round(Number(r.avg_pts || 0) * 10) / 10,
      avg_reb: Math.round(Number(r.avg_reb || 0) * 10) / 10,
      avg_ast: Math.round(Number(r.avg_ast || 0) * 10) / 10,
      avg_stl: Math.round(Number(r.avg_stl || 0) * 10) / 10,
      avg_blk: Math.round(Number(r.avg_blk || 0) * 10) / 10,
      avg_min: Math.round(Number(r.avg_min || 0) * 10) / 10,
      avg_plus_minus: Math.round(Number(r.avg_plus_minus || 0) * 10) / 10,
      fg_pct: Math.round(Number(r.fg_pct || 0) * 1000) / 1000,
      fg3_pct: Math.round(Number(r.fg3_pct || 0) * 1000) / 1000,
      ts_pct: Math.round(Number(r.ts_pct || 0) * 1000) / 1000,
      pts_diff: Number(r.pts_diff || 0),
      reb_diff: Number(r.reb_diff || 0),
      ast_diff: Number(r.ast_diff || 0),
    }));
  }

  const [home_matchups, away_matchups] = await Promise.all([
    getTeamMatchups(homeTeamId, awayTeamId),
    getTeamMatchups(awayTeamId, homeTeamId),
  ]);

  return { home_matchups, away_matchups };
}
