import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreOrb } from "@/components/ui/score-orb";
import { RadarChart } from "@/components/ui/radar-chart";
import { ShareImageWrapper } from "@/components/shared/share-image-button";
import { ArrowLeft, TrendingUp, Flame, Shield, Activity, Zap, Target, BarChart3, FileText, Swords, DollarSign } from "lucide-react";
import { getTeamLogoByAbbr, getPlayerHeadshotUrl } from "@/lib/nba-data";
import { getPlayerWithMetrics, getPlayerGameLogs } from "@/lib/db/queries";
import { getPlayerMatchupSplits } from "@/lib/db/queries/matchups";
import { generateScoutingReport } from "@/lib/scouting";
import { notFound } from "next/navigation";
import { tierClass, tierLabel, tierBorder, getStreakBadge, consistencyInfo } from "@/lib/formatting";
import { CURRENT_SEASON } from "@/lib/constants";
import { PerformanceTrendChart } from "@/components/ui/performance-trend-chart";
import { FavoritePlayerButton } from "@/components/shared/favorite-button";

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayerWithMetrics(Number(id));
  if (!player) notFound();

  const p = player as any;
  const [gameLogs, matchupSplits] = await Promise.all([
    getPlayerGameLogs(Number(id), 15) as Promise<any[]>,
    getPlayerMatchupSplits(Number(id)),
  ]);

  const bis = p.bis_score ? Number(p.bis_score) : null;
  const lfi = p.lfi_score ? Number(p.lfi_score) : null;
  const drs = p.drs_score ? Number(p.drs_score) : null;
  const rda = p.rda_score ? Number(p.rda_score) : null;
  const sps = p.sps_score ? Number(p.sps_score) : null;
  const goi = p.goi_score ? Number(p.goi_score) : null;
  const lfiDelta = p.lfi_delta ? Number(p.lfi_delta) : 0;
  const bisConf = p.bis_confidence ? Number(p.bis_confidence) : null;
  const bisPctl = p.bis_percentile ? Number(p.bis_percentile) : null;
  const hasMetrics = bis !== null;

  const radarLabels = ["BIS", "LFI", "DRS", "OIQ", "PEM", "GOI"];
  const radarRaw = [bis, lfi, drs, rda, sps, goi];
  const radarNonNull = radarRaw.filter((v) => v !== null && v !== 0).length;
  const radarData = radarRaw.map((v) => v ?? 0);
  const showRadar = radarNonNull >= 2;

  const salary = p.salary ? Number(p.salary) : null;
  const vfm = p.vfm ? Number(p.vfm) : null;
  const salaryRank = p.salary_rank ? Number(p.salary_rank) : null;
  // VFM thresholds scale by salary tier — max players can't have high VFM by math
  const salaryM = salary ? salary / 1_000_000 : 0;
  const underpaidThreshold = salaryM > 40 ? 1.6 : salaryM > 20 ? 3 : 5;
  const fairThreshold = salaryM > 40 ? 1.0 : salaryM > 20 ? 1.5 : 2;
  const vfmLabel = vfm !== null ? (vfm >= underpaidThreshold ? "Great Value" : vfm >= fairThreshold ? "Fair Value" : "Overpaid") : null;
  const vfmLabelCls = vfm !== null ? (vfm >= underpaidThreshold ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : vfm >= fairThreshold ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20") : "";

  // Consistency score computed from fetched game logs (no extra query)
  const ptsSamples = gameLogs.map((g: any) => Number(g.pts)).filter((v) => !isNaN(v) && v > 0);
  const ptsStddev = ptsSamples.length >= 5 ? (() => {
    const mean = ptsSamples.reduce((s, v) => s + v, 0) / ptsSamples.length;
    const variance = ptsSamples.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / ptsSamples.length;
    return Math.sqrt(variance);
  })() : null;
  const consInfo = consistencyInfo(ptsStddev, ptsSamples.length);

  const metrics = [
    { key: "BIS", label: "Baseline Impact Score", score: bis, icon: Activity, desc: "Overall per-game value blending offense, defense, and efficiency" },
    { key: "LFI", label: "Live Form Index", score: lfi, icon: Flame, desc: "Recent form vs season baseline — momentum and trajectory" },
    { key: "DRS", label: "Defensive Resilience", score: drs, icon: Shield, desc: "Defensive impact: contests, steals, rim protection, versatility" },
    { key: "OIQ", label: "Offensive Impact (OIQ)", score: rda, icon: Target, desc: "How hard a player's offensive role is — separating easy-efficiency from high-burden creation" },
    { key: "PEM", label: "Playmaking Efficiency (PEM)", score: sps, icon: Zap, desc: "Whether player value transfers across different contexts, roles, and lineups" },
    { key: "GOI", label: "Game Outcome Influence", score: goi, icon: BarChart3, desc: "Clutch impact on team wins — close games and high-leverage moments" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <a href="/players" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-indigo-400 transition-colors mb-4">
          <ArrowLeft className="h-3 w-3" /> Back to Players
        </a>
      </div>

      <ShareImageWrapper filename={`courtvision-${p.full_name?.replace(/\s+/g, "-").toLowerCase()}`} label="Save Player Card">
      <div>

        <div className="flex items-start gap-5">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-white/[0.04] border border-white/[0.06] rounded-xl"
            style={{
              boxShadow: `0 8px 32px ${p.team_color || "#818cf8"}30`,
            }}>
            <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.3] translate-y-[4px]" unoptimized />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight gradient-text">{p.full_name}</h1>
              <FavoritePlayerButton playerId={Number(id)} />
              {(() => { const sb = getStreakBadge(p.lfi_streak_label); return sb ? <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sb.cls}`}>{sb.text}</span> : null; })()}
              {consInfo.shortLabel !== "—" && (
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${consInfo.cls}`}>
                  {consInfo.shortLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="relative h-4 w-4">
                <Image src={getTeamLogoByAbbr(p.team_abbr)} alt={p.team_abbr} fill className="object-contain" unoptimized />
              </div>
              <span className="text-sm text-text-muted">{p.position || "—"} — {p.team_name} ({p.team_abbr})</span>
              <span className="text-text-muted/20">|</span>
              <span className="text-sm text-text-muted font-stat">{CURRENT_SEASON} Season</span>
            </div>
            {hasMetrics && (
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted/60 uppercase tracking-wider">BIS</span>
                  <span className={`font-stat text-lg font-bold ${tierClass(bis)}`}>{bis?.toFixed(0)}</span>
                </div>
                {bisPctl && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted/60 uppercase tracking-wider">Pctl</span>
                    <span className="font-stat text-sm text-text-secondary">{bisPctl.toFixed(0)}th</span>
                  </div>
                )}
                {bisConf && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted/60 uppercase tracking-wider">Conf</span>
                    <span className="font-stat text-sm text-text-secondary">{(bisConf * 100).toFixed(0)}%</span>
                  </div>
                )}
                {lfi !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted/60 uppercase tracking-wider">LFI</span>
                    <span className={`font-stat text-sm font-bold ${tierClass(lfi)}`}>{lfi.toFixed(0)}</span>
                    {lfiDelta !== 0 && (
                      <span className={`font-stat text-[10px] ${lfiDelta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {lfiDelta > 0 ? "+" : ""}{lfiDelta.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CourtVision Metrics Panel */}
      {hasMetrics && (
        <div className={`grid grid-cols-1 gap-6 ${showRadar ? "lg:grid-cols-3" : ""}`}>
          {/* Radar Chart */}
          {showRadar && (
            <GlassCard variant="accent" className="lg:col-span-1 flex flex-col items-center justify-center">
              <h2 className="section-header mb-3 text-[10px]">CourtVision Profile</h2>
              <RadarChart
                labels={radarLabels}
                datasets={[{ label: p.full_name, data: radarData, color: "#818cf8" }]}
                maxValue={100}
                size={260}
              />
              <div className="mt-2 flex items-center gap-1.5">
                <ScoreOrb score={bis ?? 0} size="sm" label="BIS" />
              </div>
            </GlassCard>
          )}

          {/* Metric Cards Grid */}
          <div className={`${showRadar ? "lg:col-span-2" : ""} grid grid-cols-2 gap-3 sm:grid-cols-3`}>
            {metrics.map((m) => (
              <div key={m.key} className={`p-4 rounded-lg ${tierBorder(m.score)} relative`}
                >
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="h-3.5 w-3.5 text-text-muted/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/80">{m.key}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`font-stat text-2xl font-bold ${tierClass(m.score)}`}>
                    {m.score?.toFixed(0) ?? "—"}
                  </span>
                  <span className="text-[9px] text-text-muted/50 uppercase">{tierLabel(m.score)}</span>
                </div>
                <p className="text-[10px] text-text-muted/40 mt-1.5 leading-snug">{m.desc}</p>
              </div>
            ))}
            {/* Consistency Card */}
            {ptsStddev !== null && (
              <div className={`p-4 rounded-lg border ${consInfo.cls.includes("emerald") ? "border-emerald-500/20 bg-emerald-500/[0.04]" : consInfo.cls.includes("sky") ? "border-sky-500/20 bg-sky-500/[0.04]" : consInfo.cls.includes("amber") ? "border-amber-500/20 bg-amber-500/[0.04]" : "border-rose-500/20 bg-rose-500/[0.04]"} relative`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3.5 w-3.5 text-text-muted/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/80">CON</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`font-bold text-[15px] uppercase tracking-wide ${consInfo.dotCls}`}>
                    {consInfo.label}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted/40 mt-1.5 leading-snug font-stat">
                  σ {ptsStddev.toFixed(1)} pts · last {ptsSamples.length}G
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </ShareImageWrapper>

      {/* Season Stats */}
      <GlassCard>
        <h2 className="section-header mb-4 text-[10px]">Season Averages</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
          {[
            { label: "GP", val: p.games_played },
            { label: "GS", val: p.games_started },
            { label: "MPG", val: Number(p.mpg).toFixed(1) },
            { label: "PPG", val: Number(p.ppg).toFixed(1), highlight: true },
            { label: "RPG", val: Number(p.rpg).toFixed(1) },
            { label: "APG", val: Number(p.apg).toFixed(1) },
            { label: "SPG", val: Number(p.spg).toFixed(1) },
            { label: "BPG", val: Number(p.bpg).toFixed(1) },
            { label: "TOV", val: Number(p.topg).toFixed(1) },
            { label: "FG%", val: (Number(p.fg_pct) * 100).toFixed(1) },
            { label: "3P%", val: (Number(p.fg3_pct) * 100).toFixed(1) },
            { label: "FT%", val: (Number(p.ft_pct) * 100).toFixed(1) },
          ].map((s) => (
            <div key={s.label} className="text-center py-1">
              <p className="text-[10px] uppercase tracking-wider text-text-muted/50 mb-1">{s.label}</p>
              <p className={`font-stat text-lg font-bold ${s.highlight ? "text-indigo-400" : ""}`}>{s.val}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Performance Trend */}
      {gameLogs.length >= 3 && (() => {
        const trendData = gameLogs.slice().reverse().map((gl: any, i: number) => ({
          game: i + 1,
          label: gl.game_date + " vs " + gl.opp_abbr,
          pts: Number(gl.pts),
          reb: Number(gl.reb),
          ast: Number(gl.ast),
        }));
        const avgPts = Number(p.ppg);
        return (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <h2 className="section-header text-[10px]">Performance Trend</h2>
              <span className="text-[9px] text-text-muted/40 ml-auto">Last {gameLogs.length} games — PTS per game</span>
            </div>
            <PerformanceTrendChart data={trendData} avgPts={avgPts} />
          </GlassCard>
        );
      })()}

      {/* Contract Value */}
      {salary !== null && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <h2 className="section-header text-[10px]">Contract Value</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted/60">Salary</p>
              <p className="font-stat text-lg font-bold mt-0.5 text-emerald-400">
                ${(salary / 1_000_000).toFixed(1)}M
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted/60">VFM</p>
              <p className={`font-stat text-lg font-bold mt-0.5 ${vfm !== null ? (vfm > 5 ? "text-emerald-400" : vfm >= 2 ? "text-amber-400" : "text-rose-400") : ""}`}>
                {vfm?.toFixed(1) ?? "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted/60">Salary Rank</p>
              <p className="font-stat text-lg font-bold mt-0.5">
                {salaryRank !== null ? `#${salaryRank}` : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted/60">Value</p>
              {vfmLabel && (
                <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${vfmLabelCls}`}>
                  {vfmLabel}
                </span>
              )}
              {!vfmLabel && <p className="font-stat text-lg font-bold mt-0.5">—</p>}
            </div>
          </div>
        </GlassCard>
      )}

      {/* AI Scouting Report */}
      {hasMetrics && (() => {
        const report = generateScoutingReport({
          full_name: p.full_name,
          position: p.position || "—",
          team_abbr: p.team_abbr,
          team_name: p.team_name,
          games_played: Number(p.games_played),
          ppg: Number(p.ppg), rpg: Number(p.rpg), apg: Number(p.apg),
          spg: Number(p.spg), bpg: Number(p.bpg), topg: Number(p.topg),
          mpg: Number(p.mpg), fg_pct: Number(p.fg_pct), fg3_pct: Number(p.fg3_pct), ft_pct: Number(p.ft_pct),
          bis_score: bis, bis_percentile: bisPctl, lfi_score: lfi, lfi_delta: lfiDelta,
          lfi_streak_label: p.lfi_streak_label, drs_score: drs, rda_score: rda, sps_score: sps, goi_score: goi,
        });
        return (
          <GlassCard variant="accent">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-indigo-400" />
              <h2 className="section-header text-[10px]">CourtVision Scouting Report</h2>
            </div>
            <p className="text-sm font-semibold text-text-primary mb-3">{report.headline}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {report.tags.map((tag) => (
                <span key={tag} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  {tag}
                </span>
              ))}
            </div>
            <div className="space-y-4">
              {report.sections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-1">{section.title}</h3>
                  <p className="text-[12px] leading-relaxed text-text-secondary">{section.content}</p>
                </div>
              ))}
            </div>
            {report.projectionNote && (
              <div className="mt-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3 w-3 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Projection</span>
                </div>
                <p className="text-[12px] leading-relaxed text-text-secondary">{report.projectionNote}</p>
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <p className="text-[9px] text-text-muted/30 italic">Generated by CourtVision Intelligence Engine — based on current season metrics and game logs</p>
              <span className="text-[8px] text-text-muted/20 font-stat">courtvisionai.io</span>
            </div>
          </GlassCard>
        );
      })()}

      {/* Opponent Splits — Player H2H Matchups */}
      {matchupSplits.length > 0 && (
        <GlassCard hover={false} padding="sm">
          <div className="flex items-center gap-2 px-3 pt-2 mb-3">
            <Swords className="h-4 w-4 text-indigo-400" />
            <h2 className="section-header text-[10px]">Opponent Splits</h2>
            <span className="text-[9px] text-text-muted/40 ml-auto">vs season avg</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">
                  <th className="px-3 py-2">Opponent</th>
                  <th className="px-2 py-2 text-right">GP</th>
                  <th className="px-2 py-2 text-right">PTS</th>
                  <th className="px-2 py-2 text-right">+/-</th>
                  <th className="px-2 py-2 text-right">REB</th>
                  <th className="px-2 py-2 text-right">AST</th>
                  <th className="px-2 py-2 text-right">FG%</th>
                  <th className="px-2 py-2 text-right">3P%</th>
                  <th className="px-2 py-2 text-right">MIN</th>
                  <th className="px-2 py-2 text-right">Matchup</th>
                </tr>
              </thead>
              <tbody>
                {matchupSplits.map((ms) => {
                  const ptsDiffColor = ms.pts_diff > 3 ? "text-emerald-400" : ms.pts_diff < -3 ? "text-rose-400" : "text-text-muted";
                  const matchupLabel = ms.pts_diff > 5 ? "Dominates" : ms.pts_diff > 2 ? "Favorable" : ms.pts_diff < -5 ? "Struggles" : ms.pts_diff < -2 ? "Tough" : "Neutral";
                  const matchupCls = ms.pts_diff > 5 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : ms.pts_diff > 2 ? "text-emerald-400/70 bg-emerald-500/5 border-emerald-500/10"
                    : ms.pts_diff < -5 ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                    : ms.pts_diff < -2 ? "text-rose-400/70 bg-rose-500/5 border-rose-500/10"
                    : "text-text-muted/60 bg-white/[0.02] border-white/[0.04]";

                  return (
                    <tr key={ms.opponent_team_id} className="border-b border-white/[0.03] table-row-hover">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative h-4 w-4">
                            <Image src={getTeamLogoByAbbr(ms.opponent_abbr)} alt={ms.opponent_abbr} fill className="object-contain" unoptimized />
                          </div>
                          <span className="text-[11px] font-semibold text-text-primary">{ms.opponent_abbr}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-stat text-[11px] text-text-muted">{ms.games}</td>
                      <td className="px-2 py-2 text-right font-stat text-[12px] font-bold text-text-primary">{ms.avg_pts}</td>
                      <td className={`px-2 py-2 text-right font-stat text-[11px] font-semibold ${ptsDiffColor}`}>
                        {ms.pts_diff > 0 ? "+" : ""}{ms.pts_diff}
                      </td>
                      <td className="px-2 py-2 text-right font-stat text-[11px] text-text-secondary">{ms.avg_reb}</td>
                      <td className="px-2 py-2 text-right font-stat text-[11px] text-text-secondary">{ms.avg_ast}</td>
                      <td className="px-2 py-2 text-right font-stat text-[11px] text-text-secondary">{(ms.fg_pct * 100).toFixed(1)}</td>
                      <td className="px-2 py-2 text-right font-stat text-[11px] text-text-secondary">{(ms.fg3_pct * 100).toFixed(1)}</td>
                      <td className="px-2 py-2 text-right font-stat text-[11px] text-text-muted">{ms.avg_min}</td>
                      <td className="px-2 py-2 text-right">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${matchupCls}`}>
                          {matchupLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Recent Game Logs */}
      {gameLogs.length > 0 && (
        <GlassCard hover={false} padding="sm">
          <h2 className="section-header mb-3 px-3 pt-2 text-[10px]">Recent Game Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Opp</th>
                  <th className="px-3 py-2 text-right">MIN</th>
                  <th className="px-3 py-2 text-right">PTS</th>
                  <th className="px-3 py-2 text-right">REB</th>
                  <th className="px-3 py-2 text-right">AST</th>
                  <th className="px-3 py-2 text-right">STL</th>
                  <th className="px-3 py-2 text-right">BLK</th>
                  <th className="px-3 py-2 text-right">FG</th>
                  <th className="px-3 py-2 text-right">3P</th>
                  <th className="px-3 py-2 text-right">+/-</th>
                </tr>
              </thead>
              <tbody>
                {gameLogs.map((gl: any, i: number) => {
                  const pts = Number(gl.pts);
                  const avgPts = Number(p.ppg);
                  const isHotGame = pts >= avgPts * 1.3;
                  const isColdGame = pts <= avgPts * 0.5;
                  return (
                    <tr key={i} className="border-b border-white/[0.03] table-row-hover">
                      <td className="px-3 py-2 text-[11px] text-text-muted">{gl.game_date}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative h-4 w-4">
                            <Image src={getTeamLogoByAbbr(gl.opp_abbr)} alt={gl.opp_abbr} fill className="object-contain" unoptimized />
                          </div>
                          <span className="text-[11px] text-text-muted">{gl.opp_abbr}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{Number(gl.minutes).toFixed(0)}</td>
                      <td className={`px-3 py-2 text-right font-stat font-bold ${isHotGame ? "text-emerald-400" : isColdGame ? "text-rose-400" : "text-text-primary"}`}>
                        {gl.pts}
                      </td>
                      <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{gl.reb}</td>
                      <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{gl.ast}</td>
                      <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{gl.stl}</td>
                      <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{gl.blk}</td>
                      <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{gl.fgm}-{gl.fga}</td>
                      <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{gl.fg3m}-{gl.fg3a}</td>
                      <td className={`px-3 py-2 text-right font-stat text-[12px] font-semibold ${Number(gl.plus_minus) > 0 ? "text-emerald-400" : Number(gl.plus_minus) < 0 ? "text-rose-400" : "text-text-muted"}`}>
                        {Number(gl.plus_minus) > 0 ? "+" : ""}{gl.plus_minus}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
