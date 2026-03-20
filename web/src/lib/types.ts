// ============================================================
// CourtVision — Core TypeScript Types
// ============================================================

// --- API Response Wrappers ---

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  perPage?: number;
  computedAt?: string;
  confidence?: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// --- Core Entities ---

export interface Team {
  id: number;
  abbreviation: string;
  name: string;
  city: string;
  nickname: string;
  conference: "East" | "West";
  division: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  arena?: string;
}

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate?: string;
  heightInches?: number;
  weightLbs?: number;
  position?: string;
  secondaryPosition?: string;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  country?: string;
  headshotUrl?: string;
  isActive: boolean;
  teamId?: number;
  team?: Team;
}

export interface Game {
  id: number;
  seasonId: number;
  gameDate: string;
  gameTime?: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: Team;
  awayTeam: Team;
  status: "scheduled" | "in_progress" | "final";
  homeScore?: number;
  awayScore?: number;
  overtimePeriods: number;
  arena?: string;
}

export interface Injury {
  id: number;
  playerId: number;
  teamId: number;
  player?: Player;
  status: "out" | "doubtful" | "questionable" | "probable" | "available";
  injuryType?: string;
  bodyPart?: string;
  side?: string;
  reportedDate: string;
  expectedReturn?: string;
}

// --- Season Stats ---

export interface PlayerSeasonStats {
  playerId: number;
  seasonId: number;
  teamId: number;
  gamesPlayed: number;
  gamesStarted: number;
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  tsPct: number;
  efgPct: number;
  per: number;
  usgPct: number;
  bpm: number;
  obpm: number;
  dbpm: number;
  vorp: number;
  ws: number;
  wsPer48: number;
  epm?: number;
  lebron?: number;
  onOffNet?: number;
}

export interface TeamSeasonStats {
  teamId: number;
  seasonId: number;
  wins: number;
  losses: number;
  ortg: number;
  drtg: number;
  netRating: number;
  pace: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  tsPct: number;
  efgPct: number;
  sos: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
}

// --- Custom Metrics ---

export interface StatRange {
  center: number;
  low: number;
  high: number;
}

export type ConfidenceLevel = "high" | "moderate" | "low" | "very_low";

export interface MetricResult {
  score: number;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  percentile?: number;
  components?: Record<string, number>;
}

export interface PlayerMetrics {
  playerId: number;
  asOfDate: string;
  bis: MetricResult & { percentile: number };
  rda: MetricResult & { label: string };
  goi?: MetricResult;
  drs: MetricResult & { label: string };
  sps?: MetricResult & { label: string };
  lfi: LiveFormResult;
  mai?: MatchupResult;
  gip?: GameImpactResult;
}

export type StreakLabel =
  | "hot_likely_real"
  | "hot_fragile"
  | "hot_opponent_driven"
  | "hot_low_volume"
  | "breakout_role_expansion"
  | "cold_bad_luck"
  | "cold_role_driven"
  | "cold_minutes_driven"
  | "cold_genuine"
  | "neutral";

export const STREAK_DISPLAY: Record<StreakLabel, { text: string; color: string }> = {
  hot_likely_real: { text: "Hot and likely real", color: "emerald" },
  hot_fragile: { text: "Hot but fragile", color: "amber" },
  hot_opponent_driven: { text: "Hot but opponent-driven", color: "amber" },
  hot_low_volume: { text: "Fake hot streak — low volume", color: "rose" },
  breakout_role_expansion: { text: "Breakout tied to expanded role", color: "emerald" },
  cold_bad_luck: { text: "Cold but due for rebound", color: "blue" },
  cold_role_driven: { text: "Slump driven by role change", color: "amber" },
  cold_minutes_driven: { text: "Slump tied to reduced minutes", color: "amber" },
  cold_genuine: { text: "Genuine cold stretch", color: "rose" },
  neutral: { text: "", color: "slate" },
};

export interface LiveFormResult extends MetricResult {
  streakLabel: StreakLabel;
  windows: Record<number, number>; // { 3: 65, 5: 60, 10: 55, 20: 52 }
  delta: number;
}

export interface MatchupResult extends MetricResult {
  label: string;
  keyFactors: string[];
}

export interface GameImpactResult {
  impactScore: number;
  confidence: number;
  projectedMinutes: number;
  projectedStats: ProjectedStatLine;
  volatilityRating: "low" | "moderate" | "high";
  keyFactors: string[];
}

export interface ProjectedStatLine {
  points: StatRange;
  rebounds: StatRange;
  assists: StatRange;
  steals: StatRange;
  blocks: StatRange;
  turnovers: StatRange;
  threes: StatRange;
  fouls: StatRange;
  usage: number;
  tsPct: StatRange;
}

// --- Team Metrics ---

export interface TeamMetrics {
  teamId: number;
  asOfDate: string;
  tsc: MetricResult;
  lss?: MetricResult;
  rp?: MetricResult & { penalties: Array<{ type: string; points: number }> };
  pts?: MetricResult;
  drsTeam?: MetricResult & { starDrop: number };
  ltfi: LiveFormResult;
}

// --- Game Projections ---

export interface GameProjection {
  gameId: number;
  projectedWinnerId: number;
  winProbHome: number;
  winProbAway: number;
  projectedScoreHome: StatRange;
  projectedScoreAway: StatRange;
  projectedPace: number;
  confidence: number;
  margin: number;
  upsetRisk: "none" | "low" | "moderate" | "high";
  keyReasons: string[];
  styleClash: StyleClashResult;
}

export interface StyleClashResult {
  factors: Record<string, StyleFactor>;
  projectedPace: number;
  keyClashes: string[];
}

export interface StyleFactor {
  home: number;
  away: number;
  edge: "home" | "away" | "neutral";
  label: string;
}

// --- Player Game Projection ---

export interface PlayerGameProjection {
  playerId: number;
  gameId: number;
  player?: Player;
  mai: MatchupResult;
  gip: GameImpactResult;
}

// --- Compare ---

export interface CompareResult {
  type: "player" | "team";
  entities: Array<{
    id: number;
    name: string;
    metrics: Record<string, number>;
    stats: Record<string, number>;
  }>;
}

// --- Insights ---

export interface Insight {
  id: number;
  entityType: "player" | "team" | "game" | "matchup";
  entityId: number;
  type: "projection" | "metric" | "trend" | "insight";
  title: string;
  body: string;
  factors: Record<string, unknown>;
  confidence: number;
  generatedAt: string;
  isFeatured: boolean;
}

// --- Leaderboard ---

export type LeaderboardMetric =
  | "bis"
  | "lfi"
  | "drs"
  | "rda"
  | "sps"
  | "goi"
  | "tsc"
  | "ltfi"
  | "lss";

export interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  team?: string;
  teamAbbr?: string;
  score: number;
  confidence: number;
  trend: number; // delta from previous snapshot
  percentile: number;
  label?: string;
}

// --- Search ---

export interface SearchResult {
  type: "player" | "team";
  id: number;
  name: string;
  subtitle: string; // e.g., "SF | BOS" or "Eastern Conference"
  imageUrl?: string;
}

// --- Rolling Window ---

export interface RollingWindowStats {
  windowSize: number;
  gamesInWindow: number;
  asOfDate: string;
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  tsPct: number;
  efgPct: number;
  usgPct: number;
}
