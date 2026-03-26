import { GlassCard } from "@/components/ui/glass-card";
import { getAllPlayersWithFullStats, getAllTeamsWithMetrics } from "@/lib/db/queries";
import { StudioBuilder } from "./studio-builder";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const [players, teams] = await Promise.all([
    getAllPlayersWithFullStats(),
    getAllTeamsWithMetrics(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">CourtVision Studio</h1>
        <p className="text-sm text-text-muted mt-1">
          Create shareable charts, comparison cards, and data visuals — download as PNG for Twitter/Instagram
        </p>
      </div>

      <StudioBuilder
        players={(players as any[]).map((p: any) => ({
          id: Number(p.id),
          name: String(p.full_name),
          team: String(p.team_abbr),
          conference: String(p.team_conference || ""),
          position: String(p.position || ""),
          gp: Number(p.games_played || 0),
          draftYear: Number(p.draft_year || 0),
          ppg: Number(p.ppg || 0),
          rpg: Number(p.rpg || 0),
          apg: Number(p.apg || 0),
          spg: Number(p.spg || 0),
          bpg: Number(p.bpg || 0),
          mpg: Number(p.mpg || 0),
          topg: Number(p.topg || 0),
          fg_pct: Number(p.fg_pct || 0),
          fg3_pct: Number(p.fg3_pct || 0),
          ft_pct: Number(p.ft_pct || 0),
          ts_pct: Number(p.ts_pct || 0),
          usg_pct: Number(p.usg_pct || 0),
          per: Number(p.per || 0),
          bis: p.bis_score ? Number(p.bis_score) : null,
          lfi: p.lfi_score ? Number(p.lfi_score) : null,
          drs: p.drs_score ? Number(p.drs_score) : null,
          sps: p.sps_score ? Number(p.sps_score) : null,
          goi: p.goi_score ? Number(p.goi_score) : null,
          rda: p.rda_score ? Number(p.rda_score) : null,
        }))}
        teams={(teams as any[]).map((t: any) => ({
          id: Number(t.id),
          name: String(t.name),
          abbr: String(t.abbreviation),
          wins: Number(t.wins || 0),
          losses: Number(t.losses || 0),
          fg_pct: Number(t.fg_pct || 0),
          fg3_pct: Number(t.fg3_pct || 0),
          ortg: Number(t.ortg || 0),
          drtg: Number(t.drtg || 0),
          net_rating: Number(t.net_rating || 0),
          pace: Number(t.pace || 0),
          tsc: t.tsc_score ? Number(t.tsc_score) : null,
          ltfi: t.ltfi_score ? Number(t.ltfi_score) : null,
          elo: t.elo_rating ? Number(t.elo_rating) : null,
        }))}
      />
    </div>
  );
}
