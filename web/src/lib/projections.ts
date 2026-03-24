/**
 * CourtVision — Live Projections Engine v2
 *
 * Computes game projections on-the-fly at request time using ALL available signals:
 * - Current Elo ratings (from team_season_stats)
 * - Season ORTG/DRTG/pace/TS%/eFG%
 * - Team rolling windows (last 5 & 10 games for recent form)
 * - CourtVision team metrics (TSC, LTFI, LSS, DRS, RP, PTS)
 * - Home/away splits
 * - Back-to-back detection
 * - Injury data with BIS-weighted impact
 * - Strength of schedule
 *
 * Runs server-side, produces fresh projections every page load.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// ============================================================
// Constants
// ============================================================

const LEAGUE_AVG_ORTG = 112;
const LEAGUE_AVG_PACE = 100;
const LEAGUE_AVG_SCORE = 112;
const ELO_HOME_ADVANTAGE = 70;
const ELO_SPREAD_DIVISOR = 28;
const STAR_OUT_PENALTY = 3.5;
const STARTER_OUT_PENALTY = 1.5;
const B2B_PENALTY = 1.8; // points penalty for back-to-back

// ============================================================
// Types
// ============================================================

interface TeamProjectionData {
  id: number;
  abbreviation: string;
  wins: number;
  losses: number;
  ortg: number;
  drtg: number;
  pace: number;
  net_rating: number;
  fg_pct: number;
  fg3_pct: number;
  ts_pct: number;
  efg_pct: number;
  sos: number;
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
  elo_rating: number;
  // CourtVision metrics
  tsc_score: number | null;
  ltfi_score: number | null;
  lss_score: number | null;
  drs_team_score: number | null;
  rp_score: number | null;
  pts_score: number | null;
}

interface TeamRollingData {
  team_id: number;
  window_size: number;
  ortg: number;
  drtg: number;
  net_rating: number;
  pace: number;
  wins: number;
  losses: number;
  fg_pct: number;
  fg3_pct: number;
  ts_pct: number;
  opp_avg_net_rtg: number;
}

interface InjuryRecord {
  player_id: number;
  team_id: number;
  status: string;
  bis_score: number | null;
  injury_type: string | null;
}

interface ScheduledGame {
  id: number;
  game_date: string;
  home_team_id: number;
  away_team_id: number;
  is_back_to_back_home: boolean;
  is_back_to_back_away: boolean;
}

export interface GameProjection {
  game_id: number;
  projected_winner_id: number;
  winner_abbr: string;
  win_prob_home: number;
  win_prob_away: number;
  proj_score_home: number;
  proj_score_home_low: number;
  proj_score_home_high: number;
  proj_score_away: number;
  proj_score_away_low: number;
  proj_score_away_high: number;
  confidence: number;
  margin: number;
  upset_risk: string;
  key_reasons: string[];
  proj_pace: number;
}

export interface PlayerProjection {
  player_id: number;
  full_name: string;
  position: string;
  team_abbr: string;
  bis_score: number | null;
  lfi_score: number | null;
  proj_pts: number;
  proj_pts_low: number;
  proj_pts_high: number;
  proj_reb: number;
  proj_ast: number;
  proj_minutes: number;
  proj_volatility: string;
}

// ============================================================
// Helpers
// ============================================================

function num(val: unknown, fallback = 0): number {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function spreadToWinProb(spread: number): number {
  return 1 / (1 + Math.exp(-spread / 5.0));
}

function eloToSpread(eloDiff: number): number {
  return eloDiff / ELO_SPREAD_DIVISOR;
}

function getHomeAdvantage(team: TeamProjectionData): number {
  const homeGames = team.home_wins + team.home_losses;
  if (homeGames < 5) return 3.2;
  const homeWinPct = team.home_wins / homeGames;
  const awayGames = team.away_wins + team.away_losses;
  const awayWinPct = awayGames > 0 ? team.away_wins / awayGames : 0.5;
  return clamp((homeWinPct - awayWinPct) * 10, 1.0, 6.0);
}

function getInjuryPenalty(injuries: InjuryRecord[]): number {
  let penalty = 0;
  for (const inj of injuries) {
    if (inj.status === "Out" || inj.status === "out") {
      const bis = inj.bis_score ?? 0;
      if (bis >= 75) penalty += STAR_OUT_PENALTY;
      else if (bis >= 55) penalty += STARTER_OUT_PENALTY;
      else if (bis >= 40) penalty += 0.5;
    } else if (inj.status === "Doubtful" || inj.status === "doubtful") {
      const bis = inj.bis_score ?? 0;
      if (bis >= 70) penalty += STAR_OUT_PENALTY * 0.6;
      else if (bis >= 50) penalty += STARTER_OUT_PENALTY * 0.6;
    } else if (inj.status === "Questionable" || inj.status === "questionable") {
      const bis = inj.bis_score ?? 0;
      if (bis >= 75) penalty += STAR_OUT_PENALTY * 0.25;
      else if (bis >= 60) penalty += STARTER_OUT_PENALTY * 0.2;
    }
  }
  return clamp(penalty, 0, 15);
}

function getUpsetRisk(favoredProb: number, tscDiff: number): string {
  if (favoredProb < 0.55) return "toss-up";
  if (favoredProb < 0.60) return "high";
  if (favoredProb < 0.68) return "moderate";
  if (favoredProb < 0.75) return "low";
  if (tscDiff < 5) return "moderate";
  return "very-low";
}

/** Blend season averages with recent rolling form */
function blendedRating(
  seasonVal: number,
  rolling5: TeamRollingData | undefined,
  rolling10: TeamRollingData | undefined,
  key: "ortg" | "drtg" | "net_rating" | "pace",
): number {
  // Weight: 40% season, 30% last 10 games, 30% last 5 games
  let val = seasonVal;
  let totalWeight = 1.0;

  if (rolling10) {
    val = seasonVal * 0.4 + rolling10[key] * 0.3;
    totalWeight = 0.7;
  }
  if (rolling5) {
    val += rolling5[key] * 0.3;
  } else if (rolling10) {
    val += rolling10[key] * 0.3; // double-weight last 10 if no 5-game window
  } else {
    val = seasonVal; // just season if no rolling data
    totalWeight = 1.0;
  }

  return totalWeight < 1.0 ? val : val;
}

function generateReasons(
  home: TeamProjectionData,
  away: TeamProjectionData,
  homeProb: number,
  homeInjPenalty: number,
  awayInjPenalty: number,
  homeRolling5: TeamRollingData | undefined,
  awayRolling5: TeamRollingData | undefined,
  isB2BHome: boolean,
  isB2BAway: boolean,
  h2hRecord: H2HRecord | null,
): string[] {
  const reasons: string[] = [];
  const favored = homeProb >= 0.5 ? home : away;
  const underdog = homeProb >= 0.5 ? away : home;

  // Elo advantage
  const eloDiff = Math.abs(home.elo_rating - away.elo_rating);
  if (eloDiff > 40) {
    const better = home.elo_rating > away.elo_rating ? home : away;
    const worse = home.elo_rating > away.elo_rating ? away : home;
    reasons.push(`${better.abbreviation} Elo advantage: ${Math.round(better.elo_rating)} vs ${Math.round(worse.elo_rating)}`);
  }

  // Net rating
  const netDiff = favored.net_rating - underdog.net_rating;
  if (netDiff > 3) {
    reasons.push(`${favored.abbreviation} +${netDiff.toFixed(1)} net rating advantage`);
  }

  // Recent form (last 5 games)
  if (homeRolling5 && awayRolling5) {
    const homeRecent = homeRolling5.wins - homeRolling5.losses;
    const awayRecent = awayRolling5.wins - awayRolling5.losses;
    if (Math.abs(homeRecent - awayRecent) >= 3) {
      const hotter = homeRecent > awayRecent ? home : away;
      const hotRolling = homeRecent > awayRecent ? homeRolling5 : awayRolling5;
      reasons.push(`${hotter.abbreviation} hot recently (${hotRolling.wins}-${hotRolling.losses} last 5 games)`);
    }
  }

  // TSC
  if (home.tsc_score && away.tsc_score) {
    const tscDiff = num(home.tsc_score) - num(away.tsc_score);
    if (Math.abs(tscDiff) > 5) {
      const better = tscDiff > 0 ? home : away;
      reasons.push(`${better.abbreviation} TSC ${num(better.tsc_score).toFixed(0)} signals stronger roster`);
    }
  }

  // LSS (Lineup Strength)
  if (home.lss_score && away.lss_score) {
    const lssDiff = num(home.lss_score) - num(away.lss_score);
    if (Math.abs(lssDiff) > 8) {
      const better = lssDiff > 0 ? home : away;
      reasons.push(`${better.abbreviation} deeper lineup (LSS ${num(better.lss_score).toFixed(0)})`);
    }
  }

  // Home court
  if (homeProb >= 0.5) {
    reasons.push(`Home court advantage (${home.home_wins}-${home.home_losses} at home)`);
  } else {
    reasons.push(`${away.abbreviation} strong on the road (${away.away_wins}-${away.away_losses} away)`);
  }

  // Back-to-back
  if (isB2BHome && !isB2BAway) {
    reasons.push(`${home.abbreviation} on back-to-back — fatigue factor`);
  } else if (isB2BAway && !isB2BHome) {
    reasons.push(`${away.abbreviation} on back-to-back — fatigue factor`);
  }

  // Injuries
  if (homeInjPenalty >= STAR_OUT_PENALTY) {
    reasons.push(`${home.abbreviation} missing key player(s) — significant impact`);
  }
  if (awayInjPenalty >= STAR_OUT_PENALTY) {
    reasons.push(`${away.abbreviation} missing key player(s) — significant impact`);
  }

  // LTFI momentum
  if (home.ltfi_score && away.ltfi_score) {
    const ltfiDiff = num(home.ltfi_score) - num(away.ltfi_score);
    if (Math.abs(ltfiDiff) > 8) {
      const hotter = ltfiDiff > 0 ? home : away;
      reasons.push(`${hotter.abbreviation} riding momentum (LTFI ${num(hotter.ltfi_score).toFixed(0)})`);
    }
  }

  // DRS (Defensive Rating Score)
  if (home.drs_team_score && away.drs_team_score) {
    const drsDiff = num(home.drs_team_score) - num(away.drs_team_score);
    if (Math.abs(drsDiff) > 8) {
      const better = drsDiff > 0 ? home : away;
      reasons.push(`${better.abbreviation} elite defense (DRS ${num(better.drs_team_score).toFixed(0)})`);
    }
  }

  // Head-to-head matchup history
  if (h2hRecord && h2hRecord.games_played >= 1) {
    const homeDominates = h2hRecord.home_wins > h2hRecord.away_wins;
    const awayDominates = h2hRecord.away_wins > h2hRecord.home_wins;
    const marginStr = Math.abs(h2hRecord.avg_margin).toFixed(1);
    if (homeDominates && Math.abs(h2hRecord.avg_margin) > 3) {
      reasons.push(`${home.abbreviation} ${h2hRecord.home_wins}-${h2hRecord.away_wins} H2H this season (avg margin +${marginStr})`);
    } else if (awayDominates && Math.abs(h2hRecord.avg_margin) > 3) {
      reasons.push(`${away.abbreviation} ${h2hRecord.away_wins}-${h2hRecord.home_wins} H2H this season (avg margin +${marginStr})`);
    } else if (h2hRecord.games_played >= 2) {
      reasons.push(`Season series ${h2hRecord.home_wins}-${h2hRecord.away_wins} — matchup is competitive`);
    }
  }

  // SOS
  const sosDiff = Math.abs(home.sos - away.sos);
  if (sosDiff > 2) {
    const harder = home.sos > away.sos ? home : away;
    reasons.push(`${harder.abbreviation} battle-tested (tougher SOS: ${harder.sos.toFixed(1)})`);
  }

  return reasons.slice(0, 6);
}

// ============================================================
// Data Loaders
// ============================================================

async function loadTeamData(): Promise<Map<number, TeamProjectionData>> {
  const rows = await db.execute(sql`
    SELECT
      t.id, t.abbreviation,
      tss.wins, tss.losses, tss.ortg, tss.drtg, tss.net_rating, tss.pace,
      tss.fg_pct, tss.fg3_pct, tss.ts_pct, tss.efg_pct, tss.sos,
      tss.home_wins, tss.home_losses, tss.away_wins, tss.away_losses,
      tss.elo_rating,
      tms.tsc_score, tms.ltfi_score, tms.lss_score,
      tms.drs_team_score, tms.rp_score, tms.pts_score
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    LEFT JOIN team_metric_snapshots tms ON tms.team_id = t.id
  `);

  const map = new Map<number, TeamProjectionData>();
  for (const t of rows) {
    map.set(Number(t.id), {
      id: Number(t.id),
      abbreviation: String(t.abbreviation),
      wins: num(t.wins),
      losses: num(t.losses),
      ortg: num(t.ortg, LEAGUE_AVG_ORTG),
      drtg: num(t.drtg, LEAGUE_AVG_ORTG),
      pace: num(t.pace, LEAGUE_AVG_PACE),
      net_rating: num(t.net_rating),
      fg_pct: num(t.fg_pct, 0.46),
      fg3_pct: num(t.fg3_pct, 0.36),
      ts_pct: num(t.ts_pct, 0.56),
      efg_pct: num(t.efg_pct, 0.53),
      sos: num(t.sos),
      home_wins: num(t.home_wins),
      home_losses: num(t.home_losses),
      away_wins: num(t.away_wins),
      away_losses: num(t.away_losses),
      elo_rating: num(t.elo_rating, 1500),
      tsc_score: t.tsc_score ? num(t.tsc_score) : null,
      ltfi_score: t.ltfi_score ? num(t.ltfi_score) : null,
      lss_score: t.lss_score ? num(t.lss_score) : null,
      drs_team_score: t.drs_team_score ? num(t.drs_team_score) : null,
      rp_score: t.rp_score ? num(t.rp_score) : null,
      pts_score: t.pts_score ? num(t.pts_score) : null,
    });
  }
  return map;
}

/** Load rolling window data for all teams (window 5 and 10) */
async function loadTeamRollingWindows(): Promise<Map<string, TeamRollingData>> {
  const rows = await db.execute(sql`
    SELECT team_id, window_size, ortg, drtg, net_rating, pace,
           wins, losses, fg_pct, fg3_pct, ts_pct, opp_avg_net_rtg
    FROM team_rolling_windows
    WHERE window_size IN (5, 10)
    ORDER BY team_id, window_size
  `);

  const map = new Map<string, TeamRollingData>();
  for (const r of rows) {
    const key = `${r.team_id}_${r.window_size}`;
    map.set(key, {
      team_id: Number(r.team_id),
      window_size: Number(r.window_size),
      ortg: num(r.ortg, LEAGUE_AVG_ORTG),
      drtg: num(r.drtg, LEAGUE_AVG_ORTG),
      net_rating: num(r.net_rating),
      pace: num(r.pace, LEAGUE_AVG_PACE),
      wins: num(r.wins),
      losses: num(r.losses),
      fg_pct: num(r.fg_pct),
      fg3_pct: num(r.fg3_pct),
      ts_pct: num(r.ts_pct),
      opp_avg_net_rtg: num(r.opp_avg_net_rtg),
    });
  }
  return map;
}

async function loadCurrentInjuries(): Promise<Map<number, InjuryRecord[]>> {
  const rows = await db.execute(sql`
    SELECT
      pi.player_id, pi.team_id, pi.status, pi.injury_type,
      pms.bis_score
    FROM player_injuries pi
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = pi.player_id
    WHERE pi.is_current = true
  `);

  const map = new Map<number, InjuryRecord[]>();
  for (const r of rows) {
    const teamId = Number(r.team_id);
    if (!map.has(teamId)) map.set(teamId, []);
    map.get(teamId)!.push({
      player_id: Number(r.player_id),
      team_id: teamId,
      status: String(r.status),
      bis_score: r.bis_score ? num(r.bis_score) : null,
      injury_type: r.injury_type ? String(r.injury_type) : null,
    });
  }
  return map;
}

/** H2H matchup record between two teams this season */
interface H2HRecord {
  home_wins: number;
  away_wins: number;
  avg_margin: number; // positive = home team dominates the matchup
  games_played: number;
}

/**
 * Load head-to-head matchup history for the current season.
 * Key format: "{teamA_id}_{teamB_id}" where teamA < teamB (canonical order).
 * Returns avg margin from teamA's perspective.
 */
async function loadH2HRecords(): Promise<Map<string, { wins_a: number; wins_b: number; margin_a: number; games: number }>> {
  const rows = await db.execute(sql`
    SELECT
      home_team_id, away_team_id,
      home_score, away_score
    FROM games
    WHERE status = 'final'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
    ORDER BY game_date ASC
  `);

  const map = new Map<string, { wins_a: number; wins_b: number; total_margin: number; games: number }>();

  for (const r of rows) {
    const hid = Number(r.home_team_id);
    const aid = Number(r.away_team_id);
    const hs = Number(r.home_score);
    const as_ = Number(r.away_score);

    // Canonical key: smaller ID first
    const [teamA, teamB] = hid < aid ? [hid, aid] : [aid, hid];
    const key = `${teamA}_${teamB}`;

    if (!map.has(key)) map.set(key, { wins_a: 0, wins_b: 0, total_margin: 0, games: 0 });
    const rec = map.get(key)!;
    rec.games++;

    // Margin from teamA's perspective
    const marginA = hid === teamA ? (hs - as_) : (as_ - hs);
    rec.total_margin += marginA;

    if (hs > as_) {
      // Home team won
      if (hid === teamA) rec.wins_a++;
      else rec.wins_b++;
    } else {
      // Away team won
      if (aid === teamA) rec.wins_a++;
      else rec.wins_b++;
    }
  }

  const result = new Map<string, { wins_a: number; wins_b: number; margin_a: number; games: number }>();
  for (const [key, val] of map) {
    result.set(key, {
      wins_a: val.wins_a,
      wins_b: val.wins_b,
      margin_a: val.games > 0 ? val.total_margin / val.games : 0,
      games: val.games,
    });
  }
  return result;
}

function getH2HSpread(
  homeId: number,
  awayId: number,
  h2h: Map<string, { wins_a: number; wins_b: number; margin_a: number; games: number }>,
): { spread: number; record: H2HRecord | null } {
  const [teamA, teamB] = homeId < awayId ? [homeId, awayId] : [awayId, homeId];
  const key = `${teamA}_${teamB}`;
  const rec = h2h.get(key);
  if (!rec || rec.games < 1) return { spread: 0, record: null };

  // Convert to home team perspective
  const homeIsA = homeId === teamA;
  const homeWinsInMatchup = homeIsA ? rec.wins_a : rec.wins_b;
  const awayWinsInMatchup = homeIsA ? rec.wins_b : rec.wins_a;
  const avgMarginHome = homeIsA ? rec.margin_a : -rec.margin_a;

  // Scale: use avg margin as a point spread indicator
  // Weight by games played (more games = more reliable)
  const reliability = Math.min(rec.games / 4, 1.0); // max out at 4 games
  const h2hSpread = avgMarginHome * reliability * 0.3; // dampen effect

  return {
    spread: clamp(h2hSpread, -6, 6),
    record: {
      home_wins: homeWinsInMatchup,
      away_wins: awayWinsInMatchup,
      avg_margin: avgMarginHome,
      games_played: rec.games,
    },
  };
}

// ============================================================
// Core Projection
// ============================================================

function computeProjection(
  game: ScheduledGame,
  home: TeamProjectionData,
  away: TeamProjectionData,
  homeInjuries: InjuryRecord[],
  awayInjuries: InjuryRecord[],
  homeRolling5: TeamRollingData | undefined,
  awayRolling5: TeamRollingData | undefined,
  homeRolling10: TeamRollingData | undefined,
  awayRolling10: TeamRollingData | undefined,
  h2hData: Map<string, { wins_a: number; wins_b: number; margin_a: number; games: number }>,
): GameProjection {
  // ── 1. Elo-based spread (with home advantage in Elo) ──
  const homeElo = home.elo_rating + ELO_HOME_ADVANTAGE;
  const awayElo = away.elo_rating;
  const eloSpread = eloToSpread(homeElo - awayElo);

  // ── 2. Efficiency-based spread (blended season + recent form) ──
  const homeOrtg = blendedRating(home.ortg, homeRolling5, homeRolling10, "ortg");
  const homeDrtg = blendedRating(home.drtg, homeRolling5, homeRolling10, "drtg");
  const awayOrtg = blendedRating(away.ortg, awayRolling5, awayRolling10, "ortg");
  const awayDrtg = blendedRating(away.drtg, awayRolling5, awayRolling10, "drtg");
  const homePace = blendedRating(home.pace, homeRolling5, homeRolling10, "pace");
  const awayPace = blendedRating(away.pace, awayRolling5, awayRolling10, "pace");

  const projPace = (homePace + awayPace) / 2;
  const homeEff = (homeOrtg + (LEAGUE_AVG_ORTG * 2 - awayDrtg)) / 2;
  const awayEff = (awayOrtg + (LEAGUE_AVG_ORTG * 2 - homeDrtg)) / 2;
  const possessions = projPace / LEAGUE_AVG_PACE;
  const homeScoreBase = (homeEff / 100) * possessions * LEAGUE_AVG_SCORE;
  const awayScoreBase = (awayEff / 100) * possessions * LEAGUE_AVG_SCORE;
  const ratingsSpread = homeScoreBase - awayScoreBase;

  // ── 3. Home court advantage ──
  const homeAdv = getHomeAdvantage(home);

  // ── 4. Back-to-back fatigue ──
  let b2bSpread = 0;
  if (game.is_back_to_back_home && !game.is_back_to_back_away) b2bSpread = -B2B_PENALTY;
  else if (game.is_back_to_back_away && !game.is_back_to_back_home) b2bSpread = B2B_PENALTY;

  // ── 5. Injuries ──
  const homeInjPenalty = getInjuryPenalty(homeInjuries);
  const awayInjPenalty = getInjuryPenalty(awayInjuries);
  const injurySpread = awayInjPenalty - homeInjPenalty;

  // ── 6. CourtVision metrics spread ──
  let cvSpread = 0;
  // TSC: overall team strength composite
  if (home.tsc_score != null && away.tsc_score != null) {
    cvSpread += (home.tsc_score - away.tsc_score) * 0.12;
  }
  // LTFI: momentum / hot streaks
  if (home.ltfi_score != null && away.ltfi_score != null) {
    cvSpread += (home.ltfi_score - away.ltfi_score) * 0.06;
  }
  // LSS: lineup depth
  if (home.lss_score != null && away.lss_score != null) {
    cvSpread += (home.lss_score - away.lss_score) * 0.04;
  }
  // DRS: defensive rating score
  if (home.drs_team_score != null && away.drs_team_score != null) {
    cvSpread += (home.drs_team_score - away.drs_team_score) * 0.05;
  }
  // RP: rest/performance factor
  if (home.rp_score != null && away.rp_score != null) {
    cvSpread += (home.rp_score - away.rp_score) * 0.03;
  }

  // ── 7. SOS adjustment (teams with harder SOS are underrated) ──
  const sosSpread = (home.sos - away.sos) * 0.3;

  // ── 8. Head-to-head matchup factor ──
  const { spread: h2hSpread, record: h2hRecord } = getH2HSpread(game.home_team_id, game.away_team_id, h2hData);

  // ── 9. Combined spread with weighted components ──
  const combinedSpread =
    eloSpread * 0.28 +
    ratingsSpread * 0.23 +
    homeAdv * 0.09 +
    b2bSpread * 0.05 +
    injurySpread * 0.09 +
    cvSpread * 0.11 +
    sosSpread * 0.03 +
    h2hSpread * 0.07 +
    // Recent form bonus (from rolling windows)
    (homeRolling5 && awayRolling5
      ? (homeRolling5.net_rating - awayRolling5.net_rating) * 0.15
      : 0) * 0.05;

  const homeProb = spreadToWinProb(combinedSpread);
  const awayProb = 1 - homeProb;

  // ── Projected scores ──
  const avgScore = (homeScoreBase + awayScoreBase) / 2;
  let finalHomeScore = avgScore + combinedSpread / 2;
  let finalAwayScore = avgScore - combinedSpread / 2;

  // B2B fatigue reduces scoring for tired team
  if (game.is_back_to_back_home) finalHomeScore -= 1.5;
  if (game.is_back_to_back_away) finalAwayScore -= 1.5;

  const projectedWinnerId = homeProb >= 0.5 ? home.id : away.id;
  const winnerAbbr = homeProb >= 0.5 ? home.abbreviation : away.abbreviation;
  const margin = Math.abs(combinedSpread);
  const confidence = clamp(Math.abs(homeProb - 0.5) * 2 + 0.5, 0.5, 0.95);
  const tscDiff = Math.abs(num(home.tsc_score) - num(away.tsc_score));
  const upsetRisk = getUpsetRisk(Math.max(homeProb, awayProb), tscDiff);
  const reasons = generateReasons(
    home, away, homeProb, homeInjPenalty, awayInjPenalty,
    homeRolling5, awayRolling5,
    game.is_back_to_back_home, game.is_back_to_back_away,
    h2hRecord,
  );

  const variance = clamp(12 - confidence * 5, 6, 14);

  return {
    game_id: game.id,
    projected_winner_id: projectedWinnerId,
    winner_abbr: winnerAbbr,
    win_prob_home: homeProb,
    win_prob_away: awayProb,
    proj_score_home: Math.round(finalHomeScore),
    proj_score_home_low: Math.round(finalHomeScore - variance),
    proj_score_home_high: Math.round(finalHomeScore + variance),
    proj_score_away: Math.round(finalAwayScore),
    proj_score_away_low: Math.round(finalAwayScore - variance),
    proj_score_away_high: Math.round(finalAwayScore + variance),
    confidence,
    margin,
    upset_risk: upsetRisk,
    key_reasons: reasons,
    proj_pace: projPace,
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Compute live projections for given game IDs.
 * Called server-side at request time — always uses fresh data.
 */
export async function computeLiveProjections(gameIds: number[]): Promise<Map<number, GameProjection>> {
  if (gameIds.length === 0) return new Map();

  const [teamData, injuries, rollingWindows, h2hData] = await Promise.all([
    loadTeamData(),
    loadCurrentInjuries(),
    loadTeamRollingWindows(),
    loadH2HRecords(),
  ]);

  // Load game data including B2B flags
  const pgArray = `{${gameIds.join(",")}}`;
  const rows = await db.execute(sql`
    SELECT id, game_date, home_team_id, away_team_id,
           is_back_to_back_home, is_back_to_back_away
    FROM games
    WHERE id = ANY(${pgArray}::int[])
      AND status != 'final'
  `);

  const projections = new Map<number, GameProjection>();

  for (const row of rows) {
    const game: ScheduledGame = {
      id: Number(row.id),
      game_date: String(row.game_date),
      home_team_id: Number(row.home_team_id),
      away_team_id: Number(row.away_team_id),
      is_back_to_back_home: !!row.is_back_to_back_home,
      is_back_to_back_away: !!row.is_back_to_back_away,
    };

    const home = teamData.get(game.home_team_id);
    const away = teamData.get(game.away_team_id);
    if (!home || !away) continue;

    const homeInj = injuries.get(game.home_team_id) || [];
    const awayInj = injuries.get(game.away_team_id) || [];

    const homeR5 = rollingWindows.get(`${game.home_team_id}_5`);
    const awayR5 = rollingWindows.get(`${game.away_team_id}_5`);
    const homeR10 = rollingWindows.get(`${game.home_team_id}_10`);
    const awayR10 = rollingWindows.get(`${game.away_team_id}_10`);

    projections.set(game.id, computeProjection(
      game, home, away, homeInj, awayInj,
      homeR5, awayR5, homeR10, awayR10,
      h2hData,
    ));
  }

  return projections;
}

/**
 * Compute live player projections for a specific game.
 * Uses player rolling windows for recent form + CourtVision metrics.
 */
export async function computeLivePlayerProjections(gameId: number): Promise<PlayerProjection[]> {
  const gameRows = await db.execute(sql`
    SELECT home_team_id, away_team_id FROM games WHERE id = ${gameId} AND status != 'final' LIMIT 1
  `);
  if (gameRows.length === 0) return [];

  const homeTeamId = Number(gameRows[0].home_team_id);
  const awayTeamId = Number(gameRows[0].away_team_id);
  const teamIds = `{${homeTeamId},${awayTeamId}}`;

  // Get top players with season stats + metrics + rolling recent form
  const playerRows = await db.execute(sql`
    SELECT
      p.id, p.full_name, p.position,
      pss.team_id, pss.ppg, pss.rpg, pss.apg, pss.spg, pss.bpg, pss.topg, pss.mpg,
      pss.usg_pct, pss.ts_pct, pss.fg_pct, pss.fg3_pct,
      pms.bis_score, pms.lfi_score, pms.goi_score, pms.sps_score, pms.drs_score,
      pms.lfi_streak_label, pms.lfi_delta,
      t.abbreviation AS team_abbr,
      prw.ppg AS recent_ppg, prw.rpg AS recent_rpg, prw.apg AS recent_apg,
      prw.fg_pct AS recent_fg_pct, prw.ts_pct AS recent_ts_pct
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    LEFT JOIN player_rolling_windows prw ON prw.player_id = p.id AND prw.window_size = 5
    JOIN teams t ON pss.team_id = t.id
    WHERE pss.team_id = ANY(${teamIds}::int[])
      AND pss.games_played > 10
      AND pss.ppg > 5
    ORDER BY COALESCE(pms.bis_score, pss.ppg) DESC
    LIMIT 12
  `);

  // Check injuries for these players
  const injuryRows = await db.execute(sql`
    SELECT player_id, status FROM player_injuries
    WHERE team_id = ANY(${teamIds}::int[]) AND is_current = true
  `);
  const injuryMap = new Map<number, string>();
  for (const inj of injuryRows) {
    injuryMap.set(Number(inj.player_id), String(inj.status));
  }

  return playerRows
    .filter((p: any) => {
      // Skip players who are Out
      const injStatus = injuryMap.get(Number(p.id));
      return injStatus !== "Out" && injStatus !== "out";
    })
    .map((p: any) => {
      const ppg = num(p.ppg);
      const rpg = num(p.rpg);
      const apg = num(p.apg);
      const mpg = num(p.mpg);
      const lfi = num(p.lfi_score, 50);
      const goi = num(p.goi_score, 50);
      const lfiDelta = num(p.lfi_delta, 0);

      // Blend season with recent form (60% season, 40% recent)
      const recentPpg = p.recent_ppg ? num(p.recent_ppg) : ppg;
      const recentRpg = p.recent_rpg ? num(p.recent_rpg) : rpg;
      const recentApg = p.recent_apg ? num(p.recent_apg) : apg;

      const blendedPpg = ppg * 0.6 + recentPpg * 0.4;
      const blendedRpg = rpg * 0.6 + recentRpg * 0.4;
      const blendedApg = apg * 0.6 + recentApg * 0.4;

      // LFI adjustment: hot streaks boost, cold streaks dampen
      const lfiAdj = (lfi - 50) / 100;
      const goiAdj = (goi - 50) / 200;
      // Extra boost if LFI is trending up (positive delta)
      const trendAdj = clamp(lfiDelta * 0.005, -0.05, 0.08);

      const projPts = blendedPpg * (1 + lfiAdj * 0.15 + goiAdj * 0.05 + trendAdj);
      const projReb = blendedRpg * (1 + lfiAdj * 0.08);
      const projAst = blendedApg * (1 + lfiAdj * 0.10);
      const projMinutes = Math.min(mpg * (1 + goiAdj * 0.05), 42);

      // Questionable status reduces projections
      const injStatus = injuryMap.get(Number(p.id));
      const injMultiplier = injStatus === "Questionable" || injStatus === "questionable" ? 0.85 : 1.0;

      // Variance based on recent consistency
      const recentDiff = Math.abs(recentPpg - ppg);
      const baseVar = ppg * 0.25;
      const adjustedVar = baseVar + recentDiff * 0.3;
      const volatility = adjustedVar / ppg > 0.35 ? "high" : adjustedVar / ppg > 0.22 ? "moderate" : "steady";

      return {
        player_id: Number(p.id),
        full_name: String(p.full_name),
        position: String(p.position || "—"),
        team_abbr: String(p.team_abbr),
        bis_score: p.bis_score ? num(p.bis_score) : null,
        lfi_score: p.lfi_score ? num(p.lfi_score) : null,
        proj_pts: Math.round(projPts * injMultiplier * 10) / 10,
        proj_pts_low: Math.round(Math.max(0, projPts * injMultiplier - adjustedVar) * 10) / 10,
        proj_pts_high: Math.round((projPts * injMultiplier + adjustedVar) * 10) / 10,
        proj_reb: Math.round(projReb * injMultiplier * 10) / 10,
        proj_ast: Math.round(projAst * injMultiplier * 10) / 10,
        proj_minutes: Math.round(projMinutes * 10) / 10,
        proj_volatility: volatility,
      };
    });
}
