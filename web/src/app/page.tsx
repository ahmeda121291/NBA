import Image from "next/image";
import { Calendar, TrendingUp, TrendingDown, Zap, Flame, ArrowRight, AlertTriangle, Activity, BarChart3, Shield, Target, Sparkles, MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getTeamLogoByAbbr, getPlayerHeadshotUrl } from "@/lib/nba-data";
import { getTodaysGamesWithProjections, getHottestPlayers, getTopPlayersWithMetrics, getAllTeamsWithMetrics, getBiggestMovers } from "@/lib/db/queries";
import { computeLiveProjections } from "@/lib/projections";
import { tierClass, getStreakBadge } from "@/lib/formatting";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [todaysGames, hotPlayers, topByBIS, teamsRanked, movers] = await Promise.all([
    getTodaysGamesWithProjections(),
    getHottestPlayers(7),
    getTopPlayersWithMetrics(5),
    getAllTeamsWithMetrics(),
    getBiggestMovers(6),
  ]);

  let games = todaysGames as any[];

  // Compute live projections for scheduled games without pre-computed projections
  const scheduledIds = games
    .filter((g: any) => g.status !== "final" && g.win_prob_home == null)
    .map((g: any) => Number(g.id));

  if (scheduledIds.length > 0) {
    const liveProjections = await computeLiveProjections(scheduledIds);
    games = games.map((g: any) => {
      const proj = liveProjections.get(Number(g.id));
      if (!proj) return g;
      return {
        ...g,
        projected_winner_id: proj.projected_winner_id,
        win_prob_home: proj.win_prob_home,
        win_prob_away: proj.win_prob_away,
        proj_score_home: proj.proj_score_home,
        proj_score_away: proj.proj_score_away,
        confidence: proj.confidence,
        upset_risk: proj.upset_risk,
        pick_abbr: proj.winner_abbr,
        key_reasons: proj.key_reasons,
      };
    });
  }

  const slateDate = games.length > 0
    ? new Date(String(games[0].game_date) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const hot = hotPlayers as any[];
  const topBIS = topByBIS as any[];
  const teams = (teamsRanked as any[]).slice(0, 5);
  const allMovers = movers as any[];
  const risers = allMovers.filter((m: any) => Number(m.lfi_delta || 0) > 0).slice(0, 3);
  const fallers = allMovers.filter((m: any) => Number(m.lfi_delta || 0) < 0).slice(0, 3);

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Find the "best edge" game — highest confidence with >55% win prob
  const bestEdge = games
    .filter((g: any) => g.win_prob_home && g.status !== "final")
    .sort((a: any, b: any) => Math.abs(Number(b.win_prob_home) - 0.5) - Math.abs(Number(a.win_prob_home) - 0.5))[0];

  // Find upset watch — scheduled game with closest to 50/50
  const upsetWatch = games
    .filter((g: any) => g.win_prob_home && g.status !== "final" && g.upset_risk && (g.upset_risk === "toss-up" || g.upset_risk === "high"))
    .sort((a: any, b: any) => Math.abs(Number(a.win_prob_home) - 0.5) - Math.abs(Number(b.win_prob_home) - 0.5))[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Intelligence Hub</h1>
            <div className="flex items-center gap-1.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Live</span>
            </div>
          </div>
          <p className="text-sm text-text-muted">
            {today} — 2025-26 Season
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <a href="/studio" className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-indigo-400 transition-colors uppercase tracking-wider border border-white/[0.06] rounded px-3 py-1.5">
            <Sparkles className="h-3 w-3" /> Studio
          </a>
          <a href="/ask" className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-indigo-400 transition-colors uppercase tracking-wider border border-white/[0.06] rounded px-3 py-1.5">
            <MessageCircle className="h-3 w-3" /> Ask CV
          </a>
        </div>
      </div>

      {/* Hero Row: Best Edge + Upset Watch */}
      {(bestEdge || upsetWatch) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bestEdge && (() => {
            const homeProb = Number(bestEdge.win_prob_home);
            const awayProb = 1 - homeProb;
            const favAbbr = homeProb >= 0.5 ? bestEdge.home_abbr : bestEdge.away_abbr;
            const dogAbbr = homeProb >= 0.5 ? bestEdge.away_abbr : bestEdge.home_abbr;
            const favProb = Math.max(homeProb, awayProb);
            const conf = bestEdge.confidence ? Number(bestEdge.confidence) : null;
            const reasons = bestEdge.key_reasons;
            const reasonsList = typeof reasons === "string" ? JSON.parse(reasons) : Array.isArray(reasons) ? reasons : [];

            return (
              <a href={`/games/${bestEdge.id}`} className="block group">
                <GlassCard variant="accent" className="relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Tonight&apos;s Best Edge</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative h-8 w-8 shrink-0">
                        <Image src={getTeamLogoByAbbr(favAbbr)} alt={favAbbr} fill className="object-contain" unoptimized />
                      </div>
                      <div>
                        <span className="text-lg font-bold text-text-primary group-hover:text-indigo-400 transition-colors">{favAbbr} over {dogAbbr}</span>
                        <span className="text-[11px] text-text-muted ml-2 font-stat">{(favProb * 100).toFixed(0)}% win probability</span>
                      </div>
                    </div>
                    {conf && <p className="text-[10px] text-text-muted/50 font-stat mb-2">Confidence: {(conf * 100).toFixed(0)}%</p>}
                    {reasonsList.length > 0 && (
                      <p className="text-[11px] text-text-muted/60 leading-relaxed">{reasonsList[0]}</p>
                    )}
                  </div>
                </GlassCard>
              </a>
            );
          })()}

          {upsetWatch && (() => {
            const homeProb = Number(upsetWatch.win_prob_home);
            return (
              <a href={`/games/${upsetWatch.id}`} className="block group">
                <GlassCard className="relative overflow-hidden h-full border-amber-500/10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Upset Watch</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        <div className="relative h-7 w-7 shrink-0">
                          <Image src={getTeamLogoByAbbr(upsetWatch.away_abbr)} alt={upsetWatch.away_abbr} fill className="object-contain" unoptimized />
                        </div>
                        <span className="text-sm font-bold">{upsetWatch.away_abbr}</span>
                      </div>
                      <span className="text-text-muted/30 text-xs">@</span>
                      <div className="flex items-center gap-1">
                        <div className="relative h-7 w-7 shrink-0">
                          <Image src={getTeamLogoByAbbr(upsetWatch.home_abbr)} alt={upsetWatch.home_abbr} fill className="object-contain" unoptimized />
                        </div>
                        <span className="text-sm font-bold">{upsetWatch.home_abbr}</span>
                      </div>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04] mb-2">
                      <div className="h-full" style={{ width: `${(1 - homeProb) * 100}%`, background: "rgba(251,191,36,0.3)" }} />
                      <div className="h-full" style={{ width: `${homeProb * 100}%`, background: "rgba(251,191,36,0.3)" }} />
                    </div>
                    <p className="text-[11px] text-text-muted/60">
                      {(Math.max(homeProb, 1 - homeProb) * 100).toFixed(0)}-{(Math.min(homeProb, 1 - homeProb) * 100).toFixed(0)} split — this one could go either way
                    </p>
                  </div>
                </GlassCard>
              </a>
            );
          })()}
        </div>
      )}

      {/* Trending Now — Risers + Fallers */}
      {(risers.length > 0 || fallers.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {risers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Trending Up</span>
              </div>
              <div className="flex gap-2">
                {risers.map((p: any) => (
                  <a key={p.id} href={`/players/${p.id}`} className="flex-1 glass-card p-2.5 rounded-lg hover:border-emerald-500/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="relative h-7 w-7 shrink-0 rounded-sm overflow-hidden bg-white/[0.04]">
                        <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[1px]" unoptimized />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-text-primary truncate">{p.full_name}</p>
                        <p className="text-[9px] text-text-muted">{p.team_abbr}</p>
                      </div>
                    </div>
                    <p className="text-right font-stat text-[11px] text-emerald-400 font-bold mt-1">+{Number(p.lfi_delta).toFixed(1)} LFI</p>
                  </a>
                ))}
              </div>
            </div>
          )}
          {fallers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Trending Down</span>
              </div>
              <div className="flex gap-2">
                {fallers.map((p: any) => (
                  <a key={p.id} href={`/players/${p.id}`} className="flex-1 glass-card p-2.5 rounded-lg hover:border-rose-500/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="relative h-7 w-7 shrink-0 rounded-sm overflow-hidden bg-white/[0.04]">
                        <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[1px]" unoptimized />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-text-primary truncate">{p.full_name}</p>
                        <p className="text-[9px] text-text-muted">{p.team_abbr}</p>
                      </div>
                    </div>
                    <p className="text-right font-stat text-[11px] text-rose-400 font-bold mt-1">{Number(p.lfi_delta).toFixed(1)} LFI</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tonight's Slate */}
      <section>
        <div className="section-header mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              {slateDate ? `Slate — ${slateDate}` : "Latest Games"}
            </span>
            <span className="text-[10px] font-stat text-text-muted/50">{games.length} games</span>
          </div>
          <a href="/games" className="flex items-center gap-1 text-[10px] text-text-muted hover:text-indigo-400 transition-colors uppercase tracking-wider">
            All Games <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 stagger-children">
          {games.slice(0, 8).map((game: any) => {
            const homePts = game.home_score != null ? Number(game.home_score) : null;
            const awayPts = game.away_score != null ? Number(game.away_score) : null;
            const isFinal = game.status === "final" && homePts != null && awayPts != null;
            const homeWon = isFinal && homePts! > awayPts!;
            const homeTSC = game.home_tsc ? Number(game.home_tsc) : null;
            const awayTSC = game.away_tsc ? Number(game.away_tsc) : null;
            const homeProb = game.win_prob_home ? Number(game.win_prob_home) : null;
            const projHome = game.proj_score_home ? Number(game.proj_score_home) : null;
            const projAway = game.proj_score_away ? Number(game.proj_score_away) : null;
            const pickAbbr = game.pick_abbr;

            return (
              <a key={game.id} href={`/games/${game.id}`} className="group glass-card rounded-lg p-3 block">
                <div className="flex items-center justify-between text-[9px] text-text-muted/50 mb-2">
                  {isFinal ? (
                    <span className="text-emerald-400 font-bold">FINAL</span>
                  ) : game.status === "live" || game.status === "in_progress" ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span>SCHED</span>
                  )}
                  {pickAbbr && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-400/70">
                      <Zap className="h-2.5 w-2.5" /> {pickAbbr}
                    </span>
                  )}
                </div>

                {/* Away */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="relative h-6 w-6 shrink-0">
                      <Image src={getTeamLogoByAbbr(game.away_abbr)} alt={game.away_abbr} fill className="object-contain" unoptimized />
                    </div>
                    <span className={`text-sm font-bold ${awayPts != null && !homeWon ? "text-emerald-400" : ""}`}>{game.away_abbr}</span>
                    {awayTSC && <span className={`font-stat text-[9px] ${tierClass(awayTSC)}`}>{awayTSC.toFixed(0)}</span>}
                  </div>
                  {awayPts != null ? (
                    <span className={`font-stat text-sm font-bold ${!homeWon ? "text-emerald-400" : "text-text-muted"}`}>{awayPts}</span>
                  ) : projAway != null ? (
                    <span className="font-stat text-sm text-text-muted/40">{projAway}</span>
                  ) : null}
                </div>

                {/* Home */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative h-6 w-6 shrink-0">
                      <Image src={getTeamLogoByAbbr(game.home_abbr)} alt={game.home_abbr} fill className="object-contain" unoptimized />
                    </div>
                    <span className={`text-sm font-bold ${homePts != null && homeWon ? "text-emerald-400" : ""}`}>{game.home_abbr}</span>
                    {homeTSC && <span className={`font-stat text-[9px] ${tierClass(homeTSC)}`}>{homeTSC.toFixed(0)}</span>}
                  </div>
                  {homePts != null ? (
                    <span className={`font-stat text-sm font-bold ${homeWon ? "text-emerald-400" : "text-text-muted"}`}>{homePts}</span>
                  ) : projHome != null ? (
                    <span className="font-stat text-sm text-text-muted/40">{projHome}</span>
                  ) : null}
                </div>

                {/* Win probability mini bar */}
                {homeProb != null && (
                  <div className="flex h-1 rounded-sm overflow-hidden bg-white/[0.04] mt-2">
                    <div className="h-full" style={{
                      width: `${(1 - homeProb) * 100}%`,
                      background: homeProb < 0.5 ? "rgba(129,140,248,0.3)" : "rgba(128,148,176,0.1)",
                    }} />
                    <div className="h-full" style={{
                      width: `${homeProb * 100}%`,
                      background: homeProb >= 0.5 ? "rgba(129,140,248,0.3)" : "rgba(128,148,176,0.1)",
                    }} />
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Hot Players + BIS Leaders — 3 cols */}
        <div className="lg:col-span-3 space-y-6">
          {/* Hottest Players by LFI */}
          <section>
            <div className="section-header mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Flame className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Hottest Players — Live Form Index</span>
              </div>
              <a href="/leaderboards" className="flex items-center gap-1 text-[10px] text-text-muted hover:text-indigo-400 transition-colors uppercase tracking-wider">
                Leaderboards <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            <p className="text-[10px] text-text-muted/40 mb-3 -mt-1">Players performing most above their own season average — not overall best, but biggest recent surge</p>
            <GlassCard padding="none" hover={false}>
              {hot.map((p: any, i: number) => {
                const lfi = p.lfi_score ? Number(p.lfi_score) : null;
                const bis = p.bis_score ? Number(p.bis_score) : null;
                const delta = p.lfi_delta ? Number(p.lfi_delta) : 0;
                return (
                  <a key={p.id} href={`/players/${p.id}`}
                    className="group flex items-center justify-between px-4 py-2.5 border-b border-white/[0.03] last:border-0 table-row-hover"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-stat text-xs text-text-muted/30 w-4 text-right">{i + 1}</span>
                      <div className="relative h-9 w-9 shrink-0 rounded-sm overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                        <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
                      </div>
                      <div>
                        <span className="text-[13px] font-semibold text-text-primary group-hover:text-indigo-400 transition-colors">{p.full_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="relative h-3 w-3">
                            <Image src={getTeamLogoByAbbr(p.team_abbr)} alt={p.team_abbr} fill className="object-contain" unoptimized />
                          </div>
                          <span className="text-[10px] text-text-muted">{p.team_abbr}</span>
                          {bis && <span className="text-[10px] text-text-muted/60 font-stat">BIS {bis.toFixed(0)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {(() => { const sb = getStreakBadge(p.lfi_streak_label); return sb ? <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sb.cls}`}>{sb.text}</span> : null; })()}
                      <div className="flex items-center gap-1">
                        {delta > 0 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        ) : delta < 0 ? (
                          <TrendingDown className="h-3 w-3 text-rose-400" />
                        ) : null}
                        <span className={`font-stat text-[10px] ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-text-muted"}`}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-right w-12">
                        <span className={`font-stat text-lg font-bold ${tierClass(lfi)}`}>{lfi?.toFixed(0) ?? "—"}</span>
                        <p className="text-[8px] text-text-muted/50 uppercase tracking-widest">LFI</p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </GlassCard>
          </section>

          {/* BIS Leaders */}
          <section>
            <div className="section-header mb-3 flex items-center gap-2.5">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Baseline Impact — Top 5</span>
            </div>
            <GlassCard padding="none" hover={false}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04] text-left text-[9px] uppercase tracking-widest text-text-muted/40">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Player</th>
                    <th className="px-4 py-2 text-right">BIS</th>
                    <th className="px-4 py-2 text-right">Conf</th>
                    <th className="px-4 py-2 text-right">%ile</th>
                    <th className="px-4 py-2 text-right">DRS</th>
                    <th className="px-4 py-2 text-right">RDA</th>
                    <th className="px-4 py-2 text-right">PPG</th>
                  </tr>
                </thead>
                <tbody>
                  {topBIS.map((p: any, i: number) => {
                    const bis = p.bis_score ? Number(p.bis_score) : null;
                    const conf = p.bis_confidence ? Number(p.bis_confidence) : null;
                    const pctl = p.bis_percentile ? Number(p.bis_percentile) : null;
                    const drs = p.drs_score ? Number(p.drs_score) : null;
                    const rda = p.rda_score ? Number(p.rda_score) : null;
                    return (
                      <tr key={p.id} className="border-b border-white/[0.03] table-row-hover group">
                        <td className="px-4 py-2 font-stat text-text-muted/30 text-xs">{i + 1}</td>
                        <td className="px-4 py-2">
                          <a href={`/players/${p.id}`} className="flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                            <div className="relative h-7 w-7 shrink-0 rounded-sm overflow-hidden bg-white/[0.04]">
                              <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
                            </div>
                            <div>
                              <span className="text-[12px] font-semibold">{p.full_name}</span>
                              <span className="text-[10px] text-text-muted ml-2">{p.team_abbr}</span>
                            </div>
                          </a>
                        </td>
                        <td className={`px-4 py-2 text-right font-stat font-bold ${tierClass(bis)}`}>{bis?.toFixed(0) ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-stat text-[11px] text-text-muted">{conf ? (conf * 100).toFixed(0) + "%" : "—"}</td>
                        <td className="px-4 py-2 text-right font-stat text-[11px] text-text-secondary">{pctl?.toFixed(0) ?? "—"}th</td>
                        <td className={`px-4 py-2 text-right font-stat text-[11px] ${tierClass(drs)}`}>{drs?.toFixed(0) ?? "—"}</td>
                        <td className={`px-4 py-2 text-right font-stat text-[11px] ${tierClass(rda)}`}>{rda?.toFixed(0) ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-stat text-[11px] text-text-secondary">{Number(p.ppg).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassCard>
          </section>
        </div>

        {/* Right: Team Power Rankings — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="section-header mb-3 flex items-center gap-2.5">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Team Power Rankings</span>
            </div>
            <GlassCard padding="none" hover={false}>
              {teams.map((t: any, i: number) => {
                const tsc = t.tsc_score ? Number(t.tsc_score) : null;
                const ltfi = t.ltfi_score ? Number(t.ltfi_score) : null;
                const wins = Number(t.wins ?? 0);
                const losses = Number(t.losses ?? 0);
                return (
                  <a key={t.id} href={`/teams/${t.id}`}
                    className="group flex items-center justify-between px-4 py-3 border-b border-white/[0.03] last:border-0 table-row-hover"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-stat text-sm font-bold w-5 text-right ${i < 3 ? "text-amber-400" : "text-text-muted/30"}`}>{i + 1}</span>
                      <div className="relative h-8 w-8 shrink-0">
                        <Image src={getTeamLogoByAbbr(t.abbreviation)} alt={t.nickname} fill className="object-contain" unoptimized />
                      </div>
                      <div>
                        <span className="text-[12px] font-semibold group-hover:text-indigo-400 transition-colors">{t.city} {t.nickname}</span>
                        <p className="text-[10px] text-text-muted font-stat">{wins}-{losses}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {ltfi && (
                        <div className="text-right">
                          <span className={`font-stat text-xs ${tierClass(ltfi)}`}>{ltfi.toFixed(0)}</span>
                          <p className="text-[8px] text-text-muted/40 uppercase">LTFI</p>
                        </div>
                      )}
                      <div className="text-right w-10">
                        <span className={`font-stat text-lg font-bold ${tierClass(tsc)}`}>{tsc?.toFixed(0) ?? "—"}</span>
                        <p className="text-[8px] text-text-muted/40 uppercase">TSC</p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </GlassCard>
          </section>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <a href="/studio" className="glass-card p-4 rounded-lg text-center hover:border-indigo-500/20 transition-colors group">
              <Sparkles className="h-5 w-5 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-[11px] font-semibold text-text-primary">Studio</p>
              <p className="text-[9px] text-text-muted/50 mt-0.5">Create shareable charts</p>
            </a>
            <a href="/ask" className="glass-card p-4 rounded-lg text-center hover:border-indigo-500/20 transition-colors group">
              <MessageCircle className="h-5 w-5 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-[11px] font-semibold text-text-primary">Ask CV</p>
              <p className="text-[9px] text-text-muted/50 mt-0.5">Query basketball data</p>
            </a>
          </div>

          {/* Engine Info */}
          <GlassCard variant="accent" className="text-center py-5">
            <BarChart3 className="h-5 w-5 text-indigo-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-text-primary mb-1">CourtVision Metrics Engine v2</p>
            <p className="text-[10px] text-text-muted leading-relaxed">
              6 player metrics + 6 team metrics · H2H matchups · Live projections at 69% accuracy
            </p>
            <a href="/methodology" className="inline-block mt-2 text-[10px] text-indigo-400 uppercase tracking-wider hover:underline">
              How It Works →
            </a>
          </GlassCard>
        </div>
      </div>

      {/* Footer watermark */}
      <div className="text-center py-2">
        <span className="text-[9px] text-text-muted/20">courtvisionai.io — CourtVision NBA Intelligence Platform</span>
      </div>
    </div>
  );
}
