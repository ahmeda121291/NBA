/**
 * Cron endpoint for automated data refresh.
 *
 * This route is called by an external cron service (e.g., cron-job.org)
 * to trigger live score updates. Protected by a secret token.
 *
 * Set CRON_SECRET in your Railway env vars.
 *
 * Schedule: Every 15 minutes during game hours, daily full refresh at 6 AM ET.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 second timeout

// Verify the request is authorized
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // If no secret set, allow (dev mode)

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const results: string[] = [];

  try {
    // 1. Fetch live scores from NBA CDN
    const cdnUrl = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";
    const cdnResp = await fetch(cdnUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.nba.com/",
      },
      next: { revalidate: 0 },
    });

    if (cdnResp.ok) {
      const cdnData = await cdnResp.json();
      const games = cdnData?.scoreboard?.games || [];

      let updated = 0;
      for (const g of games) {
        const gameStatus = Number(g.gameStatus);
        let status = "scheduled";
        if (gameStatus === 2) status = "live";
        else if (gameStatus === 3) status = "final";

        const homeScore = g.homeTeam?.score ?? 0;
        const awayScore = g.awayTeam?.score ?? 0;

        if (status === "scheduled" && homeScore === 0 && awayScore === 0) continue;

        const result = await db.execute(sql`
          UPDATE games SET
            home_score = ${homeScore},
            away_score = ${awayScore},
            status = ${status},
            updated_at = NOW()
          WHERE external_id = ${g.gameId}
            AND (status != 'final' OR status IS NULL)
        `);

        if ((result as any).count > 0 || (result as any).rowCount > 0) updated++;
      }

      results.push(`Scores: ${updated} games updated from ${games.length} on CDN`);
    } else {
      results.push(`Scores: CDN returned ${cdnResp.status}`);
    }

    // 2. Update B2B flags for today
    await db.execute(sql`
      UPDATE games g SET
        is_back_to_back_home = EXISTS (
          SELECT 1 FROM games g2
          WHERE (g2.home_team_id = g.home_team_id OR g2.away_team_id = g.home_team_id)
          AND g2.game_date = g.game_date - INTERVAL '1 day'
          AND g2.id != g.id
        ),
        is_back_to_back_away = EXISTS (
          SELECT 1 FROM games g2
          WHERE (g2.home_team_id = g.away_team_id OR g2.away_team_id = g.away_team_id)
          AND g2.game_date = g.game_date - INTERVAL '1 day'
          AND g2.id != g.id
        )
      WHERE g.game_date = CURRENT_DATE
    `);
    results.push("B2B flags updated");

    const elapsed = Date.now() - start;
    return NextResponse.json({
      success: true,
      elapsed_ms: elapsed,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      elapsed_ms: Date.now() - start,
    }, { status: 500 });
  }
}
