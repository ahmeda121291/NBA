import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId)) {
    return NextResponse.json(
      { error: { code: "INVALID_ID", message: "Player ID must be a number" } },
      { status: 400 }
    );
  }

  // TODO: Replace with actual DB queries
  // const season = await getCurrentSeason();
  // const player = await getPlayerWithTeam(playerId, season.id);
  // const stats = await getPlayerSeasonStats(playerId, season.id);
  // const metrics = await getPlayerMetrics(playerId, season.id);
  // const injury = await getPlayerCurrentInjury(playerId);
  // const explanation = await getExplanation("player", playerId, "metric");

  return NextResponse.json({
    data: null,
    meta: { computedAt: new Date().toISOString() },
  });
}
