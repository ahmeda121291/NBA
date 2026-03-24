import { NextRequest, NextResponse } from "next/server";
import { searchPlayers, searchTeams, getAllPlayersWithFullStats } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [], meta: { total: 0 } });
  }

  // Special query to return all players (for compare page filtering)
  if (q === "__all__") {
    const allPlayers = (await getAllPlayersWithFullStats(500)) as any[];
    const data = allPlayers.map((p: any) => ({
      type: "player" as const,
      id: p.id,
      label: p.full_name,
      sublabel: `${p.position ?? ""}${p.position && p.team_abbr ? " · " : ""}${p.team_abbr ?? ""}`,
      score: p.bis_score ? Number(Number(p.bis_score).toFixed(0)) : null,
      href: `/players/${p.id}`,
    }));
    return NextResponse.json({ data, meta: { query: q, total: data.length } });
  }

  const [players, teams] = await Promise.all([
    searchPlayers(q, 6),
    searchTeams(q, 4),
  ]);

  const data = [
    ...players.map((p: any) => ({
      type: "player" as const,
      id: p.id,
      label: p.full_name,
      sublabel: `${p.position ?? ""}${p.position && p.team_abbr ? " · " : ""}${p.team_abbr ?? ""}`,
      score: p.bis_score ? Number(Number(p.bis_score).toFixed(0)) : null,
      href: `/players/${p.id}`,
    })),
    ...teams.map((t: any) => ({
      type: "team" as const,
      id: t.id,
      label: `${t.city} ${t.nickname}`,
      sublabel: `${t.abbreviation}${t.wins != null ? ` · ${t.wins}-${t.losses}` : ""}`,
      score: t.tsc_score ? Number(Number(t.tsc_score).toFixed(0)) : null,
      href: `/teams/${t.id}`,
    })),
  ];

  return NextResponse.json({
    data,
    meta: { query: q, total: data.length },
  });
}
