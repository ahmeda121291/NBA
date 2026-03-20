// ============================================================
// CourtVision — Constants
// ============================================================

export const METRIC_LABELS: Record<string, { name: string; description: string; short: string }> = {
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
  { href: "/methodology", label: "Methodology" },
] as const;

export const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

export const CONFERENCES = ["East", "West"] as const;
