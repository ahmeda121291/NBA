import { NextRequest, NextResponse } from "next/server";
import { getPlayerWithMetrics } from "@/lib/db/queries";
import { checkUsage, recordUsage } from "@/lib/usage";
import { isPro } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Check usage limits for free users
  const usage = await checkUsage("compare");
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "Daily limit reached", remaining: 0, limit: usage.limit },
      { status: 429 }
    );
  }

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

  // Record usage for free users after successful comparison
  const pro = await isPro();
  if (!pro) {
    await recordUsage("compare");
  }

  return NextResponse.json({ player1, player2 });
}
