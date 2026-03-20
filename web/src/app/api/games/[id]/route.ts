import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameId = parseInt(id, 10);

  if (isNaN(gameId)) {
    return NextResponse.json(
      { error: { code: "INVALID_ID", message: "Game ID must be a number" } },
      { status: 400 }
    );
  }

  // TODO: Replace with actual DB queries
  // const game = await getGameWithTeams(gameId);
  // const projection = await getGameProjection(gameId);
  // const playerProjections = await getPlayerProjectionsForGame(gameId);
  // const injuries = await getInjuriesForGame(game.homeTeamId, game.awayTeamId);

  return NextResponse.json({
    data: null,
    meta: { computedAt: new Date().toISOString() },
  });
}
