import Image from "next/image";
import { TrendingUp, Target, AlertTriangle, Check, X, Zap, Shield } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { DatePicker } from "@/components/shared/date-picker";
import { GamesRefresh } from "./games-refresh";
import { getTeamLogoByAbbr } from "@/lib/nba-data";
import { getMostRecentGameDate, getGamesByDateWithProjections, getGameDatesInMonth } from "@/lib/db/queries";
import { computeLiveProjections } from "@/lib/projections";
import { tierClass } from "@/lib/formatting";

export const dynamic = "force-dynamic"; // Always fresh projections

function confidenceLabel(c: number): { text: string; cls: string } {
  if (c >= 0.85) return { text: "Very High", cls: "text-emerald-400" };
  if (c >= 0.72) return { text: "High", cls: "text-emerald-400/70" };
  if (c >= 0.60) return { text: "Moderate", cls: "text-amber-400/70" };
  return { text: "Low", cls: "text-rose-400/70" };
}

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const requestedDate = sp.date;
  const latestDate = await getMostRecentGameDate();
  const activeDate = requestedDate || latestDate || "";
  let games = activeDate ? ((await getGamesByDateWithProjections(activeDate)) as any[]) : [];

  // Overlay live scores from NBA CDN so game cards match the ticker
  // Only fetch for recent dates (today/yesterday) — CDN only has today's games
  // but this ensures we always try to get fresh scores for recent games
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const isRecent = activeDate === todayStr || activeDate === yesterdayStr;
  if (isRecent && games.length > 0) {
    try {
      const liveResp = await fetch(
        "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json",
        {
          headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.nba.com/" },
          next: { revalidate: 0 },
          cache: "no-store",
        }
      );
      if (liveResp.ok) {
        const liveData = await liveResp.json();
        const liveGames = liveData?.scoreboard?.games || [];
        // Build map of gameId -> live scores
        const liveMap = new Map<string, { homeScore: number; awayScore: number; status: string }>();
        for (const lg of liveGames) {
          const status = Number(lg.gameStatus) === 3 ? "final" : Number(lg.gameStatus) === 2 ? "live" : "scheduled";
          liveMap.set(lg.gameId, {
            homeScore: lg.homeTeam?.score ?? 0,
            awayScore: lg.awayTeam?.score ?? 0,
            status,
          });
        }
        // Overlay onto DB games + update DB in background
        for (const game of games) {
          const live = liveMap.get(game.external_id);
          if (live && (live.status === "final" || live.status === "live")) {
            // Update the in-memory game object for this render
            game.home_score = live.homeScore;
            game.away_score = live.awayScore;
            game.status = live.status;
            // Also update DB so future loads don't need CDN
            try {
              const { db: dbInst } = await import("@/lib/db");
              const { sql: sqlTag } = await import("drizzle-orm");
              await dbInst.execute(sqlTag`
                UPDATE games SET home_score = ${live.homeScore}, away_score = ${live.awayScore},
                  status = ${live.status}, updated_at = NOW()
                WHERE external_id = ${game.external_id} AND status != 'final'
              `);
            } catch {}
          }
        }
      }
    } catch {}
  }

  // Compute live projections for ALL non-final games (always fresh)
  const nonFinalIds = games
    .filter((g: any) => g.status !== "final")
    .map((g: any) => Number(g.id));

  if (nonFinalIds.length > 0) {
    const liveProjections = await computeLiveProjections(nonFinalIds);

    // Merge live projections into game data (override any pre-computed)
    games = games.map((g: any) => {
      const proj = liveProjections.get(Number(g.id));
      if (!proj) return g;
      return {
        ...g,
        projected_winner_id: proj.projected_winner_id,
        win_prob_home: proj.win_prob_home,
        win_prob_away: proj.win_prob_away,
        proj_score_home: proj.proj_score_home,
        proj_score_home_low: proj.proj_score_home_low,
        proj_score_home_high: proj.proj_score_home_high,
        proj_score_away: proj.proj_score_away,
        proj_score_away_low: proj.proj_score_away_low,
        proj_score_away_high: proj.proj_score_away_high,
        proj_confidence: proj.confidence,
        proj_margin: proj.margin,
        upset_risk: proj.upset_risk,
        key_reasons: proj.key_reasons,
      };
    });
  }

  // Get game dates for current month (for calendar dots)
  const dateObj = activeDate ? new Date(activeDate + "T12:00:00") : new Date();
  const gameDates = await getGameDatesInMonth(dateObj.getFullYear(), dateObj.getMonth() + 1);

  // Determine refresh behavior
  const today = new Date().toISOString().slice(0, 10);
  const hasLiveGames = games.some((g: any) => g.status === "live" || g.status === "in_progress");
  const hasScheduledGames = games.some((g: any) => g.status === "scheduled" || (g.status !== "final" && g.status !== "live"));
  const isTodayOrFuture = activeDate >= today;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Games</h1>
          <p className="text-sm text-text-muted mt-1">Results, predictions & matchup intelligence — 2025-26 season</p>
        </div>
        <div className="flex items-center gap-4">
          <GamesRefresh hasLiveGames={hasLiveGames} hasScheduledGames={hasScheduledGames} isTodayOrFuture={isTodayOrFuture} />
          <DatePicker selectedDate={activeDate} gameDates={gameDates} />
        </div>
      </div>

      <div className="space-y-4 stagger-children">
        {games.map((game: any) => {
          const homePts = game.home_score != null ? Number(game.home_score) : null;
          const awayPts = game.away_score != null ? Number(game.away_score) : null;
          const isFinal = game.status === "final" && homePts != null && awayPts != null;
          const isLive = game.status === "live" || game.status === "in_progress";
          const homeWon = isFinal && homePts! > awayPts!;
          const awayWon = isFinal && awayPts! > homePts!;
          const homeTSC = game.home_tsc ? Number(game.home_tsc) : null;
          const awayTSC = game.away_tsc ? Number(game.away_tsc) : null;

          // Projection data
          const hasProjection = game.win_prob_home != null;
          const homeProb = hasProjection ? Number(game.win_prob_home) : null;
          const awayProb = hasProjection ? Number(game.win_prob_away) : null;
          const projScoreHome = hasProjection ? Number(game.proj_score_home) : null;
          const projScoreAway = hasProjection ? Number(game.proj_score_away) : null;
          const projScoreHomeLow = game.proj_score_home_low ? Number(game.proj_score_home_low) : null;
          const projScoreHomeHigh = game.proj_score_home_high ? Number(game.proj_score_home_high) : null;
          const projScoreAwayLow = game.proj_score_away_low ? Number(game.proj_score_away_low) : null;
          const projScoreAwayHigh = game.proj_score_away_high ? Number(game.proj_score_away_high) : null;
          const projWinnerId = game.projected_winner_id ? Number(game.projected_winner_id) : null;
          const confidence = game.proj_confidence ? Number(game.proj_confidence) : null;
          const margin = game.proj_margin ? Number(game.proj_margin) : null;
          const upsetRisk = game.upset_risk;
          const rawReasons = game.key_reasons;
          const keyReasons: string[] | null = rawReasons
            ? (typeof rawReasons === "string" ? JSON.parse(rawReasons) : Array.isArray(rawReasons) ? rawReasons : null)
            : null;

          // Pick accuracy for final games
          const pickCorrect = isFinal && projWinnerId
            ? (homeWon && projWinnerId === Number(game.home_team_id)) ||
              (awayWon && projWinnerId === Number(game.away_team_id))
            : null;

          const favoredAbbr = projWinnerId === Number(game.home_team_id) ? game.home_abbr : game.away_abbr;
          const confLabel = confidence ? confidenceLabel(confidence) : null;

          return (
            <a key={game.id} href={`/games/${game.id}`} className={`block glass-card rounded-lg p-5 group ${isLive ? "border border-emerald-500/20" : ""}`}>
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {isFinal ? (
                    <span className="rounded-sm bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">FINAL</span>
                  ) : isLive ? (
                    <span className="rounded-sm bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 animate-pulse">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 mr-1 animate-pulse" />LIVE
                    </span>
                  ) : (
                    <span className="rounded-sm bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">SCHEDULED</span>
                  )}
                  {/* CourtVision Pick badge */}
                  {hasProjection && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-sm"
                      style={{
                        borderColor: pickCorrect === true ? "rgba(16,185,129,0.3)" : pickCorrect === false ? "rgba(244,63,94,0.3)" : "rgba(129,140,248,0.2)",
                        background: pickCorrect === true ? "rgba(16,185,129,0.08)" : pickCorrect === false ? "rgba(244,63,94,0.08)" : "rgba(129,140,248,0.06)",
                        color: pickCorrect === true ? "#10b981" : pickCorrect === false ? "#f43f5e" : "#818cf8",
                      }}
                    >
                      <Target className="h-2.5 w-2.5" />
                      Pick: {favoredAbbr}
                      {pickCorrect === true && <Check className="h-2.5 w-2.5" />}
                      {pickCorrect === false && <X className="h-2.5 w-2.5" />}
                    </span>
                  )}
                  {/* Confidence badge */}
                  {confLabel && !isFinal && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-sm border border-white/[0.06] ${confLabel.cls}`}>
                      <Shield className="h-2.5 w-2.5" />
                      {confLabel.text}
                    </span>
                  )}
                  {upsetRisk === "toss-up" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-400/20 bg-amber-400/5 rounded-sm">
                      <AlertTriangle className="h-2.5 w-2.5" /> Toss-up
                    </span>
                  )}
                  {upsetRisk === "high" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-400/70 border border-amber-400/15 bg-amber-400/5 rounded-sm">
                      <Zap className="h-2.5 w-2.5" /> Upset Risk
                    </span>
                  )}
                </div>
                <span className="font-stat text-text-muted/60">
                  {game.home_wins}-{game.home_losses} vs {game.away_wins}-{game.away_losses}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
                {/* Away */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 transition-transform group-hover:scale-105">
                    <Image src={getTeamLogoByAbbr(game.away_abbr)} alt={game.away_name} fill className="object-contain drop-shadow-lg" unoptimized />
                  </div>
                  <div>
                    <p className={`text-base sm:text-lg font-bold tracking-tight ${awayWon ? "text-emerald-400" : ""}`}>{game.away_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-stat text-xs text-text-muted">{game.away_abbr}</span>
                      {awayTSC != null && <span className={`font-stat text-[10px] ${tierClass(awayTSC)}`}>TSC {awayTSC.toFixed(0)}</span>}
                    </div>
                  </div>
                </div>

                {/* Score / Projection center */}
                <div className="text-center px-2 sm:px-6 min-w-[120px]">
                  {isFinal ? (
                    <>
                      <p className="font-stat text-2xl sm:text-3xl font-bold text-text-primary">
                        {awayPts} <span className="text-text-muted/20">-</span> {homePts}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-text-muted/40 font-semibold mt-1">Final</p>
                    </>
                  ) : isLive ? (
                    <>
                      <p className="font-stat text-2xl sm:text-3xl font-bold text-emerald-400">
                        {awayPts ?? 0} <span className="text-text-muted/20">-</span> {homePts ?? 0}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-red-400/70 font-semibold mt-0.5 animate-pulse">In Progress</p>
                    </>
                  ) : hasProjection ? (
                    <>
                      <p className="font-stat text-lg sm:text-xl font-bold text-text-muted/60">
                        {projScoreAway} <span className="text-text-muted/20">-</span> {projScoreHome}
                      </p>
                      {/* Score range */}
                      {projScoreAwayLow != null && projScoreAwayHigh != null && projScoreHomeLow != null && projScoreHomeHigh != null && (
                        <p className="text-[9px] font-stat text-text-muted/30 mt-0.5">
                          {projScoreAwayLow}–{projScoreAwayHigh} / {projScoreHomeLow}–{projScoreHomeHigh}
                        </p>
                      )}
                      <p className="text-[9px] uppercase tracking-widest text-indigo-400/50 font-semibold mt-0.5">
                        Projected{margin ? ` · ${margin.toFixed(1)} pt spread` : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] uppercase tracking-widest text-text-muted/40 font-semibold">VS</p>
                  )}
                </div>

                {/* Home */}
                <div className="flex items-center justify-end gap-3 sm:gap-4">
                  <div className="text-right">
                    <p className={`text-base sm:text-lg font-bold tracking-tight ${homeWon ? "text-emerald-400" : ""}`}>{game.home_name}</p>
                    <div className="flex items-center justify-end gap-2 mt-0.5">
                      {homeTSC != null && <span className={`font-stat text-[10px] ${tierClass(homeTSC)}`}>TSC {homeTSC.toFixed(0)}</span>}
                      <span className="font-stat text-xs text-text-muted">{game.home_abbr}</span>
                    </div>
                  </div>
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 transition-transform group-hover:scale-105">
                    <Image src={getTeamLogoByAbbr(game.home_abbr)} alt={game.home_name} fill className="object-contain drop-shadow-lg" unoptimized />
                  </div>
                </div>
              </div>

              {/* Win probability bar */}
              {homeProb != null && awayProb != null && (
                <div className="mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between text-[10px] font-stat mb-1.5">
                    <span className={awayProb > homeProb ? "text-indigo-400" : "text-text-muted/50"}>
                      {(awayProb * 100).toFixed(0)}%
                    </span>
                    <span className="text-text-muted/30 uppercase tracking-wider text-[9px]">Win Probability</span>
                    <span className={homeProb > awayProb ? "text-indigo-400" : "text-text-muted/50"}>
                      {(homeProb * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex h-1.5 rounded-sm overflow-hidden bg-white/[0.04]">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${awayProb * 100}%`,
                        background: awayProb > homeProb
                          ? "linear-gradient(90deg, rgba(129,140,248,0.5), rgba(129,140,248,0.25))"
                          : "rgba(128,148,176,0.15)",
                      }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${homeProb * 100}%`,
                        background: homeProb > awayProb
                          ? "linear-gradient(270deg, rgba(129,140,248,0.5), rgba(129,140,248,0.25))"
                          : "rgba(128,148,176,0.15)",
                      }}
                    />
                  </div>
                  {/* Key reasons preview — show up to 2 */}
                  {keyReasons && keyReasons.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {keyReasons.slice(0, 2).map((reason, i) => (
                        <p key={i} className="text-[10px] text-text-muted/40 truncate">
                          <TrendingUp className="inline h-2.5 w-2.5 mr-1 text-indigo-400/40" />
                          {reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </a>
          );
        })}
      </div>

      {games.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-text-muted">No games found for this date.</p>
        </GlassCard>
      )}
    </div>
  );
}
