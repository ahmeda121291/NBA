import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Replace with actual DB query
  // const teams = await getAllTeams();
  // Enrich with latest metrics snapshot for each team

  return NextResponse.json({
    data: [],
    meta: { total: 0, computedAt: new Date().toISOString() },
  });
}
