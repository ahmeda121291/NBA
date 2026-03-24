import { Suspense } from "react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreOrb } from "@/components/ui/score-orb";
import { Trophy, Flame } from "lucide-react";
import { getTeamLogoByAbbr, getPlayerHeadshotUrl } from "@/lib/nba-data";
import { getAllPlayersWithFullStats, getHottestPlayers } from "@/lib/db/queries";
import { LeaderboardTabs } from "./leaderboard-tabs";
import { tierClass, getStreakBadge } from "@/lib/formatting";

export default async function LeaderboardsPage() {
  const [allPlayers, hotLFI] = await Promise.all([
    getAllPlayersWithFullStats(100),
    getHottestPlayers(10),
  ]);

  const players = allPlayers as any[];
  const lfiPlayers = hotLFI as any[];
  const top3 = [...players]
    .filter((p) => p.bis_score != null)
    .sort((a, b) => Number(b.bis_score) - Number(a.bis_score))
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Leaderboards</h1>
        <p className="text-sm text-text-muted mt-1">CourtVision metric rankings — 2025-26 season</p>
      </div>

      {/* Top 3 BIS Podium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {top3.map((p: any, i: number) => {
          const bis = Number(p.bis_score);
          return (
            <a key={p.id} href={`/players/${p.id}`} className="block group">
              <GlassCard variant={i === 0 ? "accent" : "default"} className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className={`flex h-8 w-8 items-center justify-center ${
                    i === 0 ? "bg-amber-500/15 border border-amber-500/25" :
                    i === 1 ? "bg-slate-400/15 border border-slate-400/25" :
                    "bg-amber-700/15 border border-amber-700/25"
                  } rounded-sm`}>
                    <Trophy className={`h-4 w-4 ${
                      i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : "text-amber-600"
                    }`} />
                  </div>
                </div>
                <div className="flex justify-center mb-3">
                  <div className="relative h-16 w-16 rounded-sm overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                    <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
                  </div>
                </div>
                <p className="text-[13px] font-semibold group-hover:text-indigo-400 transition-colors">{p.full_name}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div className="relative h-3.5 w-3.5">
                    <Image src={getTeamLogoByAbbr(p.team_abbr)} alt={p.team_abbr} fill className="object-contain" unoptimized />
                  </div>
                  <span className="text-[10px] text-text-muted">{p.team_abbr}</span>
                </div>
                <div className="mt-3">
                  <ScoreOrb score={bis} size="sm" label="BIS" />
                </div>
              </GlassCard>
            </a>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Metric Leaderboard with tabs — 3 cols */}
        <div className="lg:col-span-3">
          <Suspense>
            <LeaderboardTabs players={players} />
          </Suspense>
        </div>

        {/* LFI Hot Players — 2 cols */}
        <div className="lg:col-span-2">
          <GlassCard padding="sm" hover={false} className="overflow-hidden">
            <div className="flex items-center gap-2.5 px-3 pt-2 pb-1">
              <Flame className="h-3.5 w-3.5 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Hottest — Live Form Index</h3>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {lfiPlayers.map((p: any, i: number) => {
                const lfi = p.lfi_score ? Number(p.lfi_score) : null;
                const delta = p.lfi_delta ? Number(p.lfi_delta) : 0;
                return (
                  <a key={p.id} href={`/players/${p.id}`} className="flex items-center justify-between px-3 py-2.5 table-row-hover group">
                    <div className="flex items-center gap-2.5">
                      <span className="font-stat text-xs text-text-muted/30 w-4 text-right">{i + 1}</span>
                      <div className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                        <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
                      </div>
                      <div>
                        <span className="text-[12px] font-semibold group-hover:text-indigo-400 transition-colors">{p.full_name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-text-muted">{p.team_abbr}</span>
                          {(() => { const sb = getStreakBadge(p.lfi_streak_label); return sb ? <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sb.cls}`}>{sb.text}</span> : null; })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {delta !== 0 && (
                        <span className={`font-stat text-[10px] ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                        </span>
                      )}
                      <span className={`font-stat text-lg font-bold ${tierClass(lfi)}`}>{lfi?.toFixed(0) ?? "—"}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
