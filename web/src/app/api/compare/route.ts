import { NextRequest, NextResponse } from "next/server";
import { getPlayerWithMetrics } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const p1Id = request.nextUrl.searchParams.get("p1");
  const p2Id = request.nextUrl.searchParams.get("p2");

  if (!p1Id || !p2Id) {
    return NextResponse.json({ error: "Both p1 and p2 are required" }, { status: 400 });
  }

  const [player1, player2] = await Promise.all([
    getPlayerWithMetrics(Number(p1Id)),
    getPlayerWithMetrics(Number(p2Id)),
  ]);

  if (!player1 || !player2) {
    return NextResponse.json({ error: "One or both players not found" }, { status: 404 });
  }

  return NextResponse.json({ player1, player2 });
}
