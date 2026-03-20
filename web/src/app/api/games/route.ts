import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  // TODO: Replace with actual DB query
  // const games = await getGamesByDate(date);
  // const projections = await Promise.all(games.map(g => getGameProjection(g.id)));

  return NextResponse.json({
    data: [],
    meta: {
      date,
      total: 0,
      computedAt: new Date().toISOString(),
    },
  });
}
