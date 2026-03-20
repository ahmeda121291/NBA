import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "50", 10);
  const position = searchParams.get("position");
  const search = searchParams.get("q");

  // TODO: Replace with actual DB query
  // const players = search
  //   ? await searchPlayers(search, perPage)
  //   : await getAllPlayers(perPage, (page - 1) * perPage);

  return NextResponse.json({
    data: [],
    meta: { page, perPage, total: 0, computedAt: new Date().toISOString() },
  });
}
