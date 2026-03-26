import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreOrb } from "@/components/ui/score-orb";
import { ArrowLeft, Shield, Activity, TrendingUp, Target, BarChart3 } from "lucide-react";
import { getTeamLogoByAbbr, getPlayerHeadshotUrl } from "@/lib/nba-data";
import { getTeamWithMetrics, getTeamRoster } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import { tierClass, tierBorder } from "@/lib/formatting";

const LEAGUE_AVG_ORTG = 112;

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeamWithMetrics(Number(id));
  if (!team) notFound();

  const t = team as any;
  const roster = (await getTeamRoster(Number(id))) as any[];
  const wins = Number(t.wins ?? 0);
  const losses = Number(t.losses ?? 0);
  const total = wins + losses;
  const winPct = total > 0 ? (wins / total).toFixed(3) : ".000";

  const tsc = t.tsc_score ? Number(t.tsc_score) : null;
  const ltfi = t.ltfi_score ? Number(t.ltfi_score) : null;
  const lss = t.lss_score ? Number(t.lss_score) : null;
  const pts = t.pts_score ? Number(t.pts_score) : null;
  const rp = t.rp_score ? Number(t.rp_score) : null;
  const drsTeam = t.drs_team_score ? Number(t.drs_team_score) : null;
  const hasMetrics = tsc !== null;

  const teamMetrics = [
    { key: "TSC", label: "Team Strength Composite", score: tsc, icon: Activity, desc: "Aggregate team quality blending offense, defense, and net rating" },
    { key: "LTFI", label: "Long-Term Form Index", score: ltfi, icon: TrendingUp, desc: "Team momentum and trajectory over rolling windows" },
    { key: "LSS", label: "Lineup Stability Score", score: lss, icon: Shield, desc: "Consistency of rotations and lineup cohesion" },
    { key: "PTS", label: "Pace & Tempo Score", score: pts, icon: BarChart3, desc: "Pace tendencies and how tempo affects performance" },
    { key: "RP", label: "Resilience Profile", score: rp, icon: Target, desc: "Performance in close games, comebacks, and adverse situations" },
    { key: "DRS", label: "Defensive Rating Score", score: drsTeam, icon: Shield, desc: "Team-level defensive efficiency and opponent containment" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <a href="/teams" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-indigo-400 transition-colors mb-4">
          <ArrowLeft className="h-3 w-3" /> Back to Teams
        </a>
        <div className="flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <Image src={getTeamLogoByAbbr(t.abbreviation)} alt={t.name} fill className="object-contain drop-shadow-xl" unoptimized />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight gradient-text">{t.city} {t.nickname}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-stat text-sm text-text-secondary">{wins}-{losses}</span>
              <span className="text-text-muted/20">|</span>
              <span className="text-xs text-text-muted">{t.conference}ern Conference — {t.division}</span>
              <span className="text-text-muted/20">|</span>
              <span className="text-xs text-text-muted">Win%: {winPct}</span>
            </div>
            {t.arena && <p className="text-[11px] text-text-muted/60 mt-1">{t.arena}</p>}
            {hasMetrics && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted/60 uppercase tracking-wider">TSC</span>
                  <span className={`font-stat text-lg font-bold ${tierClass(tsc)}`}>{tsc?.toFixed(0)}</span>
                </div>
                {ltfi && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted/60 uppercase tracking-wider">LTFI</span>
                    <span className={`font-stat text-sm ${tierClass(ltfi)}`}>{ltfi.toFixed(0)}</span>
                  </div>
                )}
                {t.elo_rating && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted/60 uppercase tracking-wider">Elo</span>
                    <span className={`font-stat text-sm font-bold ${Number(t.elo_rating) >= 1550 ? "text-emerald-400" : Number(t.elo_rating) < 1450 ? "text-rose-400" : "text-text-secondary"}`}>
                      {Math.round(Number(t.elo_rating))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Metrics Panel */}
      {hasMetrics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <GlassCard variant="accent" className="lg:col-span-1 flex flex-col items-center justify-center py-6">
            <ScoreOrb score={tsc ?? 0} size="lg" label="TSC" />
            <p className="text-[10px] text-text-muted/50 mt-2 uppercase tracking-wider">Team Strength Composite</p>
          </GlassCard>

          <div className="lg:col-span-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {teamMetrics.slice(1).map((m) => (
              <div key={m.key} className={`p-4 rounded-lg ${tierBorder(m.score)} relative`}
>
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="h-3.5 w-3.5 text-text-muted/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/80">{m.key}</span>
                </div>
                <span className={`font-stat text-2xl font-bold ${tierClass(m.score)}`}>
                  {m.score?.toFixed(0) ?? "—"}
                </span>
                <p className="text-[10px] text-text-muted/40 mt-1.5 leading-snug">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Season Stats */}
      <GlassCard>
        <h2 className="section-header mb-4 text-[10px]">Season Stats</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted/60">Wins</p>
            <p className="font-stat text-xl font-bold mt-0.5 text-emerald-400">{wins}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted/60">Losses</p>
            <p className="font-stat text-xl font-bold mt-0.5 text-rose-400">{losses}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted/60">Win%</p>
            <p className="font-stat text-xl font-bold mt-0.5">{winPct}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted/60">FG%</p>
            <p className="font-stat text-xl font-bold mt-0.5">{(Number(t.fg_pct ?? 0) * 100).toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted/60">3P%</p>
            <p className="font-stat text-xl font-bold mt-0.5">{(Number(t.fg3_pct ?? 0) * 100).toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted/60">FT%</p>
            <p className="font-stat text-xl font-bold mt-0.5">{(Number(t.ft_pct ?? 0) * 100).toFixed(1)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Advanced Stats */}
      <GlassCard>
        <h2 className="section-header mb-4 text-[10px]">Advanced Stats</h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "ORTG", val: t.ortg ? Number(t.ortg).toFixed(1) : "—", good: t.ortg && Number(t.ortg) > LEAGUE_AVG_ORTG },
            { label: "DRTG", val: t.drtg ? Number(t.drtg).toFixed(1) : "—", good: t.drtg && Number(t.drtg) < LEAGUE_AVG_ORTG },
            {
              label: "Net RTG", val: t.net_rating ? (Number(t.net_rating) > 0 ? "+" : "") + Number(t.net_rating).toFixed(1) : "—",
              good: t.net_rating && Number(t.net_rating) > 0, bad: t.net_rating && Number(t.net_rating) < 0,
            },
            { label: "Pace", val: t.pace ? Number(t.pace).toFixed(1) : "—" },
            { label: "SOS", val: t.sos ? Number(t.sos).toFixed(3) : "—" },
            {
              label: "Elo", val: t.elo_rating ? Math.round(Number(t.elo_rating)).toString() : "—",
              good: t.elo_rating && Number(t.elo_rating) >= 1550,
              bad: t.elo_rating && Number(t.elo_rating) < 1450,
            },
            {
              label: "Home", val: `${t.home_wins ?? 0}-${t.home_losses ?? 0}`,
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted/60">{s.label}</p>
              <p className={`font-stat text-lg font-bold mt-0.5 ${s.good ? "text-emerald-400" : s.bad ? "text-rose-400" : ""}`}>{s.val}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Roster */}
      <GlassCard hover={false} padding="sm">
        <h2 className="section-header mb-3 px-3 pt-2 text-[10px]">
          Roster ({roster.length} players)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] text-left text-[9px] uppercase tracking-widest text-text-muted/40">
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2 text-right">GP</th>
                <th className="px-3 py-2 text-right"><span className="text-indigo-400/70">BIS</span></th>
                <th className="px-3 py-2 text-right"><span className="text-emerald-400/70">LFI</span></th>
                <th className="px-3 py-2 text-right">PPG</th>
                <th className="px-3 py-2 text-right">RPG</th>
                <th className="px-3 py-2 text-right">APG</th>
                <th className="px-3 py-2 text-right">MPG</th>
                <th className="px-3 py-2 text-right">FG%</th>
              </tr>
            </thead>
            <tbody className="stagger-children">
              {roster.map((p: any) => {
                const bis = p.bis_score ? Number(p.bis_score) : null;
                const lfi = p.lfi_score ? Number(p.lfi_score) : null;
                return (
                  <tr key={p.id} className="border-b border-white/[0.03] table-row-hover group">
                    <td className="px-3 py-2">
                      <a href={`/players/${p.id}`} className="flex items-center gap-2.5 group-hover:text-indigo-400 transition-colors">
                        <div className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                          <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
                        </div>
                        <span className="text-[13px] font-semibold">{p.full_name}</span>
                      </a>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-text-muted">{p.position || "—"}</td>
                    <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{p.games_played ?? "—"}</td>
                    <td className={`px-3 py-2 text-right font-stat font-bold ${tierClass(bis)}`}>{bis?.toFixed(0) ?? "—"}</td>
                    <td className={`px-3 py-2 text-right font-stat text-[12px] ${tierClass(lfi)}`}>{lfi?.toFixed(0) ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-stat font-bold text-text-primary">{p.ppg ? Number(p.ppg).toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{p.rpg ? Number(p.rpg).toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{p.apg ? Number(p.apg).toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{p.mpg ? Number(p.mpg).toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-right font-stat text-[12px] text-text-secondary">{p.fg_pct ? (Number(p.fg_pct) * 100).toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
