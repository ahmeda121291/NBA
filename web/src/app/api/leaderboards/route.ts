import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const metric = searchParams.get("metric") || "bis";
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  const position = searchParams.get("position");

  const validMetrics = ["bis", "rda", "goi", "drs", "sps", "lfi"];
  if (!validMetrics.includes(metric)) {
    return NextResponse.json(
      { error: { code: "INVALID_METRIC", message: `Valid metrics: ${validMetrics.join(", ")}` } },
      { status: 400 }
    );
  }

  // TODO: Replace with actual DB query
  // const season = await getCurrentSeason();
  // const results = await getLeaderboard(metric, season.id, limit, position);

  return NextResponse.json({
    data: [],
    meta: { metric, limit, computedAt: new Date().toISOString() },
  });
}
