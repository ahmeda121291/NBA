import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const statusFile = resolve(process.cwd(), ".pipeline-status.json");

  if (!existsSync(statusFile)) {
    return NextResponse.json({
      lastScoreUpdate: null,
      lastFullPipeline: null,
      lastError: null,
      isRunning: false,
      pipelineType: null,
      gamesUpdated: 0,
      accuracy: null,
    });
  }

  try {
    const data = JSON.parse(readFileSync(statusFile, "utf-8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to read pipeline status" },
      { status: 500 }
    );
  }
}
