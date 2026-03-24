/**
 * CourtVision — Lightweight Live Score Updater
 *
 * Hits the NBA CDN scoreboard endpoint to update game scores and statuses.
 * Much faster than a full ingest — designed to run every 15 min during games.
 *
 * Usage:
 *   npx tsx scripts/update-scores.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", "web", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found. Check web/.env.local");
  process.exit(1);
}

import postgres from "postgres";

const sql = postgres(DATABASE_URL, { max: 3 });

const CDN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://www.nba.com/",
  "Accept-Language": "en-US,en;q=0.9",
};

interface ScoreUpdate {
  externalId: string;
  homeScore: number;
  awayScore: number;
  status: string;
  period: number;
  gameClock: string;
}

async function fetchLiveScoreboard(): Promise<ScoreUpdate[]> {
  const url =
    "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";
  try {
    const resp = await fetch(url, { headers: CDN_HEADERS });
    if (!resp.ok) throw new Error(`CDN ${resp.status}`);
    const data = await resp.json();

    const games = data?.scoreboard?.games || [];
    return games.map((g: any) => {
      let status = "scheduled";
      const gameStatus = Number(g.gameStatus);
      if (gameStatus === 2) status = "live";
      else if (gameStatus === 3) status = "final";

      return {
        externalId: g.gameId,
        homeScore: g.homeTeam?.score ?? 0,
        awayScore: g.awayTeam?.score ?? 0,
        status,
        period: g.period ?? 0,
        gameClock: g.gameClock ?? "",
      };
    });
  } catch (e: any) {
    console.error(`  Failed to fetch scoreboard: ${e.message}`);
    return [];
  }
}

async function updateScores(updates: ScoreUpdate[]): Promise<number> {
  let updated = 0;
  for (const u of updates) {
    if (u.status === "scheduled" && u.homeScore === 0 && u.awayScore === 0)
      continue;

    const result = await sql`
      UPDATE games SET
        home_score = ${u.homeScore},
        away_score = ${u.awayScore},
        status = ${u.status},
        updated_at = NOW()
      WHERE external_id = ${u.externalId}
        AND (status != 'final' OR status IS NULL)
    `;

    if (result.count > 0) updated++;
  }
  return updated;
}

async function detectBackToBack(): Promise<void> {
  // Mark B2B flags for today's games
  await sql`
    UPDATE games g SET
      is_back_to_back_home = EXISTS (
        SELECT 1 FROM games g2
        WHERE g2.home_team_id = g.home_team_id OR g2.away_team_id = g.home_team_id
        AND g2.game_date = g.game_date - INTERVAL '1 day'
        AND g2.id != g.id
      ),
      is_back_to_back_away = EXISTS (
        SELECT 1 FROM games g2
        WHERE g2.home_team_id = g.away_team_id OR g2.away_team_id = g.away_team_id
        AND g2.game_date = g.game_date - INTERVAL '1 day'
        AND g2.id != g.id
      )
    WHERE g.game_date = CURRENT_DATE
  `;
}

async function main() {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Score update starting...`);

  const updates = await fetchLiveScoreboard();
  console.log(`  Fetched ${updates.length} games from NBA CDN`);

  if (updates.length > 0) {
    const liveCount = updates.filter((u) => u.status === "live").length;
    const finalCount = updates.filter((u) => u.status === "final").length;
    console.log(
      `  Status: ${liveCount} live, ${finalCount} final, ${updates.length - liveCount - finalCount} scheduled`
    );

    const updated = await updateScores(updates);
    console.log(`  Updated ${updated} games in database`);

    await detectBackToBack();
  }

  await sql.end();
  console.log(`  Done in ${Date.now() - start}ms`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
