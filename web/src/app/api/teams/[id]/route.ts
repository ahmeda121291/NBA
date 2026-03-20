import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    return NextResponse.json(
      { error: { code: "INVALID_ID", message: "Team ID must be a number" } },
      { status: 400 }
    );
  }

  // TODO: Replace with actual DB queries
  // const team = await getTeamById(teamId);
  // const season = await getCurrentSeason();
  // const seasonStats = await getTeamSeasonStats(teamId, season.id);
  // const metrics = await getTeamMetrics(teamId, season.id);
  // const roster = await getTeamRoster(teamId, season.id);

  return NextResponse.json({
    data: null,
    meta: { computedAt: new Date().toISOString() },
  });
}
