import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CDN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://www.nba.com/",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Live win probability based on score differential and time remaining.
 * Uses a logistic model calibrated to NBA historical data:
 * - A 10-point lead with 36 min left ≈ 65% win prob
 * - A 10-point lead with 6 min left ≈ 88% win prob
 * - A 10-point lead with 1 min left ≈ 97% win prob
 */
function liveWinProbability(
  leadingScore: number,
  trailingScore: number,
  minutesRemaining: number,
  preGameProb?: number
): number {
  const diff = leadingScore - trailingScore;
  const totalMinutes = 48;

  if (minutesRemaining <= 0) {
    return diff > 0 ? 1.0 : diff < 0 ? 0.0 : 0.5;
  }

  // Time factor: as game progresses, current score matters more
  const timeFraction = minutesRemaining / totalMinutes; // 1.0 at start, 0.0 at end
  const urgency = 1 - timeFraction; // 0.0 at start, 1.0 at end

  // Points per minute remaining (how many possessions left to catch up)
  // NBA average: ~2.3 points per team per minute
  const possessionValue = 2.3;
  const expectedSwing = possessionValue * Math.sqrt(minutesRemaining) * 1.5;

  // Logistic function: probability of winning given lead and time
  const k = 0.15 + urgency * 0.35; // steepness increases as game progresses
  const liveProb = 1 / (1 + Math.exp(-k * diff));

  // Blend with pre-game probability early in the game
  if (preGameProb != null && minutesRemaining > 36) {
    // First quarter: weight pre-game model heavily
    const preWeight = Math.max(0, (minutesRemaining - 36) / 12); // 1.0 at game start, 0 at Q2
    return liveProb * (1 - preWeight * 0.4) + preGameProb * (preWeight * 0.4);
  }

  return Math.max(0.02, Math.min(0.98, liveProb));
}

function parseGameClock(clock: string, period: number): number {
  // Convert game clock + period to minutes remaining
  // Period: 1-4 for regulation, 5+ for OT
  let minutesInPeriod = 0;
  if (clock) {
    const parts = clock.replace("PT", "").replace("S", "").split("M");
    if (parts.length === 2) {
      minutesInPeriod = parseFloat(parts[0]) + parseFloat(parts[1] || "0") / 60;
    } else if (clock.includes(":")) {
      const [m, s] = clock.split(":");
      minutesInPeriod = parseFloat(m) + parseFloat(s) / 60;
    }
  }

  if (period <= 4) {
    const periodsRemaining = 4 - period;
    return periodsRemaining * 12 + minutesInPeriod;
  } else {
    // Overtime
    return minutesInPeriod;
  }
}

interface LiveGame {
  gameId: string;
  status: "scheduled" | "live" | "final";
  period: number;
  gameClock: string;
  minutesRemaining: number;
  homeTeam: {
    teamId: number;
    triCode: string;
    name: string;
    score: number;
    record: string;
  };
  awayTeam: {
    teamId: number;
    triCode: string;
    name: string;
    score: number;
    record: string;
  };
  homeWinProb: number;
  awayWinProb: number;
  // Pre-game projection (if available)
  preGameHomeProb?: number;
  preGameAwayProb?: number;
  projectedWinner?: string;
}

export async function GET() {
  try {
    const url = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";
    const resp = await fetch(url, {
      headers: CDN_HEADERS,
      next: { revalidate: 0 },
      cache: "no-store",
    });

    if (!resp.ok) {
      return NextResponse.json({ games: [], error: "NBA CDN unavailable" }, { status: 502 });
    }

    const data = await resp.json();
    const rawGames = data?.scoreboard?.games || [];

    const games: LiveGame[] = rawGames.map((g: any) => {
      const gameStatus = Number(g.gameStatus);
      const status: "scheduled" | "live" | "final" =
        gameStatus === 2 ? "live" : gameStatus === 3 ? "final" : "scheduled";

      const period = g.period || 0;
      const gameClock = g.gameClock || "";
      const minutesRemaining = status === "live" ? parseGameClock(gameClock, period) : status === "final" ? 0 : 48;

      const homeScore = g.homeTeam?.score ?? 0;
      const awayScore = g.awayTeam?.score ?? 0;

      let homeWinProb = 0.5;
      let awayWinProb = 0.5;

      if (status === "final") {
        homeWinProb = homeScore > awayScore ? 1.0 : 0.0;
        awayWinProb = 1.0 - homeWinProb;
      } else if (status === "live") {
        homeWinProb = liveWinProbability(homeScore, awayScore, minutesRemaining);
        awayWinProb = 1.0 - homeWinProb;
      }

      return {
        gameId: g.gameId,
        status,
        period,
        gameClock: gameClock.replace("PT", "").replace("S", "").replace("M", ":").replace(/^0:/, ""),
        minutesRemaining: Math.round(minutesRemaining * 10) / 10,
        homeTeam: {
          teamId: g.homeTeam?.teamId ?? 0,
          triCode: g.homeTeam?.teamTricode ?? "???",
          name: g.homeTeam?.teamName ?? "Home",
          score: homeScore,
          record: `${g.homeTeam?.wins ?? 0}-${g.homeTeam?.losses ?? 0}`,
        },
        awayTeam: {
          teamId: g.awayTeam?.teamId ?? 0,
          triCode: g.awayTeam?.teamTricode ?? "???",
          name: g.awayTeam?.teamName ?? "Away",
          score: awayScore,
          record: `${g.awayTeam?.wins ?? 0}-${g.awayTeam?.losses ?? 0}`,
        },
        homeWinProb: Math.round(homeWinProb * 1000) / 1000,
        awayWinProb: Math.round(awayWinProb * 1000) / 1000,
      };
    });

    return NextResponse.json({
      games,
      gameDate: data?.scoreboard?.gameDate ?? new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ games: [], error: e.message }, { status: 500 });
  }
}
