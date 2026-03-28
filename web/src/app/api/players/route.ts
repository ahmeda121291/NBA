import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const pos = request.nextUrl.searchParams.get("pos") ?? "";

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (p.id)
      p.id,
      p.full_name,
      p.position,
      p.external_id,
      t.abbreviation AS team_abbr,
      ROUND(pms.bis_score::numeric, 1) AS bis_score,
      ROUND(pms.lfi_score::numeric, 1) AS lfi_score
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    JOIN teams t ON pss.team_id = t.id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = p.id
    WHERE pss.gp >= 5
      AND (${q} = '' OR LOWER(p.full_name) LIKE ${'%' + q.toLowerCase() + '%'})
      AND (${pos} = '' OR p.position ILIKE ${'%' + pos + '%'})
    ORDER BY p.id, pms.bis_score DESC NULLS LAST
  `);

  const sorted = [...(rows as any[])].sort((a, b) => {
    const ba = a.bis_score != null ? Number(a.bis_score) : -1;
    const bb = b.bis_score != null ? Number(b.bis_score) : -1;
    return bb - ba;
  });

  return NextResponse.json({ players: sorted });
}
