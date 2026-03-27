"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { RadarChart } from "@/components/ui/radar-chart";
import { ScoreOrb } from "@/components/ui/score-orb";
import { MetricTooltip } from "@/components/shared/metric-tooltip";
import { Search, X, User, Filter, ChevronDown, Trophy, Download } from "lucide-react";
import { toPng } from "html-to-image";
import { getPlayerHeadshotUrl, getTeamLogoByAbbr } from "@/lib/nba-data";
import { tierClass, num } from "@/lib/formatting";

interface SearchResult {
  id: number;
  label: string;
  sublabel: string;
  score: number | null;
}

const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"];

function PlayerSearch({ onSelect, selected, slot, allPlayers }: {
  onSelect: (id: number) => void;
  selected: any;
  slot: number;
  allPlayers: SearchResult[];
}) {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => {
    let list = allPlayers;
    if (posFilter !== "All") {
      list = list.filter((p) => p.sublabel.includes(posFilter));
    }
    if (query.length >= 1) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.label.toLowerCase().includes(q));
    }
    return list.slice(0, 30);
  }, [allPlayers, query, posFilter]);

  return (
    <GlassCard className="relative">
      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder={`Search player ${slot}...`}
          className="w-full border-0 border-b border-[rgba(129,140,248,0.12)] bg-transparent pl-9 pr-10 py-2.5 text-[13px] font-mono text-text-primary placeholder-text-muted/50 focus:border-[rgba(129,140,248,0.5)] focus:outline-none transition-all"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${showFilters ? "text-indigo-400" : "text-text-muted/40 hover:text-text-muted"}`}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Position filter chips */}
      {showFilters && (
        <div className="flex items-center gap-1 mb-3">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => { setPosFilter(pos); setShowResults(true); }}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                posFilter === pos
                  ? "bg-[rgba(129,140,248,0.1)] text-indigo-400 border border-[rgba(129,140,248,0.2)]"
                  : "text-text-muted/50 border border-transparent hover:text-text-muted"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {showResults && results.length > 0 && (query.length >= 1 || posFilter !== "All") && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowResults(false)} />
          <div className="absolute left-0 right-0 top-[72px] z-30 mx-5 border border-[rgba(129,140,248,0.15)] max-h-56 overflow-y-auto rounded-md"
            style={{ background: "rgba(10, 18, 35, 0.98)" }}
          >
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => { onSelect(r.id); setQuery(""); setShowResults(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[rgba(129,140,248,0.06)] transition-colors"
              >
                <User className="h-3 w-3 text-text-muted/50" />
                <span className="font-semibold text-[12px]">{r.label}</span>
                <span className="text-[10px] text-text-muted ml-auto">{r.sublabel}</span>
                {r.score != null && (
                  <span className={`font-stat text-[10px] font-bold ${tierClass(r.score)}`}>{r.score.toFixed(0)}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Selected player display */}
      {selected ? (
        <div className="text-center mt-2">
          <button onClick={() => onSelect(0)} className="absolute top-3 right-3 text-text-muted/30 hover:text-rose-400 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex justify-center mb-3">
            <div className="relative h-16 w-16 rounded-sm overflow-hidden bg-white/[0.04] border border-white/[0.06]">
              <Image src={getPlayerHeadshotUrl(Number(selected.external_id))} alt={selected.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
            </div>
          </div>
          <p className="text-lg font-bold">{selected.full_name}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="relative h-4 w-4">
              <Image src={getTeamLogoByAbbr(selected.team_abbr)} alt={selected.team_abbr} fill className="object-contain" unoptimized />
            </div>
            <span className="text-[11px] text-text-muted">{selected.team_abbr} · {selected.position}</span>
          </div>
          <div className="mt-3">
            <ScoreOrb score={num(selected.bis_score) ?? 0} size="sm" label="BIS" />
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <User className="h-8 w-8 text-text-muted/20 mx-auto mb-2" />
          <p className="text-[12px] text-text-muted/40">Search or filter to find a player</p>
        </div>
      )}
    </GlassCard>
  );
}

function EmptyCompareState() {
  return (
    <div className="text-center py-12">
      <User className="h-10 w-10 text-text-muted/15 mx-auto mb-3" />
      <p className="text-sm text-text-muted/50">Select two players to compare</p>
      <p className="text-[11px] text-text-muted/30 mt-1.5">Try: Jokic vs Wembanyama, Brunson vs SGA, or Scottie vs Amen</p>
    </div>
  );
}

export default function ComparePage() {
  const [player1, setPlayer1] = useState<any>(null);
  const [player2, setPlayer2] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<SearchResult[]>([]);

  // Load all players on mount for filtering
  useEffect(() => {
    fetch("/api/search?q=__all__")
      .then((r) => r.json())
      .then((json) => {
        const players = (json.data ?? [])
          .filter((r: any) => r.type === "player")
          .map((r: any) => ({
            id: r.id,
            label: r.label,
            sublabel: r.sublabel,
            score: r.score != null ? Number(r.score) : null,
          }));
        setAllPlayers(players);
      })
      .catch(() => {});
  }, []);

  const loadPlayer = useCallback(async (id: number, slot: 1 | 2) => {
    if (id === 0) {
      if (slot === 1) setPlayer1(null);
      else setPlayer2(null);
      return;
    }
    setLoading(true);
    try {
      const current1 = slot === 1 ? id : player1?.id;
      const current2 = slot === 2 ? id : player2?.id;

      if (current1 && current2) {
        const res = await fetch(`/api/compare?p1=${current1}&p2=${current2}`);
        const json = await res.json();
        if (json.player1) setPlayer1(json.player1);
        if (json.player2) setPlayer2(json.player2);
      } else {
        const res = await fetch(`/api/compare?p1=${id}&p2=${id}`);
        const json = await res.json();
        if (slot === 1) setPlayer1(json.player1);
        else setPlayer2(json.player2);
      }
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [player1?.id, player2?.id]);

  const metricKeys = ["bis", "rda", "drs", "lfi", "sps", "goi"];
  const metricLabels = ["BIS", "OIQ", "DRS", "LFI", "PEM", "GOI"];

  const statComparisons = [
    { key: "ppg", label: "PPG" },
    { key: "rpg", label: "RPG" },
    { key: "apg", label: "APG" },
    { key: "spg", label: "SPG" },
    { key: "bpg", label: "BPG" },
    { key: "fg_pct", label: "FG%", isPct: true },
    { key: "fg3_pct", label: "3P%", isPct: true },
    { key: "ft_pct", label: "FT%", isPct: true },
    { key: "mpg", label: "MPG" },
  ];

  const compareRef = useRef<HTMLDivElement>(null);
  const hasComparison = player1 && player2;

  // Generate verdict
  const verdict = useMemo(() => {
    if (!hasComparison) return null;
    const metrics = metricKeys.map((k) => ({
      key: k,
      v1: num(player1[`${k}_score`]) ?? 0,
      v2: num(player2[`${k}_score`]) ?? 0,
    }));
    const p1Wins = metrics.filter((m) => m.v1 > m.v2).length;
    const p2Wins = metrics.filter((m) => m.v2 > m.v1).length;
    const bis1 = num(player1.bis_score) ?? 0;
    const bis2 = num(player2.bis_score) ?? 0;
    const lfi1 = num(player1.lfi_score) ?? 0;
    const lfi2 = num(player2.lfi_score) ?? 0;
    const drs1 = num(player1.drs_score) ?? 0;
    const drs2 = num(player2.drs_score) ?? 0;

    let winner = bis1 >= bis2 ? 1 : 2;
    let margin = Math.abs(bis1 - bis2);
    let verdict = "";
    let detail = "";

    if (margin < 3) {
      verdict = "Too close to call";
      detail = `These two are virtually identical by BIS (${bis1.toFixed(0)} vs ${bis2.toFixed(0)}). The tiebreaker comes down to fit and role.`;
    } else if (margin < 10) {
      const w = winner === 1 ? player1 : player2;
      const l = winner === 1 ? player2 : player1;
      verdict = `${w.full_name.split(" ").pop()} has the edge`;
      detail = `${w.full_name} leads ${p1Wins > p2Wins ? p1Wins : p2Wins}-${Math.min(p1Wins, p2Wins)} across 6 CourtVision metrics. Close matchup but ${w.full_name.split(" ")[0]} is the more complete player right now.`;
    } else {
      const w = winner === 1 ? player1 : player2;
      const l = winner === 1 ? player2 : player1;
      verdict = `${w.full_name.split(" ").pop()} clearly`;
      detail = `${w.full_name} is a tier above with a BIS of ${(winner === 1 ? bis1 : bis2).toFixed(0)} vs ${(winner === 1 ? bis2 : bis1).toFixed(0)}. Wins ${Math.max(p1Wins, p2Wins)} of 6 metric categories.`;
    }

    // Add form context
    if (Math.abs(lfi1 - lfi2) > 15) {
      const hotter = lfi1 > lfi2 ? player1 : player2;
      detail += ` ${hotter.full_name.split(" ")[0]} is currently in much better form (LFI ${Math.max(lfi1, lfi2).toFixed(0)} vs ${Math.min(lfi1, lfi2).toFixed(0)}).`;
    }

    // Add defensive context
    if (Math.abs(drs1 - drs2) > 15) {
      const betterD = drs1 > drs2 ? player1 : player2;
      detail += ` ${betterD.full_name.split(" ")[0]} is significantly better defensively (DRS ${Math.max(drs1, drs2).toFixed(0)} vs ${Math.min(drs1, drs2).toFixed(0)}).`;
    }

    return { winner, verdict, detail, p1Wins, p2Wins };
  }, [hasComparison, player1, player2, metricKeys]);

  const handleDownload = useCallback(async () => {
    if (!compareRef.current) return;
    try {
      const dataUrl = await toPng(compareRef.current, { backgroundColor: "#0a0e1a", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `courtvision-compare-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error(err); }
  }, []);

  const radarDatasets: any[] = [];
  if (player1) {
    radarDatasets.push({
      label: player1.full_name,
      data: metricKeys.map((k) => num(player1[`${k}_score`]) ?? 0),
      color: "#818cf8",
    });
  }
  if (player2) {
    radarDatasets.push({
      label: player2.full_name,
      data: metricKeys.map((k) => num(player2[`${k}_score`]) ?? 0),
      color: "#f0a500",
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Compare</h1>
        <p className="text-sm text-text-muted mt-1">Side-by-side player evaluation — filter by position, team, and metrics</p>
      </div>

      {/* Player selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlayerSearch onSelect={(id) => loadPlayer(id, 1)} selected={player1} slot={1} allPlayers={allPlayers} />
        <PlayerSearch onSelect={(id) => loadPlayer(id, 2)} selected={player2} slot={2} allPlayers={allPlayers} />
      </div>

      {!hasComparison && <EmptyCompareState />}

      {hasComparison && (
        <>
          {/* Verdict */}
          {verdict && (
            <GlassCard variant="accent">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">The Verdict</span>
                <button onClick={handleDownload} className="ml-auto flex items-center gap-1 text-[10px] text-text-muted hover:text-indigo-400 transition-colors border border-white/[0.08] rounded px-2 py-1">
                  <Download className="h-3 w-3" /> Download PNG
                </button>
              </div>
              <p className="text-lg font-bold text-text-primary mb-1">{verdict.verdict}</p>
              <p className="text-[12px] text-text-secondary leading-relaxed">{verdict.detail}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-[10px] text-indigo-400 font-stat font-bold">{player1.full_name.split(" ").pop()}: {verdict.p1Wins} wins</span>
                <span className="text-[10px] text-amber-400 font-stat font-bold">{player2.full_name.split(" ").pop()}: {verdict.p2Wins} wins</span>
                <span className="text-[10px] text-text-muted/40 font-stat">{6 - verdict.p1Wins - verdict.p2Wins} ties</span>
              </div>
            </GlassCard>
          )}

          {/* Radar Chart (downloadable) */}
          <div ref={compareRef}>
          <GlassCard>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Metric Overlay</h2>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                <span className="text-xs text-text-secondary">{player1.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-xs text-text-secondary">{player2.full_name}</span>
              </div>
            </div>
            <RadarChart labels={metricLabels} datasets={radarDatasets} maxValue={100} size={300} />
          </GlassCard>

          {/* Metric Comparison Table */}
          <GlassCard>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">CourtVision Metrics</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">
                    <th className="pb-3 text-left">Metric</th>
                    <th className="pb-3 text-right">{player1.full_name.split(" ").pop()}</th>
                    <th className="pb-3 text-center w-24">VS</th>
                    <th className="pb-3 text-left">{player2.full_name.split(" ").pop()}</th>
                    <th className="pb-3 text-right">Edge</th>
                  </tr>
                </thead>
                <tbody>
                  {metricKeys.map((key, i) => {
                    const v1 = num(player1[`${key}_score`]) ?? 0;
                    const v2 = num(player2[`${key}_score`]) ?? 0;
                    const diff = v1 - v2;
                    const total = v1 + v2 || 1;
                    return (
                      <tr key={key} className="border-b border-white/[0.03] table-row-hover">
                        <td className="py-3 text-[12px] font-medium">
                          <MetricTooltip metricKey={key}>
                            <span className="text-text-secondary">{metricLabels[i]}</span>
                          </MetricTooltip>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`font-stat font-bold ${diff > 0 ? tierClass(v1) : "text-text-muted"}`}>{v1.toFixed(0)}</span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <div className="h-full rounded-l-full" style={{ width: `${(v1 / total) * 100}%`, background: "#818cf8" }} />
                            <div className="h-full rounded-r-full" style={{ width: `${(v2 / total) * 100}%`, background: "#f0a500" }} />
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`font-stat font-bold ${diff < 0 ? tierClass(v2) : "text-text-muted"}`}>{v2.toFixed(0)}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`font-stat text-[11px] font-semibold ${
                            diff > 0 ? "text-indigo-400" : diff < 0 ? "text-amber-400" : "text-text-muted"
                          }`}>
                            {diff > 0 ? `+${diff.toFixed(0)}` : diff < 0 ? `+${Math.abs(diff).toFixed(0)}` : "Even"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Traditional Stats Comparison */}
          <GlassCard>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Season Stats</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">
                    <th className="pb-3 text-left">Stat</th>
                    <th className="pb-3 text-right">{player1.full_name.split(" ").pop()}</th>
                    <th className="pb-3 text-right">{player2.full_name.split(" ").pop()}</th>
                  </tr>
                </thead>
                <tbody>
                  {statComparisons.map((s) => {
                    const v1 = num(player1[s.key]) ?? 0;
                    const v2 = num(player2[s.key]) ?? 0;
                    const d1 = s.isPct ? (v1 * 100).toFixed(1) : v1.toFixed(1);
                    const d2 = s.isPct ? (v2 * 100).toFixed(1) : v2.toFixed(1);
                    const raw1 = s.isPct ? v1 * 100 : v1;
                    const raw2 = s.isPct ? v2 * 100 : v2;
                    return (
                      <tr key={s.key} className="border-b border-white/[0.03] table-row-hover">
                        <td className="py-3 text-[12px] font-medium text-text-secondary">{s.label}</td>
                        <td className={`py-3 text-right font-stat font-bold ${raw1 > raw2 ? "text-text-primary" : "text-text-muted"}`}>{d1}</td>
                        <td className={`py-3 text-right font-stat font-bold ${raw2 > raw1 ? "text-text-primary" : "text-text-muted"}`}>{d2}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
          <div className="text-right py-1">
            <span className="text-[9px] text-text-muted/20 font-stat">courtvisionai.io</span>
          </div>
          </div>{/* close compareRef */}
        </>
      )}
    </div>
  );
}
