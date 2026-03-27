import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { MetricTooltip } from "@/components/shared/metric-tooltip";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { ArrowLeft, Activity, Target, TrendingUp, AlertTriangle, Check, X, Zap, Swords } from "lucide-react";
import { getTeamLogoByAbbr } from "@/lib/nba-data";
import { getGameById, getTeamWithMetrics, getGameProjection, getGamePlayerProjections, getGamePlayerLogs } from "@/lib/db/queries";
import { getGameKeyMatchups } from "@/lib/db/queries/matchups";
import { computeLiveProjections, computeLivePlayerProjections } from "@/lib/projections";
import { notFound } from "next/navigation";
import { tierClass } from "@/lib/formatting";

export const dynamic = "force-dynamic";

function BoxScoreTable({ players, teamAbbr, teamId }: { players: any[]; teamAbbr: string; teamId: number }) {
  const teamPlayers = players.filter((p: any) => Number(p.team_id) === teamId);
  if (teamPlayers.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="relative h-5 w-5">
          <Image src={getTeamLogoByAbbr(teamAbbr)} alt={teamAbbr} fill className="object-contain" unoptimized />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{teamAbbr}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">Player</th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="min">MIN</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50 font-bold"><MetricTooltip metricKey="ppg">PTS</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="reb">REB</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="ast">AST</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="stl">STL</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="blk">BLK</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="tov">TOV</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="fg">FG</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="fg3">3P</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="ft">FT</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50"><MetricTooltip metricKey="plus_minus">+/-</MetricTooltip></th>
              <th className="px-2 py-1.5 text-right text-[9px] uppercase tracking-widest text-indigo-400/40"><MetricTooltip metricKey="bis">BIS</MetricTooltip></th>
            </tr>
          </thead>
          <tbody>
            {teamPlayers.map((p: any, i: number) => {
              const bis = p.bis_score ? Number(p.bis_score) : null;
              const fgPct = p.fga > 0 ? ((Number(p.fgm) / Number(p.fga)) * 100).toFixed(0) : "—";
              return (
                <tr key={i} className="border-b border-white/[0.03] table-row-hover">
                  <td className="px-3 py-1.5">
                    <a href={`/players/${p.player_id}`} className="hover:text-indigo-400 transition-colors">
                      <span className="text-[12px] font-semibold text-text-primary">{p.full_name}</span>
                      <span className="text-[10px] text-text-muted/40 ml-1">{p.position}</span>
                    </a>
                  </td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-muted/50">{p.minutes}</td>
                  <td className="px-2 py-1.5 text-right font-stat text-[12px] font-bold text-text-primary">{p.pts}</td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-secondary">{p.reb}</td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-secondary">{p.ast}</td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-secondary">{p.stl}</td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-secondary">{p.blk}</td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-muted/50">{p.tov ?? 0}</td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-muted/60">
                    {p.fgm}/{p.fga} <span className="text-text-muted/30">({fgPct}%)</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-muted/60">
                    {p.fg3m}/{p.fg3a}
                  </td>
                  <td className="px-2 py-1.5 text-right font-stat text-[11px] text-text-muted/60">
                    {p.ftm}/{p.fta}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-stat text-[11px] ${
                    Number(p.plus_minus) > 0 ? "text-emerald-400" : Number(p.plus_minus) < 0 ? "text-rose-400" : "text-text-muted/50"
                  }`}>
                    {Number(p.plus_minus) > 0 ? "+" : ""}{p.plus_minus}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-stat text-[11px] font-bold ${tierClass(bis)}`}>
                    {bis?.toFixed(0) ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameById(Number(id));
  if (!game) notFound();

  const g = game as any;
  const homePts = g.home_score != null ? Number(g.home_score) : null;
  const awayPts = g.away_score != null ? Number(g.away_score) : null;
  const isFinal = g.status === "final" && homePts != null && awayPts != null;
  const homeWon = isFinal && homePts! > awayPts!;
  const awayWon = isFinal && awayPts! > homePts!;
  const displayDate = new Date(g.game_date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const [homeTeam, awayTeam, preProjection, prePlayerProjections, playerLogs, keyMatchups] = await Promise.all([
    getTeamWithMetrics(Number(g.home_team_id)),
    getTeamWithMetrics(Number(g.away_team_id)),
    getGameProjection(Number(id)),
    getGamePlayerProjections(Number(id)),
    getGamePlayerLogs(Number(id), 30),
    getGameKeyMatchups(Number(id)),
  ]);

  const ht = homeTeam as any;
  const at = awayTeam as any;

  // Use pre-computed projection if available, otherwise compute live
  let proj = preProjection as any;
  let pProj = prePlayerProjections as any[];

  if (!proj && !isFinal) {
    // Compute live projection for this scheduled game
    const liveMap = await computeLiveProjections([Number(id)]);
    const liveProj = liveMap.get(Number(id));
    if (liveProj) {
      proj = {
        ...liveProj,
        winner_abbr: liveProj.winner_abbr,
        winner_name: liveProj.winner_abbr, // abbreviated for now
      };
    }
  }

  if (pProj.length === 0 && !isFinal) {
    // Compute live player projections
    const livePlayers = await computeLivePlayerProjections(Number(id));
    pProj = livePlayers as any[];
  }

  const pLogs = playerLogs as any[];

  const homeTSC = ht?.tsc_score ? Number(ht.tsc_score) : null;
  const awayTSC = at?.tsc_score ? Number(at.tsc_score) : null;
  const homeLTFI = ht?.ltfi_score ? Number(ht.ltfi_score) : null;
  const awayLTFI = at?.ltfi_score ? Number(at.ltfi_score) : null;
  const homeLSS = ht?.lss_score ? Number(ht.lss_score) : null;
  const awayLSS = at?.lss_score ? Number(at.lss_score) : null;
  const homeDRS = ht?.drs_team_score ? Number(ht.drs_team_score) : null;
  const awayDRS = at?.drs_team_score ? Number(at.drs_team_score) : null;

  const metricComparisons = [
    { label: "TSC", key: "tsc", home: homeTSC, away: awayTSC },
    { label: "LTFI", key: "ltfi", home: homeLTFI, away: awayLTFI },
    { label: "LSS", key: "lss", home: homeLSS, away: awayLSS },
    { label: "DRS", key: "drs_team", home: homeDRS, away: awayDRS },
  ];

  const hasProj = !!proj;
  const homeProb = hasProj ? Number(proj.win_prob_home) : null;
  const awayProb = hasProj ? Number(proj.win_prob_away) : null;
  const projScoreHome = hasProj ? Number(proj.proj_score_home) : null;
  const projScoreAway = hasProj ? Number(proj.proj_score_away) : null;
  const projWinnerId = proj?.projected_winner_id ? Number(proj.projected_winner_id) : null;
  const confidence = proj?.confidence ? Number(proj.confidence) : null;
  const upsetRisk = proj?.upset_risk;
  const rawReasons = proj?.key_reasons;
  const keyReasons: string[] | null = rawReasons
    ? (typeof rawReasons === "string" ? JSON.parse(rawReasons) : Array.isArray(rawReasons) ? rawReasons : null)
    : null;
  const favoredAbbr = proj?.winner_abbr;

  const pickCorrect = isFinal && projWinnerId
    ? (homeWon && projWinnerId === Number(g.home_team_id)) || (awayWon && projWinnerId === Number(g.away_team_id))
    : null;

  // Mismatch Detector: high-OIQ players vs weak opponent DRS
  // Home players (high OIQ) vs away team's defense (awayDRS)
  // Away players (high OIQ) vs home team's defense (homeDRS)
  type MismatchEntry = { player_id: number; player_name: string; position: string | null; oiq: number; opp_drs: number; opp_abbr: string; delta: number };
  const mismatches: MismatchEntry[] = [];
  const OIQ_FLOOR = 60; // min OIQ to be considered a mismatch threat
  const DRS_CEILING = 52; // max opponent DRS to qualify as exploitable

  for (const m of keyMatchups.home_matchups) {
    const oiq = m.rda_score;
    const oppDrs = awayDRS;
    if (oiq !== null && oiq >= OIQ_FLOOR && oppDrs !== null && oppDrs <= DRS_CEILING) {
      mismatches.push({ player_id: m.player_id, player_name: m.player_name, position: m.position, oiq, opp_drs: oppDrs, opp_abbr: g.away_abbr, delta: oiq - oppDrs });
    }
  }
  for (const m of keyMatchups.away_matchups) {
    const oiq = m.rda_score;
    const oppDrs = homeDRS;
    if (oiq !== null && oiq >= OIQ_FLOOR && oppDrs !== null && oppDrs <= DRS_CEILING) {
      mismatches.push({ player_id: m.player_id, player_name: m.player_name, position: m.position, oiq, opp_drs: oppDrs, opp_abbr: g.home_abbr, delta: oiq - oppDrs });
    }
  }
  // Sort by delta descending — biggest mismatches first
  mismatches.sort((a, b) => b.delta - a.delta);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back nav */}
      <div>
        <a href="/games" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-indigo-400 transition-colors mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to Games
        </a>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-text-muted font-stat">{displayDate}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight gradient-text">
              {g.away_abbr} @ {g.home_abbr}
            </h1>
          </div>
          {!isFinal && (
            <AutoRefresh
              intervalSeconds={g.status === "live" || g.status === "in_progress" ? 30 : 60}
              enabled={true}
              label={g.status === "live" || g.status === "in_progress" ? "Live updates" : "Pre-game"}
            />
          )}
        </div>
      </div>

      {/* Score Hero */}
      <GlassCard variant="accent" padding="lg" className="relative overflow-hidden">
        <div className="relative">
          {isFinal ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="rounded-sm bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Final</span>
                {hasProj && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-sm"
                    style={{
                      borderColor: pickCorrect ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)",
                      background: pickCorrect ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
                      color: pickCorrect ? "#10b981" : "#f43f5e",
                    }}
                  >
                    <Target className="h-2.5 w-2.5" />
                    Pick: {favoredAbbr} {pickCorrect ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="relative h-20 w-20">
                      <Image src={getTeamLogoByAbbr(g.away_abbr)} alt={g.away_name} fill className="object-contain drop-shadow-xl" unoptimized />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${awayWon ? "text-emerald-400" : "text-text-primary"}`}>{g.away_city} {g.away_name}</p>
                  <p className="text-xs text-text-muted font-stat mt-1">{g.away_wins}-{g.away_losses}</p>
                  {awayTSC && <p className={`font-stat text-[10px] mt-1 ${tierClass(awayTSC)}`}>TSC {awayTSC.toFixed(0)}</p>}
                </div>

                <div className="text-center">
                  <p className="font-stat text-5xl font-bold text-text-primary tracking-tight">
                    {awayPts} <span className="text-text-muted/20">-</span> {homePts}
                  </p>
                  <p className={`mt-2 text-sm font-semibold ${awayWon ? "text-emerald-400" : homeWon ? "text-emerald-400" : ""}`}>
                    {awayWon ? `${g.away_name} Win` : homeWon ? `${g.home_name} Win` : "Tied"}
                  </p>
                  {hasProj && (
                    <p className="text-[10px] text-text-muted/40 mt-1 font-stat">
                      Projected: {projScoreAway}-{projScoreHome}
                    </p>
                  )}
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="relative h-20 w-20">
                      <Image src={getTeamLogoByAbbr(g.home_abbr)} alt={g.home_name} fill className="object-contain drop-shadow-xl" unoptimized />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${homeWon ? "text-emerald-400" : "text-text-primary"}`}>{g.home_city} {g.home_name}</p>
                  <p className="text-xs text-text-muted font-stat mt-1">{g.home_wins}-{g.home_losses}</p>
                  {homeTSC && <p className={`font-stat text-[10px] mt-1 ${tierClass(homeTSC)}`}>TSC {homeTSC.toFixed(0)}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="rounded-sm bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Scheduled</span>
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="relative h-20 w-20">
                      <Image src={getTeamLogoByAbbr(g.away_abbr)} alt={g.away_name} fill className="object-contain drop-shadow-xl" unoptimized />
                    </div>
                  </div>
                  <p className="text-xl font-bold">{g.away_city} {g.away_name}</p>
                  <p className="text-xs text-text-muted font-stat mt-1">{g.away_wins}-{g.away_losses}</p>
                  {awayTSC && <p className={`font-stat text-[10px] mt-1 ${tierClass(awayTSC)}`}>TSC {awayTSC.toFixed(0)}</p>}
                </div>
                <div className="text-center">
                  {hasProj ? (
                    <>
                      <p className="font-stat text-3xl font-bold text-text-muted/50">
                        {projScoreAway} <span className="text-text-muted/15">-</span> {projScoreHome}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-indigo-400/50 font-semibold mt-1">Projected</p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-text-muted/30">VS</p>
                  )}
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="relative h-20 w-20">
                      <Image src={getTeamLogoByAbbr(g.home_abbr)} alt={g.home_name} fill className="object-contain drop-shadow-xl" unoptimized />
                    </div>
                  </div>
                  <p className="text-xl font-bold">{g.home_city} {g.home_name}</p>
                  <p className="text-xs text-text-muted font-stat mt-1">{g.home_wins}-{g.home_losses}</p>
                  {homeTSC && <p className={`font-stat text-[10px] mt-1 ${tierClass(homeTSC)}`}>TSC {homeTSC.toFixed(0)}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CourtVision Projection */}
        {hasProj && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-3.5 w-3.5 text-indigo-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">CourtVision Projection</h2>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] font-stat mb-1.5">
                <span className={awayProb! > homeProb! ? "text-indigo-400 font-bold" : "text-text-muted/50"}>
                  {g.away_abbr} {(awayProb! * 100).toFixed(0)}%
                </span>
                <span className={homeProb! > awayProb! ? "text-indigo-400 font-bold" : "text-text-muted/50"}>
                  {(homeProb! * 100).toFixed(0)}% {g.home_abbr}
                </span>
              </div>
              <div className="flex h-2 rounded-sm overflow-hidden bg-white/[0.04]">
                <div className="h-full" style={{
                  width: `${awayProb! * 100}%`,
                  background: awayProb! > homeProb!
                    ? "linear-gradient(90deg, rgba(129,140,248,0.5), rgba(129,140,248,0.25))"
                    : "rgba(128,148,176,0.15)",
                }} />
                <div className="h-full" style={{
                  width: `${homeProb! * 100}%`,
                  background: homeProb! > awayProb!
                    ? "linear-gradient(270deg, rgba(129,140,248,0.5), rgba(129,140,248,0.25))"
                    : "rgba(128,148,176,0.15)",
                }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 border border-white/[0.04] rounded">
                <p className="text-[9px] text-text-muted/50 uppercase tracking-wider mb-1">{g.away_abbr} Projected</p>
                <p className="font-stat text-lg font-bold text-text-primary">{projScoreAway}</p>
                {proj.proj_score_away_low && (
                  <p className="text-[10px] text-text-muted/40 font-stat">
                    {Number(proj.proj_score_away_low)}-{Number(proj.proj_score_away_high)}
                  </p>
                )}
              </div>
              <div className="text-center p-2 border border-white/[0.04] rounded">
                <p className="text-[9px] text-text-muted/50 uppercase tracking-wider mb-1">{g.home_abbr} Projected</p>
                <p className="font-stat text-lg font-bold text-text-primary">{projScoreHome}</p>
                {proj.proj_score_home_low && (
                  <p className="text-[10px] text-text-muted/40 font-stat">
                    {Number(proj.proj_score_home_low)}-{Number(proj.proj_score_home_high)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              {confidence != null && (
                <span className="px-2 py-0.5 text-[10px] font-bold font-stat border border-white/[0.06] text-text-muted/60 rounded-sm">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </span>
              )}
              {upsetRisk && (
                <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border rounded-sm ${
                  upsetRisk === "toss-up" ? "text-amber-400 border-amber-400/20" :
                  upsetRisk === "moderate" ? "text-orange-400 border-orange-400/20" :
                  "text-text-muted/50 border-white/[0.06]"
                }`}>
                  {upsetRisk === "toss-up" && <AlertTriangle className="h-2.5 w-2.5" />}
                  Upset Risk: {upsetRisk}
                </span>
              )}
            </div>

            {/* Projected Spread */}
            {proj.margin != null && Number(proj.margin) > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                <p className="text-[9px] text-text-muted/50 uppercase tracking-wider mb-1">Projected Spread</p>
                <p className="font-stat text-lg font-bold text-indigo-400">
                  {favoredAbbr} -{Number(proj.margin).toFixed(1)}
                </p>
              </div>
            )}

            {keyReasons && keyReasons.length > 0 && (
              <div className="space-y-1.5">
                {keyReasons.map((reason: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-text-muted/70">
                    <TrendingUp className="h-3 w-3 mt-0.5 text-indigo-400/40 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* CourtVision Metric Comparison */}
        {(homeTSC || awayTSC) && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Matchup Analysis</h2>
            </div>
            <div className="space-y-3">
              {metricComparisons.map((m) => {
                if (!m.home && !m.away) return null;
                const homeVal = m.home ?? 0;
                const awayVal = m.away ?? 0;
                const total = homeVal + awayVal || 1;
                const homeEdge = homeVal > awayVal;
                return (
                  <div key={m.label} className="flex items-center gap-4">
                    <div className="w-16 text-right">
                      <span className={`font-stat text-sm font-bold ${homeEdge ? tierClass(m.home) : "text-text-muted"}`}>
                        {m.home?.toFixed(0) ?? "—"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex h-2 rounded-sm overflow-hidden bg-white/[0.04]">
                        <div className="h-full transition-all" style={{
                          width: `${(homeVal / total) * 100}%`,
                          background: homeEdge ? "linear-gradient(90deg, rgba(129,140,248,0.4), rgba(129,140,248,0.2))" : "rgba(128,148,176,0.2)",
                        }} />
                        <div className="h-full transition-all" style={{
                          width: `${(awayVal / total) * 100}%`,
                          background: !homeEdge ? "linear-gradient(270deg, rgba(129,140,248,0.4), rgba(129,140,248,0.2))" : "rgba(128,148,176,0.2)",
                        }} />
                      </div>
                      <p className="text-center text-[9px] text-text-muted/50 mt-0.5 uppercase tracking-widest font-bold">
                        <MetricTooltip metricKey={m.key}>{m.label}</MetricTooltip>
                      </p>
                    </div>
                    <div className="w-16">
                      <span className={`font-stat text-sm font-bold ${!homeEdge ? tierClass(m.away) : "text-text-muted"}`}>
                        {m.away?.toFixed(0) ?? "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-[10px] text-text-muted/50 uppercase tracking-wider">
              <span>{g.home_abbr} (Home)</span>
              <span>{g.away_abbr} (Away)</span>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Mismatch Detector */}
      {mismatches.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Mismatch Intel</h2>
            <span className="text-[9px] text-text-muted/40 ml-auto">High-OIQ players vs weak opponent defense</span>
          </div>
          <div className="space-y-2">
            {mismatches.slice(0, 4).map((mm) => (
              <div key={mm.player_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
                <div className="flex-1 min-w-0">
                  <a href={`/players/${mm.player_id}`} className="hover:text-amber-400 transition-colors">
                    <span className="text-[13px] font-semibold text-text-primary">{mm.player_name}</span>
                    {mm.position && <span className="text-[10px] text-text-muted/50 ml-1.5">{mm.position}</span>}
                  </a>
                  <p className="text-[10px] text-text-muted/50 mt-0.5">
                    OIQ <span className="font-stat font-bold text-amber-400">{mm.oiq.toFixed(0)}</span>
                    <span className="mx-1.5 text-text-muted/20">vs</span>
                    {mm.opp_abbr} defense <span className="font-stat font-bold text-rose-400">DRS {mm.opp_drs.toFixed(0)}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-stat text-lg font-bold text-amber-400">+{mm.delta.toFixed(0)}</span>
                  <p className="text-[9px] text-text-muted/40">edge</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Key Player Matchups — H2H vs opponent */}
      {(keyMatchups.home_matchups.length > 0 || keyMatchups.away_matchups.length > 0) && (
        <GlassCard hover={false} padding="sm">
          <div className="flex items-center gap-2 px-3 pt-2 mb-3">
            <Swords className="h-3.5 w-3.5 text-indigo-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Key Player Matchups</h2>
            <span className="text-[9px] text-text-muted/40 ml-auto">Historical vs opponent this season</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-3 pb-3">
            {/* Home team matchups */}
            {keyMatchups.home_matchups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/[0.04]">
                  <div className="relative h-4 w-4">
                    <Image src={getTeamLogoByAbbr(g.home_abbr)} alt={g.home_abbr} fill className="object-contain" unoptimized />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">{g.home_abbr} vs {g.away_abbr}</span>
                </div>
                <div className="space-y-2">
                  {keyMatchups.home_matchups.map((m) => {
                    const hasMU = m.games > 0;
                    return (
                      <div key={m.player_id} className="flex items-center gap-3 py-1.5">
                        <a href={`/players/${m.player_id}`} className="flex-1 min-w-0 hover:text-indigo-400 transition-colors">
                          <span className="text-[12px] font-semibold text-text-primary block truncate">{m.player_name}</span>
                          {m.bis_score && <span className={`text-[10px] font-stat ${tierClass(m.bis_score)}`}>BIS {m.bis_score.toFixed(0)}</span>}
                        </a>
                        {hasMU ? (
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="font-stat text-sm font-bold text-text-primary">{m.avg_pts}</span>
                              <span className="text-[9px] text-text-muted/40 ml-0.5">PTS</span>
                            </div>
                            <div className="text-right">
                              <span className="font-stat text-[11px] text-text-secondary">{m.avg_reb}</span>
                              <span className="text-[9px] text-text-muted/40 ml-0.5">REB</span>
                            </div>
                            <div className="text-right">
                              <span className="font-stat text-[11px] text-text-secondary">{m.avg_ast}</span>
                              <span className="text-[9px] text-text-muted/40 ml-0.5">AST</span>
                            </div>
                            <span className={`text-[10px] font-bold font-stat ${m.pts_diff > 2 ? "text-emerald-400" : m.pts_diff < -2 ? "text-rose-400" : "text-text-muted/50"}`}>
                              {m.pts_diff > 0 ? "+" : ""}{m.pts_diff}
                            </span>
                            <span className="text-[9px] text-text-muted/30 font-stat">{m.games}G</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-muted/30 italic">No matchup data</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Away team matchups */}
            {keyMatchups.away_matchups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/[0.04]">
                  <div className="relative h-4 w-4">
                    <Image src={getTeamLogoByAbbr(g.away_abbr)} alt={g.away_abbr} fill className="object-contain" unoptimized />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">{g.away_abbr} vs {g.home_abbr}</span>
                </div>
                <div className="space-y-2">
                  {keyMatchups.away_matchups.map((m) => {
                    const hasMU = m.games > 0;
                    return (
                      <div key={m.player_id} className="flex items-center gap-3 py-1.5">
                        <a href={`/players/${m.player_id}`} className="flex-1 min-w-0 hover:text-indigo-400 transition-colors">
                          <span className="text-[12px] font-semibold text-text-primary block truncate">{m.player_name}</span>
                          {m.bis_score && <span className={`text-[10px] font-stat ${tierClass(m.bis_score)}`}>BIS {m.bis_score.toFixed(0)}</span>}
                        </a>
                        {hasMU ? (
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="font-stat text-sm font-bold text-text-primary">{m.avg_pts}</span>
                              <span className="text-[9px] text-text-muted/40 ml-0.5">PTS</span>
                            </div>
                            <div className="text-right">
                              <span className="font-stat text-[11px] text-text-secondary">{m.avg_reb}</span>
                              <span className="text-[9px] text-text-muted/40 ml-0.5">REB</span>
                            </div>
                            <div className="text-right">
                              <span className="font-stat text-[11px] text-text-secondary">{m.avg_ast}</span>
                              <span className="text-[9px] text-text-muted/40 ml-0.5">AST</span>
                            </div>
                            <span className={`text-[10px] font-bold font-stat ${m.pts_diff > 2 ? "text-emerald-400" : m.pts_diff < -2 ? "text-rose-400" : "text-text-muted/50"}`}>
                              {m.pts_diff > 0 ? "+" : ""}{m.pts_diff}
                            </span>
                            <span className="text-[9px] text-text-muted/30 font-stat">{m.games}G</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-muted/30 italic">No matchup data</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Full Box Score (final games) */}
      {isFinal && pLogs.length > 0 && (
        <GlassCard hover={false} padding="sm">
          <div className="flex items-center gap-2 mb-2 px-3 pt-2">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Box Score</h2>
          </div>
          <div className="space-y-4">
            <BoxScoreTable players={pLogs} teamAbbr={g.away_abbr} teamId={Number(g.away_team_id)} />
            <BoxScoreTable players={pLogs} teamAbbr={g.home_abbr} teamId={Number(g.home_team_id)} />
          </div>
        </GlassCard>
      )}

      {/* Player Projections (scheduled games) */}
      {!isFinal && pProj.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Player Projections</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">Player</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">Proj PTS</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">Range</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">Proj REB</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">Proj AST</th>
                  <th className="px-3 py-2 text-right text-[9px] uppercase tracking-widest text-indigo-400/40">
                    <MetricTooltip metricKey="bis">BIS</MetricTooltip>
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">Vol</th>
                </tr>
              </thead>
              <tbody>
                {pProj.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.03] table-row-hover">
                    <td className="px-3 py-2">
                      <a href={`/players/${p.player_id}`} className="hover:text-indigo-400 transition-colors">
                        <span className="font-semibold text-text-primary">{p.full_name}</span>
                        <span className="text-[10px] text-text-muted ml-1.5">{p.team_abbr}</span>
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right font-stat font-bold text-text-primary">{p.proj_pts != null ? Number(p.proj_pts).toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-right font-stat text-text-muted/50 text-[11px]">
                      {p.proj_pts_low != null ? `${Number(p.proj_pts_low).toFixed(0)}-${Number(p.proj_pts_high).toFixed(0)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-stat text-text-muted">{p.proj_reb != null ? Number(p.proj_reb).toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-right font-stat text-text-muted">{p.proj_ast != null ? Number(p.proj_ast).toFixed(1) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-stat font-bold ${tierClass(p.bis_score ? Number(p.bis_score) : null)}`}>
                      {p.bis_score ? Number(p.bis_score).toFixed(0) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-[10px] font-bold uppercase ${
                        p.proj_volatility === "high" ? "text-amber-400" :
                        p.proj_volatility === "moderate" ? "text-text-muted/60" :
                        "text-emerald-400/60"
                      }`}>{p.proj_volatility}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
