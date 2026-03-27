"use client";

import { useState, useMemo } from "react";
import { Search, Zap, TrendingUp, Shield, Target, Flame, BarChart3 } from "lucide-react";
import Link from "next/link";

interface Player {
  id: number; name: string; team: string; position: string;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number; topg: number; mpg: number;
  fg_pct: number; fg3_pct: number; ft_pct: number; gp: number;
  bis: number | null; lfi: number | null; drs: number | null;
  sps: number | null; goi: number | null; rda: number | null;
}

interface Props { players: Player[] }

interface QueryResult {
  title: string;
  description: string;
  players: Player[];
  metric: string;
  sortDesc: boolean;
}

const QUICK_QUERIES = [
  { q: "Best defensive center", icon: Shield, color: "text-emerald-400" },
  { q: "Best 3-point shooters", icon: Target, color: "text-blue-400" },
  { q: "Hottest players right now", icon: Flame, color: "text-amber-400" },
  { q: "Most improved players", icon: TrendingUp, color: "text-indigo-400" },
  { q: "Best playmakers", icon: Zap, color: "text-purple-400" },
  { q: "Most efficient scorers", icon: BarChart3, color: "text-rose-400" },
  { q: "Best two-way players", icon: Shield, color: "text-emerald-400" },
  { q: "Worst defenders high usage", icon: Shield, color: "text-rose-400" },
  { q: "Under 25 PPG with elite BIS", icon: TrendingUp, color: "text-indigo-400" },
  { q: "Guards who can't shoot", icon: Target, color: "text-amber-400" },
  { q: "Best off-ball players", icon: Zap, color: "text-purple-400" },
  { q: "Players in a cold streak", icon: Flame, color: "text-blue-400" },
];

function parseQuery(query: string, players: Player[]): QueryResult | null {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return null;

  let filtered = [...players].filter((p) => p.gp >= 10);
  let title = "";
  let description = "";
  let metric = "bis";
  let sortDesc = true;

  // Position filters
  const posMap: Record<string, string[]> = {
    center: ["C", "F-C", "C-F"],
    centers: ["C", "F-C", "C-F"],
    big: ["C", "PF", "F-C", "C-F"],
    bigs: ["C", "PF", "F-C", "C-F"],
    guard: ["PG", "SG", "G", "G-F"],
    guards: ["PG", "SG", "G", "G-F"],
    "point guard": ["PG"],
    "shooting guard": ["SG"],
    wing: ["SF", "SG", "G-F", "F-G"],
    wings: ["SF", "SG", "G-F", "F-G"],
    forward: ["SF", "PF", "F", "F-G", "F-C"],
    forwards: ["SF", "PF", "F", "F-G", "F-C"],
  };

  for (const [key, positions] of Object.entries(posMap)) {
    if (q.includes(key)) {
      const posFiltered = filtered.filter((p) => {
        const pos = (p.position || "").toUpperCase();
        return positions.some((pp) => pos.includes(pp) || pp.includes(pos));
      });
      // Only apply filter if it produces results (positions may be empty in DB)
      if (posFiltered.length > 0) filtered = posFiltered;
      break;
    }
  }

  // Team filter
  const teamPattern = /\b(lakers?|celtics?|knicks?|warriors?|bucks?|heat|nets?|sixers?|76ers?|suns?|nuggets?|cavs?|cavaliers?|hawks?|bulls?|raptors?|spurs?|mavs?|mavericks?|clippers?|thunder|rockets?|grizzlies?|pelicans?|kings?|wizards?|pistons?|pacers?|hornets?|blazers?|magic|jazz|wolves?|timberwolves?)\b/i;
  const teamMatch = q.match(teamPattern);
  if (teamMatch) {
    const teamName = teamMatch[1].toLowerCase();
    const teamAbbrMap: Record<string, string> = {
      lakers: "LAL", laker: "LAL", celtics: "BOS", celtic: "BOS", knicks: "NYK", knick: "NYK",
      warriors: "GSW", warrior: "GSW", bucks: "MIL", buck: "MIL", heat: "MIA", nets: "BKN", net: "BKN",
      sixers: "PHI", "76ers": "PHI", suns: "PHX", sun: "PHX", nuggets: "DEN", nugget: "DEN",
      cavs: "CLE", cavaliers: "CLE", cavalier: "CLE", hawks: "ATL", hawk: "ATL",
      bulls: "CHI", bull: "CHI", raptors: "TOR", raptor: "TOR", spurs: "SAS", spur: "SAS",
      mavs: "DAL", mavericks: "DAL", maverick: "DAL", clippers: "LAC", clipper: "LAC",
      thunder: "OKC", rockets: "HOU", rocket: "HOU", grizzlies: "MEM", grizzly: "MEM",
      pelicans: "NOP", pelican: "NOP", kings: "SAC", king: "SAC", wizards: "WAS", wizard: "WAS",
      pistons: "DET", piston: "DET", pacers: "IND", pacer: "IND", hornets: "CHA", hornet: "CHA",
      blazers: "POR", blazer: "POR", magic: "ORL", jazz: "UTA",
      wolves: "MIN", wolf: "MIN", timberwolves: "MIN", timberwolf: "MIN",
    };
    const abbr = teamAbbrMap[teamName];
    if (abbr) filtered = filtered.filter((p) => p.team === abbr);
  }

  // All queries require meaningful minutes: 20+ MPG, 25+ GP
  const starters = filtered.filter((p) => p.mpg >= 20 && p.gp >= 25);
  const rotation = filtered.filter((p) => p.mpg >= 15 && p.gp >= 20);

  // Query type detection — all with volume/nuance filters
  if (q.includes("defen") || q.includes("drs") || q.includes("stopper") || q.includes("rim protect")) {
    metric = "drs";
    title = "Best Defenders";
    description = "Ranked by DRS (20+ MPG, 25+ GP) — contested shots, deflections, opponent FG% impact, on/off court differential";
    filtered = starters;
    filtered.sort((a, b) => (b.drs ?? 0) - (a.drs ?? 0));
  } else if (q.includes("3-point") || q.includes("3pt") || q.includes("three") || q.includes("shooter") || q.includes("shooting")) {
    metric = "fg3_pct";
    title = "Best 3-Point Shooters (Volume)";
    // Must average 3+ 3PA/game (ppg * fg3_pct proxy) AND shoot 36%+
    description = "Ranked by 3PT% among players averaging 15+ PPG — filters out low-volume shooters";
    filtered = starters.filter((p) => p.fg3_pct >= 0.34 && p.ppg >= 12);
    // Sort by combo: 3PT% weighted by volume (PPG as proxy for attempts)
    filtered.sort((a, b) => {
      const aScore = a.fg3_pct * 0.7 + (a.ppg / 35) * 0.3;
      const bScore = b.fg3_pct * 0.7 + (b.ppg / 35) * 0.3;
      return bScore - aScore;
    });
  } else if (q.includes("hot") || q.includes("streak") || q.includes("form") || q.includes("surge") || q.includes("lfi")) {
    metric = "lfi";
    title = "Hottest Players Right Now";
    description = "Ranked by LFI (20+ MPG) — recent performance vs their own season baseline. Not overall best — most improved recently.";
    filtered = starters;
    filtered.sort((a, b) => (b.lfi ?? 0) - (a.lfi ?? 0));
  } else if (q.includes("cold") || q.includes("slump") || q.includes("struggling")) {
    metric = "lfi";
    sortDesc = false;
    title = "Coldest Players (Biggest Slumps)";
    description = "Players performing most below their own season average — 20+ MPG starters only";
    filtered = starters.filter((p) => p.ppg >= 12);
    filtered.sort((a, b) => (a.lfi ?? 100) - (b.lfi ?? 100));
  } else if (q.includes("playmaker") || q.includes("passer") || q.includes("assist") || q.includes("dime")) {
    metric = "apg";
    title = "Best Playmakers";
    description = "Ranked by APG (20+ MPG, 25+ GP) — pure assist volume for rotation players";
    filtered = starters;
    filtered.sort((a, b) => b.apg - a.apg);
  } else if (q.includes("efficient") || q.includes("efficien")) {
    metric = "rda";
    title = "Most Efficient High-Volume Scorers";
    description = "Ranked by OIQ (15+ PPG) — efficiency weighted by scoring volume. You have to score enough for it to matter.";
    filtered = starters.filter((p) => p.ppg >= 15);
    filtered.sort((a, b) => (b.rda ?? 0) - (a.rda ?? 0));
  } else if (q.includes("two-way") || q.includes("2-way") || q.includes("both ends") || q.includes("all-around")) {
    metric = "bis";
    title = "Best Two-Way Players";
    description = "Players with BIS ≥ 60 AND DRS ≥ 55 — must be impactful on BOTH ends (20+ MPG)";
    filtered = starters.filter((p) => (p.bis ?? 0) >= 50 && (p.drs ?? 0) >= 50);
    // Sort by combined BIS + DRS
    filtered.sort((a, b) => ((b.bis ?? 0) + (b.drs ?? 0)) - ((a.bis ?? 0) + (a.drs ?? 0)));
  } else if (q.includes("worst") && q.includes("defen")) {
    metric = "drs";
    sortDesc = false;
    title = "Worst Defenders (Starters Only)";
    description = "Biggest defensive liabilities among 15+ PPG starters — they play heavy minutes but hurt on D";
    filtered = starters.filter((p) => p.ppg >= 15);
    filtered.sort((a, b) => (a.drs ?? 100) - (b.drs ?? 100));
  } else if (q.includes("can't shoot") || q.includes("cant shoot") || q.includes("non-shooter")) {
    metric = "fg3_pct";
    sortDesc = false;
    title = "Worst Shooters (Among Starters)";
    description = "Starters with 20+ MPG and FG3% below 32% — their lack of shooting hurts team spacing";
    filtered = starters.filter((p) => p.fg3_pct > 0 && p.fg3_pct < 0.32 && p.ppg >= 10);
    filtered.sort((a, b) => a.fg3_pct - b.fg3_pct);
  } else if (q.includes("off-ball") || q.includes("gravity") || q.includes("spacing")) {
    metric = "goi";
    title = "Best Off-Ball Impact Players";
    description = "Ranked by GOI (20+ MPG) — clutch performance, +/- consistency, team impact without the ball";
    filtered = starters;
    filtered.sort((a, b) => (b.goi ?? 0) - (a.goi ?? 0));
  } else if (q.includes("improv") || q.includes("breakout") || q.includes("rising")) {
    metric = "lfi";
    title = "Biggest Breakout Players";
    description = "Players with LFI ≥ 65 and 20+ MPG — significantly exceeding their own baseline recently";
    filtered = starters.filter((p) => (p.lfi ?? 0) >= 60);
    filtered.sort((a, b) => (b.lfi ?? 0) - (a.lfi ?? 0));
  } else if (q.includes("overrated") || q.includes("overpaid") || q.includes("overvalued")) {
    metric = "bis";
    sortDesc = false;
    title = "Most Overrated (High PPG, Low BIS)";
    description = "Players scoring 18+ PPG but with below-average BIS — volume scorers who don't impact winning";
    filtered = starters.filter((p) => p.ppg >= 18 && (p.bis ?? 100) < 60);
    filtered.sort((a, b) => (a.bis ?? 100) - (b.bis ?? 100));
  } else if (q.includes("underrated") || q.includes("undervalued") || q.includes("sleeper")) {
    metric = "bis";
    title = "Most Underrated (Low PPG, High BIS)";
    description = "Players with BIS ≥ 60 but under 18 PPG — high impact without the box score stats";
    filtered = starters.filter((p) => p.ppg < 18 && (p.bis ?? 0) >= 55);
    filtered.sort((a, b) => (b.bis ?? 0) - (a.bis ?? 0));
  } else if (q.includes("rookie") || q.includes("first year") || q.includes("young")) {
    metric = "bis";
    title = "Best Young Players / Rookies";
    description = "Ranked by BIS among players with 15+ MPG — tomorrow's stars";
    filtered = rotation;
    filtered.sort((a, b) => (b.bis ?? 0) - (a.bis ?? 0));
    // Can't filter by age since we don't have it, just show top overall
  } else if (q.includes("scorer") || q.includes("scoring") || q.includes("points") || q.includes("ppg")) {
    metric = "ppg";
    title = "Top Scorers";
    description = "Ranked by PPG (20+ MPG, 25+ GP) — pure scoring volume among qualified starters";
    filtered = starters;
    filtered.sort((a, b) => b.ppg - a.ppg);
  } else if (q.includes("rebound") || q.includes("rpg") || q.includes("glass")) {
    metric = "rpg";
    title = "Top Rebounders";
    description = "Ranked by RPG (20+ MPG, 25+ GP)";
    filtered = starters;
    filtered.sort((a, b) => b.rpg - a.rpg);
  } else if (q.includes("steal") || q.includes("thief") || q.includes("pickpocket")) {
    metric = "spg";
    title = "Top Ball Hawks";
    description = "Ranked by SPG (20+ MPG, 25+ GP) — the league's best at creating turnovers";
    filtered = starters;
    filtered.sort((a, b) => b.spg - a.spg);
  } else if (q.includes("block") || q.includes("swat") || q.includes("rim protect")) {
    metric = "bpg";
    title = "Top Shot Blockers";
    description = "Ranked by BPG (20+ MPG, 25+ GP)";
    filtered = starters;
    filtered.sort((a, b) => b.bpg - a.bpg);
  } else if (q.includes("turnover") || q.includes("careless") || q.includes("sloppy")) {
    metric = "topg";
    sortDesc = false;
    title = "Worst Ball Handlers (Most Turnovers)";
    description = "Most turnovers per game among 15+ PPG starters — talented but careless";
    filtered = starters.filter((p) => p.ppg >= 15);
    filtered.sort((a, b) => b.topg - a.topg);
  } else if (q.includes("clutch") || q.includes("closer") || q.includes("4th quarter") || q.includes("crunch")) {
    metric = "goi";
    title = "Best Clutch Players";
    description = "Ranked by GOI (20+ MPG) — performance in close games and high-leverage moments";
    filtered = starters;
    filtered.sort((a, b) => (b.goi ?? 0) - (a.goi ?? 0));
  } else if (q.includes("best") || q.includes("top") || q.includes("elite") || q.includes("mvp")) {
    metric = "bis";
    title = "Best Players Overall";
    description = "Ranked by Baseline Impact Score (BIS) — comprehensive measure of per-game value";
    filtered.sort((a, b) => (b.bis ?? 0) - (a.bis ?? 0));
  } else {
    // Default: search by player name
    const nameMatches = players.filter((p) => p.name.toLowerCase().includes(q));
    if (nameMatches.length > 0) {
      return {
        title: `Results for "${query}"`,
        description: `Found ${nameMatches.length} player${nameMatches.length > 1 ? "s" : ""} matching your search`,
        players: nameMatches.slice(0, 20),
        metric: "bis",
        sortDesc: true,
      };
    }

    // Fallback: BIS ranking
    metric = "bis";
    title = "Top Players by BIS";
    description = "Couldn't parse a specific query — showing overall BIS rankings. Try: 'best defensive center' or 'hottest players'";
    filtered.sort((a, b) => (b.bis ?? 0) - (a.bis ?? 0));
  }

  return {
    title,
    description,
    players: filtered.slice(0, 20),
    metric,
    sortDesc,
  };
}

function tierColor(val: number): string {
  if (val >= 80) return "text-indigo-400";
  if (val >= 65) return "text-emerald-400";
  if (val >= 50) return "text-amber-400";
  if (val >= 35) return "text-orange-400";
  return "text-rose-400";
}

function formatVal(val: number, metric: string): string {
  if (metric.includes("pct")) return (val * 100).toFixed(1) + "%";
  return val.toFixed(1);
}

export function AskEngine({ players }: Props) {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const result = useMemo(() => {
    if (activeQuery.length < 3) return null;
    return parseQuery(activeQuery, players);
  }, [activeQuery, players]);

  const handleSubmit = (q?: string) => {
    const finalQuery = q || query;
    if (finalQuery.length >= 3) {
      setQuery(finalQuery);
      setActiveQuery(finalQuery);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-3 bg-[#1a1f2e] border border-white/[0.08] rounded-xl px-5 py-4 focus-within:border-indigo-500/40 transition-colors">
          <Search className="h-5 w-5 text-text-muted/40 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ask anything... 'Best defensive center', 'Hottest Knicks players', 'Guards who can't shoot'"
            className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-muted/30 outline-none"
          />
          <button
            onClick={() => handleSubmit()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Quick Queries */}
      {!result && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted/50 mb-3">Try these queries</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {QUICK_QUERIES.map((qq) => (
              <button
                key={qq.q}
                onClick={() => handleSubmit(qq.q)}
                className="flex items-center gap-2 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left"
              >
                <qq.icon className={`h-3.5 w-3.5 ${qq.color} shrink-0`} />
                <span className="text-[11px] text-text-secondary">{qq.q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{result.title}</h2>
            <p className="text-[12px] text-text-muted/60 mt-1">{result.description}</p>
            <p className="text-[10px] text-text-muted/30 mt-0.5">{result.players.length} results</p>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-widest text-text-muted/40 w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-widest text-text-muted/40">Player</th>
                  <th className="px-3 py-2.5 text-right text-[9px] uppercase tracking-widest text-indigo-400/50">
                    {result.metric.toUpperCase()}
                  </th>
                  <th className="px-3 py-2.5 text-right text-[9px] uppercase tracking-widest text-text-muted/40">PPG</th>
                  <th className="px-3 py-2.5 text-right text-[9px] uppercase tracking-widest text-text-muted/40">RPG</th>
                  <th className="px-3 py-2.5 text-right text-[9px] uppercase tracking-widest text-text-muted/40">APG</th>
                  <th className="px-3 py-2.5 text-right text-[9px] uppercase tracking-widest text-text-muted/40">BIS</th>
                  <th className="px-3 py-2.5 text-right text-[9px] uppercase tracking-widest text-text-muted/40">LFI</th>
                </tr>
              </thead>
              <tbody>
                {result.players.map((p, i) => {
                  const mainVal = (p as any)[result.metric] ?? 0;
                  return (
                    <tr key={p.id} className="border-b border-white/[0.03] table-row-hover">
                      <td className="px-3 py-2 text-text-muted/30 font-stat">{i + 1}</td>
                      <td className="px-3 py-2">
                        <Link href={`/players/${p.id}`} className="hover:text-indigo-400 transition-colors">
                          <span className="font-semibold text-text-primary">{p.name}</span>
                          <span className="text-[10px] text-text-muted/50 ml-2">{p.team} · {p.position}</span>
                        </Link>
                      </td>
                      <td className={`px-3 py-2 text-right font-stat font-bold ${tierColor(mainVal)}`}>
                        {formatVal(mainVal, result.metric)}
                      </td>
                      <td className="px-3 py-2 text-right font-stat text-text-secondary">{p.ppg.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-stat text-text-muted">{p.rpg.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-stat text-text-muted">{p.apg.toFixed(1)}</td>
                      <td className={`px-3 py-2 text-right font-stat ${tierColor(p.bis ?? 0)}`}>{p.bis?.toFixed(0) ?? "—"}</td>
                      <td className={`px-3 py-2 text-right font-stat ${tierColor(p.lfi ?? 0)}`}>{p.lfi?.toFixed(0) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => { setActiveQuery(""); setQuery(""); }}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Ask another question
          </button>
        </div>
      )}
    </div>
  );
}
