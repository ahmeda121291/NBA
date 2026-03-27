import * as dotenv from "dotenv";
import * as path from "path";
import postgres from "postgres";

// Load env from web/.env.local
dotenv.config({ path: path.resolve(__dirname, "../web/.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not found in web/.env.local");
}

const sql = postgres(DATABASE_URL, { max: 5 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

function normalize(val: number, leagueAvg: number, stdApprox: number): number {
  if (stdApprox === 0) return 50;
  const z = (val - leagueAvg) / stdApprox;
  return clamp(50 + z * 15, 0, 100);
}

/** Invert a normalized score — lower raw value = higher score */
function invertNorm(val: number, leagueAvg: number, std: number): number {
  if (std === 0) return 50;
  const z = (leagueAvg - val) / std; // inverted: below avg is good
  return clamp(50 + z * 15, 0, 100);
}

function tierLabel(score: number): string {
  if (score >= 85) return "elite";
  if (score >= 70) return "above_average";
  if (score >= 50) return "average";
  if (score >= 35) return "below_average";
  return "poor";
}

function num(v: any, fallback = 0): number {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== CourtVision Metric Computation Engine v2 ===\n");

  const [currentSeason] = await sql`
    SELECT id, year, label FROM seasons WHERE is_current = true LIMIT 1
  `;
  if (!currentSeason) {
    console.error("No current season found (is_current = true). Aborting.");
    process.exit(1);
  }
  const seasonId = currentSeason.id;
  const asOfDate = new Date().toISOString().split("T")[0];
  console.log(`Season: ${currentSeason.label} (id=${seasonId}), as_of_date: ${asOfDate}\n`);

  // =========================================================================
  // PLAYER METRICS
  // =========================================================================
  console.log("--- Computing Player Metrics (v2) ---");

  // Pre-load team DRTG for on/off court impact calculation
  const teamDrtgRows = await sql`
    SELECT team_id, drtg FROM team_season_stats WHERE season_id = ${seasonId}
  `;
  const teamDrtgMap: Record<number, number> = {};
  for (const t of teamDrtgRows) teamDrtgMap[t.team_id] = Number(t.drtg || 112);

  const playerStats = await sql`
    SELECT
      pss.*,
      p.position,
      p.full_name
    FROM player_season_stats pss
    JOIN players p ON p.id = pss.player_id
    WHERE pss.season_id = ${seasonId}
      AND pss.games_played > 0
  `;
  console.log(`Found ${playerStats.length} player season stat rows.`);

  if (playerStats.length === 0) {
    console.log("No player stats found. Skipping.");
  }

  // ---- League averages & std devs ----
  const fields = [
    "ppg", "rpg", "apg", "spg", "bpg", "fg_pct", "games_played",
    "topg", "usg_pct", "fg3_pct", "ts_pct", "ast_pct", "tov_pct", "mpg",
    "def_rating", "contested_shots", "deflections", "def_ws",
    "loose_balls", "box_outs",
  ];

  const avg: Record<string, number> = {};
  const std: Record<string, number> = {};
  const n = playerStats.length || 1;

  // Compute averages
  for (const f of fields) avg[f] = 0;
  for (const p of playerStats) {
    for (const f of fields) avg[f] += num(p[f]);
  }
  for (const f of fields) avg[f] /= n;

  // Compute std devs
  for (const f of fields) std[f] = 0;
  for (const p of playerStats) {
    for (const f of fields) std[f] += (num(p[f]) - avg[f]) ** 2;
  }
  for (const f of fields) std[f] = Math.sqrt(std[f] / n) || 1;

  // Position-specific averages for OIQ (formerly RDA)
  const posGroups: Record<string, any[]> = { G: [], F: [], C: [] };
  for (const p of playerStats) {
    const pos = (p.position || "G").toUpperCase();
    if (pos.includes("C")) posGroups.C.push(p);
    else if (pos.includes("F")) posGroups.F.push(p);
    else posGroups.G.push(p);
  }
  const posAvgUsg: Record<string, number> = {};
  // Position averages for defensive stats (DRS v3)
  const posAvgDef: Record<string, { contested: number; deflections: number; stl: number; blk: number; looseBalls: number; boxOuts: number; defRating: number; count: number }> = {};
  for (const [pos, plist] of Object.entries(posGroups)) {
    posAvgUsg[pos] = plist.length > 0
      ? plist.reduce((s, p) => s + num(p.usg_pct), 0) / plist.length
      : avg.usg_pct;

    const qualified = plist.filter(p => num(p.mpg) >= 15);
    const cnt = qualified.length || 1;
    posAvgDef[pos] = {
      contested: qualified.reduce((s, p) => s + num(p.contested_shots), 0) / cnt,
      deflections: qualified.reduce((s, p) => s + num(p.deflections), 0) / cnt,
      stl: qualified.reduce((s, p) => s + num(p.spg), 0) / cnt,
      blk: qualified.reduce((s, p) => s + num(p.bpg), 0) / cnt,
      looseBalls: qualified.reduce((s, p) => s + num(p.loose_balls), 0) / cnt,
      boxOuts: qualified.reduce((s, p) => s + num(p.box_outs), 0) / cnt,
      defRating: qualified.reduce((s, p) => s + num(p.def_rating), 0) / cnt,
      count: cnt,
    };
  }

  // ---- Game logs for LFI + GOI ----
  const gameLogs = await sql`
    SELECT
      pgl.player_id,
      pgl.pts, pgl.reb, pgl.ast, pgl.stl, pgl.blk,
      pgl.fgm, pgl.fga, pgl.fg3m, pgl.fg3a, pgl.ftm, pgl.fta,
      pgl.plus_minus, pgl.minutes,
      g.game_date, g.home_score, g.away_score
    FROM player_game_logs pgl
    JOIN games g ON g.id = pgl.game_id
    WHERE pgl.season_id = ${seasonId}
    ORDER BY pgl.player_id, g.game_date DESC
  `;

  const logsByPlayer: Record<number, any[]> = {};
  for (const log of gameLogs) {
    const pid = log.player_id;
    if (!logsByPlayer[pid]) logsByPlayer[pid] = [];
    logsByPlayer[pid].push(log);
  }

  // ---- Compute per-player metrics ----
  type PlayerMetricRow = {
    playerId: number;
    bis: number; bisConfidence: number; bisComponents: object;
    rda: number; rdaConfidence: number; rdaLabel: string; rdaComponents: object;
    drs: number; drsConfidence: number; drsLabel: string; drsComponents: object;
    lfi: number; lfiConfidence: number; lfiStreakLabel: string; lfiWindows: object; lfiDelta: number;
    sps: number; spsConfidence: number; spsLabel: string; spsComponents: object;
    goi: number; goiConfidence: number; goiComponents: object;
  };

  const playerMetrics: PlayerMetricRow[] = [];

  for (const ps of playerStats) {
    const playerId = ps.player_id;
    const gp = num(ps.games_played);
    const ppg = num(ps.ppg);
    const rpg = num(ps.rpg);
    const apg = num(ps.apg);
    const spg = num(ps.spg);
    const bpg = num(ps.bpg);
    const topg = num(ps.topg);
    const mpg = num(ps.mpg, 1);
    const fgPct = num(ps.fg_pct);
    const fg3Pct = num(ps.fg3_pct);
    const tsPct = num(ps.ts_pct);
    const usgPct = num(ps.usg_pct);
    const astPct = num(ps.ast_pct);
    const tovPct = num(ps.tov_pct);
    const defRating = num(ps.def_rating);
    const defWs = num(ps.def_ws);
    const contestedShots = num(ps.contested_shots);
    const deflections = num(ps.deflections);
    const chargesDrawn = num(ps.charges_drawn);
    const looseBalls = num(ps.loose_balls);
    const boxOuts = num(ps.box_outs);

    const position = (ps.position || "G").toUpperCase();
    const isGuard = position.includes("G");
    const isBig = position.includes("C") || position.includes("F");
    const posGroup = position.includes("C") ? "C" : position.includes("F") ? "F" : "G";

    const logs = logsByPlayer[playerId] || [];
    const bisConfidence = clamp(Math.min(gp / 50, 1), 0, 1);

    // ==================================================================
    // BIS v2 — Per-minute scaling, TS%, +/-, TOV penalty, DEF_RATING
    // ==================================================================
    // Per-36 normalize: scale stats as if player played 36 min
    const per36Factor = mpg > 10 ? 36 / mpg : 1;
    const ppg36 = ppg * per36Factor;
    const rpg36 = rpg * per36Factor;
    const apg36 = apg * per36Factor;
    const spg36 = spg * per36Factor;
    const bpg36 = bpg * per36Factor;
    const topg36 = topg * per36Factor;

    // Z-score normalized (per-36)
    const ppgNorm = normalize(ppg36, avg.ppg * (36 / (avg.mpg || 30)), std.ppg * (36 / (avg.mpg || 30)));
    const rpgNorm = normalize(rpg, avg.rpg, std.rpg); // rebounds less min-dependent
    const apgNorm = normalize(apg36, avg.apg * (36 / (avg.mpg || 30)), std.apg * (36 / (avg.mpg || 30)));
    const spgNorm = normalize(spg, avg.spg, std.spg);
    const bpgNorm = normalize(bpg, avg.bpg, std.bpg);
    const tsNorm = normalize(tsPct, avg.ts_pct || 0.56, std.ts_pct || 0.04);
    const gpNorm = normalize(gp, avg.games_played, std.games_played);

    // +/- from game logs (avg of last 15 games)
    const recentLogs = logs.slice(0, 15);
    const avgPlusMinus = recentLogs.length > 0
      ? recentLogs.reduce((s, l) => s + num(l.plus_minus), 0) / recentLogs.length
      : 0;
    const pmNorm = clamp(50 + avgPlusMinus * 2, 0, 100);

    // TOV penalty (inverted: lower TOV = better)
    const tovPenalty = topg > 0 ? invertNorm(topg, avg.topg, std.topg) : 50;

    // DEF_RATING component for BIS (small weight)
    const defComponent = defRating > 0 ? clamp(50 + (112 - defRating) * 2.5, 0, 100) : 50;

    const bis = clamp(
      ppgNorm * 0.20 +      // scoring (per-36)
      rpgNorm * 0.12 +      // rebounding
      apgNorm * 0.15 +      // playmaking (per-36)
      tsNorm * 0.12 +       // efficiency (TS% not FG%)
      spgNorm * 0.05 +      // steals
      bpgNorm * 0.05 +      // blocks
      pmNorm * 0.10 +       // +/- impact
      defComponent * 0.06 + // defensive rating
      tovPenalty * 0.05 +   // turnover penalty (inverted)
      gpNorm * 0.10         // durability
    );

    // ==================================================================
    // OIQ v2 (Offensive Impact Quotient) — stored as rda_score in DB
    // Fixed: no more triple TOV penalty, volume bonus for high-usage stars
    // ==================================================================

    // Raw TS% on wider scale (not compressed z-score) — every 1% matters
    const rawTsAboveAvg = (tsPct - (avg.ts_pct || 0.56)) * 100; // e.g., +5 = 5% above avg
    const tsOiqScore = clamp(50 + rawTsAboveAvg * 5, 10, 95); // wider spread than before

    // Usage: higher usage = harder to be efficient. Give credit for volume.
    const posUsgAvg = posAvgUsg[posGroup] || avg.usg_pct;
    const usgAboveAvg = usgPct - posUsgAvg;
    const usgVsPos = clamp(50 + usgAboveAvg * 200, 10, 95); // usage above position avg

    // Volume bonus: scoring 25+ PPG on good TS% is elite
    const volumeBonus = ppg >= 25 && tsPct > 0.57 ? 15 :
                        ppg >= 20 && tsPct > 0.55 ? 10 :
                        ppg >= 15 && tsPct > 0.54 ? 5 : 0;

    // Assist rate (raw APG, NOT AST/TOV — don't penalize turnovers here)
    const apgScore = clamp(50 + (apg - (avg.apg || 3)) * 5, 10, 90);

    // Free throw rate (FTA/FGA proxy for getting to the line)
    const ftRate = num(ps.fga) > 0 ? num(ps.fta) / num(ps.fga) : 0;
    const ftRateNorm = clamp(50 + (ftRate - 0.25) * 80, 10, 90);

    const oiq = clamp(
      tsOiqScore * 0.30 +     // true shooting (wider spread)
      usgVsPos * 0.20 +       // usage relative to position
      ppgNorm * 0.20 +         // volume scoring
      apgScore * 0.15 +        // playmaking (raw assists, no TOV penalty)
      ftRateNorm * 0.10 +      // getting to the line
      volumeBonus * 0.05        // bonus for high-volume efficient scorers
    );
    // Note: label will be overwritten by percentile-based tier system
    const oiqLabel = "placeholder";

    // ==================================================================
    // DRS v3 — Position-relative defensive scoring
    // Bigs compared to bigs, wings to wings, guards to guards
    // No more inflating bigs with raw contested shots / blocks
    // ==================================================================
    const hasDefData = defRating > 0 || contestedShots > 0;
    let drs: number;
    const posDefAvg = posAvgDef[posGroup] || posAvgDef.G;

    // Declare DRS component variables at outer scope so they're accessible for drsComponents
    let oppFgDiff = 0, deterrenceScore = 50, onOffScore = 50, onOffImpact = 0;
    let dFga = 0, versatilityBonus = 0, contestScore = 0, deflScore = 0;
    let stlScore = 0, blkScore = 0, loadScore = 0, minutesScore = 0, hustleScore = 0;

    if (hasDefData) {
      // ============================================================
      // DRS v7: RAW STATS + MINUTES/GP + LOAD + DETERRENCE + ON/OFF
      // ============================================================
      // RAW counting stats (not per-36) because VOLUME matters.
      // Heavy-minute defenders who sustain elite D over full seasons > part-timers.
      // D_FGA = "are you guarding the best players?" signal.

      // 1. DETERRENCE (18%) — opponent FG% impact
      oppFgDiff = parseFloat(ps.opp_fg_pct_diff || "0");
      const hasDeterrenceData = ps.opp_fg_pct_diff != null && ps.opp_fg_pct_diff !== "";
      deterrenceScore = hasDeterrenceData
        ? clamp(50 + (oppFgDiff * -100) * 5, 0, 100) : 50;

      // 2. ON/OFF IMPACT (12%) — team defense without you
      const teamDrtgVal = teamDrtgMap[Number(ps.team_id)] || 112;
      onOffImpact = teamDrtgVal - defRating;
      onOffScore = clamp(50 + onOffImpact * 7, 0, 100);

      // 3-6. RAW COUNTING STATS (contests 15%, defl 12%, stl 10%, blk 7%)
      contestScore = clamp(contestedShots * 7.5, 0, 100);
      deflScore = clamp(deflections * 22, 0, 100);
      stlScore = clamp(spg * 40, 0, 100);
      blkScore = clamp(bpg * 28, 0, 100);

      // 7. DEFENSIVE LOAD (8%) — how many FGA opponents take against you
      dFga = parseFloat(ps.d_fga || "0");
      loadScore = clamp(dFga * 5.5, 0, 100);

      // 8. MINUTES + GP BONUS (8%) — sustained heavy-minute defenders
      const minutesRaw = clamp((mpg - 15) * 4, 0, 100);
      // GP penalty: missing games HURTS. 70 GP = 1.0, 50 GP = 0.71, 35 GP = 0.50, 25 GP = 0.36
      // Formula: (gp/70)^1.5 — exponential penalty for missing games
      const gpFactor = clamp(Math.pow(gp / 70, 1.5), 0.25, 1.0);
      minutesScore = minutesRaw * gpFactor;

      // 9. VERSATILITY (5%) — perimeter + interior actions both present
      const perimActions = spg + deflections;
      const interiorActions = bpg + contestedShots * 0.15;
      versatilityBonus = (perimActions > 2.5 && interiorActions > 1.5)
        ? Math.min((perimActions + interiorActions) * 3, 15) : 0;

      // 10. HUSTLE (5%) — loose balls + charges
      hustleScore = clamp((looseBalls + chargesDrawn) * 30, 0, 100);

      drs = clamp(
        deterrenceScore * 0.18 + contestScore * 0.15 + onOffScore * 0.12 +
        deflScore * 0.12 + stlScore * 0.10 + loadScore * 0.08 +
        minutesScore * 0.08 + blkScore * 0.07 + versatilityBonus * 0.05 +
        hustleScore * 0.05, 0, 100
      );
    } else {
      // Fallback: box score only, position-relative, capped at 65
      const posStlAvg = posDefAvg.stl || 1;
      const posBlkAvg = posDefAvg.blk || 0.5;
      const stlVsPos = clamp(50 + (spg - posStlAvg) * 15, 10, 90);
      const blkVsPos = clamp(50 + (bpg - posBlkAvg) * 12, 10, 90);
      drs = clamp(
        (isGuard ? stlVsPos * 0.55 + blkVsPos * 0.20 : stlVsPos * 0.25 + blkVsPos * 0.50) +
        rpgNorm * 0.25,
        0, 65
      );
    }

    const drsConfidence = hasDefData ? bisConfidence : bisConfidence * 0.4;
    // Label will be overwritten by percentile-based tier system
    const drsLabel = "placeholder";

    // ==================================================================
    // LFI v2 — Efficiency trend, +/- trend, weighted recency, 10-game blend
    // ==================================================================
    const last5 = logs.slice(0, 5);
    const last10 = logs.slice(0, 10);
    let lfi = 50;
    let lfiDelta = 0;
    let lfiConfidence = 0;
    let lfiStreakLabel = "stable";

    if (last5.length >= 3) {
      // Weighted recency: game 1 = 1.0, game 2 = 0.9, game 3 = 0.8, etc.
      function weightedAvg(games: any[], key: string | ((g: any) => number)): number {
        let totalVal = 0, totalWeight = 0;
        for (let i = 0; i < games.length; i++) {
          const w = 1.0 - (i * 0.08); // slight decay
          const val = typeof key === "function" ? key(games[i]) : num(games[i][key]);
          totalVal += val * w;
          totalWeight += w;
        }
        return totalWeight > 0 ? totalVal / totalWeight : 0;
      }

      // Last 5 (weighted) vs season averages
      const recentPts = weightedAvg(last5, "pts");
      const recentReb = weightedAvg(last5, "reb");
      const recentAst = weightedAvg(last5, "ast");
      const recentPM = weightedAvg(last5, "plus_minus");

      // Efficiency trend: TS% of recent games vs season TS%
      const recentTS = weightedAvg(last5, (g) => {
        const fga = num(g.fga); const fta = num(g.fta); const pts = num(g.pts);
        const denom = 2 * (fga + 0.44 * fta);
        return denom > 0 ? pts / denom : 0;
      });
      const seasonTS = tsPct > 0 ? tsPct : 0.56;
      const tsDelta = seasonTS > 0 ? (recentTS - seasonTS) / seasonTS : 0;

      // Stat deltas vs season averages
      const ptsDelta = ppg > 0 ? (recentPts - ppg) / ppg : 0;
      const rebDelta = rpg > 0 ? (recentReb - rpg) / rpg : 0;
      const astDelta = apg > 0 ? (recentAst - apg) / apg : 0;
      const pmDelta = recentPM; // raw +/- (not normalized against season)

      // Combine: scoring trend (30%), assist trend (20%), rebound trend (10%),
      // efficiency trend (25%), +/- trend (15%)
      lfiDelta = (
        ptsDelta * 0.30 +
        astDelta * 0.20 +
        rebDelta * 0.10 +
        tsDelta * 0.25 +
        clamp(pmDelta / 10, -1, 1) * 0.15
      ) * 100;

      // Blend: 70% last 5, 30% last 10 for stability
      if (last10.length >= 6) {
        const l10PtsDelta = ppg > 0 ? (weightedAvg(last10, "pts") - ppg) / ppg : 0;
        const l10AstDelta = apg > 0 ? (weightedAvg(last10, "ast") - apg) / apg : 0;
        const l10Delta = (l10PtsDelta * 0.5 + l10AstDelta * 0.5) * 100;
        lfiDelta = lfiDelta * 0.70 + l10Delta * 0.30;
      }

      lfi = clamp(50 + lfiDelta * 2);
      lfiConfidence = clamp(Math.min(last5.length / 5, 1), 0, 1);

      // Streak labels — now factor in efficiency
      const effUp = tsDelta > 0.02;
      const effDown = tsDelta < -0.03;

      if (lfi >= 70 && recentPM > 3 && effUp) lfiStreakLabel = "hot_likely_real";
      else if (lfi >= 65 && recentPM > 2) lfiStreakLabel = "hot_likely_real";
      else if (lfi >= 65 && recentPM <= -2) lfiStreakLabel = "hot_opponent_driven";
      else if (lfi >= 60 && effDown) lfiStreakLabel = "hot_fragile";
      else if (lfi >= 60) lfiStreakLabel = "hot_fragile";
      else if (lfi <= 30 && recentPM < -5) lfiStreakLabel = "cold_real";
      else if (lfi <= 38 && effDown) lfiStreakLabel = "cold_real";
      else if (lfi <= 40) lfiStreakLabel = "cold_bouncing_back";
      else if (lfi >= 60 && usgPct > (posAvgUsg[posGroup] || avg.usg_pct) * 1.15) lfiStreakLabel = "breakout_role_expansion";
      else lfiStreakLabel = "stable";
    }

    // ==================================================================
    // PEM v2 (Playmaking Efficiency Metric) — stored as sps_score in DB
    // Fixed: NO turnover penalty (already in BIS), raw APG is king,
    // per-36 assists for bench players, TS% for shot creation quality
    // ==================================================================

    // Raw APG on wider scale — Jokic at 10+ APG should dominate
    const rawApgScore = clamp(50 + (apg - (avg.apg || 3)) * 8, 5, 99);

    // Per-36 assist rate for fairer bench player comparison
    const mpgSafe = Math.max(mpg, 10);
    const per36Ast = (apg / mpgSafe) * 36;
    const per36AstScore = clamp(50 + (per36Ast - 4.5) * 6, 5, 95);

    // Assist percentage (% of teammate FGs assisted) — pure creation measure
    const astPctScore = normalize(astPct, avg.ast_pct || 0.12, std.ast_pct || 0.06);

    // TS% but only as "do they create good shots for themselves"
    const tsPlaymaking = clamp(50 + rawTsAboveAvg * 3, 20, 80);

    // Potential assists: APG relative to USG — high usage + high assists = elite
    const creationLoad = usgPct > 0.15 ? apg / (usgPct * 100) : 0;
    const creationScore = clamp(50 + (creationLoad - 0.15) * 200, 10, 90);

    const pem = clamp(
      rawApgScore * 0.30 +       // raw assists (biggest factor)
      per36AstScore * 0.20 +     // per-36 assists (bench fairness)
      astPctScore * 0.20 +       // assist rate (% of team FGs)
      creationScore * 0.15 +     // creation under load (APG/USG%)
      tsPlaymaking * 0.15        // shot creation quality
    );
    // Note: label will be overwritten by percentile-based tier system
    const pemLabel = "placeholder";

    // ==================================================================
    // GOI v2 — Clutch performance, filtered garbage time, 4Q scoring
    // ==================================================================
    let goiPlusMinusScore = 50;
    let goiClutchScore = 50;
    let goiFourthQScore = 50;

    if (logs.length >= 3) {
      // Filter out garbage time: exclude games decided by 20+
      const meaningfulGames = logs.slice(0, 15).filter((l) => {
        const diff = Math.abs(num(l.home_score) - num(l.away_score));
        return diff < 20 || num(l.minutes) > 20; // keep if close game OR they played real minutes
      });

      if (meaningfulGames.length >= 3) {
        const mgPM = meaningfulGames.reduce((s, l) => s + num(l.plus_minus), 0) / meaningfulGames.length;
        goiPlusMinusScore = clamp(50 + mgPM * 2.5);

        // Consistency: mean/stdev ratio (high mean, low variance = clutch)
        const pmValues = meaningfulGames.map(l => num(l.plus_minus));
        const pmStd = Math.sqrt(pmValues.reduce((s, v) => s + (v - mgPM) ** 2, 0) / pmValues.length) || 1;
        goiClutchScore = clamp(50 + (mgPM / pmStd) * 8);

        // Close game performance: games decided by < 8 points
        const closeGames = meaningfulGames.filter((l) => {
          return Math.abs(num(l.home_score) - num(l.away_score)) <= 8;
        });
        if (closeGames.length >= 2) {
          const closePM = closeGames.reduce((s, l) => s + num(l.plus_minus), 0) / closeGames.length;
          const closePts = closeGames.reduce((s, l) => s + num(l.pts), 0) / closeGames.length;
          // In close games: do they score more and maintain positive +/-?
          const closeScoreDelta = ppg > 0 ? (closePts - ppg) / ppg : 0;
          goiFourthQScore = clamp(50 + closePM * 2 + closeScoreDelta * 30);
        }
      } else {
        // Not enough meaningful games, use raw data
        const rawPM = logs.slice(0, 10).reduce((s, l) => s + num(l.plus_minus), 0) / Math.min(logs.length, 10);
        goiPlusMinusScore = clamp(50 + rawPM * 2);
      }
    }

    const goi = clamp(
      goiPlusMinusScore * 0.40 +  // overall impact (filtered)
      goiClutchScore * 0.30 +      // consistency under pressure
      goiFourthQScore * 0.30       // close game performance
    );
    const goiConfidence = clamp(Math.min((logs.length || 0) / 20, 1), 0, 1);

    // ==================================================================
    // Push to array
    // ==================================================================
    playerMetrics.push({
      playerId,
      bis: Math.round(bis * 100) / 100,
      bisConfidence: Math.round(bisConfidence * 100) / 100,
      bisComponents: { ppg: ppgNorm, rpg: rpgNorm, apg: apgNorm, ts: tsNorm, pm: pmNorm, def: defComponent, tov: tovPenalty, gp: gpNorm },
      rda: Math.round(oiq * 100) / 100, // OIQ stored in rda column
      rdaConfidence: Math.round(bisConfidence * 100) / 100,
      rdaLabel: oiqLabel,
      rdaComponents: { ts: tsOiqScore, usgVsPos, ppg: ppgNorm, apg: apgScore, ftRate: ftRateNorm, volumeBonus },
      drs: Math.round(drs * 100) / 100,
      drsConfidence: Math.round(drsConfidence * 100) / 100,
      drsLabel,
      drsComponents: hasDefData
        ? { oppFgDiff: oppFgDiff.toFixed(3), deterrence: deterrenceScore.toFixed(0), onOff: onOffScore.toFixed(0), onOffImpact: onOffImpact.toFixed(1), contested: contestedShots, deflections, stl: spg, blk: bpg, dFga, mpg, gp, versatility: versatilityBonus.toFixed(1), posGroup }
        : { stl: spg, blk: bpg, posGroup, boxScoreOnly: true },
      lfi: Math.round(lfi * 100) / 100,
      lfiConfidence: Math.round(lfiConfidence * 100) / 100,
      lfiStreakLabel,
      lfiWindows: { last5Games: last5.length, last10Games: last10.length, delta: lfiDelta },
      lfiDelta: Math.round(lfiDelta * 100) / 100,
      sps: Math.round(pem * 100) / 100, // PEM stored in sps column
      spsConfidence: Math.round(bisConfidence * 100) / 100,
      spsLabel: pemLabel,
      spsComponents: { rawApg: rawApgScore, per36Ast: per36AstScore, astPct: astPctScore, creation: creationScore, ts: tsPlaymaking },
      goi: Math.round(goi * 100) / 100,
      goiConfidence: Math.round(goiConfidence * 100) / 100,
      goiComponents: { pm: goiPlusMinusScore, clutch: goiClutchScore, closeGame: goiFourthQScore },
    });
  }

  // ---- Rescale ALL metrics to 0-99 (league leader = 99, worst = 0) ----
  function rescaleMetric(key: "bis" | "drs" | "rda" | "sps" | "goi") {
    const values = playerMetrics.map(p => p[key]).filter(v => v != null && !isNaN(v));
    if (values.length === 0) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // avoid division by zero
    for (const pm of playerMetrics) {
      const raw = pm[key];
      if (raw == null || isNaN(raw)) { pm[key] = 0; continue; }
      pm[key] = Math.round(((raw - min) / range) * 99 * 100) / 100;
    }
  }

  // LFI is special — it's relative to self, not others. Still rescale to 0-99.
  function rescaleLfi() {
    const values = playerMetrics.map(p => p.lfi).filter(v => v != null && !isNaN(v));
    if (values.length === 0) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    for (const pm of playerMetrics) {
      const raw = pm.lfi;
      if (raw == null || isNaN(raw)) { pm.lfi = 50; continue; }
      pm.lfi = Math.round(((raw - min) / range) * 99 * 100) / 100;
    }
  }

  rescaleMetric("bis");
  rescaleMetric("drs");
  rescaleMetric("rda");   // OIQ stored as rda
  rescaleMetric("sps");   // PEM stored as sps
  rescaleMetric("goi");
  rescaleLfi();

  console.log("  ✓ All metrics rescaled to 0-99 (league leader = 99)");

  // ---- Percentile-based tier labels (same system for ALL metrics) ----
  // Sort descending for each metric, assign tier by rank position
  const total = playerMetrics.length;

  function assignTier(rank: number): string {
    const pct = rank / total;
    if (pct <= 0.05) return "Elite";        // Top 5%
    if (pct <= 0.15) return "Great";        // Top 15%
    if (pct <= 0.35) return "Good";         // Top 35%
    if (pct <= 0.65) return "Average";      // Middle 30%
    if (pct <= 0.85) return "Below Average"; // Bottom 35-15%
    return "Poor";                           // Bottom 15%
  }

  // DRS-specific labels (same tiers, basketball-specific names)
  function assignDrsTier(rank: number): string {
    const pct = rank / total;
    if (pct <= 0.05) return "Elite Defender";
    if (pct <= 0.15) return "Plus Defender";
    if (pct <= 0.35) return "Solid Defender";
    if (pct <= 0.65) return "Average Defender";
    if (pct <= 0.85) return "Below Avg Defender";
    return "Weak Defender";
  }

  // OIQ-specific labels
  function assignOiqTier(rank: number): string {
    const pct = rank / total;
    if (pct <= 0.05) return "Elite Offensive Force";
    if (pct <= 0.15) return "High-Impact Scorer";
    if (pct <= 0.35) return "Solid Offensive Player";
    if (pct <= 0.65) return "Average Offensive Player";
    if (pct <= 0.85) return "Limited Offensive Impact";
    return "Minimal Offensive Value";
  }

  // PEM-specific labels
  function assignPemTier(rank: number): string {
    const pct = rank / total;
    if (pct <= 0.05) return "Elite Facilitator";
    if (pct <= 0.15) return "High-Level Playmaker";
    if (pct <= 0.35) return "Capable Playmaker";
    if (pct <= 0.65) return "Average Playmaker";
    if (pct <= 0.85) return "Limited Playmaker";
    return "Non-Creator";
  }

  // GOI-specific labels
  function assignGoiTier(rank: number): string {
    const pct = rank / total;
    if (pct <= 0.05) return "Game Changer";
    if (pct <= 0.15) return "Clutch Performer";
    if (pct <= 0.35) return "Positive Influence";
    if (pct <= 0.65) return "Neutral Impact";
    if (pct <= 0.85) return "Negative Influence";
    return "Liability";
  }

  // Sort each metric descending, assign rank + tier
  const bisSorted = [...playerMetrics].sort((a, b) => b.bis - a.bis);
  const drsSorted = [...playerMetrics].sort((a, b) => b.drs - a.drs);
  const oiqSorted = [...playerMetrics].sort((a, b) => b.rda - a.rda);
  const pemSorted = [...playerMetrics].sort((a, b) => b.sps - a.sps);
  const goiSorted = [...playerMetrics].sort((a, b) => b.goi - a.goi);

  // Build rank maps
  const bisRank = new Map(bisSorted.map((p, i) => [p.playerId, i]));
  const drsRank = new Map(drsSorted.map((p, i) => [p.playerId, i]));
  const oiqRank = new Map(oiqSorted.map((p, i) => [p.playerId, i]));
  const pemRank = new Map(pemSorted.map((p, i) => [p.playerId, i]));
  const goiRank = new Map(goiSorted.map((p, i) => [p.playerId, i]));

  // Apply tiers + percentiles
  for (const pm of playerMetrics) {
    const bRank = bisRank.get(pm.playerId) ?? total;
    const dRank = drsRank.get(pm.playerId) ?? total;
    const oRank = oiqRank.get(pm.playerId) ?? total;
    const pRank = pemRank.get(pm.playerId) ?? total;
    const gRank = goiRank.get(pm.playerId) ?? total;

    (pm as any).bisPercentile = Math.round(((total - bRank) / total) * 100);
    (pm as any).bisLabel = assignTier(bRank);
    pm.drsLabel = assignDrsTier(dRank);
    pm.rdaLabel = assignOiqTier(oRank);
    pm.spsLabel = assignPemTier(pRank);
    (pm as any).goiLabel = assignGoiTier(gRank);
  }

  // ---- Upsert to DB ----
  let playerCount = 0;
  for (const pm of playerMetrics) {
    await sql`
      INSERT INTO player_metric_snapshots (
        player_id, season_id, computed_at, as_of_date,
        bis_score, bis_confidence, bis_percentile, bis_components,
        rda_score, rda_confidence, rda_label, rda_components,
        drs_score, drs_confidence, drs_label, drs_components,
        lfi_score, lfi_confidence, lfi_streak_label, lfi_windows, lfi_delta,
        sps_score, sps_confidence, sps_label, sps_components,
        goi_score, goi_confidence, goi_components
      ) VALUES (
        ${pm.playerId}, ${seasonId}, NOW(), ${asOfDate},
        ${pm.bis}, ${pm.bisConfidence}, ${(pm as any).bisPercentile}, ${JSON.stringify(pm.bisComponents)},
        ${pm.rda}, ${pm.rdaConfidence}, ${pm.rdaLabel}, ${JSON.stringify(pm.rdaComponents)},
        ${pm.drs}, ${pm.drsConfidence}, ${pm.drsLabel}, ${JSON.stringify(pm.drsComponents)},
        ${pm.lfi}, ${pm.lfiConfidence}, ${pm.lfiStreakLabel}, ${JSON.stringify(pm.lfiWindows)}, ${pm.lfiDelta},
        ${pm.sps}, ${pm.spsConfidence}, ${pm.spsLabel}, ${JSON.stringify(pm.spsComponents)},
        ${pm.goi}, ${pm.goiConfidence}, ${JSON.stringify(pm.goiComponents)}
      )
      ON CONFLICT (player_id)
      DO UPDATE SET
        computed_at = NOW(),
        bis_score = EXCLUDED.bis_score, bis_confidence = EXCLUDED.bis_confidence,
        bis_percentile = EXCLUDED.bis_percentile, bis_components = EXCLUDED.bis_components,
        rda_score = EXCLUDED.rda_score, rda_confidence = EXCLUDED.rda_confidence,
        rda_label = EXCLUDED.rda_label, rda_components = EXCLUDED.rda_components,
        drs_score = EXCLUDED.drs_score, drs_confidence = EXCLUDED.drs_confidence,
        drs_label = EXCLUDED.drs_label, drs_components = EXCLUDED.drs_components,
        lfi_score = EXCLUDED.lfi_score, lfi_confidence = EXCLUDED.lfi_confidence,
        lfi_streak_label = EXCLUDED.lfi_streak_label, lfi_windows = EXCLUDED.lfi_windows,
        lfi_delta = EXCLUDED.lfi_delta,
        sps_score = EXCLUDED.sps_score, sps_confidence = EXCLUDED.sps_confidence,
        sps_label = EXCLUDED.sps_label, sps_components = EXCLUDED.sps_components,
        goi_score = EXCLUDED.goi_score, goi_confidence = EXCLUDED.goi_confidence,
        goi_components = EXCLUDED.goi_components
    `;
    playerCount++;
  }
  console.log(`Upserted ${playerCount} player metric snapshots.\n`);

  // =========================================================================
  // TEAM METRICS (improved)
  // =========================================================================
  console.log("--- Computing Team Metrics (v2) ---");

  const teamStats = await sql`
    SELECT tss.*, t.name AS team_name, t.abbreviation
    FROM team_season_stats tss
    JOIN teams t ON t.id = tss.team_id
    WHERE tss.season_id = ${seasonId}
  `;
  console.log(`Found ${teamStats.length} team season stat rows.`);

  // Team league averages
  const teamAvg = { winPct: 0, fgPct: 0, drtg: 0, ortg: 0, pace: 0, netRtg: 0 };
  const tn = teamStats.length || 1;
  for (const t of teamStats) {
    const w = num(t.wins); const l = num(t.losses);
    teamAvg.winPct += w / (w + l || 1);
    teamAvg.fgPct += num(t.fg_pct);
    teamAvg.drtg += num(t.drtg, 112);
    teamAvg.ortg += num(t.ortg, 112);
    teamAvg.pace += num(t.pace, 100);
    teamAvg.netRtg += num(t.net_rating);
  }
  for (const k of Object.keys(teamAvg) as (keyof typeof teamAvg)[]) teamAvg[k] /= tn;

  // Player BIS by team (weighted by minutes)
  const bisScoresByTeam: Record<number, { bis: number; mpg: number }[]> = {};
  const rosterRows = await sql`SELECT player_id, team_id FROM rosters WHERE season_id = ${seasonId}`;
  const playerTeamMap: Record<number, number> = {};
  for (const r of rosterRows) playerTeamMap[r.player_id] = r.team_id;
  for (const pm of playerMetrics) {
    const teamId = playerTeamMap[pm.playerId];
    if (teamId) {
      if (!bisScoresByTeam[teamId]) bisScoresByTeam[teamId] = [];
      const ps = playerStats.find(p => p.player_id === pm.playerId);
      bisScoresByTeam[teamId].push({ bis: pm.bis, mpg: num(ps?.mpg) });
    }
  }

  // Recent games by team
  const recentTeamGames = await sql`
    SELECT home_team_id, away_team_id, home_score, away_score, game_date
    FROM games WHERE season_id = ${seasonId} AND status = 'final'
    ORDER BY game_date DESC
  `;
  const gamesByTeam: Record<number, { won: boolean; margin: number; oppNetRtg: number }[]> = {};
  // Build team net rating lookup
  const teamNetRtgMap: Record<number, number> = {};
  for (const t of teamStats) teamNetRtgMap[t.team_id] = num(t.net_rating);

  for (const g of recentTeamGames) {
    const hid = g.home_team_id; const aid = g.away_team_id;
    const hs = num(g.home_score); const as_ = num(g.away_score);
    if (!gamesByTeam[hid]) gamesByTeam[hid] = [];
    if (!gamesByTeam[aid]) gamesByTeam[aid] = [];
    gamesByTeam[hid].push({ won: hs > as_, margin: hs - as_, oppNetRtg: teamNetRtgMap[aid] || 0 });
    gamesByTeam[aid].push({ won: as_ > hs, margin: as_ - hs, oppNetRtg: teamNetRtgMap[hid] || 0 });
  }

  // Injury BIS impact
  const injuryBIS = await sql`
    SELECT pi.team_id, SUM(COALESCE(pms.bis_score, 40)) as total_bis, COUNT(*) as cnt
    FROM player_injuries pi
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = pi.player_id
    WHERE pi.season_id = ${seasonId} AND pi.is_current = true AND pi.status IN ('Out', 'out')
    GROUP BY pi.team_id
  `;
  const injuryImpact: Record<number, { totalBis: number; count: number }> = {};
  for (const ib of injuryBIS) {
    injuryImpact[ib.team_id] = { totalBis: num(ib.total_bis), count: num(ib.cnt) };
  }

  // Collect all team metrics first, then rescale, then upsert
  type TeamMetricRow = {
    teamId: number; tsc: number; ltfi: number; lss: number; pts: number; rp: number; drsTeam: number;
    w: number; l: number; winPctScore: number; weightedBIS: number; depthScore: number;
    netRtg: number; drtg: number; drtgDiff: number; tGamesLen: number; sosAdj: number;
    injImpact: { totalBis: number; count: number };
  };
  const teamMetrics: TeamMetricRow[] = [];

  for (const ts of teamStats) {
    const teamId = ts.team_id;
    const w = num(ts.wins); const l = num(ts.losses);
    const winPct = w / (w + l || 1);
    const drtg = num(ts.drtg, 112);
    const ortg = num(ts.ortg, 112);
    const netRtg = num(ts.net_rating);
    const sos = num(ts.sos);

    const teamPlayers = bisScoresByTeam[teamId] || [];
    const weightedBIS = teamPlayers.length > 0
      ? teamPlayers.reduce((s, p) => s + p.bis * Math.min(p.mpg, 36), 0) / teamPlayers.reduce((s, p) => s + Math.min(p.mpg, 36), 0)
      : 50;
    const depthCount = teamPlayers.filter(p => p.bis > 50 && p.mpg > 15).length;
    const depthScore = clamp(depthCount * 12, 0, 100);
    const winPctScore = clamp(winPct * 100);
    const tsc = clamp(winPctScore * 0.35 + weightedBIS * 0.35 + depthScore * 0.30);

    const tGames = (gamesByTeam[teamId] || []).slice(0, 10);
    let ltfi = 50;
    if (tGames.length >= 3) {
      let weightedWins = 0, totalWeight = 0;
      for (const g of tGames) {
        const oppStr = clamp((g.oppNetRtg + 10) / 20 * 100, 20, 100) / 100;
        const wt = 0.5 + oppStr * 0.5;
        weightedWins += g.won ? wt : 0;
        totalWeight += wt;
      }
      const adjWinPct = totalWeight > 0 ? weightedWins / totalWeight : 0.5;
      const avgMargin = tGames.reduce((s, g) => s + g.margin, 0) / tGames.length;
      ltfi = clamp(adjWinPct * 60 + 20 + avgMargin * 0.4);
    }

    const netRtgDiff = netRtg - teamAvg.netRtg;
    const lss = clamp(50 + netRtgDiff * 4);
    const sosAdj = num(ts.sos_remaining, sos) * 10;
    const pts = clamp(winPctScore * 0.55 + ltfi * 0.30 + (50 - sosAdj) * 0.15);
    const injImpact = injuryImpact[teamId] || { totalBis: 0, count: 0 };
    const bisPenalty = injImpact.totalBis * 0.4;
    const rp = clamp(100 - bisPenalty);
    const drtgDiff = teamAvg.drtg - drtg;
    const drsTeam = clamp(50 + drtgDiff * 5);

    teamMetrics.push({
      teamId, tsc, ltfi, lss, pts, rp, drsTeam,
      w, l, winPctScore, weightedBIS, depthScore,
      netRtg, drtg, drtgDiff, tGamesLen: tGames.length, sosAdj,
      injImpact,
    });
  }

  // ---- Rescale team metrics to 0-99 ----
  function rescaleTeamMetric(key: "tsc" | "ltfi" | "lss" | "pts" | "drsTeam") {
    const values = teamMetrics.map(t => t[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    for (const tm of teamMetrics) {
      tm[key] = Math.round(((tm[key] - min) / range) * 99 * 100) / 100;
    }
  }
  // RP is inverted (100 = healthy, lower = more injuries) — don't rescale, it's already intuitive
  rescaleTeamMetric("tsc");
  rescaleTeamMetric("ltfi");
  rescaleTeamMetric("lss");
  rescaleTeamMetric("pts");
  rescaleTeamMetric("drsTeam");
  console.log("  ✓ Team metrics rescaled to 0-99");

  // ---- Upsert team metrics ----
  let teamCount = 0;
  for (const tm of teamMetrics) {
    const ts = teamStats.find(t => t.team_id === tm.teamId);
    if (!ts) continue;

    await sql`
      INSERT INTO team_metric_snapshots (
        team_id, season_id, computed_at, as_of_date,
        tsc_score, tsc_confidence, tsc_components,
        ltfi_score, ltfi_windows, ltfi_components,
        lss_score, lss_confidence, lss_components,
        pts_score, pts_confidence, pts_components,
        rp_score, rp_penalties,
        drs_team_score, drs_team_star_drop, drs_team_components
      ) VALUES (
        ${tm.teamId}, ${seasonId}, NOW(), ${asOfDate},
        ${Math.round(tm.tsc * 100) / 100}, ${clamp(Math.min((tm.w + tm.l) / 40, 1), 0, 1)},
        ${JSON.stringify({ winPct: tm.winPctScore, weightedBIS: tm.weightedBIS, depth: tm.depthScore })},
        ${Math.round(tm.ltfi * 100) / 100},
        ${JSON.stringify({ gamesUsed: tm.tGamesLen })},
        ${JSON.stringify({ recentGames: tm.tGamesLen, sosAdjusted: true })},
        ${Math.round(tm.lss * 100) / 100}, ${clamp(Math.min((tm.w + tm.l) / 40, 1), 0, 1)},
        ${JSON.stringify({ netRtg: tm.netRtg, leagueAvg: teamAvg.netRtg })},
        ${Math.round(tm.pts * 100) / 100}, ${clamp(Math.min((tm.w + tm.l) / 50, 1), 0, 1)},
        ${JSON.stringify({ trajectory: tm.winPctScore, ltfi: tm.ltfi, sosAdj: tm.sosAdj })},
        ${Math.round(tm.rp * 100) / 100},
        ${JSON.stringify({ injuredPlayers: tm.injImpact.count, bisLost: tm.injImpact.totalBis })},
        ${Math.round(tm.drsTeam * 100) / 100}, ${0},
        ${JSON.stringify({ drtg: tm.drtg, leagueAvg: teamAvg.drtg, diff: tm.drtgDiff })}
      )
      ON CONFLICT (team_id, season_id)
      DO UPDATE SET
        computed_at = NOW(),
        tsc_score = EXCLUDED.tsc_score, tsc_confidence = EXCLUDED.tsc_confidence, tsc_components = EXCLUDED.tsc_components,
        ltfi_score = EXCLUDED.ltfi_score, ltfi_windows = EXCLUDED.ltfi_windows, ltfi_components = EXCLUDED.ltfi_components,
        lss_score = EXCLUDED.lss_score, lss_confidence = EXCLUDED.lss_confidence, lss_components = EXCLUDED.lss_components,
        pts_score = EXCLUDED.pts_score, pts_confidence = EXCLUDED.pts_confidence, pts_components = EXCLUDED.pts_components,
        rp_score = EXCLUDED.rp_score, rp_penalties = EXCLUDED.rp_penalties,
        drs_team_score = EXCLUDED.drs_team_score, drs_team_star_drop = EXCLUDED.drs_team_star_drop, drs_team_components = EXCLUDED.drs_team_components
    `;
    teamCount++;
  }
  console.log(`Upserted ${teamCount} team metric snapshots.\n`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("=== Computation Summary ===");
  console.log(`Season:          ${currentSeason.label} (id=${seasonId})`);
  console.log(`As-of date:      ${asOfDate}`);
  console.log(`Players computed: ${playerCount}`);
  console.log(`Teams computed:   ${teamCount}`);

  if (playerMetrics.length > 0) {
    const topBIS = [...playerMetrics].sort((a, b) => b.bis - a.bis).slice(0, 10);
    console.log("\nTop 10 BIS (v2):");
    for (const pm of topBIS) {
      const ps = playerStats.find(p => p.player_id === pm.playerId);
      console.log(`  ${(ps?.full_name || "???").padEnd(25)} BIS: ${pm.bis.toFixed(1).padStart(5)}  DRS: ${pm.drs.toFixed(1).padStart(5)}  OIQ: ${pm.rda.toFixed(1).padStart(5)}  LFI: ${pm.lfi.toFixed(1).padStart(5)}  PEM: ${pm.sps.toFixed(1).padStart(5)}  GOI: ${pm.goi.toFixed(1).padStart(5)}`);
    }

    console.log("\nTop 10 DRS (Defenders):");
    const topDRS = [...playerMetrics].filter(p => {
      const ps = playerStats.find(s => s.player_id === p.playerId);
      return num(ps?.mpg) > 20;
    }).sort((a, b) => b.drs - a.drs).slice(0, 10);
    for (const pm of topDRS) {
      const ps = playerStats.find(p => p.player_id === pm.playerId);
      console.log(`  ${(ps?.full_name || "???").padEnd(25)} DRS: ${pm.drs.toFixed(1).padStart(5)}  ${pm.drsLabel}`);
    }
  }

  console.log("\nDone!");
  await sql.end();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await sql.end();
  process.exit(1);
});
