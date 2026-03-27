import { db } from "./index";
import { sql } from "drizzle-orm";

// ============================================================
// Dashboard queries
// ============================================================

/** Get recent/upcoming games (today or most recent game day) */
export async function getRecentGames(limit = 8) {
  const rows = await db.execute(sql`
    SELECT
      g.id,
      g.external_id,
      g.game_date,
      g.status,
      g.home_score,
      g.away_score,
      ht.abbreviation AS home_abbr,
      ht.nickname AS home_name,
      at.abbreviation AS away_abbr,
      at.nickname AS away_name,
      hts.wins AS home_wins,
      hts.losses AS home_losses,
      ats.wins AS away_wins,
      ats.losses AS away_losses
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
    LEFT JOIN team_season_stats ats ON ats.team_id = at.id
    ORDER BY g.game_date DESC, g.id DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get top players by PPG with their season stats */
export async function getTopPlayers(limit = 20) {
  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.external_id,
      p.full_name,
      p.position,
      t.abbreviation AS team_abbr,
      pss.games_played,
      pss.ppg,
      pss.rpg,
      pss.apg,
      pss.spg,
      pss.bpg,
      pss.topg,
      pss.mpg,
      pss.fg_pct,
      pss.fg3_pct,
      pss.ft_pct
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    WHERE pss.ppg IS NOT NULL AND pss.games_played > 10
    ORDER BY pss.ppg DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get all teams with season stats, ordered by wins */
export async function getAllTeams() {
  const rows = await db.execute(sql`
    SELECT
      t.id,
      t.external_id,
      t.abbreviation,
      t.name,
      t.city,
      t.nickname,
      t.conference,
      t.division,
      t.primary_color,
      t.arena,
      tss.wins,
      tss.losses,
      tss.fg_pct,
      tss.fg3_pct,
      tss.ft_pct
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    ORDER BY tss.wins DESC NULLS LAST
  `);
  return rows;
}

/** Get a single team by abbreviation */
export async function getTeamByAbbr(abbr: string) {
  const rows = await db.execute(sql`
    SELECT
      t.id,
      t.external_id,
      t.abbreviation,
      t.name,
      t.city,
      t.nickname,
      t.conference,
      t.division,
      t.primary_color,
      t.arena,
      tss.wins,
      tss.losses,
      tss.fg_pct,
      tss.fg3_pct,
      tss.ft_pct
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    WHERE t.abbreviation = ${abbr}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/** Get a single team by database ID */
export async function getTeamById(id: number) {
  const rows = await db.execute(sql`
    SELECT
      t.id,
      t.external_id,
      t.abbreviation,
      t.name,
      t.city,
      t.nickname,
      t.conference,
      t.division,
      t.primary_color,
      t.arena,
      tss.wins,
      tss.losses,
      tss.fg_pct,
      tss.fg3_pct,
      tss.ft_pct
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    WHERE t.id = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/** Get roster for a team with CourtVision metrics */
export async function getTeamRoster(teamId: number) {
  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.external_id,
      p.full_name,
      p.position,
      pss.ppg,
      pss.rpg,
      pss.apg,
      pss.spg,
      pss.bpg,
      pss.mpg,
      pss.games_played,
      pss.fg_pct,
      pss.fg3_pct,
      pss.ft_pct,
      pms.bis_score,
      pms.lfi_score,
      pms.lfi_streak_label,
      pms.drs_score,
      pms.rda_score,
      pms.sps_score,
      pms.goi_score
    FROM rosters r
    JOIN players p ON r.player_id = p.id
    LEFT JOIN player_season_stats pss ON pss.player_id = p.id AND pss.team_id = ${teamId}
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE r.team_id = ${teamId}
    ORDER BY pms.bis_score DESC NULLS LAST, pss.ppg DESC NULLS LAST
  `);
  return rows;
}

/** Get a single player by database ID */
export async function getPlayerById(id: number) {
  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.external_id,
      p.full_name,
      p.first_name,
      p.last_name,
      p.position,
      t.abbreviation AS team_abbr,
      t.nickname AS team_name,
      t.primary_color AS team_color,
      pss.games_played,
      pss.games_started,
      pss.ppg, pss.rpg, pss.apg, pss.spg, pss.bpg, pss.topg, pss.mpg, pss.fpg,
      pss.fg_pct, pss.fg3_pct, pss.ft_pct
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    WHERE p.id = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/** Get recent game logs for a player */
export async function getPlayerGameLogs(playerId: number, limit = 10) {
  const rows = await db.execute(sql`
    SELECT
      pgl.pts, pgl.reb, pgl.ast, pgl.stl, pgl.blk,
      pgl.fgm, pgl.fga, pgl.fg3m, pgl.fg3a, pgl.ftm, pgl.fta,
      pgl.minutes, pgl.plus_minus, pgl.ts_pct,
      g.game_date,
      opp.abbreviation AS opp_abbr
    FROM player_game_logs pgl
    JOIN games g ON pgl.game_id = g.id
    JOIN teams opp ON (
      CASE WHEN g.home_team_id = (SELECT team_id FROM player_season_stats WHERE player_id = ${playerId} LIMIT 1)
        THEN g.away_team_id
        ELSE g.home_team_id
      END
    ) = opp.id
    WHERE pgl.player_id = ${playerId}
    ORDER BY g.game_date DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get a single game with teams */
export async function getGameById(id: number) {
  const rows = await db.execute(sql`
    SELECT
      g.id,
      g.external_id,
      g.game_date,
      g.status,
      g.home_score,
      g.away_score,
      ht.id AS home_team_id,
      ht.abbreviation AS home_abbr,
      ht.nickname AS home_name,
      ht.city AS home_city,
      ht.primary_color AS home_color,
      at.id AS away_team_id,
      at.abbreviation AS away_abbr,
      at.nickname AS away_name,
      at.city AS away_city,
      at.primary_color AS away_color,
      hts.wins AS home_wins,
      hts.losses AS home_losses,
      ats.wins AS away_wins,
      ats.losses AS away_losses
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
    LEFT JOIN team_season_stats ats ON ats.team_id = at.id
    WHERE g.id = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/** Get games for a specific date range */
export async function getGamesByDate(date: string, limit = 20) {
  const rows = await db.execute(sql`
    SELECT
      g.id,
      g.external_id,
      g.game_date,
      g.status,
      g.home_score,
      g.away_score,
      ht.abbreviation AS home_abbr,
      ht.nickname AS home_name,
      at.abbreviation AS away_abbr,
      at.nickname AS away_name,
      hts.wins AS home_wins,
      hts.losses AS home_losses,
      ats.wins AS away_wins,
      ats.losses AS away_losses
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
    LEFT JOIN team_season_stats ats ON ats.team_id = at.id
    WHERE g.game_date = ${date}
    ORDER BY g.id
    LIMIT ${limit}
  `);
  return rows;
}

/** Get the most recent game date */
export async function getMostRecentGameDate(): Promise<string | null> {
  // Prefer today if there are any games (scheduled or final)
  const today = new Date().toISOString().slice(0, 10);
  const todayGames = await db.execute(sql`
    SELECT game_date FROM games WHERE game_date = ${today} LIMIT 1
  `);
  if (todayGames.length > 0) return today;

  // Check for next upcoming scheduled game
  const upcoming = await db.execute(sql`
    SELECT game_date FROM games
    WHERE game_date >= ${today} AND status = 'scheduled'
    ORDER BY game_date ASC
    LIMIT 1
  `);
  if (upcoming.length > 0) return (upcoming[0] as any)?.game_date ?? null;

  // Fall back to most recent final game
  const rows = await db.execute(sql`
    SELECT game_date FROM games
    WHERE status = 'final'
    ORDER BY game_date DESC
    LIMIT 1
  `);
  return (rows[0] as any)?.game_date ?? null;
}

// ============================================================
// Metric-powered queries
// ============================================================

/** Get top players with their CourtVision metrics */
export async function getTopPlayersWithMetrics(limit = 20) {
  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.external_id,
      p.full_name,
      p.position,
      t.abbreviation AS team_abbr,
      pss.games_played,
      pss.ppg, pss.rpg, pss.apg, pss.spg, pss.bpg, pss.topg, pss.mpg,
      pss.fg_pct, pss.fg3_pct, pss.ft_pct,
      pms.bis_score, pms.bis_confidence, pms.bis_percentile,
      pms.rda_score, pms.rda_label,
      pms.drs_score, pms.drs_label,
      pms.lfi_score, pms.lfi_confidence, pms.lfi_streak_label,
      pms.sps_score, pms.sps_label,
      pms.goi_score
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pss.ppg IS NOT NULL AND pss.games_played > 10
    ORDER BY pms.bis_score DESC NULLS LAST, pss.ppg DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get player with full metrics by ID */
export async function getPlayerWithMetrics(id: number) {
  const rows = await db.execute(sql`
    SELECT
      p.id, p.external_id, p.full_name, p.first_name, p.last_name, p.position,
      t.abbreviation AS team_abbr, t.nickname AS team_name, t.primary_color AS team_color,
      pss.games_played, pss.games_started,
      pss.ppg, pss.rpg, pss.apg, pss.spg, pss.bpg, pss.topg, pss.mpg, pss.fpg,
      pss.fg_pct, pss.fg3_pct, pss.ft_pct,
      pss.salary, pss.vfm,
      (SELECT COUNT(*) + 1 FROM player_season_stats pss2 WHERE pss2.salary > pss.salary AND pss2.salary IS NOT NULL) AS salary_rank,
      pms.bis_score, pms.bis_confidence, pms.bis_percentile, pms.bis_components,
      pms.rda_score, pms.rda_confidence, pms.rda_label, pms.rda_components,
      pms.drs_score, pms.drs_confidence, pms.drs_label, pms.drs_components,
      pms.lfi_score, pms.lfi_confidence, pms.lfi_streak_label, pms.lfi_windows, pms.lfi_delta,
      pms.sps_score, pms.sps_confidence, pms.sps_label, pms.sps_components,
      pms.goi_score, pms.goi_confidence, pms.goi_components
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE p.id = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/** Get all teams with CourtVision metrics */
export async function getAllTeamsWithMetrics() {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (t.id)
      t.id, t.external_id, t.abbreviation, t.name, t.city, t.nickname,
      t.conference, t.division, t.primary_color, t.arena,
      tss.wins, tss.losses, tss.fg_pct, tss.fg3_pct, tss.ft_pct,
      tms.tsc_score, tms.tsc_confidence,
      tms.ltfi_score,
      tms.lss_score, tms.lss_confidence,
      tms.pts_score, tms.pts_confidence,
      tms.rp_score,
      tms.drs_team_score
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    LEFT JOIN team_metric_snapshots tms ON tms.team_id = t.id
    ORDER BY t.id
  `);
  return [...rows].sort((a: any, b: any) => {
    const aScore = Number(a.tsc_score) || 0;
    const bScore = Number(b.tsc_score) || 0;
    return bScore - aScore;
  });
}

/** Get team with metrics by ID */
export async function getTeamWithMetrics(id: number) {
  const rows = await db.execute(sql`
    SELECT
      t.id, t.external_id, t.abbreviation, t.name, t.city, t.nickname,
      t.conference, t.division, t.primary_color, t.arena,
      tss.wins, tss.losses, tss.fg_pct, tss.fg3_pct, tss.ft_pct,
      tss.ortg, tss.drtg, tss.net_rating, tss.pace, tss.sos, tss.elo_rating,
      tss.home_wins, tss.home_losses, tss.away_wins, tss.away_losses,
      tms.tsc_score, tms.tsc_confidence, tms.tsc_components,
      tms.ltfi_score, tms.ltfi_windows, tms.ltfi_components,
      tms.lss_score, tms.lss_confidence,
      tms.pts_score, tms.pts_confidence,
      tms.rp_score, tms.rp_penalties,
      tms.drs_team_score
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    LEFT JOIN team_metric_snapshots tms ON tms.team_id = t.id
    WHERE t.id = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/** Get hottest players by LFI score */
export async function getHottestPlayers(limit = 10) {
  const rows = await db.execute(sql`
    SELECT
      p.id, p.external_id, p.full_name, p.position,
      t.abbreviation AS team_abbr,
      pss.ppg, pss.rpg, pss.apg,
      pms.bis_score, pms.lfi_score, pms.lfi_streak_label, pms.lfi_delta,
      pms.drs_score
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pms.lfi_score IS NOT NULL AND pss.games_played > 10
    ORDER BY pms.lfi_score DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get games for a date with team metrics */
export async function getGamesByDateWithMetrics(date: string, limit = 20) {
  const rows = await db.execute(sql`
    SELECT
      g.id, g.external_id, g.game_date, g.status, g.home_score, g.away_score,
      ht.abbreviation AS home_abbr, ht.nickname AS home_name, ht.city AS home_city,
      ht.primary_color AS home_color,
      at.abbreviation AS away_abbr, at.nickname AS away_name, at.city AS away_city,
      at.primary_color AS away_color,
      hts.wins AS home_wins, hts.losses AS home_losses,
      ats.wins AS away_wins, ats.losses AS away_losses,
      htms.tsc_score AS home_tsc, htms.ltfi_score AS home_ltfi,
      atms.tsc_score AS away_tsc, atms.ltfi_score AS away_ltfi
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
    LEFT JOIN team_season_stats ats ON ats.team_id = at.id
    LEFT JOIN team_metric_snapshots htms ON htms.team_id = ht.id
    LEFT JOIN team_metric_snapshots atms ON atms.team_id = at.id
    WHERE g.game_date = ${date}
    ORDER BY g.id
    LIMIT ${limit}
  `);
  return rows;
}

/** Get leaderboard by any CourtVision metric */
export async function getMetricLeaderboard(metric: string, limit = 25) {
  const validMetrics: Record<string, string> = {
    bis: "pms.bis_score", lfi: "pms.lfi_score", drs: "pms.drs_score",
    rda: "pms.rda_score", sps: "pms.sps_score", goi: "pms.goi_score",
  };
  const orderCol = validMetrics[metric] || "pms.bis_score";
  const rows = await db.execute(sql.raw(`
    SELECT
      p.id, p.external_id, p.full_name, p.position,
      t.abbreviation AS team_abbr,
      pss.games_played, pss.ppg, pss.rpg, pss.apg, pss.mpg,
      pss.fg_pct, pss.fg3_pct,
      pms.bis_score, pms.bis_confidence, pms.bis_percentile,
      pms.rda_score, pms.rda_label,
      pms.drs_score, pms.drs_label,
      pms.lfi_score, pms.lfi_confidence, pms.lfi_streak_label, pms.lfi_delta,
      pms.sps_score, pms.sps_label,
      pms.goi_score
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pss.games_played > 10 AND ${orderCol} IS NOT NULL
    ORDER BY ${orderCol} DESC
    LIMIT ${limit}
  `));
  return rows;
}

/** Search players by name */
export async function searchPlayers(query: string, limit = 8) {
  const rows = await db.execute(sql`
    SELECT
      p.id, p.full_name, p.position,
      t.abbreviation AS team_abbr,
      pms.bis_score
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE LOWER(p.full_name) LIKE ${'%' + query.toLowerCase() + '%'}
    ORDER BY pms.bis_score DESC NULLS LAST
    LIMIT ${limit}
  `);
  return rows;
}

/** Search teams by name, city, or abbreviation */
export async function searchTeams(query: string, limit = 5) {
  const q = '%' + query.toLowerCase() + '%';
  const rows = await db.execute(sql`
    SELECT
      t.id, t.abbreviation, t.city, t.nickname,
      tss.wins, tss.losses,
      tms.tsc_score
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    LEFT JOIN team_metric_snapshots tms ON tms.team_id = t.id
    WHERE LOWER(t.name) LIKE ${q}
      OR LOWER(t.city) LIKE ${q}
      OR LOWER(t.nickname) LIKE ${q}
      OR LOWER(t.abbreviation) LIKE ${q}
    ORDER BY tms.tsc_score DESC NULLS LAST
    LIMIT ${limit}
  `);
  return rows;
}

/** Get all game dates in a given month (for DatePicker) */
export async function getGameDatesInMonth(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  const rows = await db.execute(sql`
    SELECT DISTINCT game_date::text AS game_date
    FROM games
    WHERE game_date >= ${startDate} AND game_date < ${endDate}
    ORDER BY game_date
  `);
  return rows.map((r: any) => r.game_date);
}

/** Get games for a date with team metrics AND projections */
export async function getGamesByDateWithProjections(date: string, limit = 20) {
  const rows = await db.execute(sql`
    SELECT
      g.id, g.external_id, g.game_date, g.status, g.home_score, g.away_score,
      ht.id AS home_team_id, ht.abbreviation AS home_abbr, ht.nickname AS home_name, ht.city AS home_city,
      ht.primary_color AS home_color,
      at.id AS away_team_id, at.abbreviation AS away_abbr, at.nickname AS away_name, at.city AS away_city,
      at.primary_color AS away_color,
      hts.wins AS home_wins, hts.losses AS home_losses,
      ats.wins AS away_wins, ats.losses AS away_losses,
      htms.tsc_score AS home_tsc, htms.ltfi_score AS home_ltfi,
      atms.tsc_score AS away_tsc, atms.ltfi_score AS away_ltfi,
      gp.projected_winner_id, gp.win_prob_home, gp.win_prob_away,
      gp.proj_score_home, gp.proj_score_home_low, gp.proj_score_home_high,
      gp.proj_score_away, gp.proj_score_away_low, gp.proj_score_away_high,
      gp.confidence AS proj_confidence, gp.margin AS proj_margin,
      gp.upset_risk, gp.key_reasons
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
    LEFT JOIN team_season_stats ats ON ats.team_id = at.id
    LEFT JOIN team_metric_snapshots htms ON htms.team_id = ht.id
    LEFT JOIN team_metric_snapshots atms ON atms.team_id = at.id
    LEFT JOIN game_projections gp ON gp.game_id = g.id
    WHERE g.game_date = ${date}
    ORDER BY g.id
    LIMIT ${limit}
  `);
  return rows;
}

/** Get game projection by game ID */
export async function getGameProjection(gameId: number) {
  const rows = await db.execute(sql`
    SELECT
      gp.*,
      wt.abbreviation AS winner_abbr, wt.nickname AS winner_name
    FROM game_projections gp
    LEFT JOIN teams wt ON gp.projected_winner_id = wt.id
    WHERE gp.game_id = ${gameId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/** Get top player projections for a game */
export async function getGamePlayerProjections(gameId: number, limit = 8) {
  const rows = await db.execute(sql`
    SELECT
      pgp.player_id, pgp.proj_pts, pgp.proj_pts_low, pgp.proj_pts_high,
      pgp.proj_reb, pgp.proj_ast, pgp.proj_minutes, pgp.proj_volatility,
      p.full_name, p.position,
      t.abbreviation AS team_abbr,
      pms.bis_score, pms.lfi_score
    FROM player_game_projections pgp
    JOIN players p ON pgp.player_id = p.id
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pgp.game_id = ${gameId}
    ORDER BY pgp.proj_pts DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get game team stats (box score) */
export async function getGameTeamStats(gameId: number) {
  const rows = await db.execute(sql`
    SELECT * FROM game_team_stats WHERE game_id = ${gameId}
  `);
  return rows;
}

/** Get top player performances for a game */
export async function getGamePlayerLogs(gameId: number, limit = 30) {
  const rows = await db.execute(sql`
    SELECT
      pgl.player_id, pgl.pts, pgl.reb, pgl.ast, pgl.stl, pgl.blk,
      pgl.tov, pgl.fgm, pgl.fga, pgl.fg3m, pgl.fg3a, pgl.ftm, pgl.fta,
      pgl.minutes, pgl.plus_minus, pgl.ts_pct,
      p.full_name, p.position,
      t.abbreviation AS team_abbr, t.id AS team_id,
      pms.bis_score, pms.lfi_score, pms.drs_score
    FROM player_game_logs pgl
    JOIN players p ON pgl.player_id = p.id
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pgl.game_id = ${gameId}
    ORDER BY pgl.pts DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get today's games with projections for "Tonight's Slate" */
export async function getTodaysGamesWithProjections() {
  const today = new Date().toISOString().slice(0, 10);
  // Try today first, fallback to most recent date with games
  let rows = await db.execute(sql`
    SELECT
      g.id, g.game_date, g.game_time, g.status, g.home_score, g.away_score,
      ht.abbreviation AS home_abbr, ht.nickname AS home_name,
      at.abbreviation AS away_abbr, at.nickname AS away_name,
      hts.wins AS home_wins, hts.losses AS home_losses,
      ats.wins AS away_wins, ats.losses AS away_losses,
      htms.tsc_score AS home_tsc, atms.tsc_score AS away_tsc,
      gp.projected_winner_id, gp.win_prob_home, gp.win_prob_away,
      gp.proj_score_home, gp.proj_score_away, gp.confidence AS proj_confidence,
      gp.upset_risk,
      wt.abbreviation AS pick_abbr
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
    LEFT JOIN team_season_stats ats ON ats.team_id = at.id
    LEFT JOIN team_metric_snapshots htms ON htms.team_id = ht.id
    LEFT JOIN team_metric_snapshots atms ON atms.team_id = at.id
    LEFT JOIN game_projections gp ON gp.game_id = g.id
    LEFT JOIN teams wt ON gp.projected_winner_id = wt.id
    WHERE g.game_date = ${today}
    ORDER BY g.id
    LIMIT 12
  `);
  if (rows.length === 0) {
    // Fallback to most recent game date
    const recent = await getMostRecentGameDate();
    if (recent) {
      rows = await db.execute(sql`
        SELECT
          g.id, g.game_date, g.game_time, g.status, g.home_score, g.away_score,
          ht.abbreviation AS home_abbr, ht.nickname AS home_name,
          at.abbreviation AS away_abbr, at.nickname AS away_name,
          hts.wins AS home_wins, hts.losses AS home_losses,
          ats.wins AS away_wins, ats.losses AS away_losses,
          htms.tsc_score AS home_tsc, atms.tsc_score AS away_tsc,
          gp.projected_winner_id, gp.win_prob_home, gp.win_prob_away,
          gp.proj_score_home, gp.proj_score_away, gp.confidence AS proj_confidence,
          gp.upset_risk,
          wt.abbreviation AS pick_abbr
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
        LEFT JOIN team_season_stats ats ON ats.team_id = at.id
        LEFT JOIN team_metric_snapshots htms ON htms.team_id = ht.id
        LEFT JOIN team_metric_snapshots atms ON atms.team_id = at.id
        LEFT JOIN game_projections gp ON gp.game_id = g.id
        LEFT JOIN teams wt ON gp.projected_winner_id = wt.id
        WHERE g.game_date = ${recent}
        ORDER BY g.id
        LIMIT 12
      `);
    }
  }
  return rows;
}

/** Get biggest metric movers (LFI delta) for Pulse feed */
export async function getBiggestMovers(limit = 10) {
  const rows = await db.execute(sql`
    SELECT
      p.id, p.external_id, p.full_name, p.position,
      t.abbreviation AS team_abbr,
      pss.ppg,
      pms.bis_score, pms.lfi_score, pms.lfi_delta, pms.lfi_streak_label
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pms.lfi_delta IS NOT NULL AND pss.games_played > 10
    ORDER BY ABS(pms.lfi_delta) DESC
    LIMIT ${limit}
  `);
  return rows;
}

/** Get current key injuries (BIS 70+) grouped by team abbreviation */
export async function getKeyInjuriesByTeam() {
  const rows = await db.execute(sql`
    SELECT
      t.abbreviation AS team_abbr,
      p.full_name,
      pi.status AS injury_status,
      pi.injury_type,
      pms.bis_score
    FROM player_injuries pi
    JOIN players p ON pi.player_id = p.id
    JOIN teams t ON pi.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pi.is_current = true
      AND pi.status IN ('Out', 'Doubtful')
      AND pms.bis_score >= 70
    ORDER BY pms.bis_score DESC
  `);
  // Group by team_abbr
  const map: Record<string, { full_name: string; bis_score: number; injury_status: string }[]> = {};
  for (const r of rows as any[]) {
    const abbr = r.team_abbr;
    if (!map[abbr]) map[abbr] = [];
    map[abbr].push({ full_name: r.full_name, bis_score: Number(r.bis_score), injury_status: r.injury_status });
  }
  return map;
}

/** Get all players with full stats + metrics (for DataTable) */
export async function getAllPlayersWithFullStats(limit = 200) {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (p.id)
      p.id, p.external_id, p.full_name, p.position,
      t.abbreviation AS team_abbr,
      pss.games_played, pss.games_started,
      pss.ppg, pss.rpg, pss.apg, pss.spg, pss.bpg, pss.topg, pss.mpg, pss.fpg,
      pss.fg_pct, pss.fg3_pct, pss.ft_pct,
      pss.ts_pct, pss.efg_pct, pss.usg_pct,
      pss.per, pss.bpm, pss.vorp, pss.ws,
      pms.bis_score, pms.bis_confidence, pms.bis_percentile,
      pms.rda_score, pms.rda_label,
      pms.drs_score, pms.drs_label,
      pms.lfi_score, pms.lfi_confidence, pms.lfi_streak_label, pms.lfi_delta,
      pms.sps_score, pms.sps_label,
      pms.goi_score,
      t.conference AS team_conference,
      pi.status AS injury_status,
      pi.injury_type AS injury_type
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    LEFT JOIN player_injuries pi ON pi.player_id = p.id AND pi.is_current = true
    WHERE pss.ppg IS NOT NULL AND pss.games_played > 10
    ORDER BY p.id, pms.bis_score DESC NULLS LAST
  `);
  // Re-sort by BIS after DISTINCT ON
  const sorted = [...rows].sort((a: any, b: any) => {
    const aScore = Number(a.bis_score) || Number(a.ppg) || 0;
    const bScore = Number(b.bis_score) || Number(b.ppg) || 0;
    return bScore - aScore;
  });
  return sorted.slice(0, limit);
}

/** Get all teams with full stats + metrics (for DataTable) */
export async function getAllTeamsWithFullStats() {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (t.id)
      t.id, t.external_id, t.abbreviation, t.name, t.city, t.nickname,
      t.conference, t.division, t.primary_color, t.arena,
      tss.wins, tss.losses, tss.fg_pct, tss.fg3_pct, tss.ft_pct,
      tss.ortg, tss.drtg, tss.net_rating, tss.pace, tss.sos,
      tss.ts_pct, tss.efg_pct, tss.elo_rating,
      tms.tsc_score, tms.tsc_confidence,
      tms.ltfi_score,
      tms.lss_score, tms.lss_confidence,
      tms.pts_score, tms.pts_confidence,
      tms.rp_score,
      tms.drs_team_score
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    LEFT JOIN team_metric_snapshots tms ON tms.team_id = t.id
    ORDER BY t.id
  `);
  // Re-sort by TSC after DISTINCT ON
  return [...rows].sort((a: any, b: any) => {
    const aScore = Number(a.tsc_score) || 0;
    const bScore = Number(b.tsc_score) || 0;
    return bScore - aScore;
  });
}

/** Get projection accuracy stats (season, last 7 days, last 30 days) */
export async function getProjectionAccuracy() {
  const rows = await db.execute(sql`
    SELECT
      COUNT(*) as total_games,
      SUM(CASE
        WHEN (gp.projected_winner_id = g.home_team_id AND g.home_score > g.away_score)
          OR (gp.projected_winner_id = g.away_team_id AND g.away_score > g.home_score)
        THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN g.game_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as last_7_total,
      SUM(CASE
        WHEN g.game_date >= CURRENT_DATE - INTERVAL '7 days'
          AND ((gp.projected_winner_id = g.home_team_id AND g.home_score > g.away_score)
            OR (gp.projected_winner_id = g.away_team_id AND g.away_score > g.home_score))
        THEN 1 ELSE 0 END) as last_7_correct,
      SUM(CASE WHEN g.game_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) as last_30_total,
      SUM(CASE
        WHEN g.game_date >= CURRENT_DATE - INTERVAL '30 days'
          AND ((gp.projected_winner_id = g.home_team_id AND g.home_score > g.away_score)
            OR (gp.projected_winner_id = g.away_team_id AND g.away_score > g.home_score))
        THEN 1 ELSE 0 END) as last_30_correct
    FROM game_projections gp
    JOIN games g ON g.id = gp.game_id
    WHERE g.status = 'final' AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL
  `);
  return rows[0] || null;
}

/** Recent games with team metrics for dashboard */
export async function getRecentGamesWithMetrics(limit = 6) {
  const rows = await db.execute(sql`
    SELECT
      g.id, g.external_id, g.game_date, g.status, g.home_score, g.away_score,
      ht.abbreviation AS home_abbr, ht.nickname AS home_name,
      at.abbreviation AS away_abbr, at.nickname AS away_name,
      hts.wins AS home_wins, hts.losses AS home_losses,
      ats.wins AS away_wins, ats.losses AS away_losses,
      htms.tsc_score AS home_tsc, htms.ltfi_score AS home_ltfi,
      atms.tsc_score AS away_tsc, atms.ltfi_score AS away_ltfi
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN team_season_stats hts ON hts.team_id = ht.id
    LEFT JOIN team_season_stats ats ON ats.team_id = at.id
    LEFT JOIN team_metric_snapshots htms ON htms.team_id = ht.id
    LEFT JOIN team_metric_snapshots atms ON atms.team_id = at.id
    ORDER BY g.game_date DESC, g.id DESC
    LIMIT ${limit}
  `);
  return rows;
}
