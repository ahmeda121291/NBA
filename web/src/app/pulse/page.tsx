import type { Metadata } from "next";
import { GlassCard } from "@/components/ui/glass-card";
import { MetricTooltip } from "@/components/shared/metric-tooltip";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Daily Brief | CourtVision AI",
  description:
    "Your daily NBA intelligence briefing — trending players, key matchups, and performance alerts.",
  openGraph: {
    title: "Daily Brief | CourtVision AI",
    description:
      "Your daily NBA intelligence briefing — trending players, key matchups, and performance alerts.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io/pulse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Brief | CourtVision AI",
    description:
      "Your daily NBA intelligence briefing — trending players, key matchups, and performance alerts.",
  },
};
import { getTeamLogoByAbbr, getPlayerHeadshotUrl } from "@/lib/nba-data";
import {
  getBiggestMovers,
  getHottestPlayers,
  getTodaysGamesWithProjections,
  getKeyInjuriesByTeam,
} from "@/lib/db/queries";
import { TrendingUp, TrendingDown, Flame, Snowflake, Zap, Trophy, AlertTriangle } from "lucide-react";
import { tierClass } from "@/lib/formatting";

export const dynamic = "force-dynamic";

export default async function PulsePage() {
  const [movers, hotPlayers, slateGames, keyInjuries] = await Promise.all([
    getBiggestMovers(12),
    getHottestPlayers(10),
    getTodaysGamesWithProjections(),
    getKeyInjuriesByTeam(),
  ]);

  const moversData = movers as any[];
  const hotData = hotPlayers as any[];
  const gamesData = slateGames as any[];

  // Split movers into risers and fallers
  const risers = moversData.filter((m) => Number(m.lfi_delta) > 0).slice(0, 6);
  const fallers = moversData.filter((m) => Number(m.lfi_delta) < 0).slice(0, 6);

  // Hot and cold streaks
  const hotStreaks = hotData.filter((p) =>
    p.lfi_streak_label === "hot_likely_real" || p.lfi_streak_label === "hot_fragile" || p.lfi_streak_label === "breakout_role_expansion" || p.lfi_streak_label === "hot_opponent_driven"
  ).slice(0, 5);
  const coldStreaks = hotData.length > 0
    ? (moversData.filter((p) => p.lfi_streak_label === "cold_real" || p.lfi_streak_label === "cold_bouncing_back").slice(0, 5))
    : [];

  // Marquee matchups: games with upset risk or close projections
  const marqueeGames = gamesData.filter((g: any) =>
    g.upset_risk === "high" || g.upset_risk === "moderate" ||
    (g.win_prob_home && Math.abs(Number(g.win_prob_home) - 0.5) < 0.1)
  ).slice(0, 4);

  const slateDate = gamesData[0]
    ? new Date(gamesData[0].game_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "Today";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight gradient-text">Pulse</h1>
        </div>
        <p className="text-sm text-text-muted mt-1">Daily intelligence feed — what moved, who&apos;s hot, and what to watch</p>
        <p className="text-[10px] text-text-muted/50 uppercase tracking-wider mt-0.5">{slateDate}</p>
      </div>

      {/* Marquee Matchups */}
      {marqueeGames.length > 0 && (
        <section>
          <h2 className="section-header text-[10px] mb-3 flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Marquee Matchups
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {marqueeGames.map((g: any) => {
              const homeProb = g.win_prob_home ? (Number(g.win_prob_home) * 100).toFixed(0) : null;
              const awayProb = g.win_prob_away ? (Number(g.win_prob_away) * 100).toFixed(0) : null;
              const isUpset = g.upset_risk === "high";
              const homeInjuries = keyInjuries[g.home_abbr] ?? [];
              const awayInjuries = keyInjuries[g.away_abbr] ?? [];
              return (
                <a key={g.id} href={`/games/${g.id}`}>
                  <GlassCard hover className="relative overflow-hidden">
                    {isUpset && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400">Upset Alert</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="relative h-6 w-6">
                          <Image src={getTeamLogoByAbbr(g.away_abbr)} alt={g.away_abbr} fill className="object-contain" unoptimized />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold">{g.away_abbr}</span>
                            <span className="text-[10px] text-text-muted">({g.away_wins}-{g.away_losses})</span>
                            {awayInjuries.length > 0 && (
                              <span className="text-[7px] font-bold text-rose-400" title={awayInjuries.map((i: any) => `${i.full_name} (BIS ${i.bis_score})`).join(", ")}>⚠ KEY INJ</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-text-muted/50">@</span>
                        {homeProb && awayProb && (
                          <div className="text-[9px] text-text-muted/40 mt-0.5">
                            {awayProb}%-{homeProb}%
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1">
                            {homeInjuries.length > 0 && (
                              <span className="text-[7px] font-bold text-rose-400" title={homeInjuries.map((i: any) => `${i.full_name} (BIS ${i.bis_score})`).join(", ")}>⚠ KEY INJ</span>
                            )}
                            <span className="text-sm font-bold">{g.home_abbr}</span>
                            <span className="text-[10px] text-text-muted">({g.home_wins}-{g.home_losses})</span>
                          </div>
                        </div>
                        <div className="relative h-6 w-6">
                          <Image src={getTeamLogoByAbbr(g.home_abbr)} alt={g.home_abbr} fill className="object-contain" unoptimized />
                        </div>
                      </div>
                    </div>
                    {g.pick_abbr && (
                      <div className="mt-2 text-center">
                        <span className="text-[9px] text-text-muted/40 uppercase tracking-wider">Pick: </span>
                        <span className="text-[10px] font-bold text-indigo-400">{g.pick_abbr}</span>
                        {g.proj_score_away && g.proj_score_home && (
                          <span className="text-[10px] text-text-muted/50 ml-2">
                            {Math.round(Number(g.proj_score_away))}-{Math.round(Number(g.proj_score_home))}
                          </span>
                        )}
                      </div>
                    )}
                  </GlassCard>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* LFI Movers — Risers & Fallers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risers */}
        <section>
          <h2 className="section-header text-[10px] mb-3 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <MetricTooltip metricKey="lfi">Biggest Risers</MetricTooltip>
          </h2>
          <GlassCard hover={false} padding="sm">
            <div className="space-y-0">
              {risers.map((p: any, i: number) => (
                <a key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 table-row-hover rounded">
                  <span className="text-[10px] font-stat text-text-muted/40 w-4">{i + 1}</span>
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.04]">
                    <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4]" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{p.full_name}</span>
                      <span className="text-[10px] text-text-muted">{p.team_abbr}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted/50">
                      <span>BIS {Number(p.bis_score).toFixed(0)}</span>
                      <span>·</span>
                      <span>{Number(p.ppg).toFixed(1)} PPG</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      <span className="font-stat text-sm font-bold text-emerald-400">+{Number(p.lfi_delta).toFixed(1)}</span>
                    </div>
                    <span className={`font-stat text-[10px] ${tierClass(Number(p.lfi_score))}`}>
                      LFI {Number(p.lfi_score).toFixed(0)}
                    </span>
                  </div>
                </a>
              ))}
              {risers.length === 0 && (
                <p className="text-sm text-text-muted/50 text-center py-6">No significant risers detected</p>
              )}
            </div>
          </GlassCard>
        </section>

        {/* Fallers */}
        <section>
          <h2 className="section-header text-[10px] mb-3 flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            <MetricTooltip metricKey="lfi">Biggest Fallers</MetricTooltip>
          </h2>
          <GlassCard hover={false} padding="sm">
            <div className="space-y-0">
              {fallers.map((p: any, i: number) => (
                <a key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 table-row-hover rounded">
                  <span className="text-[10px] font-stat text-text-muted/40 w-4">{i + 1}</span>
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.04]">
                    <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4]" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{p.full_name}</span>
                      <span className="text-[10px] text-text-muted">{p.team_abbr}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted/50">
                      <span>BIS {Number(p.bis_score).toFixed(0)}</span>
                      <span>·</span>
                      <span>{Number(p.ppg).toFixed(1)} PPG</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-rose-400" />
                      <span className="font-stat text-sm font-bold text-rose-400">{Number(p.lfi_delta).toFixed(1)}</span>
                    </div>
                    <span className={`font-stat text-[10px] ${tierClass(Number(p.lfi_score))}`}>
                      LFI {Number(p.lfi_score).toFixed(0)}
                    </span>
                  </div>
                </a>
              ))}
              {fallers.length === 0 && (
                <p className="text-sm text-text-muted/50 text-center py-6">No significant fallers detected</p>
              )}
            </div>
          </GlassCard>
        </section>
      </div>

      {/* Hot & Cold Streaks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Streaks */}
        <section>
          <h2 className="section-header text-[10px] mb-3 flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            Hot Streaks
          </h2>
          <GlassCard hover={false} padding="sm">
            <div className="space-y-0">
              {hotStreaks.map((p: any) => {
                const streakMap: Record<string, { text: string; cls: string }> = {
                  hot_likely_real: { text: "VERIFIED HOT", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                  hot_fragile: { text: "HOT — FRAGILE", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
                  hot_opponent_driven: { text: "OPP-DRIVEN", cls: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
                  breakout_role_expansion: { text: "BREAKOUT", cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
                };
                const badge = streakMap[p.lfi_streak_label] ?? { text: p.lfi_streak_label, cls: "text-text-muted" };
                return (
                  <a key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 table-row-hover rounded">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.04]">
                      <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4]" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block">{p.full_name}</span>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted/50">
                        <span>{p.team_abbr}</span>
                        <span>·</span>
                        <span>{Number(p.ppg).toFixed(1)} PPG</span>
                        <span>·</span>
                        <span className={tierClass(Number(p.lfi_score))}>LFI {Number(p.lfi_score).toFixed(0)}</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </a>
                );
              })}
              {hotStreaks.length === 0 && (
                <p className="text-sm text-text-muted/50 text-center py-6">No hot streaks detected</p>
              )}
            </div>
          </GlassCard>
        </section>

        {/* Cold Streaks */}
        <section>
          <h2 className="section-header text-[10px] mb-3 flex items-center gap-2">
            <Snowflake className="h-3.5 w-3.5 text-blue-400" />
            Cold Streaks
          </h2>
          <GlassCard hover={false} padding="sm">
            <div className="space-y-0">
              {coldStreaks.map((p: any) => {
                const streakMap: Record<string, { text: string; cls: string }> = {
                  cold_real: { text: "COLD — REAL", cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
                  cold_bouncing_back: { text: "RECOVERING", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                };
                const badge = streakMap[p.lfi_streak_label] ?? { text: p.lfi_streak_label, cls: "text-text-muted" };
                return (
                  <a key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 table-row-hover rounded">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.04]">
                      <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4]" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block">{p.full_name}</span>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted/50">
                        <span>{p.team_abbr}</span>
                        <span>·</span>
                        <span>{Number(p.ppg).toFixed(1)} PPG</span>
                        <span>·</span>
                        <span className={tierClass(Number(p.lfi_score))}>LFI {Number(p.lfi_score).toFixed(0)}</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </a>
                );
              })}
              {coldStreaks.length === 0 && (
                <p className="text-sm text-text-muted/50 text-center py-6">No cold streaks detected</p>
              )}
            </div>
          </GlassCard>
        </section>
      </div>

      {/* All Games Today */}
      {gamesData.length > 0 && (
        <section>
          <h2 className="section-header text-[10px] mb-3">Full Slate — {slateDate}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gamesData.map((g: any) => {
              const isFinal = g.status === "final";
              const homeProb = g.win_prob_home ? Number(g.win_prob_home) : null;
              const homeWon = isFinal && Number(g.home_score) > Number(g.away_score);
              const pickCorrect = isFinal && g.projected_winner_id
                ? (homeWon ? Number(g.projected_winner_id) === Number(g.home_team_id) : Number(g.projected_winner_id) === Number(g.away_team_id))
                : null;
              return (
                <a key={g.id} href={`/games/${g.id}`}>
                  <GlassCard hover padding="sm" className="relative">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="relative h-4 w-4">
                          <Image src={getTeamLogoByAbbr(g.away_abbr)} alt={g.away_abbr} fill className="object-contain" unoptimized />
                        </div>
                        <span className="font-bold text-[12px]">{g.away_abbr}</span>
                      </div>
                      {isFinal ? (
                        <span className="font-stat text-[12px] font-bold">{g.away_score} - {g.home_score}</span>
                      ) : g.proj_score_away ? (
                        <span className="font-stat text-[10px] text-text-muted/50">{Math.round(Number(g.proj_score_away))} - {Math.round(Number(g.proj_score_home))}</span>
                      ) : (
                        <span className="text-[10px] text-text-muted/30">—</span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[12px]">{g.home_abbr}</span>
                        <div className="relative h-4 w-4">
                          <Image src={getTeamLogoByAbbr(g.home_abbr)} alt={g.home_abbr} fill className="object-contain" unoptimized />
                        </div>
                      </div>
                    </div>
                    {homeProb !== null && (
                      <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500/40 transition-all" style={{ width: `${(1 - homeProb) * 100}%` }} />
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      {g.pick_abbr && (
                        <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider">Pick: {g.pick_abbr}</span>
                      )}
                      {pickCorrect !== null && (
                        <span className={`text-[8px] font-bold ${pickCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                          {pickCorrect ? "✓" : "✗"}
                        </span>
                      )}
                      {isFinal && <span className="text-[8px] text-text-muted/30 uppercase">Final</span>}
                      {!isFinal && (
                        <span className="text-[8px] text-text-muted/30">
                          {g.game_time ? new Date(g.game_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD"}
                        </span>
                      )}
                    </div>
                  </GlassCard>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
