"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { toPng } from "html-to-image";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, Label
} from "recharts";
import { Download, Grid3X3, Trophy, BarChart3, TrendingUp, Zap, Users, Search, X, Twitter, Instagram, Monitor } from "lucide-react";

// ============================================================
// Types
// ============================================================

interface PlayerData {
  id: number; name: string; team: string; conference: string; position: string;
  gp: number; draftYear: number; injuryStatus: string;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
  mpg: number; topg: number;
  fg_pct: number; fg3_pct: number; ft_pct: number;
  ts_pct: number; usg_pct: number; per: number;
  bis: number | null; lfi: number | null; drs: number | null;
  sps: number | null; goi: number | null; rda: number | null;
}

interface TeamData {
  id: number; name: string; abbr: string;
  wins: number; losses: number;
  fg_pct: number; fg3_pct: number;
  ortg: number; drtg: number; net_rating: number; pace: number;
  tsc: number | null; ltfi: number | null; elo: number | null;
}

interface Props { players: PlayerData[]; teams: TeamData[]; }

type ChartType = "quadrant" | "tier-list" | "bar-compare" | "top10" | "matchup-card" | "stat-card";
type SocialSize = "twitter" | "instagram" | "wide";

const SOCIAL_SIZES: { id: SocialSize; label: string; icon: any; w: number; h: number }[] = [
  { id: "twitter", label: "Twitter", icon: Twitter, w: 1200, h: 675 },
  { id: "instagram", label: "Instagram", icon: Instagram, w: 1080, h: 1080 },
  { id: "wide", label: "Widescreen", icon: Monitor, w: 1400, h: 600 },
];

const CHART_TEMPLATES: { id: ChartType; label: string; desc: string; icon: any }[] = [
  { id: "quadrant", label: "Scatter Plot", desc: "Plot any two stats — find the overrated & underrated", icon: Grid3X3 },
  { id: "top10", label: "Top 10 List", desc: "Ranked leaderboard by any metric", icon: TrendingUp },
  { id: "bar-compare", label: "Bar Compare", desc: "Side-by-side bars for 2-8 players", icon: BarChart3 },
  { id: "tier-list", label: "Tier List", desc: "Group players into Elite / Great / Good / Avg / Below", icon: Trophy },
  { id: "stat-card", label: "Player Card", desc: "Single player stat card — perfect for Twitter", icon: Users },
  { id: "matchup-card", label: "Matchup Card", desc: "Head-to-head team preview", icon: Zap },
];

const METRICS = [
  { key: "bis", label: "BIS (Impact)", group: "CourtVision" },
  { key: "lfi", label: "LFI (Form)", group: "CourtVision" },
  { key: "drs", label: "DRS (Defense)", group: "CourtVision" },
  { key: "rda", label: "OIQ (Offense)", group: "CourtVision" },
  { key: "sps", label: "PEM (Playmaking)", group: "CourtVision" },
  { key: "goi", label: "GOI (Clutch)", group: "CourtVision" },
  { key: "ppg", label: "PPG", group: "Traditional" },
  { key: "rpg", label: "RPG", group: "Traditional" },
  { key: "apg", label: "APG", group: "Traditional" },
  { key: "spg", label: "SPG", group: "Traditional" },
  { key: "bpg", label: "BPG", group: "Traditional" },
  { key: "mpg", label: "MPG", group: "Traditional" },
  { key: "topg", label: "TOV", group: "Traditional" },
  { key: "fg_pct", label: "FG%", group: "Efficiency", isPct: true },
  { key: "fg3_pct", label: "3P%", group: "Efficiency", isPct: true },
  { key: "ft_pct", label: "FT%", group: "Efficiency", isPct: true },
  { key: "ts_pct", label: "TS%", group: "Efficiency", isPct: true },
  { key: "usg_pct", label: "USG%", group: "Efficiency", isPct: true },
  { key: "per", label: "PER", group: "Advanced" },
];

function tierColor(score: number): string {
  if (score >= 80) return "#818cf8";
  if (score >= 65) return "#34d399";
  if (score >= 50) return "#fbbf24";
  if (score >= 35) return "#f97316";
  return "#f43f5e";
}

function getVal(p: PlayerData, key: string): number {
  const v = (p as any)[key];
  return typeof v === "number" ? v : 0;
}

function fmtVal(val: number, key: string): string {
  const m = METRICS.find(x => x.key === key);
  if (m && (m as any).isPct) return (val * 100).toFixed(1) + "%";
  if (val >= 100) return val.toFixed(0);
  return val.toFixed(1);
}

// ============================================================
// Main Component
// ============================================================

export function StudioBuilder({ players, teams }: Props) {
  const [chartType, setChartType] = useState<ChartType>("quadrant");
  const [socialSize, setSocialSize] = useState<SocialSize>("twitter");
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerData[]>([]);
  const [xAxis, setXAxis] = useState("ppg");
  const [yAxis, setYAxis] = useState("bis");
  const [metric, setMetric] = useState("bis");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [confFilter, setConfFilter] = useState("All");
  const [minMpg, setMinMpg] = useState(0);
  const [expFilter, setExpFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("All");
  const [excludeInjured, setExcludeInjured] = useState(false);
  const [minGP, setMinGPStudio] = useState(0);
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [topN, setTopN] = useState(10);
  const [selectedPlayerCard, setSelectedPlayerCard] = useState<PlayerData | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Auto-title based on template
  const autoTitle = useMemo(() => {
    const metricLabel = METRICS.find(m => m.key === metric)?.label || metric;
    switch (chartType) {
      case "quadrant": return `${METRICS.find(m => m.key === xAxis)?.label} vs ${METRICS.find(m => m.key === yAxis)?.label}`;
      case "top10": return `Top ${topN} Players by ${metricLabel}`;
      case "bar-compare": return `Player Comparison — ${metricLabel}`;
      case "tier-list": return `${metricLabel} Tier List`;
      case "stat-card": return selectedPlayerCard?.name || "Player Card";
      case "matchup-card": return "Matchup Preview";
      default: return "CourtVision Chart";
    }
  }, [chartType, metric, xAxis, yAxis, topN, selectedPlayerCard]);

  const displayTitle = title || autoTitle;

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const size = SOCIAL_SIZES.find(s => s.id === socialSize)!;
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "#0a0e1a",
        pixelRatio: 2,
        width: size.w,
        height: size.h,
      });
      const link = document.createElement("a");
      link.download = `courtvision-${chartType}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, [chartType, socialSize]);

  const addPlayer = (p: PlayerData) => {
    if (!selectedPlayers.find(sp => sp.id === p.id)) {
      setSelectedPlayers([...selectedPlayers, p]);
    }
    setSearch("");
  };

  const allTeamAbbrs = useMemo(() =>
    [...new Set(players.map(p => p.team).filter(Boolean))].sort(),
    [players]
  );

  const getFilteredPlayers = useCallback(() => {
    return players.filter(p => {
      if (posFilter !== "All" && !p.position?.includes(posFilter)) return false;
      if (confFilter !== "All" && p.conference !== confFilter) return false;
      if (minMpg > 0 && p.mpg < minMpg) return false;
      if (teamFilter !== "All" && p.team !== teamFilter) return false;
      if (excludeInjured && (p.injuryStatus === "Out" || p.injuryStatus === "out")) return false;
      if (minGP > 0 && p.gp < minGP) return false;
      if (expFilter === "rookie" && p.draftYear !== 2025) return false;
      if (expFilter === "sophomore" && p.draftYear !== 2024) return false;
      if (expFilter === "young" && (p.draftYear < 2022 || p.draftYear === 0)) return false;
      if (expFilter === "veteran" && (p.draftYear >= 2022 || p.draftYear === 0)) return false;
      if ((p.bis ?? 0) <= 0 && p.ppg <= 0) return false;
      return true;
    }).sort((a, b) => (b.bis ?? 0) - (a.bis ?? 0));
  }, [players, posFilter, confFilter, minMpg, teamFilter, expFilter, excludeInjured, minGP]);

  const filteredSearch = useMemo(() => {
    if (search.length < 2) return [];
    return players
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .filter(p => posFilter === "All" || p.position?.includes(posFilter))
      .filter(p => confFilter === "All" || p.conference === confFilter)
      .filter(p => teamFilter === "All" || p.team === teamFilter)
      .filter(p => minMpg <= 0 || p.mpg >= minMpg)
      .slice(0, 12);
  }, [search, players, posFilter, confFilter, teamFilter, minMpg]);

  const topNPlayers = useMemo(() => {
    let pool = [...players].filter(p => getVal(p, metric) > 0);
    if (excludeInjured) pool = pool.filter(p => p.injuryStatus !== "Out" && p.injuryStatus !== "out");
    if (minGP > 0) pool = pool.filter(p => p.gp >= minGP);
    if (posFilter !== "All") pool = pool.filter(p => p.position?.includes(posFilter));
    if (confFilter !== "All") pool = pool.filter(p => p.conference === confFilter);
    if (teamFilter !== "All") pool = pool.filter(p => p.team === teamFilter);
    return pool.sort((a, b) => getVal(b, metric) - getVal(a, metric)).slice(0, topN);
  }, [players, metric, topN, excludeInjured, minGP, posFilter, confFilter, teamFilter]);

  const size = SOCIAL_SIZES.find(s => s.id === socialSize)!;
  const aspectRatio = `${size.w} / ${size.h}`;

  // Metric selector dropdown
  const MetricSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div>
      <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo-500/50 transition-colors [&>optgroup]:bg-[#141925] [&>optgroup]:text-text-muted [&>option]:bg-[#141925] [&>option]:text-white"
      >
        {["CourtVision", "Traditional", "Efficiency", "Advanced"].map(group => (
          <optgroup key={group} label={group}>
            {METRICS.filter(m => m.group === group).map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
      {/* ════════ LEFT PANEL: Controls ════════ */}
      <div className="space-y-4">

        {/* Template Picker */}
        <div className="glass-card p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-3">Template</h3>
          <div className="grid grid-cols-2 gap-2">
            {CHART_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  chartType === t.id
                    ? "border-indigo-500/40 bg-indigo-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <t.icon className={`h-3.5 w-3.5 ${chartType === t.id ? "text-indigo-400" : "text-text-muted/50"}`} />
                  <span className="text-[11px] font-semibold">{t.label}</span>
                </div>
                <p className="text-[9px] text-text-muted/40 mt-0.5 line-clamp-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Social Size */}
        <div className="glass-card p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-3">Export Size</h3>
          <div className="flex gap-2">
            {SOCIAL_SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => setSocialSize(s.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-semibold transition-all ${
                  socialSize === s.id
                    ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
                    : "border-white/[0.06] text-text-muted/60 hover:border-white/[0.12]"
                }`}
              >
                <s.icon className="h-3 w-3" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Config */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">Configuration</h3>

          <div>
            <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Title (auto-generates if empty)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={autoTitle}
              className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo-500/50 placeholder:text-text-muted/30"
            />
          </div>

          <div>
            <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Your Handle (optional)</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@yourhandle"
              className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo-500/50 placeholder:text-text-muted/30"
            />
          </div>

          {chartType === "quadrant" && (
            <>
              <MetricSelect value={xAxis} onChange={setXAxis} label="X Axis" />
              <MetricSelect value={yAxis} onChange={setYAxis} label="Y Axis" />
            </>
          )}

          {(chartType === "top10" || chartType === "tier-list" || chartType === "bar-compare") && (
            <MetricSelect value={metric} onChange={setMetric} label="Metric" />
          )}

          {chartType === "top10" && (
            <div>
              <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Number of Players</label>
              <div className="flex gap-1.5">
                {[5, 10, 15, 20, 25].map(n => (
                  <button
                    key={n}
                    onClick={() => setTopN(n)}
                    className={`flex-1 py-1.5 rounded text-[11px] font-semibold border transition-all ${
                      topN === n ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400" : "border-white/[0.06] text-text-muted/60"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Player Picker */}
        {(chartType === "quadrant" || chartType === "bar-compare" || chartType === "stat-card") && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">
              {chartType === "stat-card" ? "Select Player" : `Players (${selectedPlayers.length})`}
            </h3>

            {/* Smart Filters */}
            <div className="space-y-2">
              {/* Row 1: Position */}
              <div>
                <label className="text-[9px] text-text-muted/40 uppercase tracking-wider block mb-1">Position</label>
                <div className="flex gap-1">
                  {["All", "PG", "SG", "SF", "PF", "C"].map(pos => (
                    <button
                      key={pos}
                      onClick={() => setPosFilter(pos)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all ${
                        posFilter === pos ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-white/[0.06] text-text-muted/50"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Conference */}
              <div>
                <label className="text-[9px] text-text-muted/40 uppercase tracking-wider block mb-1">Conference</label>
                <div className="flex gap-1">
                  {["All", "East", "West"].map(conf => (
                    <button
                      key={conf}
                      onClick={() => setConfFilter(conf)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all ${
                        confFilter === conf ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-white/[0.06] text-text-muted/50"
                      }`}
                    >
                      {conf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Minutes + Experience */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-text-muted/40 uppercase tracking-wider block mb-1">Min MPG</label>
                  <select
                    value={minMpg}
                    onChange={(e) => setMinMpg(Number(e.target.value))}
                    className="w-full bg-[#141925] border border-white/[0.1] rounded px-2 py-1 text-[11px] text-text-primary outline-none [&>option]:bg-[#141925] [&>option]:text-white"
                  >
                    <option value={0}>Any</option>
                    <option value={10}>10+ MPG</option>
                    <option value={15}>15+ MPG</option>
                    <option value={20}>20+ MPG</option>
                    <option value={25}>25+ MPG</option>
                    <option value={30}>30+ MPG</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-text-muted/40 uppercase tracking-wider block mb-1">Experience</label>
                  <select
                    value={expFilter}
                    onChange={(e) => setExpFilter(e.target.value)}
                    className="w-full bg-[#141925] border border-white/[0.1] rounded px-2 py-1 text-[11px] text-text-primary outline-none [&>option]:bg-[#141925] [&>option]:text-white"
                  >
                    <option value="all">All Players</option>
                    <option value="rookie">Rookies (2025)</option>
                    <option value="sophomore">Sophomores (2024)</option>
                    <option value="young">Young (draft 2022+)</option>
                    <option value="veteran">Veterans (pre-2022)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Team + Min GP */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-text-muted/40 uppercase tracking-wider block mb-1">Team</label>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="w-full bg-[#141925] border border-white/[0.1] rounded px-2 py-1 text-[11px] text-text-primary outline-none [&>option]:bg-[#141925] [&>option]:text-white"
                  >
                    <option value="All">All Teams</option>
                    {allTeamAbbrs.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-text-muted/40 uppercase tracking-wider block mb-1">Min GP</label>
                  <select
                    value={minGP}
                    onChange={(e) => setMinGPStudio(Number(e.target.value))}
                    className="w-full bg-[#141925] border border-white/[0.1] rounded px-2 py-1 text-[11px] text-text-primary outline-none [&>option]:bg-[#141925] [&>option]:text-white"
                  >
                    <option value={0}>Any</option>
                    <option value={20}>20+ GP</option>
                    <option value={30}>30+ GP</option>
                    <option value={40}>40+ GP</option>
                    <option value={50}>50+ GP</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Exclude Injured */}
              <button
                onClick={() => setExcludeInjured(!excludeInjured)}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold rounded border transition-all ${
                  excludeInjured
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    : "border-white/[0.08] text-text-muted/60 hover:border-white/[0.15]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${excludeInjured ? "bg-rose-400" : "bg-text-muted/30"}`} />
                {excludeInjured ? "Injured Players Excluded" : "Include Injured Players"}
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2">
                <Search className="h-3.5 w-3.5 text-text-muted/50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/30 w-full"
                />
              </div>
              {filteredSearch.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#141925] border border-white/[0.12] rounded-lg shadow-2xl z-50 max-h-[250px] overflow-y-auto">
                  {filteredSearch.map(p => (
                    <button
                      key={p.id}
                      onClick={() => chartType === "stat-card" ? setSelectedPlayerCard(p) : addPlayer(p)}
                      className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm text-text-primary">{p.name}</span>
                      <span className="text-[10px] text-text-muted/50">{p.team} · {p.position} · BIS {p.bis?.toFixed(0) || "—"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick-add from filters */}
            {chartType !== "stat-card" && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const filtered = getFilteredPlayers();
                      setSelectedPlayers(filtered.slice(0, 50));
                    }}
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 rounded px-2 py-1 hover:bg-indigo-500/10 transition-all"
                  >
                    Add all filtered ({getFilteredPlayers().length > 50 ? "50 max" : getFilteredPlayers().length})
                  </button>
                  {selectedPlayers.length > 0 && (
                    <button
                      onClick={() => setSelectedPlayers([])}
                      className="text-[10px] text-rose-400/70 hover:text-rose-400"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                  {selectedPlayers.map(p => (
                    <span key={p.id} className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                      {p.name.split(" ").pop()} <span className="text-text-muted/50">{p.team}</span>
                      <button onClick={() => setSelectedPlayers(selectedPlayers.filter(x => x.id !== p.id))} className="hover:text-rose-400 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Download */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          <Download className="h-4 w-4" />
          Download PNG ({size.w}×{size.h})
        </button>
      </div>

      {/* ════════ RIGHT PANEL: Preview ════════ */}
      <div>
        <div
          ref={chartRef}
          className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] relative overflow-hidden"
          style={{ aspectRatio, maxHeight: "700px" }}
        >
          {/* Inner padding container */}
          <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-4 shrink-0">
              <h2 className="text-xl font-bold text-white leading-tight">{displayTitle}</h2>
              <p className="text-[11px] text-gray-500 mt-1">
                2025-26 Season · courtvisionai.io
              </p>
            </div>

            {/* Chart body */}
            <div className="flex-1 min-h-0">
              {chartType === "quadrant" && (
                <QuadrantChart
                  players={selectedPlayers.length > 0 ? selectedPlayers : players.filter(p => (p.bis ?? 0) > 0).slice(0, 40)}
                  xKey={xAxis} yKey={yAxis}
                />
              )}
              {chartType === "top10" && (
                <Top10List players={topNPlayers} metric={metric} />
              )}
              {chartType === "tier-list" && (
                <TierList players={players} metric={metric} />
              )}
              {chartType === "bar-compare" && (
                <BarCompare players={selectedPlayers} metric={metric} />
              )}
              {chartType === "stat-card" && (
                <StatCard player={selectedPlayerCard} />
              )}
              {chartType === "matchup-card" && (
                <MatchupCard teams={teams} />
              )}
            </div>

            {/* Watermark */}
            <div className="flex items-center justify-between mt-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-indigo-500/30 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <span className="text-[9px] text-gray-600 font-semibold tracking-wider">courtvisionai.io</span>
              </div>
              {handle && (
                <span className="text-[9px] text-gray-600 font-semibold">{handle}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHART COMPONENTS
// ============================================================

function QuadrantChart({ players, xKey, yKey }: { players: PlayerData[]; xKey: string; yKey: string }) {
  const data = players.map(p => ({
    name: p.name.split(" ").pop(),
    fullName: p.name,
    team: p.team,
    x: getVal(p, xKey),
    y: getVal(p, yKey),
    bis: p.bis ?? 50,
  })).filter(d => d.x > 0 && d.y > 0);

  if (data.length === 0) return <p className="text-gray-500 text-sm text-center py-12">Add players or auto-fill from the left panel</p>;

  const xAvg = data.reduce((s, d) => s + d.x, 0) / data.length;
  const yAvg = data.reduce((s, d) => s + d.y, 0) / data.length;
  const xLabel = METRICS.find(m => m.key === xKey)?.label || xKey;
  const yLabel = METRICS.find(m => m.key === yKey)?.label || yKey;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          type="number" dataKey="x" name={xLabel}
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
        >
          <Label value={xLabel} position="bottom" offset={10} style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} />
        </XAxis>
        <YAxis
          type="number" dataKey="y" name={yLabel}
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
        >
          <Label value={yLabel} angle={-90} position="insideLeft" offset={5} style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} />
        </YAxis>
        <ReferenceLine x={xAvg} stroke="rgba(129,140,248,0.3)" strokeDasharray="4 4" />
        <ReferenceLine y={yAvg} stroke="rgba(129,140,248,0.3)" strokeDasharray="4 4" />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-[#1a1f2e] border border-white/[0.15] rounded-lg px-3 py-2 shadow-xl">
                <p className="text-sm font-bold text-white">{d.fullName}</p>
                <p className="text-[10px] text-gray-400">{d.team} · BIS {d.bis.toFixed(0)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{xLabel}: {fmtVal(d.x, xKey)} · {yLabel}: {fmtVal(d.y, yKey)}</p>
              </div>
            );
          }}
        />
        <Scatter data={data} fill="#818cf8">
          {data.map((d, i) => (
            <Cell key={i} fill={tierColor(d.bis)} opacity={0.85} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function Top10List({ players, metric }: { players: PlayerData[]; metric: string }) {
  const metricLabel = METRICS.find(m => m.key === metric)?.label || metric;
  const maxVal = getVal(players[0], metric) || 1;

  return (
    <div className="space-y-1.5 overflow-y-auto h-full">
      {players.map((p, i) => {
        const val = getVal(p, metric);
        const pct = (val / maxVal) * 100;
        const isGold = i === 0, isSilver = i === 1, isBronze = i === 2;
        return (
          <div key={p.id} className="flex items-center gap-3">
            <span className={`w-7 text-right font-bold text-lg tabular-nums ${isGold ? "text-amber-400" : isSilver ? "text-gray-300" : isBronze ? "text-amber-600" : "text-gray-600"}`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-500 shrink-0">{p.team}</span>
                </div>
                <span className="font-mono text-sm font-bold shrink-0 ml-2" style={{ color: tierColor(val) }}>
                  {fmtVal(val, metric)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tierColor(val) + "80" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TierList({ players, metric }: { players: PlayerData[]; metric: string }) {
  const tiers = [
    { label: "ELITE", min: 80, color: "#818cf8", bg: "rgba(129,140,248,0.06)", border: "rgba(129,140,248,0.15)" },
    { label: "GREAT", min: 65, color: "#34d399", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)" },
    { label: "GOOD", min: 50, color: "#fbbf24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.15)" },
    { label: "AVG", min: 35, color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.15)" },
    { label: "BELOW", min: 0, color: "#f43f5e", bg: "rgba(244,63,94,0.06)", border: "rgba(244,63,94,0.15)" },
  ];

  return (
    <div className="space-y-2 overflow-y-auto h-full">
      {tiers.map(t => {
        const items = players.filter(p => {
          const v = getVal(p, metric);
          const nextTier = tiers.find(x => x.min > t.min && x.min <= v);
          return v >= t.min && (t.min === 80 ? v >= 80 : !tiers.find(x => x.min > t.min && v >= x.min));
        }).sort((a, b) => getVal(b, metric) - getVal(a, metric));
        if (items.length === 0) return null;
        return (
          <div key={t.label} className="rounded-lg p-3" style={{ backgroundColor: t.bg, border: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.color }}>{t.label}</span>
              <span className="text-[9px] text-gray-600">{items.length} players</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {items.slice(0, 15).map(p => (
                <span key={p.id} className="text-[10px] px-2 py-0.5 rounded bg-black/30 text-gray-300 font-mono">
                  {p.name.split(" ").slice(-1)[0]} <span style={{ color: t.color }}>{getVal(p, metric).toFixed(0)}</span>
                </span>
              ))}
              {items.length > 15 && <span className="text-[9px] text-gray-600">+{items.length - 15}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarCompare({ players, metric }: { players: PlayerData[]; metric: string }) {
  if (players.length === 0) return <p className="text-gray-500 text-sm text-center py-12">Add 2-8 players from the left panel</p>;

  const data = players.map(p => ({
    name: p.name.split(" ").pop(),
    fullName: p.name,
    team: p.team,
    value: getVal(p, metric),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
        <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} width={75} />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-[#1a1f2e] border border-white/[0.15] rounded-lg px-3 py-2 shadow-xl">
                <p className="text-sm font-bold text-white">{d.fullName}</p>
                <p className="text-[10px] text-gray-400">{d.team} · {fmtVal(d.value, metric)}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={tierColor(d.value)} opacity={0.75} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatCard({ player }: { player: PlayerData | null }) {
  if (!player) return <p className="text-gray-500 text-sm text-center py-12">Search and select a player from the left panel</p>;

  const stats = [
    { label: "PPG", value: player.ppg.toFixed(1) },
    { label: "RPG", value: player.rpg.toFixed(1) },
    { label: "APG", value: player.apg.toFixed(1) },
    { label: "FG%", value: (player.fg_pct * 100).toFixed(1) },
    { label: "3P%", value: (player.fg3_pct * 100).toFixed(1) },
    { label: "FT%", value: (player.ft_pct * 100).toFixed(1) },
  ];

  const metrics = [
    { label: "BIS", value: player.bis, color: tierColor(player.bis ?? 0) },
    { label: "DRS", value: player.drs, color: tierColor(player.drs ?? 0) },
    { label: "OIQ", value: player.rda, color: tierColor(player.rda ?? 0) },
    { label: "PEM", value: player.sps, color: tierColor(player.sps ?? 0) },
    { label: "GOI", value: player.goi, color: tierColor(player.goi ?? 0) },
    { label: "LFI", value: player.lfi, color: tierColor(player.lfi ?? 0) },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center mb-6">
        <h3 className="text-3xl font-bold text-white">{player.name}</h3>
        <p className="text-sm text-gray-400 mt-1">{player.team} · {player.position || "—"} · 2025-26</p>
      </div>

      {/* BIS Hero */}
      {player.bis != null && (
        <div className="text-center mb-6">
          <span className="text-6xl font-bold" style={{ color: tierColor(player.bis) }}>{player.bis.toFixed(0)}</span>
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">BIS</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-lg font-bold text-white tabular-nums">{s.value}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CourtVision metrics */}
      <div className="grid grid-cols-6 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="text-center">
            <p className="text-xl font-bold tabular-nums" style={{ color: m.color }}>{m.value?.toFixed(0) ?? "—"}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchupCard({ teams }: { teams: TeamData[] }) {
  const t1 = teams[0];
  const t2 = teams[1];
  if (!t1 || !t2) return null;

  const comparisons = [
    { label: "Record", v1: `${t1.wins}-${t1.losses}`, v2: `${t2.wins}-${t2.losses}`, n1: t1.wins, n2: t2.wins },
    { label: "TSC", v1: t1.tsc?.toFixed(0) ?? "—", v2: t2.tsc?.toFixed(0) ?? "—", n1: t1.tsc ?? 0, n2: t2.tsc ?? 0 },
    { label: "Elo", v1: t1.elo?.toFixed(0) ?? "—", v2: t2.elo?.toFixed(0) ?? "—", n1: t1.elo ?? 0, n2: t2.elo ?? 0 },
    { label: "ORTG", v1: t1.ortg?.toFixed(1) ?? "—", v2: t2.ortg?.toFixed(1) ?? "—", n1: t1.ortg ?? 0, n2: t2.ortg ?? 0 },
    { label: "DRTG", v1: t1.drtg?.toFixed(1) ?? "—", v2: t2.drtg?.toFixed(1) ?? "—", n1: t1.drtg ?? 0, n2: t2.drtg ?? 0, invert: true },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex items-center gap-12 mb-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{t1.abbr}</p>
          <p className="text-sm text-gray-400">{t1.name}</p>
          <p className="text-sm text-gray-500 font-mono">{t1.wins}-{t1.losses}</p>
        </div>
        <p className="text-2xl font-bold text-gray-600">VS</p>
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{t2.abbr}</p>
          <p className="text-sm text-gray-400">{t2.name}</p>
          <p className="text-sm text-gray-500 font-mono">{t2.wins}-{t2.losses}</p>
        </div>
      </div>
      <div className="w-full max-w-md space-y-2">
        {comparisons.map(c => {
          const better1 = c.invert ? c.n1 < c.n2 : c.n1 > c.n2;
          return (
            <div key={c.label} className="flex items-center gap-3">
              <span className={`w-16 text-right font-mono text-sm font-bold ${better1 ? "text-indigo-400" : "text-gray-500"}`}>{c.v1}</span>
              <div className="flex-1 text-center">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{c.label}</span>
              </div>
              <span className={`w-16 font-mono text-sm font-bold ${!better1 ? "text-indigo-400" : "text-gray-500"}`}>{c.v2}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
