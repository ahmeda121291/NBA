import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { isPro } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pro = await isPro();
  if (!pro) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId)) {
    return NextResponse.json({ logs: [] });
  }

  const rows = await db.execute(sql`
    SELECT pgl.pts, pgl.game_date
    FROM player_game_logs pgl
    JOIN seasons s ON pgl.season_id = s.id
    WHERE pgl.player_id = ${playerId}
      AND s.is_current = true
    ORDER BY pgl.game_date DESC
    LIMIT 12
  `);

  return NextResponse.json({ logs: rows });
}
