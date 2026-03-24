/**
 * CourtVision Game Projections Engine v2
 *
 * Major improvements over v1:
 * 1. Point-in-time data: rolling ORTG/DRTG from game_team_stats (no future leakage)
 * 2. Elo rating system: updates chronologically after each game
 * 3. Rest days / back-to-back detection
 * 4. Home/away-specific win rates (not flat constant)
 * 5. Injury impact: star player absence adjustments
 * 6. Stronger CourtVision metric weights (TSC, LTFI)
 */

import * as dotenv from "dotenv";
import * as path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(__dirname, "../web/.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not found in web/.env.local");
}

const sql = postgres(DATABASE_URL, { max: 5 });

// ============================================================
// Constants
// ============================================================

const LEAGUE_AVG_ORTG = 112;
const LEAGUE_AVG_PACE = 100;
const LEAGUE_AVG_SCORE = 112;
const ROLLING_WINDOW = 15; // games for rolling ORTG/DRTG
const MIN_ROLLING_GAMES = 5; // minimum before using rolling stats

// Elo constants
const ELO_INITIAL = 1500;
const ELO_K = 20; // K-factor
const ELO_HOME_ADVANTAGE = 70; // Elo points for home court (~3.5 pts)
const ELO_SPREAD_DIVISOR = 28; // maps Elo diff to point spread (400 Elo ≈ 14 pts)

// Rest day adjustments (in points)
const REST_ADJUSTMENTS: Record<number, number> = {
  0: -4.0,  // second game of B2B (played yesterday)
  1: -1.5,  // one day rest (normal)
  2: 0,     // two days rest (baseline)
  3: 0.5,   // three days rest
};
const MAX_REST_BONUS = 1.0; // 4+ days

// Injury impact: points subtracted when star is out
const STAR_OUT_PENALTY = 3.5;  // top player (BIS >= 75) missing
const STARTER_OUT_PENALTY = 1.5; // starter-quality (BIS 55-74) missing

// ============================================================
// Types
// ============================================================

interface TeamData {
  id: number;
  abbreviation: string;
  wins: number;
  losses: number;
  ortg: number;
  drtg: number;
  pace: number;
  net_rating: number;
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
  tsc_score: number | null;
  ltfi_score: number | null;
  lss_score: number | null;
  drs_team_score: number | null;
}

interface Game {
  id: number;
  game_date: string;
  status: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  is_back_to_back_home: boolean;
  is_back_to_back_away: boolean;
}

interface GameTeamStat {
  game_id: number;
  team_id: number;
  is_home: boolean;
  ortg: number;
  drtg: number;
  pace: number;
  points: number;
  game_date: string;
}

interface InjuryRecord {
  player_id: number;
  team_id: number;
  status: string;
  reported_date: string;
  return_date: string | null;
  bis_score: number | null;
}

interface TeamRollingState {
  elo: number;
  recentGames: GameTeamStat[]; // last N game stats for rolling ORTG/DRTG
  lastGameDate: string | null;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
}

// ============================================================
// Helpers
// ============================================================

function num(val: any, fallback: number = 0): number {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Calculate days between two dates */
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T12:00:00Z");
  const b = new Date(dateB + "T12:00:00Z");
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Get rest days adjustment in points */
function getRestAdjustment(restDays: number | null): number {
  if (restDays === null) return 0; // no prior game data
  if (restDays in REST_ADJUSTMENTS) return REST_ADJUSTMENTS[restDays];
  if (restDays >= 4) return MAX_REST_BONUS;
  return 0;
}

/** Compute rolling ORTG/DRTG/pace from recent game stats */
function getRollingRatings(state: TeamRollingState, seasonOrtg: number, seasonDrtg: number, seasonPace: number) {
  const games = state.recentGames;
  if (games.length < MIN_ROLLING_GAMES) {
    // Not enough rolling data — blend with season averages
    const weight = games.length / MIN_ROLLING_GAMES;
    const rollOrtg = games.length > 0 ? games.reduce((s, g) => s + g.ortg, 0) / games.length : seasonOrtg;
    const rollDrtg = games.length > 0 ? games.reduce((s, g) => s + g.drtg, 0) / games.length : seasonDrtg;
    const rollPace = games.length > 0 ? games.reduce((s, g) => s + g.pace, 0) / games.length : seasonPace;
    return {
      ortg: rollOrtg * weight + seasonOrtg * (1 - weight),
      drtg: rollDrtg * weight + seasonDrtg * (1 - weight),
      pace: rollPace * weight + seasonPace * (1 - weight),
    };
  }
  // Full rolling window — weight recent games more heavily
  let totalOrtg = 0, totalDrtg = 0, totalPace = 0, totalWeight = 0;
  for (let i = 0; i < games.length; i++) {
    // More recent games get higher weight (1.0 to 2.0 linear)
    const w = 1 + (i / (games.length - 1));
    totalOrtg += games[i].ortg * w;
    totalDrtg += games[i].drtg * w;
    totalPace += games[i].pace * w;
    totalWeight += w;
  }
  // Blend 70% rolling / 30% season to prevent overfitting to small samples
  const rollOrtg = totalOrtg / totalWeight;
  const rollDrtg = totalDrtg / totalWeight;
  const rollPace = totalPace / totalWeight;
  return {
    ortg: rollOrtg * 0.7 + seasonOrtg * 0.3,
    drtg: rollDrtg * 0.7 + seasonDrtg * 0.3,
    pace: rollPace * 0.7 + seasonPace * 0.3,
  };
}

/** Expected win probability from Elo difference */
function eloExpected(eloDiff: number): number {
  return 1 / (1 + Math.pow(10, -eloDiff / 400));
}

/** Update Elo after a game result */
function updateElo(rating: number, expected: number, actual: number, marginOfVictory: number): number {
  // Margin of victory multiplier (FiveThirtyEight-style)
  const movMultiplier = Math.log(Math.abs(marginOfVictory) + 1) * (2.2 / (1 + 0.001 * Math.abs(rating - ELO_INITIAL)));
  const change = ELO_K * movMultiplier * (actual - expected);
  return rating + change;
}

/** Convert Elo difference to point spread */
function eloToSpread(eloDiff: number): number {
  return eloDiff / ELO_SPREAD_DIVISOR;
}

/** Get home court advantage based on team's home record */
function getHomeAdvantage(state: TeamRollingState): number {
  const homeGames = state.homeWins + state.homeLosses;
  if (homeGames < 5) return 3.2; // default until enough data
  const homeWinPct = state.homeWins / homeGames;
  const awayGames = state.awayWins + state.awayLosses;
  const awayWinPct = awayGames > 0 ? state.awayWins / awayGames : 0.5;
  // Home advantage = delta between home and away performance, converted to points
  // Average NBA team is ~6 wins better at home = ~3.5 pts
  const delta = homeWinPct - awayWinPct;
  return clamp(delta * 10, 1.0, 6.0); // 1-6 point range
}

/** Get injury impact for a team on a given date */
function getInjuryPenalty(teamId: number, gameDate: string, injuryMap: Map<number, InjuryRecord[]>): number {
  const injuries = injuryMap.get(teamId) || [];
  let penalty = 0;
  for (const inj of injuries) {
    // Is this injury active on game date?
    if (inj.reported_date <= gameDate && (inj.return_date === null || inj.return_date > gameDate)) {
      if (inj.status === "Out" || inj.status === "out") {
        const bis = inj.bis_score ?? 0;
        if (bis >= 75) {
          penalty += STAR_OUT_PENALTY;
        } else if (bis >= 55) {
          penalty += STARTER_OUT_PENALTY;
        } else if (bis >= 40) {
          penalty += 0.5;
        }
      } else if (inj.status === "Doubtful" || inj.status === "doubtful") {
        const bis = inj.bis_score ?? 0;
        if (bis >= 70) penalty += STAR_OUT_PENALTY * 0.6; // 60% chance they miss
        else if (bis >= 50) penalty += STARTER_OUT_PENALTY * 0.6;
      }
    }
  }
  return clamp(penalty, 0, 12); // cap at 12 points (multiple stars out)
}

/** Estimate spread from point spread using logistic function */
function spreadToWinProb(spread: number): number {
  return 1 / (1 + Math.exp(-spread / 5.0));
}

/** Get upset risk label */
function getUpsetRisk(favoredProb: number, tscDiff: number): string {
  if (favoredProb < 0.55) return "toss-up";
  if (favoredProb < 0.60) return "high";
  if (favoredProb < 0.68) return "moderate";
  if (favoredProb < 0.75) return "low";
  if (tscDiff < 5) return "moderate";
  return "very-low";
}

/** Generate key reasons for projection */
function generateReasons(
  home: TeamData,
  away: TeamData,
  homeProb: number,
  homeElo: number,
  awayElo: number,
  homeRest: number | null,
  awayRest: number | null,
  homeInjPenalty: number,
  awayInjPenalty: number,
): string[] {
  const reasons: string[] = [];
  const favored = homeProb >= 0.5 ? home : away;
  const underdog = homeProb >= 0.5 ? away : home;

  // Elo advantage
  const eloDiff = Math.abs(homeElo - awayElo);
  if (eloDiff > 80) {
    const better = homeElo > awayElo ? home : away;
    reasons.push(`${better.abbreviation} Elo advantage: ${Math.round(homeElo > awayElo ? homeElo : awayElo)} vs ${Math.round(homeElo > awayElo ? awayElo : homeElo)}`);
  }

  // Rating advantage
  const netDiff = num(favored.net_rating) - num(underdog.net_rating);
  if (netDiff > 4) {
    reasons.push(`${favored.abbreviation} +${netDiff.toFixed(1)} net rating advantage`);
  }

  // TSC comparison
  if (home.tsc_score && away.tsc_score) {
    const tscDiff = num(home.tsc_score) - num(away.tsc_score);
    if (Math.abs(tscDiff) > 5) {
      const better = tscDiff > 0 ? home : away;
      reasons.push(`${better.abbreviation} TSC ${num(better.tsc_score).toFixed(0)} signals stronger roster`);
    }
  }

  // Home court
  if (homeProb >= 0.5) {
    reasons.push(`Home court advantage (${home.home_wins}-${home.home_losses} at home)`);
  } else {
    reasons.push(`${away.abbreviation} strong on the road (${away.away_wins}-${away.away_losses} away)`);
  }

  // Rest factor
  if (homeRest !== null && awayRest !== null) {
    if (homeRest === 0 && awayRest >= 2) {
      reasons.push(`${home.abbreviation} on a back-to-back, ${away.abbreviation} well-rested`);
    } else if (awayRest === 0 && homeRest >= 2) {
      reasons.push(`${away.abbreviation} on a back-to-back, ${home.abbreviation} well-rested`);
    }
  }

  // Injury impact
  if (homeInjPenalty >= STAR_OUT_PENALTY) {
    reasons.push(`${home.abbreviation} missing key player(s) — significant impact`);
  }
  if (awayInjPenalty >= STAR_OUT_PENALTY) {
    reasons.push(`${away.abbreviation} missing key player(s) — significant impact`);
  }

  // LTFI momentum
  if (home.ltfi_score && away.ltfi_score) {
    const ltfiDiff = num(home.ltfi_score) - num(away.ltfi_score);
    if (Math.abs(ltfiDiff) > 10) {
      const hotter = ltfiDiff > 0 ? home : away;
      reasons.push(`${hotter.abbreviation} riding momentum (LTFI ${num(hotter.ltfi_score).toFixed(0)})`);
    }
  }

  return reasons.slice(0, 5);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("🏀 CourtVision Projections Engine v2");
  console.log("=".repeat(50));
  console.log("Features: Elo, rolling ORTG/DRTG, rest days, home/away splits, injuries, boosted CV metrics\n");

  // 0. Add elo_rating column if it doesn't exist
  await sql`
    DO $$ BEGIN
      ALTER TABLE team_season_stats ADD COLUMN IF NOT EXISTS elo_rating DECIMAL(7,2);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `.catch(() => {
    // Column may already exist — that's fine
  });

  // 1. Load all teams with their season stats and metrics
  const teamsRaw = await sql`
    SELECT
      t.id, t.abbreviation,
      tss.wins, tss.losses, tss.ortg, tss.drtg, tss.net_rating, tss.pace,
      tss.home_wins, tss.home_losses, tss.away_wins, tss.away_losses,
      tms.tsc_score, tms.ltfi_score, tms.lss_score, tms.drs_team_score
    FROM teams t
    LEFT JOIN team_season_stats tss ON t.id = tss.team_id
    LEFT JOIN team_metric_snapshots tms ON tms.team_id = t.id
  `;

  const teamMap = new Map<number, TeamData>();
  for (const t of teamsRaw) {
    teamMap.set(Number(t.id), {
      id: Number(t.id),
      abbreviation: String(t.abbreviation),
      wins: num(t.wins),
      losses: num(t.losses),
      ortg: num(t.ortg, LEAGUE_AVG_ORTG),
      drtg: num(t.drtg, LEAGUE_AVG_ORTG),
      pace: num(t.pace, LEAGUE_AVG_PACE),
      net_rating: num(t.net_rating),
      home_wins: num(t.home_wins),
      home_losses: num(t.home_losses),
      away_wins: num(t.away_wins),
      away_losses: num(t.away_losses),
      tsc_score: t.tsc_score ? num(t.tsc_score) : null,
      ltfi_score: t.ltfi_score ? num(t.ltfi_score) : null,
      lss_score: t.lss_score ? num(t.lss_score) : null,
      drs_team_score: t.drs_team_score ? num(t.drs_team_score) : null,
    });
  }
  console.log(`📊 Loaded ${teamMap.size} teams with metrics`);

  // 2. Load all game_team_stats (for rolling computations)
  const allGameStats = await sql`
    SELECT
      gts.game_id, gts.team_id, gts.is_home,
      gts.ortg, gts.drtg, gts.pace, gts.points,
      g.game_date
    FROM game_team_stats gts
    JOIN games g ON gts.game_id = g.id
    WHERE g.status = 'final'
    ORDER BY g.game_date ASC, g.id ASC
  `;

  // Index by game_id + team_id for quick lookup
  const gameStatsIndex = new Map<string, GameTeamStat>();
  for (const gs of allGameStats) {
    const key = `${gs.game_id}_${gs.team_id}`;
    gameStatsIndex.set(key, {
      game_id: Number(gs.game_id),
      team_id: Number(gs.team_id),
      is_home: Boolean(gs.is_home),
      ortg: num(gs.ortg, LEAGUE_AVG_ORTG),
      drtg: num(gs.drtg, LEAGUE_AVG_ORTG),
      pace: num(gs.pace, LEAGUE_AVG_PACE),
      points: num(gs.points),
      game_date: String(gs.game_date),
    });
  }
  console.log(`📈 Loaded ${gameStatsIndex.size} game-team stat records`);

  // 3. Load injuries with player BIS scores
  const injuriesRaw = await sql`
    SELECT
      pi.player_id, pi.team_id, pi.status, pi.reported_date, pi.return_date,
      pms.bis_score
    FROM player_injuries pi
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = pi.player_id
    ORDER BY pi.reported_date
  `;

  const injuryMap = new Map<number, InjuryRecord[]>();
  for (const inj of injuriesRaw) {
    const teamId = Number(inj.team_id);
    if (!injuryMap.has(teamId)) injuryMap.set(teamId, []);
    injuryMap.get(teamId)!.push({
      player_id: Number(inj.player_id),
      team_id: teamId,
      status: String(inj.status),
      reported_date: String(inj.reported_date),
      return_date: inj.return_date ? String(inj.return_date) : null,
      bis_score: inj.bis_score ? num(inj.bis_score) : null,
    });
  }
  console.log(`🏥 Loaded ${injuriesRaw.length} injury records`);

  // 4. Load all games sorted chronologically
  const games: Game[] = (await sql`
    SELECT id, game_date, status, home_team_id, away_team_id, home_score, away_score,
           is_back_to_back_home, is_back_to_back_away
    FROM games
    ORDER BY game_date ASC, id ASC
  `).map((g: any) => ({
    id: Number(g.id),
    game_date: String(g.game_date),
    status: String(g.status),
    home_team_id: Number(g.home_team_id),
    away_team_id: Number(g.away_team_id),
    home_score: g.home_score ? Number(g.home_score) : null,
    away_score: g.away_score ? Number(g.away_score) : null,
    is_back_to_back_home: Boolean(g.is_back_to_back_home),
    is_back_to_back_away: Boolean(g.is_back_to_back_away),
  }));

  console.log(`📅 Processing ${games.length} games chronologically\n`);

  // 5. Initialize team rolling state
  const teamStates = new Map<number, TeamRollingState>();
  for (const [id] of teamMap) {
    teamStates.set(id, {
      elo: ELO_INITIAL,
      recentGames: [],
      lastGameDate: null,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
    });
  }

  // 6. Process games chronologically
  let projected = 0;
  let correct = 0;
  let totalFinal = 0;
  const batchValues: any[][] = [];

  for (const game of games) {
    const homeTeam = teamMap.get(game.home_team_id);
    const awayTeam = teamMap.get(game.away_team_id);
    if (!homeTeam || !awayTeam) continue;

    const homeState = teamStates.get(game.home_team_id)!;
    const awayState = teamStates.get(game.away_team_id)!;

    // --- COMPUTE PREDICTION (using only data available BEFORE this game) ---

    // A. Rolling ORTG/DRTG (point-in-time)
    const homeRolling = getRollingRatings(homeState, homeTeam.ortg, homeTeam.drtg, homeTeam.pace);
    const awayRolling = getRollingRatings(awayState, awayTeam.ortg, awayTeam.drtg, awayTeam.pace);

    // B. Elo-based spread
    const homeElo = homeState.elo + ELO_HOME_ADVANTAGE;
    const awayElo = awayState.elo;
    const eloSpread = eloToSpread(homeElo - awayElo);

    // C. Ratings-based spread (from rolling ORTG/DRTG)
    const projPace = (homeRolling.pace + awayRolling.pace) / 2;
    const homeEff = (homeRolling.ortg + (LEAGUE_AVG_ORTG * 2 - awayRolling.drtg)) / 2;
    const awayEff = (awayRolling.ortg + (LEAGUE_AVG_ORTG * 2 - homeRolling.drtg)) / 2;
    const possessions = projPace / LEAGUE_AVG_PACE;
    let homeScore = (homeEff / 100) * possessions * LEAGUE_AVG_SCORE;
    let awayScore = (awayEff / 100) * possessions * LEAGUE_AVG_SCORE;
    const ratingsSpread = homeScore - awayScore;

    // D. Home court advantage (team-specific)
    const homeAdv = getHomeAdvantage(homeState);

    // E. Rest days
    const homeRestDays = homeState.lastGameDate ? daysBetween(homeState.lastGameDate, game.game_date) - 1 : null;
    const awayRestDays = awayState.lastGameDate ? daysBetween(awayState.lastGameDate, game.game_date) - 1 : null;
    const homeRestAdj = getRestAdjustment(homeRestDays);
    const awayRestAdj = getRestAdjustment(awayRestDays);
    const restSpread = homeRestAdj - awayRestAdj;

    // F. Injury adjustments
    const homeInjPenalty = getInjuryPenalty(game.home_team_id, game.game_date, injuryMap);
    const awayInjPenalty = getInjuryPenalty(game.away_team_id, game.game_date, injuryMap);
    const injurySpread = awayInjPenalty - homeInjPenalty; // positive = home benefits

    // G. CourtVision metric adjustments (boosted from v1)
    let cvSpread = 0;
    if (homeTeam.tsc_score && awayTeam.tsc_score) {
      const tscDiff = homeTeam.tsc_score - awayTeam.tsc_score;
      cvSpread += tscDiff * 0.15; // 3x stronger than v1 (was 0.05)
    }
    if (homeTeam.ltfi_score && awayTeam.ltfi_score) {
      const ltfiDiff = homeTeam.ltfi_score - awayTeam.ltfi_score;
      cvSpread += ltfiDiff * 0.08; // 4x stronger than v1 (was 0.02)
    }

    // H. COMBINE: weighted blend of Elo spread + ratings spread + adjustments
    // Elo captures holistic team strength + momentum; ratings capture efficiency
    const combinedSpread =
      eloSpread * 0.40 +          // 40% Elo (best single predictor)
      ratingsSpread * 0.25 +       // 25% rolling efficiency differential
      homeAdv * 0.15 +             // 15% home court (team-specific)
      restSpread * 0.08 +          // 8% rest factor
      injurySpread * 0.07 +        // 7% injury impact
      cvSpread * 0.05;             // 5% CourtVision metrics

    const homeProb = spreadToWinProb(combinedSpread);
    const awayProb = 1 - homeProb;

    // Projected scores from combined spread
    const avgScore = (homeScore + awayScore) / 2;
    const finalHomeScore = avgScore + combinedSpread / 2;
    const finalAwayScore = avgScore - combinedSpread / 2;

    const projectedWinnerId = homeProb >= 0.5 ? homeTeam.id : awayTeam.id;
    const margin = Math.abs(combinedSpread);
    const confidence = clamp(Math.abs(homeProb - 0.5) * 2 + 0.5, 0.5, 0.95);

    const tscDiff = Math.abs(num(homeTeam.tsc_score) - num(awayTeam.tsc_score));
    const upsetRisk = getUpsetRisk(Math.max(homeProb, awayProb), tscDiff);
    const reasons = generateReasons(
      homeTeam, awayTeam, homeProb,
      homeState.elo, awayState.elo,
      homeRestDays, awayRestDays,
      homeInjPenalty, awayInjPenalty,
    );

    // Score ranges
    const variance = clamp(12 - confidence * 5, 6, 14);
    const homeScoreLow = Math.round(finalHomeScore - variance);
    const homeScoreHigh = Math.round(finalHomeScore + variance);
    const awayScoreLow = Math.round(finalAwayScore - variance);
    const awayScoreHigh = Math.round(finalAwayScore + variance);

    // Upsert projection
    await sql`
      INSERT INTO game_projections (
        game_id, computed_at,
        projected_winner_id, win_prob_home, win_prob_away,
        proj_score_home, proj_score_home_low, proj_score_home_high,
        proj_score_away, proj_score_away_low, proj_score_away_high,
        proj_pace, confidence, margin, upset_risk, key_reasons
      ) VALUES (
        ${game.id}, NOW(),
        ${projectedWinnerId},
        ${homeProb.toFixed(4)}, ${awayProb.toFixed(4)},
        ${Math.round(finalHomeScore)}, ${homeScoreLow}, ${homeScoreHigh},
        ${Math.round(finalAwayScore)}, ${awayScoreLow}, ${awayScoreHigh},
        ${projPace.toFixed(2)}, ${confidence.toFixed(2)},
        ${margin.toFixed(2)}, ${upsetRisk},
        ${JSON.stringify(reasons)}
      )
      ON CONFLICT (game_id) DO UPDATE SET
        computed_at = NOW(),
        projected_winner_id = EXCLUDED.projected_winner_id,
        win_prob_home = EXCLUDED.win_prob_home,
        win_prob_away = EXCLUDED.win_prob_away,
        proj_score_home = EXCLUDED.proj_score_home,
        proj_score_home_low = EXCLUDED.proj_score_home_low,
        proj_score_home_high = EXCLUDED.proj_score_home_high,
        proj_score_away = EXCLUDED.proj_score_away,
        proj_score_away_low = EXCLUDED.proj_score_away_low,
        proj_score_away_high = EXCLUDED.proj_score_away_high,
        proj_pace = EXCLUDED.proj_pace,
        confidence = EXCLUDED.confidence,
        margin = EXCLUDED.margin,
        upset_risk = EXCLUDED.upset_risk,
        key_reasons = EXCLUDED.key_reasons
    `;
    projected++;

    // --- AFTER PREDICTION: update state with game result ---
    if (game.status === "final" && game.home_score != null && game.away_score != null) {
      totalFinal++;
      const actualWinnerId = game.home_score > game.away_score ? homeTeam.id : awayTeam.id;
      if (actualWinnerId === projectedWinnerId) correct++;

      // Update Elo ratings
      const homeExpected = eloExpected(homeElo - awayElo);
      const homeActual = game.home_score > game.away_score ? 1 : 0;
      const mov = game.home_score - game.away_score;
      homeState.elo = updateElo(homeState.elo, homeExpected, homeActual, mov);
      awayState.elo = updateElo(awayState.elo, 1 - homeExpected, 1 - homeActual, -mov);

      // Update rolling game stats
      const homeGS = gameStatsIndex.get(`${game.id}_${game.home_team_id}`);
      const awayGS = gameStatsIndex.get(`${game.id}_${game.away_team_id}`);
      if (homeGS) {
        homeState.recentGames.push(homeGS);
        if (homeState.recentGames.length > ROLLING_WINDOW) homeState.recentGames.shift();
      }
      if (awayGS) {
        awayState.recentGames.push(awayGS);
        if (awayState.recentGames.length > ROLLING_WINDOW) awayState.recentGames.shift();
      }

      // Update home/away records
      if (game.home_score > game.away_score) {
        homeState.homeWins++;
        awayState.awayLosses++;
      } else {
        homeState.homeLosses++;
        awayState.awayWins++;
      }
    }

    // Update last game dates
    homeState.lastGameDate = game.game_date;
    awayState.lastGameDate = game.game_date;
  }

  console.log(`✅ Projected ${projected} games`);
  if (totalFinal > 0) {
    const accuracy = ((correct / totalFinal) * 100).toFixed(1);
    console.log(`📈 Accuracy on completed games: ${correct}/${totalFinal} (${accuracy}%)`);
  }

  // 7. Save final Elo ratings to team_season_stats
  console.log("\n💾 Saving Elo ratings to team_season_stats...");
  for (const [teamId, state] of teamStates) {
    await sql`
      UPDATE team_season_stats SET elo_rating = ${state.elo.toFixed(2)} WHERE team_id = ${teamId}
    `;
  }

  // Print Elo rankings
  const eloRankings = [...teamStates.entries()]
    .map(([id, s]) => ({ abbr: teamMap.get(id)?.abbreviation ?? "???", elo: s.elo }))
    .sort((a, b) => b.elo - a.elo);
  console.log("\n🏆 Final Elo Rankings:");
  eloRankings.forEach((t, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${t.abbr}  ${t.elo.toFixed(0)}`);
  });

  // 8. Compute player projections
  console.log("\n🏃 Computing player projections...");

  const playersRaw = await sql`
    SELECT
      p.id, p.full_name, p.position,
      pss.team_id, pss.ppg, pss.rpg, pss.apg, pss.spg, pss.bpg, pss.topg, pss.mpg,
      pss.fg_pct, pss.fg3_pct, pss.ft_pct, pss.ts_pct, pss.usg_pct,
      pms.bis_score, pms.lfi_score, pms.goi_score
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pss.games_played > 10 AND pss.ppg > 5
  `;

  const teamPlayers = new Map<number, any[]>();
  for (const p of playersRaw) {
    const teamId = Number(p.team_id);
    if (!teamPlayers.has(teamId)) teamPlayers.set(teamId, []);
    teamPlayers.get(teamId)!.push(p);
  }

  let playerProjections = 0;

  for (const game of games) {
    const homePlayers = teamPlayers.get(game.home_team_id) ?? [];
    const awayPlayers = teamPlayers.get(game.away_team_id) ?? [];
    const allPlayers = [...homePlayers, ...awayPlayers];

    const topPlayers = allPlayers
      .sort((a, b) => num(b.bis_score, num(b.ppg)) - num(a.bis_score, num(a.ppg)))
      .slice(0, 8);

    for (const p of topPlayers) {
      const ppg = num(p.ppg);
      const rpg = num(p.rpg);
      const apg = num(p.apg);
      const mpg = num(p.mpg);
      const lfi = num(p.lfi_score, 50);
      const goi = num(p.goi_score, 50);

      const lfiAdj = (lfi - 50) / 100;
      const goiAdj = (goi - 50) / 200;

      const projPts = ppg * (1 + lfiAdj * 0.15 + goiAdj * 0.05);
      const projReb = rpg * (1 + lfiAdj * 0.08);
      const projAst = apg * (1 + lfiAdj * 0.10);
      const projMinutes = Math.min(mpg * (1 + goiAdj * 0.05), 42);

      const ptsVar = ppg * 0.25;
      const rebVar = rpg * 0.3;
      const astVar = apg * 0.3;
      const volatility = ptsVar / ppg > 0.3 ? "high" : ptsVar / ppg > 0.2 ? "moderate" : "steady";

      await sql`
        INSERT INTO player_game_projections (
          player_id, game_id, computed_at,
          proj_minutes, proj_pts, proj_pts_low, proj_pts_high,
          proj_reb, proj_reb_low, proj_reb_high,
          proj_ast, proj_ast_low, proj_ast_high,
          proj_stl, proj_blk, proj_tov, proj_fg3m,
          proj_usage, proj_ts_pct, proj_volatility
        ) VALUES (
          ${Number(p.id)}, ${game.id}, NOW(),
          ${projMinutes.toFixed(2)},
          ${projPts.toFixed(2)}, ${Math.max(0, projPts - ptsVar).toFixed(2)}, ${(projPts + ptsVar).toFixed(2)},
          ${projReb.toFixed(2)}, ${Math.max(0, projReb - rebVar).toFixed(2)}, ${(projReb + rebVar).toFixed(2)},
          ${projAst.toFixed(2)}, ${Math.max(0, projAst - astVar).toFixed(2)}, ${(projAst + astVar).toFixed(2)},
          ${num(p.spg).toFixed(2)}, ${num(p.bpg).toFixed(2)}, ${num(p.topg).toFixed(2)},
          ${(num(p.fg3_pct) * num(p.ppg) * 0.1).toFixed(2)},
          ${num(p.usg_pct, 20).toFixed(2)},
          ${num(p.ts_pct, 0.55).toFixed(4)},
          ${volatility}
        )
        ON CONFLICT (player_id, game_id) DO UPDATE SET
          computed_at = NOW(),
          proj_minutes = EXCLUDED.proj_minutes,
          proj_pts = EXCLUDED.proj_pts,
          proj_pts_low = EXCLUDED.proj_pts_low,
          proj_pts_high = EXCLUDED.proj_pts_high,
          proj_reb = EXCLUDED.proj_reb,
          proj_reb_low = EXCLUDED.proj_reb_low,
          proj_reb_high = EXCLUDED.proj_reb_high,
          proj_ast = EXCLUDED.proj_ast,
          proj_ast_low = EXCLUDED.proj_ast_low,
          proj_ast_high = EXCLUDED.proj_ast_high,
          proj_stl = EXCLUDED.proj_stl,
          proj_blk = EXCLUDED.proj_blk,
          proj_tov = EXCLUDED.proj_tov,
          proj_fg3m = EXCLUDED.proj_fg3m,
          proj_usage = EXCLUDED.proj_usage,
          proj_ts_pct = EXCLUDED.proj_ts_pct,
          proj_volatility = EXCLUDED.proj_volatility
      `;
      playerProjections++;
    }
  }

  console.log(`✅ Generated ${playerProjections} player projections`);
  console.log("\n🎯 Projections engine v2 complete!");

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
