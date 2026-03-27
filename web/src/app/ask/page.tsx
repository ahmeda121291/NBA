import { GlassCard } from "@/components/ui/glass-card";
import { getAllPlayersWithFullStats } from "@/lib/db/queries";
import { AskEngine } from "./ask-engine";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const players = await getAllPlayersWithFullStats();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Search</h1>
        <p className="text-sm text-text-muted mt-1">
          Find any stat, ranking, or comparison — powered by real data
        </p>
      </div>

      <AskEngine players={(players as any[]).map((p: any) => ({
        id: Number(p.id),
        name: String(p.full_name),
        team: String(p.team_abbr || ""),
        position: String(p.position || ""),
        ppg: Number(p.ppg || 0),
        rpg: Number(p.rpg || 0),
        apg: Number(p.apg || 0),
        spg: Number(p.spg || 0),
        bpg: Number(p.bpg || 0),
        topg: Number(p.topg || 0),
        mpg: Number(p.mpg || 0),
        fg_pct: Number(p.fg_pct || 0),
        fg3_pct: Number(p.fg3_pct || 0),
        ft_pct: Number(p.ft_pct || 0),
        gp: Number(p.games_played || 0),
        bis: p.bis_score ? Number(p.bis_score) : null,
        lfi: p.lfi_score ? Number(p.lfi_score) : null,
        drs: p.drs_score ? Number(p.drs_score) : null,
        sps: p.sps_score ? Number(p.sps_score) : null,
        goi: p.goi_score ? Number(p.goi_score) : null,
        rda: p.rda_score ? Number(p.rda_score) : null,
      }))} />
    </div>
  );
}
