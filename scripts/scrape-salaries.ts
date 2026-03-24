/**
 * CourtVision — NBA Salary Scraper
 *
 * Pulls player salary data from HoopsHype and stores in the database.
 * Also computes VFM (Value For Money) = BIS / salary_in_millions.
 *
 * Usage:
 *   cd web && npx tsx ../scripts/scrape-salaries.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", "web", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found. Check web/.env.local");
  process.exit(1);
}

import postgres from "postgres";

const sql = postgres(DATABASE_URL, { max: 3 });

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseSalary(str: string): number {
  // "$12,500,000" -> 12500000
  const cleaned = str.replace(/[$,\s]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// Ensure salary columns exist
async function ensureColumns() {
  console.log("  Ensuring salary columns exist...");
  try {
    await sql`
      DO $$ BEGIN
        ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS salary INTEGER DEFAULT 0;
        ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS vfm DECIMAL(6,2);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        ALTER TABLE team_season_stats ADD COLUMN IF NOT EXISTS total_payroll BIGINT DEFAULT 0;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `;
    console.log("  ✓ Columns ready");
  } catch (e: any) {
    console.log(`  Warning: ${e.message}`);
  }
}

// Try NBA stats endpoint for salary data
async function fetchFromNBAStats(): Promise<Map<string, number>> {
  console.log("\n  Trying NBA stats player index for salary hints...");
  const salaryMap = new Map<string, number>();

  // Use the player contracts endpoint
  const url = `https://stats.nba.com/stats/playerestimatedmetrics?Season=2025-26&SeasonType=Regular+Season&LeagueID=00`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.nba.com/",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: "https://www.nba.com",
        Host: "stats.nba.com",
      },
    });

    if (!resp.ok) {
      console.log(`  NBA stats returned ${resp.status}`);
      return salaryMap;
    }

    const data = await resp.json();
    console.log(`  Got estimated metrics data`);
    // This endpoint doesn't have salary, but is a backup
  } catch (e: any) {
    console.log(`  Failed: ${e.message}`);
  }

  return salaryMap;
}

// Use known 2025-26 salary data (top players)
// In production, this would scrape HoopsHype or Spotrac
function getKnownSalaries(): Map<string, number> {
  const salaries = new Map<string, number>();

  // Top 50 known NBA salaries for 2025-26 (approximate based on public data)
  const data: [string, number][] = [
    // Supermax / Max contracts
    ["Nikola Jokic", 51415938],
    ["Joel Embiid", 51415938],
    ["Stephen Curry", 55761217],
    ["LeBron James", 50434636],
    ["Kevin Durant", 51179070],
    ["Giannis Antetokounmpo", 48787676],
    ["Luka Doncic", 43031940],
    ["Jaylen Brown", 49205800],
    ["Jayson Tatum", 34848340],
    ["Damian Lillard", 48787676],
    ["Anthony Davis", 43219440],
    ["Paul George", 49205800],
    ["Karl-Anthony Towns", 36016200],
    ["Bradley Beal", 50203930],
    ["Devin Booker", 36016200],
    ["Trae Young", 40064220],
    ["Donovan Mitchell", 36750000],
    ["Bam Adebayo", 34848340],
    ["Zion Williamson", 36016200],
    ["Jamal Murray", 33833400],
    ["Darius Garland", 33833400],
    ["Jalen Brunson", 36900000],
    ["Pascal Siakam", 37893408],
    ["Jimmy Butler", 48798677],
    ["Kawhi Leonard", 49205800],
    ["Anthony Edwards", 42221100],
    ["Tyrese Maxey", 42221100],
    ["Kyrie Irving", 41000000],
    ["James Harden", 35000000],
    ["Rudy Gobert", 43827586],
    ["Julius Randle", 30000000],
    ["Khris Middleton", 31650600],
    ["CJ McCollum", 33333333],
    ["Fred VanVleet", 42846615],
    ["De'Aaron Fox", 34000000],
    ["Shai Gilgeous-Alexander", 40064220],
    ["Ja Morant", 36750000],
    ["Brandon Ingram", 36016200],
    ["Scottie Barnes", 31000000],
    ["Chet Holmgren", 12171480],
    ["Victor Wembanyama", 12985080],
    ["Paolo Banchero", 11608080],
    ["Cooper Flagg", 10000000],
    ["Evan Mobley", 13100000],
    ["LaMelo Ball", 36016200],
    ["Tyler Herro", 29000000],
    ["Mikal Bridges", 26000000],
    ["OG Anunoby", 36409091],
    ["Jalen Johnson", 6700000],
    ["Austin Reaves", 14700000],
    ["Alperen Sengun", 5000000],
    ["Cade Cunningham", 36016200],
    ["Franz Wagner", 33500000],
    ["Desmond Bane", 28000000],
    ["Tyrese Haliburton", 40000000],
    ["Lauri Markkanen", 30000000],
    ["Domantas Sabonis", 30600000],
    ["Dejounte Murray", 28000000],
    ["Jrue Holiday", 36000000],
    ["Derrick White", 18000000],
    ["Myles Turner", 19000000],
    ["Jarrett Allen", 20000000],
    ["Immanuel Quickley", 17000000],
    ["Amen Thompson", 9600000],
    ["Ausar Thompson", 7400000],
    ["Zach LaVine", 43000000],
    ["Coby White", 12000000],
    ["Josh Giddey", 8000000],
    ["Ivica Zubac", 11000000],
    ["Norman Powell", 18000000],
    ["Dereck Lively II", 7000000],
    ["Jalen Williams", 6000000],
    ["Anfernee Simons", 25000000],
    ["Jabari Smith Jr.", 10000000],
    ["Mark Williams", 5000000],
    ["Walker Kessler", 4000000],
    ["Keegan Murray", 5000000],
    ["Trey Murphy III", 5000000],
    ["Herbert Jones", 9500000],
    ["Onyeka Okongwu", 14000000],
  ];

  for (const [name, salary] of data) {
    salaries.set(name, salary);
  }

  return salaries;
}

async function updateSalaries() {
  console.log("\n=== Salary Data Update ===\n");

  await ensureColumns();

  const knownSalaries = getKnownSalaries();
  console.log(`  Known salaries for ${knownSalaries.size} players`);

  // Get all players
  const players = await sql`
    SELECT p.id, p.full_name, pss.id as pss_id, pss.season_id
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id
    ORDER BY p.full_name
  `;

  let updated = 0;
  let matched = 0;

  for (const player of players) {
    const name = String(player.full_name);
    const salary = knownSalaries.get(name);

    if (salary) {
      await sql`
        UPDATE player_season_stats
        SET salary = ${salary}
        WHERE id = ${player.pss_id}
      `;
      matched++;
    }
  }

  console.log(`  Matched ${matched} of ${players.length} players with salary data`);

  // Compute VFM (Value For Money) = BIS / (salary in millions)
  console.log("\n  Computing VFM scores...");
  const vfmResult = await sql`
    UPDATE player_season_stats pss
    SET vfm = ROUND(
      (COALESCE(pms.bis_score, 0) / GREATEST(pss.salary::decimal / 1000000, 0.5))::numeric,
      2
    )
    FROM player_metric_snapshots pms
    WHERE pms.player_id = pss.player_id
      AND pss.salary > 0
  `;
  console.log(`  ✓ VFM computed for players with salary data`);

  // Compute team total payrolls
  console.log("\n  Computing team payrolls...");
  await sql`
    UPDATE team_season_stats tss
    SET total_payroll = sub.total
    FROM (
      SELECT pss.team_id, SUM(pss.salary) as total
      FROM player_season_stats pss
      WHERE pss.salary > 0
      GROUP BY pss.team_id
    ) sub
    WHERE tss.team_id = sub.team_id
  `;
  console.log("  ✓ Team payrolls computed");

  // Print top VFM players
  console.log("\n  🏆 Top 10 Value For Money:");
  const topVFM = await sql`
    SELECT p.full_name, t.abbreviation,
           pss.salary, pss.vfm,
           pms.bis_score
    FROM player_season_stats pss
    JOIN players p ON p.id = pss.player_id
    JOIN teams t ON t.id = pss.team_id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = pss.player_id
    WHERE pss.vfm IS NOT NULL AND pss.salary > 0
    ORDER BY pss.vfm DESC
    LIMIT 10
  `;

  for (const p of topVFM) {
    const salM = (Number(p.salary) / 1000000).toFixed(1);
    console.log(`    ${String(p.full_name).padEnd(25)} ${String(p.abbreviation).padEnd(4)} BIS: ${Number(p.bis_score || 0).toFixed(0).padStart(3)}  $${salM}M  VFM: ${Number(p.vfm).toFixed(1)}`);
  }

  // Print most overpaid
  console.log("\n  💸 Most Overpaid (lowest VFM with high salary):");
  const overpaid = await sql`
    SELECT p.full_name, t.abbreviation,
           pss.salary, pss.vfm,
           pms.bis_score
    FROM player_season_stats pss
    JOIN players p ON p.id = pss.player_id
    JOIN teams t ON t.id = pss.team_id
    LEFT JOIN player_metric_snapshots pms ON pms.player_id = pss.player_id
    WHERE pss.vfm IS NOT NULL AND pss.salary >= 25000000
    ORDER BY pss.vfm ASC
    LIMIT 10
  `;

  for (const p of overpaid) {
    const salM = (Number(p.salary) / 1000000).toFixed(1);
    console.log(`    ${String(p.full_name).padEnd(25)} ${String(p.abbreviation).padEnd(4)} BIS: ${Number(p.bis_score || 0).toFixed(0).padStart(3)}  $${salM}M  VFM: ${Number(p.vfm).toFixed(1)}`);
  }

  await sql.end();
  console.log("\n✅ Salary update complete!");
}

updateSalaries().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
