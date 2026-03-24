// ============================================================
// NBA Real Data — Team IDs, Colors, Player IDs
// All logo/headshot URLs use official NBA CDN (no API key needed)
// ============================================================

export interface NBATeam {
  id: number;
  abbr: string;
  name: string;
  city: string;
  conference: "East" | "West";
  color: string;
  colorAlt: string;
}

export const NBA_TEAMS: Record<string, NBATeam> = {
  ATL: { id: 1610612737, abbr: "ATL", name: "Hawks", city: "Atlanta", conference: "East", color: "#E03A3E", colorAlt: "#C1D32F" },
  BOS: { id: 1610612738, abbr: "BOS", name: "Celtics", city: "Boston", conference: "East", color: "#007A33", colorAlt: "#BA9653" },
  BKN: { id: 1610612751, abbr: "BKN", name: "Nets", city: "Brooklyn", conference: "East", color: "#000000", colorAlt: "#FFFFFF" },
  CHA: { id: 1610612766, abbr: "CHA", name: "Hornets", city: "Charlotte", conference: "East", color: "#1D1160", colorAlt: "#00788C" },
  CHI: { id: 1610612741, abbr: "CHI", name: "Bulls", city: "Chicago", conference: "East", color: "#CE1141", colorAlt: "#000000" },
  CLE: { id: 1610612739, abbr: "CLE", name: "Cavaliers", city: "Cleveland", conference: "East", color: "#860038", colorAlt: "#FDBB30" },
  DAL: { id: 1610612742, abbr: "DAL", name: "Mavericks", city: "Dallas", conference: "West", color: "#00538C", colorAlt: "#002B5E" },
  DEN: { id: 1610612743, abbr: "DEN", name: "Nuggets", city: "Denver", conference: "West", color: "#0E2240", colorAlt: "#FEC524" },
  DET: { id: 1610612765, abbr: "DET", name: "Pistons", city: "Detroit", conference: "East", color: "#C8102E", colorAlt: "#1D42BA" },
  GSW: { id: 1610612744, abbr: "GSW", name: "Warriors", city: "Golden State", conference: "West", color: "#1D428A", colorAlt: "#FFC72C" },
  HOU: { id: 1610612745, abbr: "HOU", name: "Rockets", city: "Houston", conference: "West", color: "#CE1141", colorAlt: "#000000" },
  IND: { id: 1610612754, abbr: "IND", name: "Pacers", city: "Indiana", conference: "East", color: "#002D62", colorAlt: "#FDBB30" },
  LAC: { id: 1610612746, abbr: "LAC", name: "Clippers", city: "LA", conference: "West", color: "#C8102E", colorAlt: "#1D428A" },
  LAL: { id: 1610612747, abbr: "LAL", name: "Lakers", city: "Los Angeles", conference: "West", color: "#552583", colorAlt: "#FDB927" },
  MEM: { id: 1610612763, abbr: "MEM", name: "Grizzlies", city: "Memphis", conference: "West", color: "#5D76A9", colorAlt: "#12173F" },
  MIA: { id: 1610612748, abbr: "MIA", name: "Heat", city: "Miami", conference: "East", color: "#98002E", colorAlt: "#F9A01B" },
  MIL: { id: 1610612749, abbr: "MIL", name: "Bucks", city: "Milwaukee", conference: "East", color: "#00471B", colorAlt: "#EEE1C6" },
  MIN: { id: 1610612750, abbr: "MIN", name: "Timberwolves", city: "Minnesota", conference: "West", color: "#0C2340", colorAlt: "#236192" },
  NOP: { id: 1610612740, abbr: "NOP", name: "Pelicans", city: "New Orleans", conference: "West", color: "#0C2340", colorAlt: "#C8102E" },
  NYK: { id: 1610612752, abbr: "NYK", name: "Knicks", city: "New York", conference: "East", color: "#006BB6", colorAlt: "#F58426" },
  OKC: { id: 1610612760, abbr: "OKC", name: "Thunder", city: "Oklahoma City", conference: "West", color: "#007AC1", colorAlt: "#EF6100" },
  ORL: { id: 1610612753, abbr: "ORL", name: "Magic", city: "Orlando", conference: "East", color: "#0077C0", colorAlt: "#C4CED4" },
  PHI: { id: 1610612755, abbr: "PHI", name: "76ers", city: "Philadelphia", conference: "East", color: "#006BB6", colorAlt: "#ED174C" },
  PHX: { id: 1610612756, abbr: "PHX", name: "Suns", city: "Phoenix", conference: "West", color: "#1D1160", colorAlt: "#E56020" },
  POR: { id: 1610612757, abbr: "POR", name: "Trail Blazers", city: "Portland", conference: "West", color: "#E03A3E", colorAlt: "#000000" },
  SAC: { id: 1610612758, abbr: "SAC", name: "Kings", city: "Sacramento", conference: "West", color: "#5A2D81", colorAlt: "#63727A" },
  SAS: { id: 1610612759, abbr: "SAS", name: "Spurs", city: "San Antonio", conference: "West", color: "#C4CED4", colorAlt: "#000000" },
  TOR: { id: 1610612761, abbr: "TOR", name: "Raptors", city: "Toronto", conference: "East", color: "#CE1141", colorAlt: "#000000" },
  UTA: { id: 1610612762, abbr: "UTA", name: "Jazz", city: "Utah", conference: "West", color: "#002B5C", colorAlt: "#00471B" },
  WAS: { id: 1610612764, abbr: "WAS", name: "Wizards", city: "Washington", conference: "East", color: "#002B5C", colorAlt: "#E31837" },
};

// Top players with NBA.com player IDs for headshot URLs
export interface NBAPlayer {
  id: number;       // NBA.com player ID
  name: string;
  team: string;     // team abbr
  pos: string;
  number: string;
}

export const NBA_PLAYERS: Record<string, NBAPlayer> = {
  "nikola-jokic":             { id: 203999,  name: "Nikola Jokic",             team: "DEN", pos: "C",  number: "15" },
  "shai-gilgeous-alexander":  { id: 1628983, name: "Shai Gilgeous-Alexander",  team: "OKC", pos: "PG", number: "2" },
  "luka-doncic":              { id: 1629029, name: "Luka Doncic",              team: "DAL", pos: "PG", number: "77" },
  "giannis-antetokounmpo":    { id: 203507,  name: "Giannis Antetokounmpo",    team: "MIL", pos: "PF", number: "34" },
  "jayson-tatum":             { id: 1628369, name: "Jayson Tatum",             team: "BOS", pos: "SF", number: "0" },
  "anthony-edwards":          { id: 1630162, name: "Anthony Edwards",          team: "MIN", pos: "SG", number: "5" },
  "joel-embiid":              { id: 203954,  name: "Joel Embiid",              team: "PHI", pos: "C",  number: "21" },
  "kevin-durant":             { id: 201142,  name: "Kevin Durant",             team: "PHX", pos: "SF", number: "35" },
  "lebron-james":             { id: 2544,    name: "LeBron James",             team: "LAL", pos: "SF", number: "23" },
  "tyrese-haliburton":        { id: 1630169, name: "Tyrese Haliburton",        team: "IND", pos: "PG", number: "0" },
  "jaylen-brown":             { id: 1627759, name: "Jaylen Brown",             team: "BOS", pos: "SG", number: "7" },
  "kristaps-porzingis":       { id: 204001,  name: "Kristaps Porzingis",       team: "BOS", pos: "C",  number: "8" },
  "derrick-white":            { id: 1628401, name: "Derrick White",            team: "BOS", pos: "PG", number: "9" },
  "jrue-holiday":             { id: 201950,  name: "Jrue Holiday",             team: "BOS", pos: "PG", number: "4" },
  "deaaron-fox":              { id: 1628368, name: "De'Aaron Fox",             team: "SAC", pos: "PG", number: "5" },
  "tyrese-maxey":             { id: 1630178, name: "Tyrese Maxey",             team: "PHI", pos: "PG", number: "0" },
  "anthony-davis":            { id: 203076,  name: "Anthony Davis",            team: "LAL", pos: "PF", number: "3" },
  "ja-morant":                { id: 1629630, name: "Ja Morant",                team: "MEM", pos: "PG", number: "12" },
  "austin-reaves":            { id: 1630559, name: "Austin Reaves",            team: "LAL", pos: "SG", number: "15" },
  "stephen-curry":            { id: 201939,  name: "Stephen Curry",            team: "GSW", pos: "PG", number: "30" },
  "donovan-mitchell":         { id: 1628378, name: "Donovan Mitchell",         team: "CLE", pos: "SG", number: "45" },
  "jalen-brunson":            { id: 1628973, name: "Jalen Brunson",            team: "NYK", pos: "PG", number: "11" },
  "devin-booker":             { id: 1626164, name: "Devin Booker",             team: "PHX", pos: "SG", number: "1" },
  "jimmy-butler":             { id: 202710,  name: "Jimmy Butler",             team: "MIA", pos: "SF", number: "22" },
  "damian-lillard":           { id: 203081,  name: "Damian Lillard",           team: "MIL", pos: "PG", number: "0" },
};

// ============================================================
// URL Helpers
// ============================================================

/** Get team logo URL from NBA CDN */
export function getTeamLogoUrl(teamId: number): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`;
}

/** Get team logo URL by abbreviation */
export function getTeamLogoByAbbr(abbr: string): string {
  const team = NBA_TEAMS[abbr];
  if (!team) return "";
  return getTeamLogoUrl(team.id);
}

/** Get player headshot URL from NBA CDN */
export function getPlayerHeadshotUrl(playerId: number): string {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
}

/** Get player headshot by slug */
export function getPlayerHeadshotBySlug(slug: string): string {
  const player = NBA_PLAYERS[slug];
  if (!player) return "";
  return getPlayerHeadshotUrl(player.id);
}

/** Get team info by abbreviation */
export function getTeam(abbr: string): NBATeam | undefined {
  return NBA_TEAMS[abbr];
}

/** Find player by name (fuzzy) */
export function findPlayerByName(name: string): NBAPlayer | undefined {
  const lower = name.toLowerCase();
  return Object.values(NBA_PLAYERS).find(
    (p) => p.name.toLowerCase() === lower || p.name.toLowerCase().includes(lower)
  );
}
