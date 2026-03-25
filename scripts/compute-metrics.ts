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
  // Return a 0-100 scale where 50 = league average
  if (stdApprox === 0) return 50;
  const z = (val - leagueAvg) / stdApprox;
  return clamp(50 + z * 15, 0, 100);
}

function tierLabel(score: number): string {
  if (score >= 85) return "elite";
  if (score >= 70) return "above_average";
  if (score >= 50) return "average";
  if (score >= 35) return "below_average";
  return "poor";
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== CourtVision Metric Computation Engine ===\n");

  // 1. Get current season
  const [currentSeason] = await sql`
    SELECT id, year, label FROM seasons WHERE is_current = true LIMIT 1
  `;
  if (!currentSeason) {
    console.error("No current season found (is_current = true). Aborting.");
    process.exit(1);
  }
  const seasonId = currentSeason.id;
  const asOfDate = new Date().toISOString().split("T")[0]; // today
  console.log(`Season: ${currentSeason.label} (id=${seasonId}), as_of_date: ${asOfDate}\n`);

  // =========================================================================
  // PLAYER METRICS
  // =========================================================================
  console.log("--- Computing Player Metrics ---");

  // Fetch all player season stats for this season
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
    console.log("No player stats found. Skipping player metrics.");
  }

  // Compute league averages
  const leagueAvg = {
    ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, fgPct: 0, gp: 0,
    topg: 0, usgPct: 0, fg3Pct: 0, tsPct: 0, astPct: 0, tovPct: 0,
  };
  const n = playerStats.length || 1;
  for (const p of playerStats) {
    leagueAvg.ppg += parseFloat(p.ppg || "0");
    leagueAvg.rpg += parseFloat(p.rpg || "0");
    leagueAvg.apg += parseFloat(p.apg || "0");
    leagueAvg.spg += parseFloat(p.spg || "0");
    leagueAvg.bpg += parseFloat(p.bpg || "0");
    leagueAvg.fgPct += parseFloat(p.fg_pct || "0");
    leagueAvg.gp += parseInt(p.games_played || "0");
    leagueAvg.topg += parseFloat(p.topg || "0");
    leagueAvg.usgPct += parseFloat(p.usg_pct || "0");
    leagueAvg.fg3Pct += parseFloat(p.fg3_pct || "0");
    leagueAvg.tsPct += parseFloat(p.ts_pct || "0");
    leagueAvg.astPct += parseFloat(p.ast_pct || "0");
    leagueAvg.tovPct += parseFloat(p.tov_pct || "0");
  }
  for (const key of Object.keys(leagueAvg) as (keyof typeof leagueAvg)[]) {
    leagueAvg[key] /= n;
  }

  // Approximate standard deviations (use simple calculation)
  const leagueStd = {
    ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, fgPct: 0, gp: 0,
    topg: 0, usgPct: 0, fg3Pct: 0, tsPct: 0, astPct: 0, tovPct: 0,
  };
  for (const p of playerStats) {
    leagueStd.ppg += (parseFloat(p.ppg || "0") - leagueAvg.ppg) ** 2;
    leagueStd.rpg += (parseFloat(p.rpg || "0") - leagueAvg.rpg) ** 2;
    leagueStd.apg += (parseFloat(p.apg || "0") - leagueAvg.apg) ** 2;
    leagueStd.spg += (parseFloat(p.spg || "0") - leagueAvg.spg) ** 2;
    leagueStd.bpg += (parseFloat(p.bpg || "0") - leagueAvg.bpg) ** 2;
    leagueStd.fgPct += (parseFloat(p.fg_pct || "0") - leagueAvg.fgPct) ** 2;
    leagueStd.gp += (parseInt(p.games_played || "0") - leagueAvg.gp) ** 2;
    leagueStd.topg += (parseFloat(p.topg || "0") - leagueAvg.topg) ** 2;
    leagueStd.usgPct += (parseFloat(p.usg_pct || "0") - leagueAvg.usgPct) ** 2;
    leagueStd.fg3Pct += (parseFloat(p.fg3_pct || "0") - leagueAvg.fg3Pct) ** 2;
    leagueStd.tsPct += (parseFloat(p.ts_pct || "0") - leagueAvg.tsPct) ** 2;
    leagueStd.astPct += (parseFloat(p.ast_pct || "0") - leagueAvg.astPct) ** 2;
    leagueStd.tovPct += (parseFloat(p.tov_pct || "0") - leagueAvg.tovPct) ** 2;
  }
  for (const key of Object.keys(leagueStd) as (keyof typeof leagueStd)[]) {
    leagueStd[key] = Math.sqrt(leagueStd[key] / n) || 1;
  }

  // Fetch game logs for LFI computation (last 5 games per player)
  const gameLogs = await sql`
    SELECT
      pgl.player_id,
      pgl.pts, pgl.reb, pgl.ast, pgl.stl, pgl.blk,
      pgl.fgm, pgl.fga, pgl.plus_minus, pgl.minutes,
      g.game_date
    FROM player_game_logs pgl
    JOIN games g ON g.id = pgl.game_id
    WHERE pgl.season_id = ${seasonId}
      AND pgl.status = 'active'
    ORDER BY pgl.player_id, g.game_date DESC
  `;

  // Group game logs by player
  const logsByPlayer: Record<number, typeof gameLogs> = {};
  for (const log of gameLogs) {
    const pid = log.player_id;
    if (!logsByPlayer[pid]) logsByPlayer[pid] = [];
    logsByPlayer[pid].push(log);
  }

  // Compute per-player metrics
  type PlayerMetricRow = {
    playerId: number;
    bis: number;
    bisConfidence: number;
    bisComponents: object;
    rda: number;
    rdaConfidence: number;
    rdaLabel: string;
    rdaComponents: object;
    drs: number;
    drsConfidence: number;
    drsLabel: string;
    drsComponents: object;
    lfi: number;
    lfiConfidence: number;
    lfiStreakLabel: string;
    lfiWindows: object;
    lfiDelta: number;
    sps: number;
    spsConfidence: number;
    spsLabel: string;
    spsComponents: object;
    goi: number;
    goiConfidence: number;
    goiComponents: object;
  };

  const playerMetrics: PlayerMetricRow[] = [];

  for (const ps of playerStats) {
    const playerId = ps.player_id;
    const gp = parseInt(ps.games_played || "0");
    const ppg = parseFloat(ps.ppg || "0");
    const rpg = parseFloat(ps.rpg || "0");
    const apg = parseFloat(ps.apg || "0");
    const spg = parseFloat(ps.spg || "0");
    const bpg = parseFloat(ps.bpg || "0");
    const fgPct = parseFloat(ps.fg_pct || "0");
    const fg3Pct = parseFloat(ps.fg3_pct || "0");
    const tsPct = parseFloat(ps.ts_pct || "0");
    const usgPct = parseFloat(ps.usg_pct || "0");
    const astPct = parseFloat(ps.ast_pct || "0");
    const tovPct = parseFloat(ps.tov_pct || "0");
    const topg = parseFloat(ps.topg || "0");
    const position = (ps.position || "G").toUpperCase();
    const isGuard = position.includes("G");
    const isBig = position.includes("C") || position.includes("F");

    // ---- BIS (Baseline Impact Score) ----
    const ppgNorm = normalize(ppg, leagueAvg.ppg, leagueStd.ppg);
    const rpgNorm = normalize(rpg, leagueAvg.rpg, leagueStd.rpg);
    const apgNorm = normalize(apg, leagueAvg.apg, leagueStd.apg);
    const spgNorm = normalize(spg, leagueAvg.spg, leagueStd.spg);
    const bpgNorm = normalize(bpg, leagueAvg.bpg, leagueStd.bpg);
    const fgNorm = normalize(fgPct, leagueAvg.fgPct, leagueStd.fgPct);
    const gpNorm = normalize(gp, leagueAvg.gp, leagueStd.gp);

    const bis = clamp(
      ppgNorm * 0.25 +
      rpgNorm * 0.15 +
      apgNorm * 0.20 +
      spgNorm * 0.10 +
      bpgNorm * 0.10 +
      fgNorm * 0.10 +
      gpNorm * 0.10
    );
    // Confidence based on games played (82-game season)
    const bisConfidence = clamp(Math.min(gp / 50, 1), 0, 1);

    // ---- RDA (Role Difficulty Adjusted) ----
    const usgNorm = normalize(usgPct, leagueAvg.usgPct, leagueStd.usgPct);
    // Approximate unassisted shot rate from 3P% (higher 3P attempts = harder shots)
    const fg3Norm = normalize(fg3Pct, leagueAvg.fg3Pct, leagueStd.fg3Pct);
    const tsNorm = normalize(tsPct, leagueAvg.tsPct, leagueStd.tsPct);
    // Combine: high usage + maintaining efficiency = hard role done well
    const rda = clamp(usgNorm * 0.40 + fg3Norm * 0.20 + tsNorm * 0.25 + ppgNorm * 0.15);
    const rdaConfidence = bisConfidence;
    const rdaLabel = tierLabel(rda);

    // ---- DRS (Defensive Reality Score) ----
    // Uses real defensive data: DEF_RATING, contested shots, deflections, charges, hustle stats
    const defRating = parseFloat(ps.def_rating || "0");
    const defWs = parseFloat(ps.def_ws || "0");
    const contestedShots = parseFloat(ps.contested_shots || "0");
    const deflections = parseFloat(ps.deflections || "0");
    const chargesDrawn = parseFloat(ps.charges_drawn || "0");
    const looseBalls = parseFloat(ps.loose_balls || "0");
    const boxOuts = parseFloat(ps.box_outs || "0");
    const oppPtsPaint = parseFloat(ps.opp_pts_paint || "0");

    const hasDefData = defRating > 0 || contestedShots > 0;

    let drs: number;
    if (hasDefData) {
      // Real defensive data available — use advanced metrics
      // DEF_RATING: lower is better (league avg ~112), invert and normalize
      const defRtgNorm = defRating > 0 ? clamp(50 + (112 - defRating) * 3, 0, 100) : 50;
      // DEF_WS: higher is better (league avg ~0.04/game), normalize
      const defWsNorm = defWs > 0 ? clamp(normalize(defWs * gp, 1.5, 1.2), 0, 100) : 50;
      // Contested shots: higher is better (league avg ~5 for starters)
      const contestNorm = normalize(contestedShots, 4.5, 2.5);
      // Deflections: higher is better (league avg ~2)
      const deflNorm = normalize(deflections, 2.0, 1.5);
      // Charges: higher is better (league avg ~0.2)
      const chargeNorm = chargesDrawn > 0 ? clamp(50 + chargesDrawn * 30, 0, 100) : 50;
      // Loose balls: hustle (league avg ~0.5)
      const hustleNorm = normalize(looseBalls + boxOuts * 0.3, 1.0, 0.8);

      // Weighted: DEF_RATING is king (35%), then contested shots (20%), deflections (15%),
      // DEF_WS (10%), hustle (10%), traditional STL/BLK (10%)
      drs = clamp(
        defRtgNorm * 0.35 +
        contestNorm * 0.20 +
        deflNorm * 0.15 +
        defWsNorm * 0.10 +
        hustleNorm * 0.10 +
        (spgNorm * 0.5 + bpgNorm * 0.5) * 0.10,
        0, 100
      );
    } else {
      // Fallback: box score only (less reliable, cap at 70 max)
      const drebFactor = isBig ? 0.7 : 0.3;
      const estimatedDreb = rpg * drebFactor;
      const drebNorm = normalize(estimatedDreb, leagueAvg.rpg * drebFactor, leagueStd.rpg * drebFactor);
      const posAdj = isBig
        ? bpgNorm * 0.15 + spgNorm * 0.05
        : spgNorm * 0.15 + bpgNorm * 0.05;
      drs = clamp((spgNorm * 0.25 + bpgNorm * 0.25 + drebNorm * 0.30 + posAdj) * 0.7, 0, 70);
    }

    const drsConfidence = hasDefData ? bisConfidence : bisConfidence * 0.5;
    const drsLabel = hasDefData
      ? (drs >= 80 ? "Elite Defender" : drs >= 65 ? "Plus Defender" : drs >= 50 ? "Solid Defender" : drs >= 35 ? "Average Defender" : "Weak Defender")
      : (drs >= 60 ? "Good (box score est.)" : drs >= 40 ? "Average (box score est.)" : "Below Avg (box score est.)");

    // ---- LFI (Live Form Index) ----
    const logs = logsByPlayer[playerId] || [];
    const last5 = logs.slice(0, 5);
    let lfi = 50; // default stable
    let lfiDelta = 0;
    let lfiConfidence = 0;
    let lfiStreakLabel = "stable";

    if (last5.length >= 3) {
      const avg5 = {
        pts: last5.reduce((s, l) => s + (l.pts || 0), 0) / last5.length,
        reb: last5.reduce((s, l) => s + (l.reb || 0), 0) / last5.length,
        ast: last5.reduce((s, l) => s + (l.ast || 0), 0) / last5.length,
        fgPct: last5.reduce((s, l) => {
          const fga = l.fga || 0;
          const fgm = l.fgm || 0;
          return s + (fga > 0 ? fgm / fga : 0);
        }, 0) / last5.length,
        plusMinus: last5.reduce((s, l) => s + (l.plus_minus || 0), 0) / last5.length,
      };

      // Deltas vs season averages
      const ptsDelta = ppg > 0 ? (avg5.pts - ppg) / (ppg || 1) : 0;
      const rebDelta = rpg > 0 ? (avg5.reb - rpg) / (rpg || 1) : 0;
      const astDelta = apg > 0 ? (avg5.ast - apg) / (apg || 1) : 0;

      lfiDelta = (ptsDelta * 0.40 + rebDelta * 0.25 + astDelta * 0.35) * 100;
      lfi = clamp(50 + lfiDelta * 2);
      lfiConfidence = clamp(Math.min(last5.length / 5, 1), 0, 1);

      // Determine streak label
      if (lfi >= 70 && avg5.plusMinus > 3) lfiStreakLabel = "hot_likely_real";
      else if (lfi >= 65 && avg5.plusMinus <= 0) lfiStreakLabel = "hot_opponent_driven";
      else if (lfi >= 60) lfiStreakLabel = "hot_fragile";
      else if (lfi <= 35 && avg5.plusMinus < -3) lfiStreakLabel = "cold_real";
      else if (lfi <= 40) lfiStreakLabel = "cold_bouncing_back";
      else if (lfi >= 60 && usgPct > leagueAvg.usgPct * 1.2) lfiStreakLabel = "breakout_role_expansion";
      else lfiStreakLabel = "stable";
    }

    // ---- SPS (Scalability Profile Score) ----
    const astNorm = normalize(astPct, leagueAvg.astPct, leagueStd.astPct);
    const tovNorm = normalize(tovPct, leagueAvg.tovPct, leagueStd.tovPct);
    // Invert turnover norm: lower TOV% = better
    const tovInverted = clamp(100 - tovNorm);
    const sps = clamp(tsNorm * 0.35 + astNorm * 0.30 + tovInverted * 0.25 + gpNorm * 0.10);
    const spsConfidence = bisConfidence;
    const spsLabel = tierLabel(sps);

    // ---- GOI (Game Outcome Influence) ----
    let goiPlusMinusScore = 50;
    let goiClutchScore = 50;
    if (logs.length >= 3) {
      const avgPM = logs.slice(0, 10).reduce((s, l) => s + (l.plus_minus || 0), 0) / Math.min(logs.length, 10);
      goiPlusMinusScore = clamp(50 + avgPM * 2);
      // Clutch approximation: variance in plus_minus (consistent positive = clutch)
      const pmValues = logs.slice(0, 10).map(l => l.plus_minus || 0);
      const pmStd = Math.sqrt(pmValues.reduce((s, v) => s + (v - avgPM) ** 2, 0) / pmValues.length) || 1;
      // High mean, low variance = clutch
      goiClutchScore = clamp(50 + (avgPM / pmStd) * 10);
    }
    const goi = clamp(goiPlusMinusScore * 0.60 + goiClutchScore * 0.40);
    const goiConfidence = clamp(Math.min((logs.length || 0) / 20, 1), 0, 1);

    playerMetrics.push({
      playerId,
      bis: Math.round(bis * 100) / 100,
      bisConfidence: Math.round(bisConfidence * 100) / 100,
      bisComponents: { ppg: ppgNorm, rpg: rpgNorm, apg: apgNorm, spg: spgNorm, bpg: bpgNorm, fg: fgNorm, gp: gpNorm },
      rda: Math.round(rda * 100) / 100,
      rdaConfidence: Math.round(rdaConfidence * 100) / 100,
      rdaLabel,
      rdaComponents: { usage: usgNorm, fg3: fg3Norm, ts: tsNorm, ppg: ppgNorm },
      drs: Math.round(drs * 100) / 100,
      drsConfidence: Math.round(drsConfidence * 100) / 100,
      drsLabel,
      drsComponents: hasDefData
        ? { defRtg: defRating, contested: contestedShots, deflections, defWs, hustle: looseBalls, stl: spgNorm, blk: bpgNorm }
        : { stl: spgNorm, blk: bpgNorm, boxScoreOnly: true },
      lfi: Math.round(lfi * 100) / 100,
      lfiConfidence: Math.round(lfiConfidence * 100) / 100,
      lfiStreakLabel,
      lfiWindows: { last5Games: last5.length, delta: lfiDelta },
      lfiDelta: Math.round(lfiDelta * 100) / 100,
      sps: Math.round(sps * 100) / 100,
      spsConfidence: Math.round(spsConfidence * 100) / 100,
      spsLabel,
      spsComponents: { ts: tsNorm, ast: astNorm, tovInv: tovInverted, gp: gpNorm },
      goi: Math.round(goi * 100) / 100,
      goiConfidence: Math.round(goiConfidence * 100) / 100,
      goiComponents: { plusMinus: goiPlusMinusScore, clutch: goiClutchScore },
    });
  }

  // Compute BIS percentiles
  const bisSorted = [...playerMetrics].sort((a, b) => a.bis - b.bis);
  for (const pm of playerMetrics) {
    const rank = bisSorted.findIndex(x => x.playerId === pm.playerId);
    (pm as any).bisPercentile = Math.round((rank / (bisSorted.length || 1)) * 10000) / 100;
  }

  // Upsert player metrics
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
        bis_score = EXCLUDED.bis_score,
        bis_confidence = EXCLUDED.bis_confidence,
        bis_percentile = EXCLUDED.bis_percentile,
        bis_components = EXCLUDED.bis_components,
        rda_score = EXCLUDED.rda_score,
        rda_confidence = EXCLUDED.rda_confidence,
        rda_label = EXCLUDED.rda_label,
        rda_components = EXCLUDED.rda_components,
        drs_score = EXCLUDED.drs_score,
        drs_confidence = EXCLUDED.drs_confidence,
        drs_label = EXCLUDED.drs_label,
        drs_components = EXCLUDED.drs_components,
        lfi_score = EXCLUDED.lfi_score,
        lfi_confidence = EXCLUDED.lfi_confidence,
        lfi_streak_label = EXCLUDED.lfi_streak_label,
        lfi_windows = EXCLUDED.lfi_windows,
        lfi_delta = EXCLUDED.lfi_delta,
        sps_score = EXCLUDED.sps_score,
        sps_confidence = EXCLUDED.sps_confidence,
        sps_label = EXCLUDED.sps_label,
        sps_components = EXCLUDED.sps_components,
        goi_score = EXCLUDED.goi_score,
        goi_confidence = EXCLUDED.goi_confidence,
        goi_components = EXCLUDED.goi_components
    `;
    playerCount++;
  }
  console.log(`Upserted ${playerCount} player metric snapshots.\n`);

  // =========================================================================
  // TEAM METRICS
  // =========================================================================
  console.log("--- Computing Team Metrics ---");

  const teamStats = await sql`
    SELECT
      tss.*,
      t.name AS team_name,
      t.abbreviation
    FROM team_season_stats tss
    JOIN teams t ON t.id = tss.team_id
    WHERE tss.season_id = ${seasonId}
  `;
  console.log(`Found ${teamStats.length} team season stat rows.`);

  // League averages for teams
  const teamLeagueAvg = {
    winPct: 0, fgPct: 0, drtg: 0, ortg: 0, pace: 0,
  };
  const tn = teamStats.length || 1;
  for (const t of teamStats) {
    const wins = parseInt(t.wins || "0");
    const losses = parseInt(t.losses || "0");
    const total = wins + losses || 1;
    teamLeagueAvg.winPct += wins / total;
    teamLeagueAvg.fgPct += parseFloat(t.fg_pct || "0");
    teamLeagueAvg.drtg += parseFloat(t.drtg || "110");
    teamLeagueAvg.ortg += parseFloat(t.ortg || "110");
    teamLeagueAvg.pace += parseFloat(t.pace || "100");
  }
  for (const key of Object.keys(teamLeagueAvg) as (keyof typeof teamLeagueAvg)[]) {
    teamLeagueAvg[key] /= tn;
  }

  // Build map of player BIS scores by team
  const bisScoresByTeam: Record<number, number[]> = {};
  // We need roster -> team mapping
  const rosterRows = await sql`
    SELECT player_id, team_id FROM rosters WHERE season_id = ${seasonId}
  `;
  const playerTeamMap: Record<number, number> = {};
  for (const r of rosterRows) {
    playerTeamMap[r.player_id] = r.team_id;
  }
  for (const pm of playerMetrics) {
    const teamId = playerTeamMap[pm.playerId];
    if (teamId) {
      if (!bisScoresByTeam[teamId]) bisScoresByTeam[teamId] = [];
      bisScoresByTeam[teamId].push(pm.bis);
    }
  }

  // Fetch recent team games for LTFI
  const recentTeamGames = await sql`
    SELECT
      g.home_team_id, g.away_team_id,
      g.home_score, g.away_score,
      g.game_date
    FROM games g
    WHERE g.season_id = ${seasonId}
      AND g.status = 'final'
    ORDER BY g.game_date DESC
  `;

  // Group games by team
  const gamesByTeam: Record<number, Array<{won: boolean; date: string; margin: number}>> = {};
  for (const g of recentTeamGames) {
    const homeId = g.home_team_id;
    const awayId = g.away_team_id;
    const homeScore = g.home_score || 0;
    const awayScore = g.away_score || 0;
    if (!gamesByTeam[homeId]) gamesByTeam[homeId] = [];
    if (!gamesByTeam[awayId]) gamesByTeam[awayId] = [];
    gamesByTeam[homeId].push({ won: homeScore > awayScore, date: g.game_date, margin: homeScore - awayScore });
    gamesByTeam[awayId].push({ won: awayScore > homeScore, date: g.game_date, margin: awayScore - homeScore });
  }
  // Sort each team's games by date desc
  for (const teamId of Object.keys(gamesByTeam)) {
    gamesByTeam[parseInt(teamId)].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  // Fetch injury counts per team for Roster Penalty
  const injuryCounts = await sql`
    SELECT team_id, COUNT(*) as cnt
    FROM player_injuries
    WHERE season_id = ${seasonId} AND is_current = true
    GROUP BY team_id
  `;
  const injuryByTeam: Record<number, number> = {};
  for (const ic of injuryCounts) {
    injuryByTeam[ic.team_id] = parseInt(ic.cnt || "0");
  }

  let teamCount = 0;
  for (const ts of teamStats) {
    const teamId = ts.team_id;
    const wins = parseInt(ts.wins || "0");
    const losses = parseInt(ts.losses || "0");
    const total = wins + losses || 1;
    const winPct = wins / total;
    const fgPct = parseFloat(ts.fg_pct || "0");
    const drtg = parseFloat(ts.drtg || "110");
    const ortg = parseFloat(ts.ortg || "110");
    const pace = parseFloat(ts.pace || "100");
    const sos = parseFloat(ts.sos || "0");
    const sosRemaining = parseFloat(ts.sos_remaining || "0");

    // ---- TSC (Team Strength Composite) ----
    const teamBIS = bisScoresByTeam[teamId] || [];
    const topBIS = teamBIS.sort((a, b) => b - a).slice(0, 3);
    const avgTopBIS = topBIS.length > 0 ? topBIS.reduce((s, v) => s + v, 0) / topBIS.length : 50;
    const depthCount = teamBIS.filter(b => b > 50).length;
    const depthScore = clamp(depthCount * 10, 0, 100); // 10 players with BIS>50 = 100

    const winPctScore = clamp(winPct * 100);
    const tsc = clamp(winPctScore * 0.35 + avgTopBIS * 0.35 + depthScore * 0.30);
    const tscConfidence = clamp(Math.min(total / 40, 1), 0, 1);

    // ---- LTFI (Live Team Form Index) ----
    const tGames = (gamesByTeam[teamId] || []).slice(0, 10);
    let ltfi = 50;
    let ltfiConfidence = 0;
    if (tGames.length >= 3) {
      const recentWinPct = tGames.filter(g => g.won).length / tGames.length;
      const avgMargin = tGames.reduce((s, g) => s + g.margin, 0) / tGames.length;
      ltfi = clamp(recentWinPct * 60 + 20 + avgMargin * 0.5);
      ltfiConfidence = clamp(Math.min(tGames.length / 10, 1), 0, 1);
    }

    // ---- LSS (Lineup Synergy Score) ----
    const fgDiff = fgPct - teamLeagueAvg.fgPct;
    const lss = clamp(50 + fgDiff * 500); // amplify small differences
    const lssConfidence = tscConfidence;

    // ---- PTS (Predictive Team Score) ----
    // Forward-looking: current trajectory (win%) + SOS remaining adjustment
    const trajectoryScore = winPctScore;
    const sosAdj = sosRemaining * 10; // positive SOS = harder remaining schedule
    const pts = clamp(trajectoryScore * 0.60 + ltfi * 0.25 + (50 - sosAdj) * 0.15);
    const ptsConfidence = clamp(Math.min(total / 50, 1), 0, 1);

    // ---- RP (Roster Penalty) ----
    const injuries = injuryByTeam[teamId] || 0;
    // Also check for low-GP players as proxy for missed time
    const lowGPPlayers = (bisScoresByTeam[teamId] || []).length;
    const rosterSize = rosterRows.filter(r => r.team_id === teamId).length || 15;
    const missingPenalty = injuries * 5; // 5 points per injured player
    const rp = clamp(100 - missingPenalty);

    // ---- DRS_Team ----
    // Lower DRTG = better defense
    const drtgDiff = teamLeagueAvg.drtg - drtg; // positive = better than average
    const drsTeam = clamp(50 + drtgDiff * 5);
    const drsTeamStarDrop = 0; // Would need lineup data to compute properly

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
        ${teamId}, ${seasonId}, NOW(), ${asOfDate},
        ${Math.round(tsc * 100) / 100}, ${Math.round(tscConfidence * 100) / 100},
        ${JSON.stringify({ winPct: winPctScore, topBIS: avgTopBIS, depth: depthScore })},
        ${Math.round(ltfi * 100) / 100},
        ${JSON.stringify({ gamesUsed: tGames.length })},
        ${JSON.stringify({ recentWins: tGames.filter(g => g.won).length, recentGames: tGames.length })},
        ${Math.round(lss * 100) / 100}, ${Math.round(lssConfidence * 100) / 100},
        ${JSON.stringify({ fgPctDiff: fgDiff })},
        ${Math.round(pts * 100) / 100}, ${Math.round(ptsConfidence * 100) / 100},
        ${JSON.stringify({ trajectory: trajectoryScore, ltfi, sosAdj })},
        ${Math.round(rp * 100) / 100},
        ${JSON.stringify({ injuries, missingPenalty })},
        ${Math.round(drsTeam * 100) / 100}, ${drsTeamStarDrop},
        ${JSON.stringify({ drtg, leagueAvg: teamLeagueAvg.drtg, diff: drtgDiff })}
      )
      ON CONFLICT (team_id, season_id)
      DO UPDATE SET
        computed_at = NOW(),
        tsc_score = EXCLUDED.tsc_score,
        tsc_confidence = EXCLUDED.tsc_confidence,
        tsc_components = EXCLUDED.tsc_components,
        ltfi_score = EXCLUDED.ltfi_score,
        ltfi_windows = EXCLUDED.ltfi_windows,
        ltfi_components = EXCLUDED.ltfi_components,
        lss_score = EXCLUDED.lss_score,
        lss_confidence = EXCLUDED.lss_confidence,
        lss_components = EXCLUDED.lss_components,
        pts_score = EXCLUDED.pts_score,
        pts_confidence = EXCLUDED.pts_confidence,
        pts_components = EXCLUDED.pts_components,
        rp_score = EXCLUDED.rp_score,
        rp_penalties = EXCLUDED.rp_penalties,
        drs_team_score = EXCLUDED.drs_team_score,
        drs_team_star_drop = EXCLUDED.drs_team_star_drop,
        drs_team_components = EXCLUDED.drs_team_components
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
    const topBIS = [...playerMetrics].sort((a, b) => b.bis - a.bis).slice(0, 5);
    console.log("\nTop 5 BIS scores:");
    for (const pm of topBIS) {
      const ps = playerStats.find(p => p.player_id === pm.playerId);
      console.log(`  ${ps?.full_name || pm.playerId}: ${pm.bis.toFixed(2)}`);
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
