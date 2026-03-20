import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  date,
  decimal,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ============================================================
// Core Entities
// ============================================================

export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull().unique(),
  label: varchar("label", { length: 10 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  allStarDate: date("all_star_date"),
  tradeDeadline: date("trade_deadline"),
  playoffStart: date("playoff_start"),
  isCurrent: boolean("is_current").default(false),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 50 }).unique(),
  abbreviation: varchar("abbreviation", { length: 5 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  city: varchar("city", { length: 50 }).notNull(),
  nickname: varchar("nickname", { length: 50 }).notNull(),
  conference: varchar("conference", { length: 10 }).notNull(),
  division: varchar("division", { length: 20 }).notNull(),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }),
  secondaryColor: varchar("secondary_color", { length: 7 }),
  arena: varchar("arena", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 50 }).unique(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  birthDate: date("birth_date"),
  heightInches: integer("height_inches"),
  weightLbs: integer("weight_lbs"),
  position: varchar("position", { length: 5 }),
  secondaryPosition: varchar("secondary_position", { length: 5 }),
  draftYear: integer("draft_year"),
  draftRound: integer("draft_round"),
  draftPick: integer("draft_pick"),
  country: varchar("country", { length: 50 }),
  headshotUrl: text("headshot_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rosters = pgTable(
  "rosters",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull().references(() => teams.id),
    playerId: integer("player_id").notNull().references(() => players.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    jerseyNumber: varchar("jersey_number", { length: 5 }),
    position: varchar("position", { length: 5 }),
    isTwoWay: boolean("is_two_way").default(false),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_rosters_team_season").on(table.teamId, table.seasonId),
    index("idx_rosters_player_season").on(table.playerId, table.seasonId),
  ]
);

// ============================================================
// Games
// ============================================================

export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    externalId: varchar("external_id", { length: 50 }).unique(),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    gameDate: date("game_date").notNull(),
    gameTime: timestamp("game_time"),
    homeTeamId: integer("home_team_id").notNull().references(() => teams.id),
    awayTeamId: integer("away_team_id").notNull().references(() => teams.id),
    status: varchar("status", { length: 20 }).default("scheduled"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    overtimePeriods: integer("overtime_periods").default(0),
    arena: varchar("arena", { length: 100 }),
    attendance: integer("attendance"),
    isBackToBackHome: boolean("is_back_to_back_home").default(false),
    isBackToBackAway: boolean("is_back_to_back_away").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_games_date").on(table.gameDate),
    index("idx_games_season").on(table.seasonId),
    index("idx_games_home_team").on(table.homeTeamId),
    index("idx_games_away_team").on(table.awayTeamId),
    index("idx_games_status").on(table.status),
  ]
);

export const gameTeamStats = pgTable(
  "game_team_stats",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull().references(() => games.id),
    teamId: integer("team_id").notNull().references(() => teams.id),
    isHome: boolean("is_home").notNull(),
    points: integer("points"),
    fgm: integer("fgm"),
    fga: integer("fga"),
    fg3m: integer("fg3m"),
    fg3a: integer("fg3a"),
    ftm: integer("ftm"),
    fta: integer("fta"),
    oreb: integer("oreb"),
    dreb: integer("dreb"),
    reb: integer("reb"),
    ast: integer("ast"),
    stl: integer("stl"),
    blk: integer("blk"),
    tov: integer("tov"),
    pf: integer("pf"),
    ortg: decimal("ortg", { precision: 6, scale: 2 }),
    drtg: decimal("drtg", { precision: 6, scale: 2 }),
    netRating: decimal("net_rating", { precision: 6, scale: 2 }),
    pace: decimal("pace", { precision: 6, scale: 2 }),
    tsPct: decimal("ts_pct", { precision: 5, scale: 4 }),
    efgPct: decimal("efg_pct", { precision: 5, scale: 4 }),
    ptsInPaint: integer("pts_in_paint"),
    ptsFastbreak: integer("pts_fastbreak"),
    ptsSecondChance: integer("pts_second_chance"),
    ptsOffTov: integer("pts_off_tov"),
    largestLead: integer("largest_lead"),
  },
  (table) => [
    uniqueIndex("idx_gts_game_team").on(table.gameId, table.teamId),
  ]
);

// ============================================================
// Player Game Logs
// ============================================================

export const playerGameLogs = pgTable(
  "player_game_logs",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    gameId: integer("game_id").notNull().references(() => games.id),
    teamId: integer("team_id").notNull().references(() => teams.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    status: varchar("status", { length: 20 }).default("active"),
    starter: boolean("starter").default(false),
    minutes: decimal("minutes", { precision: 5, scale: 2 }),
    pts: integer("pts").default(0),
    fgm: integer("fgm").default(0),
    fga: integer("fga").default(0),
    fg3m: integer("fg3m").default(0),
    fg3a: integer("fg3a").default(0),
    ftm: integer("ftm").default(0),
    fta: integer("fta").default(0),
    oreb: integer("oreb").default(0),
    dreb: integer("dreb").default(0),
    reb: integer("reb").default(0),
    ast: integer("ast").default(0),
    stl: integer("stl").default(0),
    blk: integer("blk").default(0),
    tov: integer("tov").default(0),
    pf: integer("pf").default(0),
    plusMinus: integer("plus_minus").default(0),
    tsPct: decimal("ts_pct", { precision: 5, scale: 4 }),
    efgPct: decimal("efg_pct", { precision: 5, scale: 4 }),
    usgPct: decimal("usg_pct", { precision: 5, scale: 4 }),
    gameScore: decimal("game_score", { precision: 6, scale: 2 }),
  },
  (table) => [
    uniqueIndex("idx_pgl_player_game").on(table.playerId, table.gameId),
    index("idx_pgl_player_season").on(table.playerId, table.seasonId),
    index("idx_pgl_game").on(table.gameId),
  ]
);

// ============================================================
// Season Stats
// ============================================================

export const playerSeasonStats = pgTable(
  "player_season_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    teamId: integer("team_id").notNull().references(() => teams.id),
    gamesPlayed: integer("games_played").default(0),
    gamesStarted: integer("games_started").default(0),
    mpg: decimal("mpg", { precision: 5, scale: 2 }),
    ppg: decimal("ppg", { precision: 5, scale: 2 }),
    rpg: decimal("rpg", { precision: 5, scale: 2 }),
    apg: decimal("apg", { precision: 5, scale: 2 }),
    spg: decimal("spg", { precision: 5, scale: 2 }),
    bpg: decimal("bpg", { precision: 5, scale: 2 }),
    topg: decimal("topg", { precision: 5, scale: 2 }),
    fpg: decimal("fpg", { precision: 5, scale: 2 }),
    fgPct: decimal("fg_pct", { precision: 5, scale: 4 }),
    fg3Pct: decimal("fg3_pct", { precision: 5, scale: 4 }),
    ftPct: decimal("ft_pct", { precision: 5, scale: 4 }),
    tsPct: decimal("ts_pct", { precision: 5, scale: 4 }),
    efgPct: decimal("efg_pct", { precision: 5, scale: 4 }),
    per: decimal("per", { precision: 6, scale: 2 }),
    usgPct: decimal("usg_pct", { precision: 5, scale: 4 }),
    astPct: decimal("ast_pct", { precision: 5, scale: 4 }),
    rebPct: decimal("reb_pct", { precision: 5, scale: 4 }),
    stlPct: decimal("stl_pct", { precision: 5, scale: 4 }),
    blkPct: decimal("blk_pct", { precision: 5, scale: 4 }),
    tovPct: decimal("tov_pct", { precision: 5, scale: 4 }),
    bpm: decimal("bpm", { precision: 6, scale: 2 }),
    obpm: decimal("obpm", { precision: 6, scale: 2 }),
    dbpm: decimal("dbpm", { precision: 6, scale: 2 }),
    vorp: decimal("vorp", { precision: 6, scale: 2 }),
    ws: decimal("ws", { precision: 6, scale: 2 }),
    wsPer48: decimal("ws_per_48", { precision: 6, scale: 4 }),
    epm: decimal("epm", { precision: 6, scale: 2 }),
    oEpm: decimal("o_epm", { precision: 6, scale: 2 }),
    dEpm: decimal("d_epm", { precision: 6, scale: 2 }),
    lebron: decimal("lebron", { precision: 6, scale: 2 }),
    oLebron: decimal("o_lebron", { precision: 6, scale: 2 }),
    dLebron: decimal("d_lebron", { precision: 6, scale: 2 }),
    raptor: decimal("raptor", { precision: 6, scale: 2 }),
    onCourtOrtg: decimal("on_court_ortg", { precision: 6, scale: 2 }),
    offCourtOrtg: decimal("off_court_ortg", { precision: 6, scale: 2 }),
    onCourtDrtg: decimal("on_court_drtg", { precision: 6, scale: 2 }),
    offCourtDrtg: decimal("off_court_drtg", { precision: 6, scale: 2 }),
    onOffNet: decimal("on_off_net", { precision: 6, scale: 2 }),
  },
  (table) => [
    uniqueIndex("idx_pss_player_season_team").on(table.playerId, table.seasonId, table.teamId),
  ]
);

export const teamSeasonStats = pgTable(
  "team_season_stats",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull().references(() => teams.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    wins: integer("wins").default(0),
    losses: integer("losses").default(0),
    ortg: decimal("ortg", { precision: 6, scale: 2 }),
    drtg: decimal("drtg", { precision: 6, scale: 2 }),
    netRating: decimal("net_rating", { precision: 6, scale: 2 }),
    pace: decimal("pace", { precision: 6, scale: 2 }),
    fgPct: decimal("fg_pct", { precision: 5, scale: 4 }),
    fg3Pct: decimal("fg3_pct", { precision: 5, scale: 4 }),
    ftPct: decimal("ft_pct", { precision: 5, scale: 4 }),
    tsPct: decimal("ts_pct", { precision: 5, scale: 4 }),
    efgPct: decimal("efg_pct", { precision: 5, scale: 4 }),
    sos: decimal("sos", { precision: 6, scale: 4 }),
    sosRemaining: decimal("sos_remaining", { precision: 6, scale: 4 }),
    homeWins: integer("home_wins").default(0),
    homeLosses: integer("home_losses").default(0),
    awayWins: integer("away_wins").default(0),
    awayLosses: integer("away_losses").default(0),
  },
  (table) => [
    uniqueIndex("idx_tss_team_season").on(table.teamId, table.seasonId),
  ]
);

// ============================================================
// Injuries
// ============================================================

export const playerInjuries = pgTable(
  "player_injuries",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    teamId: integer("team_id").notNull().references(() => teams.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    status: varchar("status", { length: 30 }).notNull(),
    injuryType: varchar("injury_type", { length: 100 }),
    bodyPart: varchar("body_part", { length: 50 }),
    side: varchar("side", { length: 10 }),
    reportedDate: date("reported_date").notNull(),
    returnDate: date("return_date"),
    expectedReturn: text("expected_return"),
    isCurrent: boolean("is_current").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_injuries_player").on(table.playerId),
    index("idx_injuries_team").on(table.teamId),
  ]
);

// ============================================================
// Custom Metric Snapshots
// ============================================================

export const playerMetricSnapshots = pgTable(
  "player_metric_snapshots",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
    asOfDate: date("as_of_date").notNull(),
    bisScore: decimal("bis_score", { precision: 5, scale: 2 }),
    bisConfidence: decimal("bis_confidence", { precision: 3, scale: 2 }),
    bisPercentile: decimal("bis_percentile", { precision: 5, scale: 2 }),
    bisComponents: jsonb("bis_components"),
    rdaScore: decimal("rda_score", { precision: 5, scale: 2 }),
    rdaConfidence: decimal("rda_confidence", { precision: 3, scale: 2 }),
    rdaLabel: varchar("rda_label", { length: 50 }),
    rdaComponents: jsonb("rda_components"),
    goiScore: decimal("goi_score", { precision: 5, scale: 2 }),
    goiConfidence: decimal("goi_confidence", { precision: 3, scale: 2 }),
    goiComponents: jsonb("goi_components"),
    drsScore: decimal("drs_score", { precision: 5, scale: 2 }),
    drsConfidence: decimal("drs_confidence", { precision: 3, scale: 2 }),
    drsLabel: varchar("drs_label", { length: 50 }),
    drsComponents: jsonb("drs_components"),
    spsScore: decimal("sps_score", { precision: 5, scale: 2 }),
    spsConfidence: decimal("sps_confidence", { precision: 3, scale: 2 }),
    spsLabel: varchar("sps_label", { length: 50 }),
    spsComponents: jsonb("sps_components"),
    lfiScore: decimal("lfi_score", { precision: 5, scale: 2 }),
    lfiConfidence: decimal("lfi_confidence", { precision: 3, scale: 2 }),
    lfiStreakLabel: varchar("lfi_streak_label", { length: 80 }),
    lfiWindows: jsonb("lfi_windows"),
    lfiDelta: decimal("lfi_delta", { precision: 5, scale: 2 }),
  },
  (table) => [
    uniqueIndex("idx_pms_player_date").on(table.playerId, table.seasonId, table.asOfDate),
    index("idx_pms_date").on(table.asOfDate),
  ]
);

export const playerGameProjections = pgTable(
  "player_game_projections",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    gameId: integer("game_id").notNull().references(() => games.id),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
    maiScore: decimal("mai_score", { precision: 5, scale: 2 }),
    maiConfidence: decimal("mai_confidence", { precision: 3, scale: 2 }),
    maiLabel: varchar("mai_label", { length: 50 }),
    maiFactors: jsonb("mai_factors"),
    gipImpact: decimal("gip_impact", { precision: 5, scale: 2 }),
    gipConfidence: decimal("gip_confidence", { precision: 3, scale: 2 }),
    projMinutes: decimal("proj_minutes", { precision: 5, scale: 2 }),
    projPts: decimal("proj_pts", { precision: 5, scale: 2 }),
    projPtsLow: decimal("proj_pts_low", { precision: 5, scale: 2 }),
    projPtsHigh: decimal("proj_pts_high", { precision: 5, scale: 2 }),
    projReb: decimal("proj_reb", { precision: 5, scale: 2 }),
    projRebLow: decimal("proj_reb_low", { precision: 5, scale: 2 }),
    projRebHigh: decimal("proj_reb_high", { precision: 5, scale: 2 }),
    projAst: decimal("proj_ast", { precision: 5, scale: 2 }),
    projAstLow: decimal("proj_ast_low", { precision: 5, scale: 2 }),
    projAstHigh: decimal("proj_ast_high", { precision: 5, scale: 2 }),
    projStl: decimal("proj_stl", { precision: 5, scale: 2 }),
    projBlk: decimal("proj_blk", { precision: 5, scale: 2 }),
    projTov: decimal("proj_tov", { precision: 5, scale: 2 }),
    projFg3m: decimal("proj_fg3m", { precision: 5, scale: 2 }),
    projUsage: decimal("proj_usage", { precision: 5, scale: 2 }),
    projTsPct: decimal("proj_ts_pct", { precision: 5, scale: 4 }),
    projVolatility: varchar("proj_volatility", { length: 20 }),
  },
  (table) => [
    uniqueIndex("idx_pgp_player_game").on(table.playerId, table.gameId),
    index("idx_pgp_game").on(table.gameId),
  ]
);

export const teamMetricSnapshots = pgTable(
  "team_metric_snapshots",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull().references(() => teams.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
    asOfDate: date("as_of_date").notNull(),
    tscScore: decimal("tsc_score", { precision: 5, scale: 2 }),
    tscConfidence: decimal("tsc_confidence", { precision: 3, scale: 2 }),
    tscComponents: jsonb("tsc_components"),
    lssScore: decimal("lss_score", { precision: 5, scale: 2 }),
    lssConfidence: decimal("lss_confidence", { precision: 3, scale: 2 }),
    lssComponents: jsonb("lss_components"),
    rpScore: decimal("rp_score", { precision: 5, scale: 2 }),
    rpPenalties: jsonb("rp_penalties"),
    ptsScore: decimal("pts_score", { precision: 5, scale: 2 }),
    ptsConfidence: decimal("pts_confidence", { precision: 3, scale: 2 }),
    ptsComponents: jsonb("pts_components"),
    drsTeamScore: decimal("drs_team_score", { precision: 5, scale: 2 }),
    drsTeamStarDrop: decimal("drs_team_star_drop", { precision: 6, scale: 2 }),
    drsTeamComponents: jsonb("drs_team_components"),
    ltfiScore: decimal("ltfi_score", { precision: 5, scale: 2 }),
    ltfiWindows: jsonb("ltfi_windows"),
    ltfiComponents: jsonb("ltfi_components"),
  },
  (table) => [
    uniqueIndex("idx_tms_team_date").on(table.teamId, table.seasonId, table.asOfDate),
  ]
);

export const gameProjections = pgTable(
  "game_projections",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull().references(() => games.id),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
    sceFactors: jsonb("sce_factors"),
    sceProjectedPace: decimal("sce_projected_pace", { precision: 5, scale: 2 }),
    sceKeyClashes: jsonb("sce_key_clashes"),
    projectedWinnerId: integer("projected_winner_id").references(() => teams.id),
    winProbHome: decimal("win_prob_home", { precision: 5, scale: 4 }),
    winProbAway: decimal("win_prob_away", { precision: 5, scale: 4 }),
    projScoreHome: decimal("proj_score_home", { precision: 5, scale: 2 }),
    projScoreHomeLow: decimal("proj_score_home_low", { precision: 5, scale: 2 }),
    projScoreHomeHigh: decimal("proj_score_home_high", { precision: 5, scale: 2 }),
    projScoreAway: decimal("proj_score_away", { precision: 5, scale: 2 }),
    projScoreAwayLow: decimal("proj_score_away_low", { precision: 5, scale: 2 }),
    projScoreAwayHigh: decimal("proj_score_away_high", { precision: 5, scale: 2 }),
    projPace: decimal("proj_pace", { precision: 5, scale: 2 }),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    margin: decimal("margin", { precision: 5, scale: 2 }),
    upsetRisk: varchar("upset_risk", { length: 20 }),
    keyReasons: jsonb("key_reasons"),
  },
  (table) => [
    uniqueIndex("idx_gproj_game").on(table.gameId),
  ]
);

// ============================================================
// Rolling Windows
// ============================================================

export const playerRollingWindows = pgTable(
  "player_rolling_windows",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    asOfDate: date("as_of_date").notNull(),
    windowSize: integer("window_size").notNull(),
    gamesInWindow: integer("games_in_window").notNull(),
    mpg: decimal("mpg", { precision: 5, scale: 2 }),
    ppg: decimal("ppg", { precision: 5, scale: 2 }),
    rpg: decimal("rpg", { precision: 5, scale: 2 }),
    apg: decimal("apg", { precision: 5, scale: 2 }),
    spg: decimal("spg", { precision: 5, scale: 2 }),
    bpg: decimal("bpg", { precision: 5, scale: 2 }),
    topg: decimal("topg", { precision: 5, scale: 2 }),
    fgPct: decimal("fg_pct", { precision: 5, scale: 4 }),
    fg3Pct: decimal("fg3_pct", { precision: 5, scale: 4 }),
    ftPct: decimal("ft_pct", { precision: 5, scale: 4 }),
    tsPct: decimal("ts_pct", { precision: 5, scale: 4 }),
    efgPct: decimal("efg_pct", { precision: 5, scale: 4 }),
    usgPct: decimal("usg_pct", { precision: 5, scale: 4 }),
    oppAvgDrtg: decimal("opp_avg_drtg", { precision: 6, scale: 2 }),
  },
  (table) => [
    uniqueIndex("idx_prw_unique").on(table.playerId, table.seasonId, table.asOfDate, table.windowSize),
    index("idx_prw_player_date").on(table.playerId, table.asOfDate),
  ]
);

export const teamRollingWindows = pgTable(
  "team_rolling_windows",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull().references(() => teams.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    asOfDate: date("as_of_date").notNull(),
    windowSize: integer("window_size").notNull(),
    gamesInWindow: integer("games_in_window").notNull(),
    ortg: decimal("ortg", { precision: 6, scale: 2 }),
    drtg: decimal("drtg", { precision: 6, scale: 2 }),
    netRating: decimal("net_rating", { precision: 6, scale: 2 }),
    pace: decimal("pace", { precision: 6, scale: 2 }),
    wins: integer("wins"),
    losses: integer("losses"),
    fgPct: decimal("fg_pct", { precision: 5, scale: 4 }),
    fg3Pct: decimal("fg3_pct", { precision: 5, scale: 4 }),
    tsPct: decimal("ts_pct", { precision: 5, scale: 4 }),
    oppAvgNetRtg: decimal("opp_avg_net_rtg", { precision: 6, scale: 2 }),
  },
  (table) => [
    uniqueIndex("idx_trw_unique").on(table.teamId, table.seasonId, table.asOfDate, table.windowSize),
  ]
);

// ============================================================
// Lineups
// ============================================================

export const lineups = pgTable(
  "lineups",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull().references(() => teams.id),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    lineupHash: varchar("lineup_hash", { length: 64 }).notNull(),
    lineupSize: integer("lineup_size").notNull().default(5),
    playerIds: jsonb("player_ids").notNull(),
    minutes: decimal("minutes", { precision: 8, scale: 2 }),
    possessions: decimal("possessions", { precision: 8, scale: 2 }),
    ortg: decimal("ortg", { precision: 6, scale: 2 }),
    drtg: decimal("drtg", { precision: 6, scale: 2 }),
    netRating: decimal("net_rating", { precision: 6, scale: 2 }),
    plusMinus: integer("plus_minus"),
    gamesTogether: integer("games_together"),
    asOfDate: date("as_of_date").notNull(),
  },
  (table) => [
    uniqueIndex("idx_lineups_hash_date").on(table.lineupHash, table.seasonId, table.asOfDate),
    index("idx_lineups_team").on(table.teamId),
  ]
);

// ============================================================
// Explanations
// ============================================================

export const explanations = pgTable(
  "explanations",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 20 }).notNull(),
    entityId: integer("entity_id").notNull(),
    explanationType: varchar("explanation_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 200 }),
    body: text("body").notNull(),
    factors: jsonb("factors"),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    validUntil: timestamp("valid_until"),
    isFeatured: boolean("is_featured").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_explanations_entity").on(table.entityType, table.entityId),
    index("idx_explanations_type").on(table.explanationType),
  ]
);
