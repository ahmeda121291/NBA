// ============================================================
// CourtVision — Constants
// ============================================================

export const METRIC_LABELS: Record<string, { name: string; description: string; short: string }> = {
  // ---- CourtVision Player Metrics ----
  bis: {
    name: "Baseline Impact Score",
    short: "BIS",
    description: "Stable estimate of overall player value using the strongest existing impact metrics.",
  },
  rda: {
    name: "Role Difficulty Adjustment",
    short: "RDA",
    description: "Measures how hard a player's offensive role is — separating easy-efficiency from high-burden creation.",
  },
  goi: {
    name: "Gravity & Off-Ball Impact",
    short: "GOI",
    description: "Estimates value created without the ball through spacing, movement, and ecosystem effects.",
  },
  drs: {
    name: "Defensive Reality Score",
    short: "DRS",
    description: "Estimates whether a player actually improves team defense, beyond steals and blocks.",
  },
  sps: {
    name: "Scalability & Portability",
    short: "SPS",
    description: "Measures whether player value transfers across different contexts, roles, and lineups.",
  },
  lfi: {
    name: "Live Form Index",
    short: "LFI",
    description: "Captures current form with noise filtering — what is actually happening right now.",
  },
  mai: {
    name: "Matchup Advantage Index",
    short: "MAI",
    description: "Estimates game-specific edge based on likely defender, scheme, pace, and fatigue.",
  },
  gip: {
    name: "Game Impact Projection",
    short: "GIP",
    description: "Projects expected player impact and stat line for tonight's game.",
  },

  // ---- CourtVision Team Metrics ----
  tsc: {
    name: "Team Strength Core",
    short: "TSC",
    description: "Baseline team quality estimate adjusted for schedule, injuries, and recent form.",
  },
  lss: {
    name: "Lineup Synergy Score",
    short: "LSS",
    description: "Measures how well a team's lineup units function together across spacing, creation, and defense.",
  },
  rp: {
    name: "Redundancy Penalty",
    short: "RP",
    description: "Penalizes overlapping skill sets that reduce team fit and flexibility.",
  },
  pts: {
    name: "Playoff Translation Score",
    short: "PTS",
    description: "Estimates whether a team's style and depth survive high-leverage playoff basketball.",
  },
  drs_team: {
    name: "Dependency Risk",
    short: "DEP",
    description: "Measures fragility if the top player is absent or limited.",
  },
  ltfi: {
    name: "Live Team Form Index",
    short: "LTFI",
    description: "Estimates how strong a team is right now based on rolling performance and context.",
  },
  sce: {
    name: "Style Clash Engine",
    short: "SCE",
    description: "Analyzes how tonight's matchup plays out stylistically across pace, transition, and defense.",
  },
  gop: {
    name: "Game Outcome Projection",
    short: "GOP",
    description: "Projects likely game result with win probability, score range, and key reasons.",
  },
  elo: {
    name: "Elo Rating",
    short: "Elo",
    description: "Power rating updated after every game. Higher = stronger. 1500 is average, 1600+ is elite.",
  },

  // ---- Traditional Per-Game Stats ----
  ppg: {
    name: "Points Per Game",
    short: "PPG",
    description: "Average points scored per game. League average is ~15 PPG; 25+ is elite scoring.",
  },
  rpg: {
    name: "Rebounds Per Game",
    short: "RPG",
    description: "Average rebounds per game. Combines offensive and defensive boards. 10+ is elite for bigs.",
  },
  apg: {
    name: "Assists Per Game",
    short: "APG",
    description: "Average assists per game. Measures playmaking and passing. 8+ is elite point guard territory.",
  },
  spg: {
    name: "Steals Per Game",
    short: "SPG",
    description: "Average steals per game. Measures ball-hawking ability. 1.5+ is among league leaders.",
  },
  bpg: {
    name: "Blocks Per Game",
    short: "BPG",
    description: "Average blocks per game. Measures rim protection. 2+ is elite shot-blocking.",
  },
  tov: {
    name: "Turnovers Per Game",
    short: "TOV",
    description: "Average turnovers per game. Lower is better. High-usage players naturally turn it over more.",
  },
  mpg: {
    name: "Minutes Per Game",
    short: "MPG",
    description: "Average minutes played per game. 30+ indicates a key rotation player; 36+ is heavy workload.",
  },
  gp: {
    name: "Games Played",
    short: "GP",
    description: "Total games played this season. Important for sample size — more games = more reliable stats.",
  },

  // ---- Shooting Splits ----
  fg_pct: {
    name: "Field Goal Percentage",
    short: "FG%",
    description: "Percentage of all field goals made. League average is ~46%. Doesn't distinguish 2s from 3s.",
  },
  fg3_pct: {
    name: "Three-Point Percentage",
    short: "3P%",
    description: "Percentage of three-pointers made. League average is ~36%. 40%+ on volume is elite.",
  },
  ft_pct: {
    name: "Free Throw Percentage",
    short: "FT%",
    description: "Percentage of free throws made. League average is ~78%. 90%+ is elite marksmanship.",
  },

  // ---- Advanced Stats ----
  per: {
    name: "Player Efficiency Rating",
    short: "PER",
    description: "John Hollinger's all-in-one rating. League average is 15.0. 25+ is MVP-caliber. Favors high-usage players.",
  },
  usg_pct: {
    name: "Usage Rate",
    short: "USG%",
    description: "Percentage of team plays used while on court. Higher = more involved. 30%+ is extremely ball-dominant.",
  },
  bpm: {
    name: "Box Plus-Minus",
    short: "BPM",
    description: "Estimated points per 100 possessions above average. 0 is league average, +5 is All-Star, +8 is MVP.",
  },
  vorp: {
    name: "Value Over Replacement",
    short: "VORP",
    description: "Total box score value above replacement level. Accumulates over the season. 3+ is All-Star, 6+ is MVP.",
  },
  ws: {
    name: "Win Shares",
    short: "WS",
    description: "Estimated wins contributed. Accumulates over the season. 10+ is All-Star level for a full season.",
  },
  ts_pct: {
    name: "True Shooting Percentage",
    short: "TS%",
    description: "Shooting efficiency accounting for 2s, 3s, and free throws. League average is ~57%. 62%+ is elite.",
  },
  efg_pct: {
    name: "Effective Field Goal Percentage",
    short: "EFG%",
    description: "Field goal percentage adjusted for three-pointers being worth more. League average is ~53%.",
  },

  // ---- Team Advanced Stats ----
  ortg: {
    name: "Offensive Rating",
    short: "ORTG",
    description: "Points scored per 100 possessions. League average is ~112. Higher is better. 115+ is elite offense.",
  },
  drtg: {
    name: "Defensive Rating",
    short: "DRTG",
    description: "Points allowed per 100 possessions. League average is ~112. Lower is better. 108 or below is elite defense.",
  },
  net_rating: {
    name: "Net Rating",
    short: "Net RTG",
    description: "ORTG minus DRTG. Positive = outscoring opponents. +5 is elite. Best single team quality indicator.",
  },
  pace: {
    name: "Pace",
    short: "Pace",
    description: "Possessions per 48 minutes. Higher = faster team. League average is ~100. Affects all counting stats.",
  },
  sos: {
    name: "Strength of Schedule",
    short: "SOS",
    description: "Average quality of opponents faced. 0 is neutral. Positive = harder schedule, negative = easier.",
  },

  // ---- Box Score Stats (game-level) ----
  min: {
    name: "Minutes Played",
    short: "MIN",
    description: "Total minutes played in the game.",
  },
  reb: {
    name: "Rebounds",
    short: "REB",
    description: "Total rebounds (offensive + defensive) in the game.",
  },
  ast: {
    name: "Assists",
    short: "AST",
    description: "Passes directly leading to a made basket.",
  },
  stl: {
    name: "Steals",
    short: "STL",
    description: "Times the player took the ball from an opponent.",
  },
  blk: {
    name: "Blocks",
    short: "BLK",
    description: "Shots blocked by the player.",
  },
  fg: {
    name: "Field Goals",
    short: "FG",
    description: "Field goals made out of attempted. Includes both 2-point and 3-point shots.",
  },
  fg3: {
    name: "Three-Pointers",
    short: "3P",
    description: "Three-point field goals made out of attempted.",
  },
  ft: {
    name: "Free Throws",
    short: "FT",
    description: "Free throws made out of attempted.",
  },
  plus_minus: {
    name: "Plus/Minus",
    short: "+/-",
    description: "Point differential while this player was on the court. Positive = team outscored opponents.",
  },
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
  very_low: "Very low confidence — treat as rough estimate",
};

export const ROLLING_WINDOWS = [3, 5, 10, 20] as const;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/games", label: "Games" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/compare", label: "Compare" },
  { href: "/pulse", label: "Pulse" },
  { href: "/methodology", label: "Methodology" },
] as const;

export const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

export const CONFERENCES = ["East", "West"] as const;
