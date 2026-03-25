/**
 * CourtVision NBA Data Ingestion Pipeline (TypeScript / Node.js)
 *
 * Pulls real NBA data from stats.nba.com and loads into Supabase PostgreSQL.
 *
 * Usage:
 *   cd web && npx tsx ../scripts/ingest.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load env
config({ path: resolve(__dirname, "..", "web", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found. Check web/.env.local");
  process.exit(1);
}

import postgres from "postgres";

const sql = postgres(DATABASE_URL, { max: 5 });

const SEASON = "2025-26";
const SEASON_YEAR = 2026;
const DELAY_MS = 800;

const NBA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://www.nba.com/",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nba.com",
  Host: "stats.nba.com",
};

async function nbaFetch(url: string): Promise<any> {
  const resp = await fetch(url, { headers: NBA_HEADERS });
  if (!resp.ok) throw new Error(`NBA API ${resp.status}: ${url}`);
  return resp.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function step(msg: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${msg}`);
  console.log(`${"=".repeat(60)}`);
}

// ============================================================
// Static NBA team data
// ============================================================
const NBA_TEAMS = [
  { id: 1610612737, abbr: "ATL", city: "Atlanta", nickname: "Hawks", conf: "East", div: "Southeast", color1: "#E03A3E", color2: "#C1D32F", arena: "State Farm Arena" },
  { id: 1610612738, abbr: "BOS", city: "Boston", nickname: "Celtics", conf: "East", div: "Atlantic", color1: "#007A33", color2: "#BA9653", arena: "TD Garden" },
  { id: 1610612751, abbr: "BKN", city: "Brooklyn", nickname: "Nets", conf: "East", div: "Atlantic", color1: "#000000", color2: "#FFFFFF", arena: "Barclays Center" },
  { id: 1610612766, abbr: "CHA", city: "Charlotte", nickname: "Hornets", conf: "East", div: "Southeast", color1: "#1D1160", color2: "#00788C", arena: "Spectrum Center" },
  { id: 1610612741, abbr: "CHI", city: "Chicago", nickname: "Bulls", conf: "East", div: "Central", color1: "#CE1141", color2: "#000000", arena: "United Center" },
  { id: 1610612739, abbr: "CLE", city: "Cleveland", nickname: "Cavaliers", conf: "East", div: "Central", color1: "#860038", color2: "#041E42", arena: "Rocket Mortgage FieldHouse" },
  { id: 1610612742, abbr: "DAL", city: "Dallas", nickname: "Mavericks", conf: "West", div: "Southwest", color1: "#00538C", color2: "#002B5E", arena: "American Airlines Center" },
  { id: 1610612743, abbr: "DEN", city: "Denver", nickname: "Nuggets", conf: "West", div: "Northwest", color1: "#0E2240", color2: "#FEC524", arena: "Ball Arena" },
  { id: 1610612765, abbr: "DET", city: "Detroit", nickname: "Pistons", conf: "East", div: "Central", color1: "#C8102E", color2: "#1D42BA", arena: "Little Caesars Arena" },
  { id: 1610612744, abbr: "GSW", city: "Golden State", nickname: "Warriors", conf: "West", div: "Pacific", color1: "#1D428A", color2: "#FFC72C", arena: "Chase Center" },
  { id: 1610612745, abbr: "HOU", city: "Houston", nickname: "Rockets", conf: "West", div: "Southwest", color1: "#CE1141", color2: "#000000", arena: "Toyota Center" },
  { id: 1610612754, abbr: "IND", city: "Indiana", nickname: "Pacers", conf: "East", div: "Central", color1: "#002D62", color2: "#FDBB30", arena: "Gainbridge Fieldhouse" },
  { id: 1610612746, abbr: "LAC", city: "Los Angeles", nickname: "Clippers", conf: "West", div: "Pacific", color1: "#C8102E", color2: "#1D428A", arena: "Intuit Dome" },
  { id: 1610612747, abbr: "LAL", city: "Los Angeles", nickname: "Lakers", conf: "West", div: "Pacific", color1: "#552583", color2: "#FDB927", arena: "Crypto.com Arena" },
  { id: 1610612763, abbr: "MEM", city: "Memphis", nickname: "Grizzlies", conf: "West", div: "Southwest", color1: "#5D76A9", color2: "#12173F", arena: "FedExForum" },
  { id: 1610612748, abbr: "MIA", city: "Miami", nickname: "Heat", conf: "East", div: "Southeast", color1: "#98002E", color2: "#F9A01B", arena: "Kaseya Center" },
  { id: 1610612749, abbr: "MIL", city: "Milwaukee", nickname: "Bucks", conf: "East", div: "Central", color1: "#00471B", color2: "#EEE1C6", arena: "Fiserv Forum" },
  { id: 1610612750, abbr: "MIN", city: "Minnesota", nickname: "Timberwolves", conf: "West", div: "Northwest", color1: "#0C2340", color2: "#236192", arena: "Target Center" },
  { id: 1610612740, abbr: "NOP", city: "New Orleans", nickname: "Pelicans", conf: "West", div: "Southwest", color1: "#0C2340", color2: "#C8102E", arena: "Smoothie King Center" },
  { id: 1610612752, abbr: "NYK", city: "New York", nickname: "Knicks", conf: "East", div: "Atlantic", color1: "#006BB6", color2: "#F58426", arena: "Madison Square Garden" },
  { id: 1610612760, abbr: "OKC", city: "Oklahoma City", nickname: "Thunder", conf: "West", div: "Northwest", color1: "#007AC1", color2: "#EF6C00", arena: "Paycom Center" },
  { id: 1610612753, abbr: "ORL", city: "Orlando", nickname: "Magic", conf: "East", div: "Southeast", color1: "#0077C0", color2: "#C4CED4", arena: "Amway Center" },
  { id: 1610612755, abbr: "PHI", city: "Philadelphia", nickname: "76ers", conf: "East", div: "Atlantic", color1: "#006BB6", color2: "#ED174C", arena: "Wells Fargo Center" },
  { id: 1610612756, abbr: "PHX", city: "Phoenix", nickname: "Suns", conf: "West", div: "Pacific", color1: "#1D1160", color2: "#E56020", arena: "Footprint Center" },
  { id: 1610612757, abbr: "POR", city: "Portland", nickname: "Trail Blazers", conf: "West", div: "Northwest", color1: "#E03A3E", color2: "#000000", arena: "Moda Center" },
  { id: 1610612758, abbr: "SAC", city: "Sacramento", nickname: "Kings", conf: "West", div: "Pacific", color1: "#5A2D81", color2: "#63727A", arena: "Golden 1 Center" },
  { id: 1610612759, abbr: "SAS", city: "San Antonio", nickname: "Spurs", conf: "West", div: "Southwest", color1: "#C4CED4", color2: "#000000", arena: "Frost Bank Center" },
  { id: 1610612761, abbr: "TOR", city: "Toronto", nickname: "Raptors", conf: "East", div: "Atlantic", color1: "#CE1141", color2: "#000000", arena: "Scotiabank Arena" },
  { id: 1610612762, abbr: "UTA", city: "Utah", nickname: "Jazz", conf: "West", div: "Northwest", color1: "#002B5C", color2: "#00471B", arena: "Delta Center" },
  { id: 1610612764, abbr: "WAS", city: "Washington", nickname: "Wizards", conf: "East", div: "Southeast", color1: "#002B5C", color2: "#E31837", arena: "Capital One Arena" },
];

// ============================================================
// 1. Seed season
// ============================================================
async function ingestSeason(): Promise<number> {
  step("1/9  Seeding current season");
  const [row] = await sql`
    INSERT INTO seasons (year, label, start_date, end_date, is_current)
    VALUES (${SEASON_YEAR}, ${SEASON}, '2025-10-21', '2026-06-21', true)
    ON CONFLICT (year) DO UPDATE SET is_current = true
    RETURNING id
  `;
  console.log(`  Season ID: ${row.id}`);
  return row.id;
}

// ============================================================
// 2. Ingest teams
// ============================================================
async function ingestTeams(): Promise<void> {
  step("2/9  Ingesting 30 NBA teams");
  for (const t of NBA_TEAMS) {
    const name = `${t.city} ${t.nickname}`;
    const logoUrl = `https://cdn.nba.com/logos/nba/${t.id}/primary/L/logo.svg`;
    await sql`
      INSERT INTO teams (external_id, abbreviation, name, city, nickname, conference, division,
        logo_url, primary_color, secondary_color, arena)
      VALUES (${String(t.id)}, ${t.abbr}, ${name}, ${t.city}, ${t.nickname}, ${t.conf}, ${t.div},
        ${logoUrl}, ${t.color1}, ${t.color2}, ${t.arena})
      ON CONFLICT (abbreviation) DO UPDATE SET
        external_id = EXCLUDED.external_id, name = EXCLUDED.name,
        logo_url = EXCLUDED.logo_url, primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color, arena = EXCLUDED.arena, updated_at = NOW()
    `;
  }
  console.log(`  Inserted/updated ${NBA_TEAMS.length} teams`);
}

// ============================================================
// 3. Ingest players + season stats
// ============================================================
async function ingestPlayersAndStats(seasonId: number): Promise<void> {
  step("3/9  Ingesting players and season stats");
  await sleep(DELAY_MS);

  const url = `https://stats.nba.com/stats/leaguedashplayerstats?Season=${SEASON}&SeasonType=Regular+Season&PerMode=PerGame&MeasureType=Base&LastNGames=0&Month=0&OpponentTeamID=0&PORound=0&PaceAdjust=N&Period=0&PlusMinus=N&Rank=N&LeagueID=00`;

  let rows: any[];
  try {
    const data = await nbaFetch(url);
    const headers: string[] = data.resultSets[0].headers;
    const rowData: any[][] = data.resultSets[0].rowSet;
    rows = rowData.map((r) => {
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = r[i]));
      return obj;
    });
    console.log(`  Got ${rows.length} players from NBA stats API`);
  } catch (e: any) {
    console.log(`  Warning: NBA stats API failed (${e.message})`);
    console.log("  Falling back to basic team rosters...");
    await ingestPlayersFromRosters(seasonId);
    return;
  }

  // Get team abbr -> db id
  const teamRows = await sql`SELECT abbreviation, id FROM teams`;
  const teamMap = new Map(teamRows.map((r) => [r.abbreviation, r.id]));

  let count = 0;
  for (const row of rows) {
    const extId = String(row.PLAYER_ID);
    const fullName = row.PLAYER_NAME;
    const [first, ...rest] = fullName.split(" ");
    const last = rest.join(" ");
    const teamAbbr = row.TEAM_ABBREVIATION;

    // Insert player
    const [playerRow] = await sql`
      INSERT INTO players (external_id, first_name, last_name, full_name, headshot_url, is_active)
      VALUES (${extId}, ${first}, ${last}, ${fullName},
        ${"https://cdn.nba.com/headshots/nba/latest/1040x760/" + extId + ".png"}, true)
      ON CONFLICT (external_id) DO UPDATE SET
        full_name = EXCLUDED.full_name, headshot_url = EXCLUDED.headshot_url,
        is_active = true, updated_at = NOW()
      RETURNING id
    `;
    const playerId = playerRow.id;

    // Roster entry
    const teamId = teamMap.get(teamAbbr);
    if (teamId) {
      await sql`
        INSERT INTO rosters (team_id, player_id, season_id, position, start_date)
        VALUES (${teamId}, ${playerId}, ${seasonId}, ${row.PLAYER_POSITION || ""}, '2025-10-21')
        ON CONFLICT DO NOTHING
      `;

      // Season stats
      await sql`
        INSERT INTO player_season_stats (
          player_id, season_id, team_id, games_played, games_started,
          mpg, ppg, rpg, apg, spg, bpg, topg, fpg,
          fg_pct, fg3_pct, ft_pct
        ) VALUES (
          ${playerId}, ${seasonId}, ${teamId},
          ${row.GP || 0}, ${row.GS || 0},
          ${row.MIN || 0}, ${row.PTS || 0}, ${row.REB || 0}, ${row.AST || 0},
          ${row.STL || 0}, ${row.BLK || 0}, ${row.TOV || 0}, ${row.PF || 0},
          ${row.FG_PCT || 0}, ${row.FG3_PCT || 0}, ${row.FT_PCT || 0}
        )
        ON CONFLICT (player_id, season_id, team_id) DO UPDATE SET
          games_played = EXCLUDED.games_played, ppg = EXCLUDED.ppg,
          rpg = EXCLUDED.rpg, apg = EXCLUDED.apg, spg = EXCLUDED.spg,
          bpg = EXCLUDED.bpg, topg = EXCLUDED.topg, fg_pct = EXCLUDED.fg_pct,
          fg3_pct = EXCLUDED.fg3_pct, ft_pct = EXCLUDED.ft_pct, mpg = EXCLUDED.mpg
      `;
    }

    count++;
    if (count % 100 === 0) console.log(`    ...${count} players processed`);
  }
  console.log(`  Inserted/updated ${count} players with season stats`);
}

async function ingestPlayersFromRosters(seasonId: number): Promise<void> {
  // Fallback: fetch roster for each team
  const teamRows = await sql`SELECT id, external_id, abbreviation FROM teams`;
  let total = 0;
  for (const team of teamRows) {
    await sleep(DELAY_MS);
    try {
      const url = `https://stats.nba.com/stats/commonteamroster?TeamID=${team.external_id}&Season=${SEASON}`;
      const data = await nbaFetch(url);
      const headers: string[] = data.resultSets[0].headers;
      const rowData: any[][] = data.resultSets[0].rowSet;

      for (const r of rowData) {
        const obj: any = {};
        headers.forEach((h, i) => (obj[h] = r[i]));

        const extId = String(obj.PLAYER_ID);
        const [playerRow] = await sql`
          INSERT INTO players (external_id, first_name, last_name, full_name, headshot_url, is_active)
          VALUES (${extId}, ${obj.PLAYER || ""}, ${""}, ${obj.PLAYER || ""},
            ${"https://cdn.nba.com/headshots/nba/latest/1040x760/" + extId + ".png"}, true)
          ON CONFLICT (external_id) DO UPDATE SET is_active = true, updated_at = NOW()
          RETURNING id
        `;

        await sql`
          INSERT INTO rosters (team_id, player_id, season_id, position, jersey_number, start_date)
          VALUES (${team.id}, ${playerRow.id}, ${seasonId}, ${obj.POSITION || ""}, ${obj.NUM || ""}, '2025-10-21')
          ON CONFLICT DO NOTHING
        `;
        total++;
      }
      console.log(`    ${team.abbreviation}: ${rowData.length} players`);
    } catch (e: any) {
      console.log(`    ${team.abbreviation}: failed (${e.message})`);
    }
  }
  console.log(`  Total: ${total} players from rosters`);
}

// ============================================================
// 4. Ingest team season stats
// ============================================================
async function ingestTeamStats(seasonId: number): Promise<void> {
  step("4/9  Ingesting team season stats");
  await sleep(DELAY_MS);

  const url = `https://stats.nba.com/stats/leaguedashteamstats?Season=${SEASON}&SeasonType=Regular+Season&PerMode=PerGame&MeasureType=Base&LastNGames=0&Month=0&OpponentTeamID=0&PORound=0&PaceAdjust=N&Period=0&PlusMinus=N&Rank=N&LeagueID=00`;

  try {
    const data = await nbaFetch(url);
    const headers: string[] = data.resultSets[0].headers;
    const rowData: any[][] = data.resultSets[0].rowSet;

    const teamRows = await sql`SELECT external_id, id FROM teams`;
    const teamMap = new Map(teamRows.map((r) => [r.external_id, r.id]));

    for (const r of rowData) {
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = r[i]));

      const tid = teamMap.get(String(obj.TEAM_ID));
      if (!tid) continue;

      await sql`
        INSERT INTO team_season_stats (team_id, season_id, wins, losses, fg_pct, fg3_pct, ft_pct)
        VALUES (${tid}, ${seasonId}, ${obj.W || 0}, ${obj.L || 0},
          ${obj.FG_PCT || 0}, ${obj.FG3_PCT || 0}, ${obj.FT_PCT || 0})
        ON CONFLICT (team_id, season_id) DO UPDATE SET
          wins = EXCLUDED.wins, losses = EXCLUDED.losses,
          fg_pct = EXCLUDED.fg_pct, fg3_pct = EXCLUDED.fg3_pct, ft_pct = EXCLUDED.ft_pct
      `;
    }
    console.log(`  Inserted stats for ${rowData.length} teams`);
  } catch (e: any) {
    console.log(`  Warning: ${e.message}`);
  }
}

// ============================================================
// 5. Ingest games
// ============================================================
async function ingestGames(seasonId: number): Promise<void> {
  step("5/9  Ingesting games");
  await sleep(DELAY_MS);

  const teamRows = await sql`SELECT external_id, id FROM teams`;
  const teamMap = new Map(teamRows.map((r) => [r.external_id, r.id]));

  // Fetch games for each team and deduplicate by game ID
  const allGames = new Map<string, any>();

  for (const team of NBA_TEAMS) {
    await sleep(DELAY_MS);
    try {
      const url = `https://stats.nba.com/stats/leaguegamefinder?Season=${SEASON}&LeagueID=00&TeamID=${team.id}&SeasonType=Regular+Season`;
      const data = await nbaFetch(url);
      const headers: string[] = data.resultSets[0].headers;
      const rowData: any[][] = data.resultSets[0].rowSet;

      for (const r of rowData) {
        const obj: any = {};
        headers.forEach((h, i) => (obj[h] = r[i]));

        const gameId = obj.GAME_ID;
        if (!allGames.has(gameId)) {
          allGames.set(gameId, []);
        }
        allGames.get(gameId)!.push(obj);
      }
      console.log(`    ${team.abbr}: ${rowData.length} game entries`);
    } catch (e: any) {
      console.log(`    ${team.abbr}: failed (${e.message})`);
    }
  }

  console.log(`  Processing ${allGames.size} unique games...`);
  let count = 0;

  for (const [gameId, entries] of allGames) {
    if (entries.length < 2) continue;

    // Home team doesn't have "@" in matchup
    const homeEntry = entries.find((e: any) => !String(e.MATCHUP || "").includes("@"));
    const awayEntry = entries.find((e: any) => String(e.MATCHUP || "").includes("@"));
    if (!homeEntry || !awayEntry) continue;

    const homeTid = teamMap.get(String(homeEntry.TEAM_ID));
    const awayTid = teamMap.get(String(awayEntry.TEAM_ID));
    if (!homeTid || !awayTid) continue;

    const gameDate = String(homeEntry.GAME_DATE).slice(0, 10);
    const homePts = homeEntry.PTS != null ? Number(homeEntry.PTS) : null;
    const awayPts = awayEntry.PTS != null ? Number(awayEntry.PTS) : null;
    const status = homePts != null && awayPts != null ? "final" : "scheduled";

    await sql`
      INSERT INTO games (external_id, season_id, game_date, home_team_id, away_team_id,
        status, home_score, away_score)
      VALUES (${gameId}, ${seasonId}, ${gameDate}, ${homeTid}, ${awayTid},
        ${status}, ${homePts}, ${awayPts})
      ON CONFLICT (external_id) DO UPDATE SET
        status = EXCLUDED.status, home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score, updated_at = NOW()
    `;
    count++;
  }
  console.log(`  Inserted/updated ${count} games`);
}

// ============================================================
// 5.5. Ingest game team stats (box score per team per game)
// ============================================================
async function ingestGameTeamStats(seasonId: number): Promise<void> {
  step("5.5/9  Ingesting game team stats from box scores");

  const teamRows = await sql`SELECT external_id, id FROM teams`;
  const teamMap = new Map(teamRows.map((r) => [r.external_id, r.id]));

  // Get all games with scores (final games)
  const gameRows = await sql`
    SELECT id, external_id, home_team_id, away_team_id, home_score, away_score
    FROM games WHERE season_id = ${seasonId} AND status = 'final'
  `;
  const gameMap = new Map(gameRows.map((r) => [r.external_id, r]));

  console.log(`  Found ${gameRows.length} completed games to process`);

  // Check how many we already have
  const [existing] = await sql`SELECT COUNT(*) as c FROM game_team_stats`;
  console.log(`  Existing game_team_stats rows: ${existing.c}`);

  let inserted = 0;

  // Use leaguegamefinder data which we already fetched per team
  // For each team, get their game-level stats
  for (const team of NBA_TEAMS) {
    await sleep(DELAY_MS);
    try {
      const url = `https://stats.nba.com/stats/teamgamelog?TeamID=${team.id}&Season=${SEASON}&SeasonType=Regular+Season`;
      const data = await nbaFetch(url);
      const headers: string[] = data.resultSets[0].headers;
      const rowData: any[][] = data.resultSets[0].rowSet;

      for (const r of rowData) {
        const obj: any = {};
        headers.forEach((h, i) => (obj[h] = r[i]));

        const gameExtId = obj.Game_ID;
        const game = gameMap.get(gameExtId);
        if (!game) continue;

        const teamId = teamMap.get(String(team.id));
        if (!teamId) continue;

        const isHome = Number(game.home_team_id) === Number(teamId);
        const fga = obj.FGA || 0;
        const fta = obj.FTA || 0;
        const pts = obj.PTS || 0;
        const fg3m = obj.FG3M || 0;
        const denom = 2 * (fga + 0.44 * fta);
        const tsPct = denom > 0 ? pts / denom : 0;
        const efgPct = fga > 0 ? (obj.FGM + 0.5 * fg3m) / fga : 0;

        await sql`
          INSERT INTO game_team_stats (
            game_id, team_id, is_home, points,
            fgm, fga, fg3m, fg3a, ftm, fta,
            oreb, dreb, reb, ast, stl, blk, tov, pf,
            ts_pct, efg_pct
          ) VALUES (
            ${game.id}, ${teamId}, ${isHome}, ${pts},
            ${obj.FGM || 0}, ${fga}, ${fg3m}, ${obj.FG3A || 0},
            ${obj.FTM || 0}, ${fta},
            ${obj.OREB || 0}, ${obj.DREB || 0},
            ${obj.REB || 0}, ${obj.AST || 0},
            ${obj.STL || 0}, ${obj.BLK || 0},
            ${obj.TOV || 0}, ${obj.PF || 0},
            ${Math.round(tsPct * 10000) / 10000},
            ${Math.round(efgPct * 10000) / 10000}
          )
          ON CONFLICT (game_id, team_id) DO UPDATE SET
            points = EXCLUDED.points, fgm = EXCLUDED.fgm, fga = EXCLUDED.fga,
            fg3m = EXCLUDED.fg3m, fg3a = EXCLUDED.fg3a, ftm = EXCLUDED.ftm, fta = EXCLUDED.fta,
            reb = EXCLUDED.reb, ast = EXCLUDED.ast, stl = EXCLUDED.stl, blk = EXCLUDED.blk,
            tov = EXCLUDED.tov, ts_pct = EXCLUDED.ts_pct, efg_pct = EXCLUDED.efg_pct
        `;
        inserted++;
      }
      console.log(`    ${team.abbr}: ${rowData.length} game logs`);
    } catch (e: any) {
      console.log(`    ${team.abbr}: failed (${e.message})`);
    }
  }
  console.log(`  Inserted/updated ${inserted} game team stat records`);
}

// ============================================================
// 6. Ingest advanced player stats (PER, USG%, BPM, VORP, WS)
// ============================================================
async function ingestAdvancedPlayerStats(seasonId: number): Promise<void> {
  step("6/9  Ingesting advanced player stats");
  await sleep(DELAY_MS);

  const url = `https://stats.nba.com/stats/leaguedashplayerstats?Season=${SEASON}&SeasonType=Regular+Season&PerMode=PerGame&MeasureType=Advanced&LastNGames=0&Month=0&OpponentTeamID=0&PORound=0&PaceAdjust=N&Period=0&PlusMinus=N&Rank=N&LeagueID=00`;

  try {
    const data = await nbaFetch(url);
    const headers: string[] = data.resultSets[0].headers;
    const rowData: any[][] = data.resultSets[0].rowSet;

    const rows = rowData.map((r) => {
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = r[i]));
      return obj;
    });

    console.log(`  Got ${rows.length} players with advanced stats`);

    // Map player external IDs to DB IDs
    const playerRows = await sql`SELECT id, external_id FROM players`;
    const playerMap = new Map(playerRows.map((r) => [r.external_id, r.id]));

    let updated = 0;
    for (const row of rows) {
      const pid = playerMap.get(String(row.PLAYER_ID));
      if (!pid) continue;

      // NBA Advanced stats endpoint returns: TS_PCT, EFG_PCT, USG_PCT, PACE, PIE,
      // AST_PCT, AST_TO, AST_RATIO, OREB_PCT, DREB_PCT, REB_PCT, E_TOV_PCT,
      // USG_PCT, PACE, OFF_RATING, DEF_RATING, NET_RATING
      await sql`
        UPDATE player_season_stats SET
          ts_pct = ${row.TS_PCT || null},
          efg_pct = ${row.EFG_PCT || null},
          usg_pct = ${row.USG_PCT || null},
          ast_pct = ${row.AST_PCT || null},
          reb_pct = ${row.REB_PCT || null},
          tov_pct = ${row.E_TOV_PCT || null},
          per = ${row.PIE ? Math.round(Number(row.PIE) * 100 * 100) / 100 : null},
          on_court_ortg = ${row.OFF_RATING || null},
          off_court_drtg = ${row.DEF_RATING || null},
          on_off_net = ${row.NET_RATING || null}
        WHERE player_id = ${pid} AND season_id = ${seasonId}
      `;
      updated++;
    }
    console.log(`  Updated advanced stats for ${updated} players`);
  } catch (e: any) {
    console.log(`  Warning: Advanced player stats failed (${e.message})`);
  }
}

// ============================================================
// 6.5. Ingest advanced team stats (ORTG, DRTG, pace, etc.)
// ============================================================
async function ingestAdvancedTeamStats(seasonId: number): Promise<void> {
  step("6.5/9  Ingesting advanced team stats");
  await sleep(DELAY_MS);

  const url = `https://stats.nba.com/stats/leaguedashteamstats?Season=${SEASON}&SeasonType=Regular+Season&PerMode=PerGame&MeasureType=Advanced&LastNGames=0&Month=0&OpponentTeamID=0&PORound=0&PaceAdjust=N&Period=0&PlusMinus=N&Rank=N&LeagueID=00`;

  try {
    const data = await nbaFetch(url);
    const headers: string[] = data.resultSets[0].headers;
    const rowData: any[][] = data.resultSets[0].rowSet;

    const teamRows = await sql`SELECT external_id, id FROM teams`;
    const teamMap = new Map(teamRows.map((r) => [r.external_id, r.id]));

    let updated = 0;
    for (const r of rowData) {
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = r[i]));

      const tid = teamMap.get(String(obj.TEAM_ID));
      if (!tid) continue;

      await sql`
        UPDATE team_season_stats SET
          ortg = ${obj.OFF_RATING || null},
          drtg = ${obj.DEF_RATING || null},
          net_rating = ${obj.NET_RATING || null},
          pace = ${obj.PACE || null},
          ts_pct = ${obj.TS_PCT || null},
          efg_pct = ${obj.EFG_PCT || null}
        WHERE team_id = ${tid} AND season_id = ${seasonId}
      `;
      updated++;
    }
    console.log(`  Updated advanced stats for ${updated} teams`);
  } catch (e: any) {
    console.log(`  Warning: Advanced team stats failed (${e.message})`);
  }

  // Compute SOS from opponent win percentages
  step("6.5b  Computing Strength of Schedule");
  try {
    await sql`
      UPDATE team_season_stats tss SET
        sos = sub.sos
      FROM (
        SELECT
          g_team.id as team_id,
          AVG(
            CASE
              WHEN opp.wins + opp.losses > 0
              THEN opp.wins::decimal / (opp.wins + opp.losses)
              ELSE 0.5
            END
          ) as sos
        FROM teams g_team
        JOIN games g ON (g.home_team_id = g_team.id OR g.away_team_id = g_team.id) AND g.status = 'final'
        JOIN team_season_stats opp ON opp.team_id = CASE
          WHEN g.home_team_id = g_team.id THEN g.away_team_id
          ELSE g.home_team_id
        END
        GROUP BY g_team.id
      ) sub
      WHERE tss.team_id = sub.team_id AND tss.season_id = ${seasonId}
    `;
    console.log("  SOS computed for all teams");
  } catch (e: any) {
    console.log(`  Warning: SOS computation failed (${e.message})`);
  }

  // Compute home/away splits
  step("6.5c  Computing home/away splits");
  try {
    await sql`
      UPDATE team_season_stats tss SET
        home_wins = COALESCE(sub.hw, 0),
        home_losses = COALESCE(sub.hl, 0),
        away_wins = COALESCE(sub.aw, 0),
        away_losses = COALESCE(sub.al, 0)
      FROM (
        SELECT
          t.id as team_id,
          SUM(CASE WHEN g.home_team_id = t.id AND g.home_score > g.away_score THEN 1 ELSE 0 END) as hw,
          SUM(CASE WHEN g.home_team_id = t.id AND g.home_score < g.away_score THEN 1 ELSE 0 END) as hl,
          SUM(CASE WHEN g.away_team_id = t.id AND g.away_score > g.home_score THEN 1 ELSE 0 END) as aw,
          SUM(CASE WHEN g.away_team_id = t.id AND g.away_score < g.home_score THEN 1 ELSE 0 END) as al
        FROM teams t
        JOIN games g ON (g.home_team_id = t.id OR g.away_team_id = t.id) AND g.status = 'final'
        GROUP BY t.id
      ) sub
      WHERE tss.team_id = sub.team_id AND tss.season_id = ${seasonId}
    `;
    console.log("  Home/away splits computed for all teams");
  } catch (e: any) {
    console.log(`  Warning: Home/away splits failed (${e.message})`);
  }
}

// ============================================================
// 7. Ingest player game logs (players with 15+ MPG)
// ============================================================
async function ingestPlayerGameLogs(seasonId: number): Promise<void> {
  step("7/9  Ingesting player game logs (15+ MPG)");

  const topPlayers = await sql`
    SELECT p.id, p.external_id, p.full_name, pss.team_id
    FROM players p
    JOIN player_season_stats pss ON p.id = pss.player_id AND pss.season_id = ${seasonId}
    WHERE pss.mpg >= 15
    ORDER BY pss.ppg DESC NULLS LAST
  `;

  const gameRows = await sql`SELECT external_id, id FROM games WHERE season_id = ${seasonId}`;
  const gameMap = new Map(gameRows.map((r) => [r.external_id, r.id]));

  console.log(`  Processing game logs for ${topPlayers.length} players...`);

  for (let i = 0; i < topPlayers.length; i++) {
    const { id: pid, external_id: extId, full_name: name, team_id: tid } = topPlayers[i];
    await sleep(DELAY_MS);

    try {
      const url = `https://stats.nba.com/stats/playergamelog?PlayerID=${extId}&Season=${SEASON}&SeasonType=Regular+Season`;
      const data = await nbaFetch(url);
      const headers: string[] = data.resultSets[0].headers;
      const rowData: any[][] = data.resultSets[0].rowSet;

      let logCount = 0;
      for (const r of rowData) {
        const obj: any = {};
        headers.forEach((h, j) => (obj[h] = r[j]));

        const gameExtId = obj.Game_ID;
        const gid = gameMap.get(gameExtId);
        if (!gid) continue;

        // Parse minutes
        let mins = 0;
        const minsRaw = obj.MIN;
        if (typeof minsRaw === "string" && minsRaw.includes(":")) {
          const [m, s] = minsRaw.split(":");
          mins = parseFloat(m) + parseFloat(s) / 60;
        } else {
          mins = parseFloat(minsRaw) || 0;
        }

        const fga = obj.FGA || 0;
        const fta = obj.FTA || 0;
        const pts = obj.PTS || 0;
        const denom = 2 * (fga + 0.44 * fta);
        const tsPct = denom > 0 ? pts / denom : 0;

        await sql`
          INSERT INTO player_game_logs (
            player_id, game_id, team_id, season_id, minutes,
            pts, fgm, fga, fg3m, fg3a, ftm, fta,
            oreb, dreb, reb, ast, stl, blk, tov, pf, plus_minus, ts_pct
          ) VALUES (
            ${pid}, ${gid}, ${tid}, ${seasonId}, ${mins},
            ${pts}, ${obj.FGM || 0}, ${fga},
            ${obj.FG3M || 0}, ${obj.FG3A || 0},
            ${obj.FTM || 0}, ${fta},
            ${obj.OREB || 0}, ${obj.DREB || 0},
            ${obj.REB || 0}, ${obj.AST || 0},
            ${obj.STL || 0}, ${obj.BLK || 0},
            ${obj.TOV || 0}, ${obj.PF || 0},
            ${obj.PLUS_MINUS || 0}, ${Math.round(tsPct * 10000) / 10000}
          )
          ON CONFLICT (player_id, game_id) DO UPDATE SET
            pts = EXCLUDED.pts, reb = EXCLUDED.reb, ast = EXCLUDED.ast,
            minutes = EXCLUDED.minutes, plus_minus = EXCLUDED.plus_minus, ts_pct = EXCLUDED.ts_pct
        `;
        logCount++;
      }

      if ((i + 1) % 10 === 0 || i === 0) {
        console.log(`    [${i + 1}/${topPlayers.length}] ${name}: ${logCount} game logs`);
      }
    } catch (e: any) {
      console.log(`    [${i + 1}/${topPlayers.length}] ${name}: failed (${e.message})`);
    }
  }
  console.log("  Done with player game logs");
}

// ============================================================
// 8. Ingest injuries from NBA injury report
// ============================================================
async function ingestInjuries(seasonId: number): Promise<void> {
  step("8/9  Ingesting injury report (ESPN)");

  // Clear old injuries
  await sql`UPDATE player_injuries SET is_current = false WHERE season_id = ${seasonId}`;

  const injuries: { name: string; status: string; injury: string; body: string }[] = [];

  // ESPN public injury API — returns all 30 teams with current injuries
  try {
    const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) throw new Error(`ESPN ${resp.status}`);
    const data = await resp.json();

    const teams = data.injuries || [];
    console.log(`  ESPN returned injury data for ${teams.length} teams`);

    for (const team of teams) {
      const teamInjuries = team.injuries || [];
      for (const inj of teamInjuries) {
        const name = inj.athlete?.displayName || "";
        if (!name) continue;

        // Map ESPN status to our format
        let status = "Questionable";
        const espnStatus = (inj.status || "").toLowerCase();
        if (espnStatus === "out" || espnStatus.includes("out")) status = "Out";
        else if (espnStatus === "doubtful") status = "Doubtful";
        else if (espnStatus === "day-to-day" || espnStatus === "questionable") status = "Questionable";
        else if (espnStatus === "probable") status = "Questionable"; // treat probable as minor

        // Extract injury type from comment
        const comment = inj.shortComment || inj.longComment || "";
        let injuryType = "Unknown";
        let bodyPart = "other";

        // Parse body part from comment
        const bodyParts: [RegExp, string, string][] = [
          [/knee/i, "Knee", "knee"],
          [/ankle/i, "Ankle", "ankle"],
          [/hamstring/i, "Hamstring", "hamstring"],
          [/shoulder/i, "Shoulder", "shoulder"],
          [/back/i, "Back", "back"],
          [/hip/i, "Hip", "hip"],
          [/foot/i, "Foot", "foot"],
          [/calf/i, "Calf", "calf"],
          [/wrist/i, "Wrist", "wrist"],
          [/quad/i, "Quad", "quad"],
          [/groin/i, "Groin", "groin"],
          [/concussion/i, "Concussion", "head"],
          [/illness/i, "Illness", "other"],
          [/rest/i, "Rest", "other"],
          [/personal/i, "Personal", "other"],
          [/suspension/i, "Suspension", "other"],
          [/achilles/i, "Achilles", "achilles"],
          [/thumb/i, "Thumb", "hand"],
          [/finger/i, "Finger", "hand"],
          [/elbow/i, "Elbow", "elbow"],
          [/toe/i, "Toe", "foot"],
          [/thigh/i, "Thigh", "thigh"],
          [/rib/i, "Ribs", "torso"],
          [/oblique/i, "Oblique", "torso"],
          [/abdom/i, "Abdomen", "torso"],
        ];

        for (const [regex, type, part] of bodyParts) {
          if (regex.test(comment) || regex.test(name)) {
            injuryType = type;
            bodyPart = part;
            break;
          }
        }

        injuries.push({ name, status, injury: injuryType, body: bodyPart });
      }
    }

    console.log(`  Parsed ${injuries.length} injury records from ESPN`);
  } catch (e: any) {
    console.log(`  ESPN injury fetch failed: ${e.message}`);
  }

  if (injuries.length === 0) {
    console.log("  No injury data available. Skipping.");
    return;
  }

  // Match to DB players and insert
  const playerRows = await sql`
    SELECT p.id, p.full_name, r.team_id
    FROM players p
    JOIN rosters r ON r.player_id = p.id AND r.season_id = ${seasonId}
  `;

  // Build lookup map with lowercase names
  const playerMap = new Map<string, { id: number; teamId: number }>();
  for (const r of playerRows) {
    playerMap.set(String(r.full_name).toLowerCase(), { id: Number(r.id), teamId: Number(r.team_id) });
  }

  let inserted = 0;
  const seen = new Set<number>();

  for (const inj of injuries) {
    const match = playerMap.get(inj.name.toLowerCase());
    if (!match || seen.has(match.id)) continue;
    seen.add(match.id);

    await sql`
      INSERT INTO player_injuries (
        player_id, team_id, season_id, status, injury_type, body_part,
        reported_date, is_current
      ) VALUES (
        ${match.id}, ${match.teamId}, ${seasonId}, ${inj.status}, ${inj.injury}, ${inj.body},
        CURRENT_DATE, true
      )
      ON CONFLICT DO NOTHING
    `;
    inserted++;
  }

  // Print summary by status
  const outCount = injuries.filter((i) => i.status === "Out").length;
  const dayCount = injuries.filter((i) => i.status === "Questionable").length;
  const doubtCount = injuries.filter((i) => i.status === "Doubtful").length;

  console.log(`  Matched ${inserted} of ${injuries.length} injured players to DB`);
  console.log(`  Breakdown: ${outCount} Out, ${doubtCount} Doubtful, ${dayCount} Questionable/Day-to-Day`);
}

// ============================================================
// 9. Summary
// ============================================================
async function printSummary(): Promise<void> {
  step("DONE — Database Summary");
  const tables = [
    "seasons", "teams", "players", "rosters", "games",
    "player_season_stats", "team_season_stats", "player_game_logs",
    "game_team_stats", "player_injuries",
  ];
  for (const t of tables) {
    const [row] = await sql.unsafe(`SELECT COUNT(*) as c FROM ${t}`);
    console.log(`  ${t.padEnd(30)} ${String(row.c).padStart(6)} rows`);
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  CourtVision NBA Data Ingestion Pipeline");
  console.log(`  Season: ${SEASON}  |  Started: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  try {
    const seasonId = await ingestSeason();
    await ingestTeams();
    await ingestPlayersAndStats(seasonId);
    await ingestTeamStats(seasonId);
    await ingestGames(seasonId);
    await ingestGameTeamStats(seasonId);
    await ingestAdvancedPlayerStats(seasonId);
    await ingestAdvancedTeamStats(seasonId);
    await ingestPlayerGameLogs(seasonId);
    await ingestInjuries(seasonId);
    await printSummary();
  } catch (e: any) {
    console.error(`\nERROR: ${e.message}`);
    console.error(e.stack);
  } finally {
    await sql.end();
  }

  console.log(`\nFinished at ${new Date().toISOString()}`);
}

main();
