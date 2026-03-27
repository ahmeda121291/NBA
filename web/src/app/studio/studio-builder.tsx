"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { toPng } from "html-to-image";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, Label,
} from "recharts";
import {
  Download, Grid3X3, Trophy, BarChart3, TrendingUp, Zap, Users, Search,
  Twitter, Instagram, Monitor, ChevronDown, ChevronUp,
  Sparkles, Copy, Check, Star,
} from "lucide-react";
import { CURRENT_SEASON, SEASON_YEAR } from "@/lib/constants";

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

// ============================================================
// Constants
// ============================================================

const SOCIAL_SIZES: { id: SocialSize; label: string; icon: any; w: number; h: number }[] = [
  { id: "twitter", label: "X / Twitter", icon: Twitter, w: 1200, h: 675 },
  { id: "instagram", label: "Instagram", icon: Instagram, w: 1080, h: 1080 },
  { id: "wide", label: "Widescreen", icon: Monitor, w: 1400, h: 600 },
];

// Renamed: content-first language, not tool-category labels
const CHART_TEMPLATES: { id: ChartType; label: string; desc: string; icon: any }[] = [
  { id: "top10",        label: "Who's Actually Elite",       desc: "Ranked by any metric — no debates",           icon: TrendingUp },
  { id: "quadrant",     label: "Find the Hidden Gems",       desc: "Plot two stats — spot over & underrated",     icon: Grid3X3 },
  { id: "bar-compare",  label: "Head-to-Head Breakdown",     desc: "Pick your players — settle it",               icon: BarChart3 },
  { id: "tier-list",    label: "Rank the League",            desc: "Tier the whole NBA by any metric",            icon: Trophy },
  { id: "stat-card",    label: "Drop a Player's Card",       desc: "One player, full picture — post-ready",       icon: Users },
  { id: "matchup-card", label: "Tonight's Matchup Preview",  desc: "Team vs team breakdown",                      icon: Zap },
];

interface InsightPreset {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  chartType: ChartType;
  metric: string;
  xAxis?: string;
  yAxis?: string;
  topN?: number;
  captionTitle: string;
  captionSub: string;
}

// 5 auto-generated insight presets — each loads a ready-to-share chart instantly
const AUTO_INSIGHTS: InsightPreset[] = [
  {
    id: "elite-now",
    emoji: "👑",
    label: "Who's Actually Elite",
    desc: "Top 10 total on-court impact",
    chartType: "top10",
    metric: "bis",
    topN: 10,
    captionTitle: "The 10 most impactful players in the NBA right now 👑",
    captionSub: "BIS = total on-court impact (0–99). Not PPG. Not narrative. Just impact.",
  },
  {
    id: "trending",
    emoji: "🔥",
    label: "Trending Right Now",
    desc: "Hottest players over recent games",
    chartType: "top10",
    metric: "lfi",
    topN: 10,
    captionTitle: "These players are on fire right now 🔥",
    captionSub: "LFI = Live Form Index. Recent-game performance, heavily weighted. Hot streaks only.",
  },
  {
    id: "hidden-gems",
    emoji: "💎",
    label: "Hidden Gems",
    desc: "High impact, not enough hype",
    chartType: "quadrant",
    metric: "bis",
    xAxis: "ppg",
    yAxis: "bis",
    topN: 10,
    captionTitle: "PPG doesn't tell the full story 💎",
    captionSub: "High BIS + modest PPG = flying under the radar. This quadrant never lies.",
  },
  {
    id: "clutch",
    emoji: "🎯",
    label: "Clutch Performers",
    desc: "Who delivers when it matters most",
    chartType: "top10",
    metric: "goi",
    topN: 10,
    captionTitle: "Who actually delivers when the game is on the line 🎯",
    captionSub: "GOI = Game Outcome Influence. Close games, 4th quarter, walk-offs.",
  },
  {
    id: "defenders",
    emoji: "🛡️",
    label: "Best Defenders",
    desc: "Who's actually stopping people",
    chartType: "top10",
    metric: "drs",
    topN: 10,
    captionTitle: "The best defenders in the NBA — actually measured 🛡️",
    captionSub: "DRS = Defensive Resilience Score. Contests, deterrence, on/off impact. Eye test confirmed.",
  },
];

const METRICS = [
  { key: "bis",    label: "BIS — Total Impact",   group: "CourtVision" },
  { key: "lfi",    label: "LFI — Live Form",       group: "CourtVision" },
  { key: "drs",    label: "DRS — Defense",         group: "CourtVision" },
  { key: "rda",    label: "OIQ — Offensive IQ",    group: "CourtVision" },
  { key: "sps",    label: "PEM — Playmaking",      group: "CourtVision" },
  { key: "goi",    label: "GOI — Clutch Impact",   group: "CourtVision" },
  { key: "ppg",    label: "PPG",  group: "Traditional" },
  { key: "rpg",    label: "RPG",  group: "Traditional" },
  { key: "apg",    label: "APG",  group: "Traditional" },
  { key: "spg",    label: "SPG",  group: "Traditional" },
  { key: "bpg",    label: "BPG",  group: "Traditional" },
  { key: "mpg",    label: "MPG",  group: "Traditional" },
  { key: "topg",   label: "TOV",  group: "Traditional" },
  { key: "fg_pct",  label: "FG%",  group: "Efficiency", isPct: true },
  { key: "fg3_pct", label: "3P%",  group: "Efficiency", isPct: true },
  { key: "ft_pct",  label: "FT%",  group: "Efficiency", isPct: true },
  { key: "ts_pct",  label: "TS%",  group: "Efficiency", isPct: true },
  { key: "usg_pct", label: "USG%", group: "Efficiency", isPct: true },
  { key: "per",    label: "PER",  group: "Advanced" },
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

function shortLabel(metricKey: string): string {
  return METRICS.find(m => m.key === metricKey)?.label.split(" — ")[0] || metricKey.toUpperCase();
}

// ============================================================
// Main Component
// ============================================================

export function StudioBuilder({ players, teams }: Props) {
  // Default: top10 BIS → renders immediately on load, no empty canvas
  const [chartType, setChartType]   = useState<ChartType>("top10");
  const [socialSize, setSocialSize] = useState<SocialSize>("twitter");
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerData[]>([]);
  const [xAxis, setXAxis]   = useState("ppg");
  const [yAxis, setYAxis]   = useState("bis");
  const [metric, setMetric] = useState("bis");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter]   = useState("All");
  const [confFilter, setConfFilter] = useState("All");
  const [minMpg, setMinMpg]         = useState(0);
  const [expFilter, setExpFilter]   = useState("all");
  const [teamFilter, setTeamFilter] = useState("All");
  const [excludeInjured, setExcludeInjured] = useState(false);
  const [minGP, setMinGPStudio]     = useState(0);
  const [title, setTitle]   = useState("");
  const [handle, setHandle] = useState("");
  const [topN, setTopN]     = useState(10);
  const [selectedPlayerCard, setSelectedPlayerCard] = useState<PlayerData | null>(null);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [activeInsight, setActiveInsight] = useState<string>("elite-now");
  const [generatedCaption, setGeneratedCaption] = useState<{ title: string; sub: string } | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [matchupHomeIdx, setMatchupHomeIdx] = useState(0);
  const [matchupAwayIdx, setMatchupAwayIdx] = useState(1);

  const chartRef = useRef<HTMLDivElement>(null);

  // Load an insight preset — instantly sets chart to a ready-to-share state
  const loadInsight = useCallback((insight: InsightPreset) => {
    setChartType(insight.chartType);
    setMetric(insight.metric);
    if (insight.xAxis) setXAxis(insight.xAxis);
    if (insight.yAxis) setYAxis(insight.yAxis);
    if (insight.topN)  setTopN(insight.topN);
    setActiveInsight(insight.id);
    setTitle("");
    setGeneratedCaption(null);
  }, []);

  // Auto-title: descriptive, not a column header
  const autoTitle = useMemo(() => {
    const mLabel = shortLabel(metric);
    const xLabel = shortLabel(xAxis);
    const yLabel = shortLabel(yAxis);
    switch (chartType) {
      case "quadrant":     return `${xLabel} vs ${yLabel} — Who's Overrated?`;
      case "top10":        return `Top ${topN} Players by ${mLabel}`;
      case "bar-compare":  return `Head-to-Head — ${mLabel}`;
      case "tier-list":    return `${mLabel} Tier Rankings`;
      case "stat-card":    return selectedPlayerCard?.name || "Player Card";
      case "matchup-card": return `${teams[matchupAwayIdx]?.abbr ?? "Away"} @ ${teams[matchupHomeIdx]?.abbr ?? "Home"}`;
      default:             return "CourtVision";
    }
  }, [chartType, metric, xAxis, yAxis, topN, selectedPlayerCard, teams, matchupHomeIdx, matchupAwayIdx]);

  const displayTitle = title || autoTitle;

  // Caption generator — produces a social-ready hook + context line
  const generateCaption = useCallback(() => {
    const insight = AUTO_INSIGHTS.find(i => i.id === activeInsight);
    if (insight) {
      setGeneratedCaption({ title: insight.captionTitle, sub: insight.captionSub });
      return;
    }
    const mLabel = shortLabel(metric);
    const topPlayer = topNPlayers[0];
    const fallback: Record<ChartType, string> = {
      "top10":        `${topPlayer?.name ?? "Nobody"} leads the NBA in ${mLabel} right now 👀`,
      "quadrant":     `${shortLabel(xAxis)} vs ${shortLabel(yAxis)} — this changes how you see the NBA 📊`,
      "bar-compare":  `The numbers don't lie — ${mLabel} comparison 📊`,
      "tier-list":    `The definitive ${mLabel} tier list. No arguments. 🔥`,
      "stat-card":    `${selectedPlayerCard?.name ?? "This player"} — the full picture 📊`,
      "matchup-card": `${teams[matchupAwayIdx]?.abbr ?? "Away"} @ ${teams[matchupHomeIdx]?.abbr ?? "Home"} — who wins tonight? 🏀`,
    };
    setGeneratedCaption({
      title: fallback[chartType] ?? displayTitle,
      sub: `${CURRENT_SEASON} · CourtVision analytics · courtvisionai.io`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInsight, chartType, metric, xAxis, yAxis, selectedPlayerCard, teams, matchupHomeIdx, matchupAwayIdx, displayTitle]);

  const copyCaption = useCallback(async () => {
    if (!generatedCaption) return;
    await navigator.clipboard.writeText(`${generatedCaption.title}\n\n${generatedCaption.sub}\n\n📊 courtvisionai.io`);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }, [generatedCaption]);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const s = SOCIAL_SIZES.find(s => s.id === socialSize)!;
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "#0a0e1a", pixelRatio: 2, width: s.w, height: s.h,
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
    if (!selectedPlayers.find(sp => sp.id === p.id)) setSelectedPlayers([...selectedPlayers, p]);
    setSearch("");
  };

  const allTeamAbbrs = useMemo(() =>
    [...new Set(players.map(p => p.team).filter(Boolean))].sort(), [players]);

  const getFilteredPlayers = useCallback(() => {
    return players.filter(p => {
      if (posFilter !== "All" && !p.position?.includes(posFilter)) return false;
      if (confFilter !== "All" && p.conference !== confFilter) return false;
      if (minMpg > 0 && p.mpg < minMpg) return false;
      if (teamFilter !== "All" && p.team !== teamFilter) return false;
      if (excludeInjured && (p.injuryStatus === "Out" || p.injuryStatus === "out")) return false;
      if (minGP > 0 && p.gp < minGP) return false;
      if (expFilter === "rookie" && p.draftYear !== SEASON_YEAR - 1) return false;
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

  // Qualified player pool (min 15 GP + 15 MPG baseline — no noise)
  const qualifiedPlayers = useMemo(() =>
    players.filter(p => p.gp >= 15 && p.mpg >= 15), [players]);

  const topNPlayers = useMemo(() => {
    let pool = [...qualifiedPlayers].filter(p => getVal(p, metric) > 0);
    if (excludeInjured) pool = pool.filter(p => p.injuryStatus !== "Out" && p.injuryStatus !== "out");
    if (minGP > 0) pool = pool.filter(p => p.gp >= minGP);
    if (posFilter !== "All") pool = pool.filter(p => p.position?.includes(posFilter));
    if (confFilter !== "All") pool = pool.filter(p => p.conference === confFilter);
    if (teamFilter !== "All") pool = pool.filter(p => p.team === teamFilter);
    return pool.sort((a, b) => getVal(b, metric) - getVal(a, metric)).slice(0, topN);
  }, [qualifiedPlayers, metric, topN, excludeInjured, minGP, posFilter, confFilter, teamFilter]);

  const s = SOCIAL_SIZES.find(s => s.id === socialSize)!;
  const aspectRatio = `${s.w} / ${s.h}`;

  // Only bar-compare and stat-card need manual player selection — everything else auto-populates
  const needsPlayerPicker = chartType === "bar-compare" || chartType === "stat-card";

  const MetricSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div>
      <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo-500/50 transition-colors [&>optgroup]:bg-[#141925] [&>optgroup]:text-text-muted [&>option]:bg-[#141925] [&>option]:text-white">
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
    <div className="space-y-5">

      {/* ════════ AUTO-INSIGHTS ROW ════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">Start with an insight</span>
          <span className="text-[9px] text-text-muted/30 ml-auto">Click any → loads instantly</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {AUTO_INSIGHTS.map(insight => (
            <button
              key={insight.id}
              onClick={() => loadInsight(insight)}
              className={`text-left p-3 rounded-xl border transition-all ${
                activeInsight === insight.id
                  ? "border-indigo-500/40 bg-indigo-500/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
              }`}
            >
              <div className="text-xl mb-1.5">{insight.emoji}</div>
              <p className="text-[11px] font-bold text-text-primary leading-tight">{insight.label}</p>
              <p className="text-[9px] text-text-muted/40 mt-0.5 leading-snug">{insight.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ════════ BUILDER ════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">

        {/* ════════ LEFT PANEL ════════ */}
        <div className="space-y-4">

          {/* BIS Hero Callout — persistent explanation */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] px-4 py-3">
            <div className="flex items-start gap-2">
              <Star className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-indigo-300">BIS = total on-court impact score (0–99)</p>
                <p className="text-[10px] text-indigo-400/50 mt-1 leading-snug">
                  League avg ≈ 50. Above 65 = elite contributor. Above 80 = top-tier star.
                  Captures what PPG misses — defense, efficiency, usage context.
                </p>
              </div>
            </div>
          </div>

          {/* Template Picker */}
          <div className="glass-card p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-3">Chart Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {CHART_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setChartType(t.id); setActiveInsight(""); }}
                  className={`text-left p-2.5 rounded-lg border transition-all ${
                    chartType === t.id
                      ? "border-indigo-500/40 bg-indigo-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                  }`}>
                  <div className="flex items-center gap-1.5">
                    <t.icon className={`h-3.5 w-3.5 shrink-0 ${chartType === t.id ? "text-indigo-400" : "text-text-muted/50"}`} />
                    <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
                  </div>
                  <p className="text-[9px] text-text-muted/40 mt-0.5 line-clamp-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="glass-card p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-3">Export Format</h3>
            <div className="flex gap-2">
              {SOCIAL_SIZES.map(sz => (
                <button key={sz.id} onClick={() => setSocialSize(sz.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-semibold transition-all ${
                    socialSize === sz.id
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
                      : "border-white/[0.06] text-text-muted/60 hover:border-white/[0.12]"
                  }`}>
                  <sz.icon className="h-3 w-3" />
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">Customize</h3>

            {chartType === "quadrant" && (
              <>
                <MetricSelect value={xAxis} onChange={setXAxis} label="X Axis" />
                <MetricSelect value={yAxis} onChange={setYAxis} label="Y Axis" />
              </>
            )}

            {(chartType === "top10" || chartType === "tier-list" || chartType === "bar-compare") && (
              <MetricSelect value={metric} onChange={setMetric} label="Rank by" />
            )}

            {chartType === "top10" && (
              <div>
                <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Show top</label>
                <div className="flex gap-1.5">
                  {[5, 10, 15, 20, 25].map(n => (
                    <button key={n} onClick={() => setTopN(n)}
                      className={`flex-1 py-1.5 rounded text-[11px] font-semibold border transition-all ${
                        topN === n ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400" : "border-white/[0.06] text-text-muted/60"
                      }`}>{n}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Position + Conference filters for auto-populate charts */}
            {!needsPlayerPicker && chartType !== "matchup-card" && (
              <div className="space-y-2 pt-1">
                <label className="text-[9px] text-text-muted/40 uppercase tracking-wider block">Filter</label>
                <div className="flex gap-1 flex-wrap">
                  {["All", "PG", "SG", "SF", "PF", "C"].map(pos => (
                    <button key={pos} onClick={() => setPosFilter(pos)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all ${posFilter === pos ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-white/[0.06] text-text-muted/50"}`}
                    >{pos}</button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {["All", "East", "West"].map(conf => (
                    <button key={conf} onClick={() => setConfFilter(conf)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all ${confFilter === conf ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-white/[0.06] text-text-muted/50"}`}
                    >{conf}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Matchup team selectors — fixed, functional */}
            {chartType === "matchup-card" && (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Home Team</label>
                  <select value={matchupHomeIdx} onChange={(e) => setMatchupHomeIdx(Number(e.target.value))}
                    className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none [&>option]:bg-[#141925] [&>option]:text-white">
                    {teams.map((t, i) => <option key={t.id} value={i}>{t.abbr} — {t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Away Team</label>
                  <select value={matchupAwayIdx} onChange={(e) => setMatchupAwayIdx(Number(e.target.value))}
                    className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none [&>option]:bg-[#141925] [&>option]:text-white">
                    {teams.map((t, i) => <option key={t.id} value={i}>{t.abbr} — {t.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Custom title (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={autoTitle}
                className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo-500/50 placeholder:text-text-muted/30" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted/60 mb-1 block font-semibold uppercase tracking-wider">Your handle</label>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle"
                className="w-full bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo-500/50 placeholder:text-text-muted/30" />
            </div>
          </div>

          {/* Player Picker — ONLY for bar-compare and stat-card */}
          {needsPlayerPicker && (
            <div className="glass-card p-4 space-y-3">
              <button onClick={() => setPickerOpen(!pickerOpen)} className="w-full flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">
                  {chartType === "stat-card" ? "Select Player" : `Players (${selectedPlayers.length})`}
                </h3>
                {pickerOpen ? <ChevronUp className="h-3.5 w-3.5 text-text-muted/40" /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted/40" />}
              </button>

              {!pickerOpen && selectedPlayers.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedPlayers.slice(0, 8).map(p => (
                    <span key={p.id} className="text-[9px] bg-indigo-500/10 text-indigo-400/70 rounded-full px-2 py-0.5">{p.name.split(" ").pop()}</span>
                  ))}
                </div>
              )}

              {pickerOpen && (
                <div className="space-y-3">
                  {chartType !== "stat-card" && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "Top 10 BIS",      fn: () => [...players].sort((a,b) => (b.bis??0)-(a.bis??0)).slice(0,10) },
                        { label: "Top 10 Scorers",   fn: () => [...players].sort((a,b) => b.ppg-a.ppg).slice(0,10) },
                        { label: "Top Defenders",    fn: () => [...players].sort((a,b) => (b.drs??0)-(a.drs??0)).slice(0,10) },
                        { label: "Top Playmakers",   fn: () => [...players].sort((a,b) => b.apg-a.apg).slice(0,10) },
                      ].map(preset => (
                        <button key={preset.label} onClick={() => setSelectedPlayers(preset.fn())}
                          className="text-[10px] font-semibold text-indigo-400/80 hover:text-indigo-400 border border-indigo-500/15 rounded-lg px-2 py-1.5 hover:bg-indigo-500/10 transition-all text-center">
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <div className="flex items-center gap-1.5 bg-[#141925] border border-white/[0.1] rounded-lg px-3 py-2">
                      <Search className="h-3.5 w-3.5 text-text-muted/50" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player…"
                        className="bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/30 w-full" />
                    </div>
                    {filteredSearch.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#141925] border border-white/[0.12] rounded-lg shadow-2xl z-50 max-h-[250px] overflow-y-auto">
                        {filteredSearch.map(p => (
                          <button key={p.id}
                            onClick={() => chartType === "stat-card" ? setSelectedPlayerCard(p) : addPlayer(p)}
                            className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition-colors flex items-center justify-between">
                            <span className="text-sm text-text-primary">{p.name}</span>
                            <span className="text-[10px] text-text-muted/50">{p.team} · {p.position} · BIS {p.bis?.toFixed(0) || "—"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {chartType !== "stat-card" && selectedPlayers.length > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted/50">{selectedPlayers.length} selected</span>
                        <button onClick={() => setSelectedPlayers([])} className="text-[10px] text-rose-400/70 hover:text-rose-400">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
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
            </div>
          )}

          {/* ── Generate Caption + Download ── */}
          <div className="space-y-2">
            <button onClick={generateCaption}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.06] text-indigo-400 font-bold text-[11px] uppercase tracking-wider hover:bg-indigo-500/10 transition-all">
              <Sparkles className="h-3.5 w-3.5" /> Generate Post Caption
            </button>

            {generatedCaption && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
                <p className="text-[12px] font-semibold text-text-primary leading-snug">{generatedCaption.title}</p>
                <p className="text-[10px] text-text-muted/50 leading-snug">{generatedCaption.sub}</p>
                <button onClick={copyCaption}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                  {captionCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {captionCopied ? "Copied!" : "Copy to clipboard"}
                </button>
              </div>
            )}

            <button onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
              <Download className="h-4 w-4" />
              Download PNG ({s.w}×{s.h})
            </button>
          </div>
        </div>

        {/* ════════ RIGHT PANEL: Preview ════════ */}
        <div>
          <div ref={chartRef}
            className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] relative overflow-hidden"
            style={{ aspectRatio, maxHeight: "700px" }}>
            <div className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="mb-4 shrink-0">
                <h2 className="text-xl font-bold text-white leading-tight">{displayTitle}</h2>
                <p className="text-[11px] text-gray-500 mt-1">
                  {CURRENT_SEASON} Season · courtvisionai.io
                  {(metric === "bis" || yAxis === "bis") && (
                    <span className="ml-2 text-indigo-400/50">· BIS = total on-court impact (0–99)</span>
                  )}
                </p>
              </div>

              {/* Chart body */}
              <div className="flex-1 min-h-0">
                {chartType === "quadrant" && (
                  <QuadrantChart
                    players={selectedPlayers.length > 0
                      ? selectedPlayers
                      : qualifiedPlayers.filter(p => getVal(p, xAxis) > 0 && getVal(p, yAxis) > 0).slice(0, 60)}
                    xKey={xAxis} yKey={yAxis}
                  />
                )}
                {chartType === "top10" && <Top10List players={topNPlayers} metric={metric} />}
                {chartType === "tier-list" && <TierList players={qualifiedPlayers} metric={metric} />}
                {chartType === "bar-compare" && <BarCompare players={selectedPlayers} metric={metric} />}
                {chartType === "stat-card" && <StatCard player={selectedPlayerCard} />}
                {chartType === "matchup-card" && (
                  <MatchupCard teams={teams} homeIdx={matchupHomeIdx} awayIdx={matchupAwayIdx} />
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
                {handle && <span className="text-[9px] text-gray-600 font-semibold">{handle}</span>}
              </div>
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
  const xLabel = shortLabel(xKey);
  const yLabel = shortLabel(yKey);

  const data = players.map(p => ({
    name: p.name.split(" ").pop(),
    fullName: p.name,
    team: p.team,
    x: getVal(p, xKey),
    y: getVal(p, yKey),
    bis: p.bis ?? 50,
  })).filter(d => d.x > 0 && d.y > 0);

  if (data.length === 0) return (
    <p className="text-gray-500 text-sm text-center py-12">Add players or auto-fill from the left panel</p>
  );

  const xAvg = data.reduce((s, d) => s + d.x, 0) / data.length;
  const yAvg = data.reduce((s, d) => s + d.y, 0) / data.length;

  // Quadrant labels — change based on axes
  const isBisY = yKey === "bis" || yKey === "lfi" || yKey === "drs" || yKey === "goi";
  const isPpgX = xKey === "ppg" || xKey === "per";
  const quadLabels = {
    tl: isBisY && isPpgX ? "💎 Hidden Gem" : `High ${yLabel}`,
    tr: isBisY && isPpgX ? "⭐ Confirmed Elite" : `Elite (high both)`,
    bl: "📉 Struggling",
    br: isBisY && isPpgX ? "📊 Empty Calories" : `High ${xLabel}`,
  };

  // Custom dot: elite dots (top-right quadrant + far from mean) get a halo ring
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    const isTopRight = payload.x > xAvg && payload.y > yAvg;
    const xStd = Math.sqrt(data.reduce((s, d) => s + Math.pow(d.x - xAvg, 2), 0) / data.length);
    const yStd = Math.sqrt(data.reduce((s, d) => s + Math.pow(d.y - yAvg, 2), 0) / data.length);
    const isElite = isTopRight && (payload.x > xAvg + xStd * 0.8 || payload.y > yAvg + yStd * 0.8);
    const color = tierColor(payload.bis);
    const r = isElite ? 6 : 4;
    return (
      <g key={`dot-${payload.fullName}`}>
        {isElite && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={color} strokeWidth={1.2} opacity={0.35} />}
        <circle cx={cx} cy={cy} r={r} fill={color} opacity={isElite ? 1 : 0.75} />
      </g>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Quadrant corner labels */}
      <div className="absolute top-1 left-[52%] right-1 flex justify-end z-10 pointer-events-none">
        <span className="text-[8px] font-bold text-emerald-400/50 uppercase tracking-wider">{quadLabels.tr}</span>
      </div>
      <div className="absolute top-1 left-0 right-[52%] flex justify-start z-10 pointer-events-none pl-12">
        <span className="text-[8px] font-bold text-indigo-400/50 uppercase tracking-wider">{quadLabels.tl}</span>
      </div>
      <div className="absolute bottom-8 left-[52%] right-1 flex justify-end z-10 pointer-events-none">
        <span className="text-[8px] font-bold text-amber-400/40 uppercase tracking-wider">{quadLabels.br}</span>
      </div>
      <div className="absolute bottom-8 left-0 right-[52%] flex justify-start z-10 pointer-events-none pl-12">
        <span className="text-[8px] font-bold text-rose-400/40 uppercase tracking-wider">{quadLabels.bl}</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" dataKey="x" name={xLabel}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}>
            <Label value={xLabel} position="bottom" offset={10}
              style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} />
          </XAxis>
          <YAxis type="number" dataKey="y" name={yLabel}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}>
            <Label value={yLabel} angle={-90} position="insideLeft" offset={5}
              style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} />
          </YAxis>
          <ReferenceLine x={xAvg} stroke="rgba(129,140,248,0.25)" strokeDasharray="4 4" />
          <ReferenceLine y={yAvg} stroke="rgba(129,140,248,0.25)" strokeDasharray="4 4" />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-[#1a1f2e] border border-white/[0.15] rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-sm font-bold text-white">{d.fullName}</p>
                  <p className="text-[10px] text-gray-400">{d.team} · BIS {d.bis.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {xLabel}: {fmtVal(d.x, xKey)} · {yLabel}: {fmtVal(d.y, yKey)}
                  </p>
                </div>
              );
            }}
          />
          <Scatter data={data} shape={renderDot}>
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function Top10List({ players, metric }: { players: PlayerData[]; metric: string }) {
  const maxVal = getVal(players[0], metric) || 1;
  const isBIS = metric === "bis";

  return (
    <div className="space-y-1.5 overflow-y-auto h-full">
      {players.map((p, i) => {
        const val = getVal(p, metric);
        const pct = (val / maxVal) * 100;
        const isGold = i === 0, isSilver = i === 1, isBronze = i === 2;
        return (
          <div key={p.id} className="flex items-center gap-3">
            <span className={`w-7 text-right font-bold text-lg tabular-nums shrink-0 ${isGold ? "text-amber-400" : isSilver ? "text-gray-300" : isBronze ? "text-amber-600" : "text-gray-600"}`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-500 shrink-0">{p.team}</span>
                  {isBIS && isGold && <span className="text-[8px] font-bold text-indigo-400/70 uppercase tracking-wider shrink-0">Top Impact</span>}
                </div>
                <span className="font-mono text-sm font-bold shrink-0 ml-2" style={{ color: tierColor(val) }}>
                  {fmtVal(val, metric)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tierColor(val) + "80" }} />
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
    { label: "ELITE",  min: 80, color: "#818cf8", bg: "rgba(129,140,248,0.06)", border: "rgba(129,140,248,0.15)" },
    { label: "GREAT",  min: 65, color: "#34d399", bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.15)" },
    { label: "GOOD",   min: 50, color: "#fbbf24", bg: "rgba(251,191,36,0.06)",  border: "rgba(251,191,36,0.15)" },
    { label: "AVG",    min: 35, color: "#f97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.15)" },
    { label: "BELOW",  min: 0,  color: "#f43f5e", bg: "rgba(244,63,94,0.06)",   border: "rgba(244,63,94,0.15)" },
  ];

  return (
    <div className="space-y-2 overflow-y-auto h-full">
      {tiers.map(t => {
        const items = players
          .filter(p => {
            const v = getVal(p, metric);
            return v >= t.min && !tiers.find(x => x.min > t.min && v >= x.min);
          })
          .sort((a, b) => getVal(b, metric) - getVal(a, metric));
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
  if (players.length === 0) return (
    <p className="text-gray-500 text-sm text-center py-12">Add 2–8 players from the left panel</p>
  );
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
          {data.map((d, i) => <Cell key={i} fill={tierColor(d.value)} opacity={0.8} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatCard({ player }: { player: PlayerData | null }) {
  if (!player) return (
    <p className="text-gray-500 text-sm text-center py-12">Search and select a player from the left panel</p>
  );
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
    { label: "LFI", value: player.lfi, color: tierColor(player.lfi ?? 0) },
    { label: "DRS", value: player.drs, color: tierColor(player.drs ?? 0) },
    { label: "OIQ", value: player.rda, color: tierColor(player.rda ?? 0) },
    { label: "PEM", value: player.sps, color: tierColor(player.sps ?? 0) },
    { label: "GOI", value: player.goi, color: tierColor(player.goi ?? 0) },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center mb-5">
        <h3 className="text-3xl font-bold text-white">{player.name}</h3>
        <p className="text-sm text-gray-400 mt-1">{player.team} · {player.position || "—"} · {CURRENT_SEASON}</p>
      </div>
      {player.bis != null && (
        <div className="text-center mb-5">
          <span className="text-6xl font-bold tabular-nums" style={{ color: tierColor(player.bis) }}>{player.bis.toFixed(0)}</span>
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">BIS — Total Impact</p>
        </div>
      )}
      <div className="grid grid-cols-6 gap-4 mb-5">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-lg font-bold text-white tabular-nums">{s.value}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
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

// Fixed: accepts homeIdx + awayIdx — no longer hardcoded to teams[0]/teams[1]
function MatchupCard({ teams, homeIdx, awayIdx }: { teams: TeamData[]; homeIdx: number; awayIdx: number }) {
  const home = teams[homeIdx];
  const away = teams[awayIdx];
  if (!home || !away) return <p className="text-gray-500 text-sm text-center py-12">Select two teams from the left panel</p>;

  const comparisons = [
    { label: "Record",   v1: `${home.wins}-${home.losses}`, v2: `${away.wins}-${away.losses}`, n1: home.wins,     n2: away.wins },
    { label: "TSC",      v1: home.tsc?.toFixed(0) ?? "—",  v2: away.tsc?.toFixed(0) ?? "—",   n1: home.tsc ?? 0, n2: away.tsc ?? 0 },
    { label: "Elo",      v1: home.elo?.toFixed(0) ?? "—",  v2: away.elo?.toFixed(0) ?? "—",   n1: home.elo ?? 0, n2: away.elo ?? 0 },
    { label: "ORTG",     v1: home.ortg?.toFixed(1) ?? "—", v2: away.ortg?.toFixed(1) ?? "—",  n1: home.ortg ?? 0, n2: away.ortg ?? 0 },
    { label: "DRTG",     v1: home.drtg?.toFixed(1) ?? "—", v2: away.drtg?.toFixed(1) ?? "—",  n1: home.drtg ?? 0, n2: away.drtg ?? 0, invert: true },
    { label: "Net RTG",  v1: home.net_rating != null ? (home.net_rating > 0 ? "+" : "") + home.net_rating.toFixed(1) : "—",
                          v2: away.net_rating != null ? (away.net_rating > 0 ? "+" : "") + away.net_rating.toFixed(1) : "—",
                          n1: home.net_rating ?? 0, n2: away.net_rating ?? 0 },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="flex items-center gap-10">
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{away.abbr}</p>
          <p className="text-sm text-gray-400">{away.name}</p>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{away.wins}-{away.losses}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-600">@</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{home.abbr}</p>
          <p className="text-sm text-gray-400">{home.name}</p>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{home.wins}-{home.losses}</p>
        </div>
      </div>
      <div className="w-full max-w-sm space-y-2">
        {comparisons.map(c => {
          const homeBetter = c.invert ? c.n1 < c.n2 : c.n1 > c.n2;
          const awayBetter = c.invert ? c.n2 < c.n1 : c.n2 > c.n1;
          return (
            <div key={c.label} className="flex items-center gap-3">
              <span className={`w-16 text-right font-mono text-sm font-bold ${awayBetter ? "text-indigo-400" : "text-gray-500"}`}>{c.v2}</span>
              <div className="flex-1 text-center">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{c.label}</span>
              </div>
              <span className={`w-16 font-mono text-sm font-bold ${homeBetter ? "text-indigo-400" : "text-gray-500"}`}>{c.v1}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-gray-700 uppercase tracking-widest">Home team on right</p>
    </div>
  );
}
