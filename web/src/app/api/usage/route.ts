import { NextRequest, NextResponse } from "next/server";
import { checkUsage, type FeatureKey } from "@/lib/usage";

export async function GET(request: NextRequest) {
  const feature = request.nextUrl.searchParams.get("feature") as FeatureKey | null;
  if (!feature || !["studio", "compare"].includes(feature)) {
    return NextResponse.json({ error: "Invalid feature" }, { status: 400 });
  }

  const usage = await checkUsage(feature);
  return NextResponse.json(usage);
}
