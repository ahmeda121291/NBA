import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({
      data: [],
      meta: { total: 0 },
    });
  }

  // TODO: Replace with actual DB queries
  // const players = await searchPlayers(q, 5);
  // const teams = await searchTeams(q, 3);
  // Combine and format as SearchResult[]

  return NextResponse.json({
    data: [],
    meta: { query: q, total: 0 },
  });
}
