/**
 * CourtVision — Pipeline Orchestrator
 *
 * Single entry point that coordinates all data pipeline scripts on a schedule.
 * Uses node-cron for scheduling:
 *   - During NBA game hours (6pm-1am ET): score updates every 15 min
 *   - Daily at 6:00 AM ET: full pipeline (schedule + ingest + metrics + projections)
 *
 * Usage:
 *   npx tsx scripts/orchestrate.ts
 *
 * For production:
 *   pm2 start "npx tsx scripts/orchestrate.ts" --name courtvision-pipeline
 */

import { config } from "dotenv";
import { resolve } from "path";
import { execSync, exec } from "child_process";
import { writeFileSync, existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "..", "web", ".env.local") });

// Status file for the API endpoint
const STATUS_FILE = resolve(__dirname, "..", "web", ".pipeline-status.json");

interface PipelineStatus {
  lastScoreUpdate: string | null;
  lastFullPipeline: string | null;
  lastError: string | null;
  isRunning: boolean;
  pipelineType: string | null;
  gamesUpdated: number;
  accuracy: string | null;
}

function writeStatus(partial: Partial<PipelineStatus>) {
  let current: PipelineStatus = {
    lastScoreUpdate: null,
    lastFullPipeline: null,
    lastError: null,
    isRunning: false,
    pipelineType: null,
    gamesUpdated: 0,
    accuracy: null,
  };

  if (existsSync(STATUS_FILE)) {
    try {
      current = JSON.parse(readFileSync(STATUS_FILE, "utf-8"));
    } catch {}
  }

  const updated = { ...current, ...partial };
  writeFileSync(STATUS_FILE, JSON.stringify(updated, null, 2));
}

function runScript(name: string): string {
  const scriptPath = resolve(__dirname, name);
  console.log(`\n  Running ${name}...`);
  const start = Date.now();

  try {
    const output = execSync(`npx tsx "${scriptPath}"`, {
      cwd: resolve(__dirname, "..", "web"),
      env: { ...process.env },
      timeout: 300_000, // 5 min timeout
      maxBuffer: 10 * 1024 * 1024,
    }).toString();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ✓ ${name} completed in ${elapsed}s`);
    return output;
  } catch (e: any) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`  ✗ ${name} failed after ${elapsed}s: ${e.message}`);
    throw e;
  }
}

async function scoreUpdate() {
  console.log(
    `\n${"─".repeat(50)}\n  SCORE UPDATE — ${new Date().toISOString()}\n${"─".repeat(50)}`
  );

  writeStatus({ isRunning: true, pipelineType: "score-update" });

  try {
    const output = runScript("update-scores.ts");

    // Extract games updated count from output
    const match = output.match(/Updated (\d+) games/);
    const gamesUpdated = match ? parseInt(match[1]) : 0;

    writeStatus({
      isRunning: false,
      lastScoreUpdate: new Date().toISOString(),
      gamesUpdated,
      lastError: null,
    });
  } catch (e: any) {
    writeStatus({
      isRunning: false,
      lastError: `Score update failed: ${e.message}`,
    });
  }
}

async function fullPipeline() {
  console.log(
    `\n${"═".repeat(50)}\n  FULL PIPELINE — ${new Date().toISOString()}\n${"═".repeat(50)}`
  );

  writeStatus({ isRunning: true, pipelineType: "full-pipeline" });

  try {
    // Step 1: Fetch schedule for upcoming games
    runScript("fetch-schedule.ts");

    // Step 2: Full data ingest (players, teams, games, game logs)
    runScript("ingest.ts");

    // Step 3: Compute metrics (BIS, LFI, DRS, etc.)
    runScript("compute-metrics.ts");

    // Step 4: Compute projections
    const projOutput = runScript("compute-projections.ts");

    // Extract accuracy from output
    const accMatch = projOutput.match(/Accuracy.*?(\d+\.\d+)%/);
    const accuracy = accMatch ? accMatch[1] + "%" : null;

    writeStatus({
      isRunning: false,
      lastFullPipeline: new Date().toISOString(),
      accuracy,
      lastError: null,
    });

    console.log(`\n  ✅ Full pipeline complete!`);
    if (accuracy) console.log(`  📊 Projection accuracy: ${accuracy}`);
  } catch (e: any) {
    writeStatus({
      isRunning: false,
      lastError: `Full pipeline failed at step: ${e.message}`,
    });
  }
}

function isGameHours(): boolean {
  // NBA games typically 7pm-midnight ET
  // We check 6pm-1am ET for buffer
  const now = new Date();
  // Convert to Eastern Time (UTC-4 or UTC-5 depending on DST)
  const etOffset = isDST(now) ? -4 : -5;
  const etHour =
    (now.getUTCHours() + etOffset + 24) % 24;

  return etHour >= 18 || etHour < 1;
}

function isDST(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return date.getTimezoneOffset() < Math.max(jan, jul);
}

// ─── Main Loop ───

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  CourtVision Pipeline Orchestrator               ║");
  console.log("║  Score updates: every 15 min during game hours   ║");
  console.log("║  Full pipeline: daily at 6 AM ET                 ║");
  console.log("╚══════════════════════════════════════════════════╝");

  // Initial status
  writeStatus({
    isRunning: false,
    pipelineType: null,
    lastError: null,
  });

  // Check if node-cron is available
  let cron: any;
  try {
    cron = require("node-cron");
  } catch {
    console.log(
      "\n⚠ node-cron not found. Running in simple loop mode instead."
    );
    console.log("  Install with: npm install node-cron");
    console.log("  Falling back to setInterval-based scheduling.\n");

    // Fallback: simple interval-based scheduling
    await runOnce();
    return;
  }

  // Schedule: score updates every 15 min
  cron.schedule("*/15 * * * *", async () => {
    if (isGameHours()) {
      await scoreUpdate();
    }
  });

  // Schedule: full pipeline daily at 6 AM ET (11 AM UTC / 10 AM UTC in summer)
  cron.schedule("0 11 * * *", async () => {
    await fullPipeline();
  });

  // Run score update immediately on start
  console.log("\n  Running initial score update...");
  await scoreUpdate();

  console.log("\n  Scheduler active. Press Ctrl+C to stop.\n");
}

/**
 * Fallback mode: run once without cron
 * Useful for manual runs or when node-cron isn't installed
 */
async function runOnce() {
  const mode = process.argv[2] || "scores";

  if (mode === "full") {
    await fullPipeline();
  } else if (mode === "scores") {
    await scoreUpdate();
  } else {
    console.log("Usage: npx tsx scripts/orchestrate.ts [scores|full]");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
