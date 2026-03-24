"use client";

import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { Download, BarChart3, Grid3X3, Users, Trophy, Zap, TrendingUp } from "lucide-react";

interface PlayerData {
  id: number; name: string; team: string; position: string;
  ppg: number; rpg: number; apg: number;
  fg_pct: number; fg3_pct: number; ft_pct: number;
  bis: number | null; lfi: number | null; drs: number | null;
  sps: number | null; goi: number | null; rda: number | null;
}

interface TeamData {
  id: number; name: string; abbr: string;
  wins: number; losses: number;
  tsc: number | null; ltfi: number | null; elo: number | null;
}

interface Props {
  players: PlayerData[];
  teams: TeamData[];
}

type ChartType = "quadrant" | "tier-list" | "bar-compare" | "top10" | "matchup-card";

const CHART_TEMPLATES: { id: ChartType; label: string; desc: string; icon: any }[] = [
  { id: "quadrant", label: "4-Box Quadrant", desc: "Plot players on two axes — find the overrated & underrated", icon: Grid3X3 },
  { id: "tier-list", label: "Tier List", desc: "Rank players into Elite / Great / Good / Average / Below tiers", icon: Trophy },
  { id: "bar-compare", label: "Bar Comparison", desc: "Side-by-side stat bars for 2-5 players", icon: BarChart3 },
  { id: "top10", label: "Top 10 List", desc: "Ranked list by any metric — clean & shareable", icon: TrendingUp },
  { id: "matchup-card", label: "Matchup Card", desc: "Head-to-head preview card for two teams", icon: Zap },
];

const METRICS = [
  // CourtVision
  { key: "bis", label: "BIS (Impact)", group: "CourtVision" },
  { key: "lfi", label: "LFI (Form)", group: "CourtVision" },
  { key: "drs", label: "DRS (Defense)", group: "CourtVision" },
  { key: "sps", label: "SPS (Shooting)", group: "CourtVision" },
  { key: "goi", label: "GOI (Gravity)", group: "CourtVision" },
  { key: "rda", label: "RDA (Role)", group: "CourtVision" },
  // Traditional
  { key: "ppg", label: "PPG", group: "Traditional" },
  { key: "rpg", label: "RPG", group: "Traditional" },
  { key: "apg", label: "APG", group: "Traditional" },
  { key: "spg", label: "SPG", group: "Traditional" },
  { key: "bpg", label: "BPG", group: "Traditional" },
  { key: "mpg", label: "MPG", group: "Traditional" },
  // Shooting
  { key: "fg_pct", label: "FG%", group: "Shooting" },
  { key: "fg3_pct", label: "3P%", group: "Shooting" },
  { key: "ft_pct", label: "FT%", group: "Shooting" },
];

function tierColor(score: number): string {
  if (score >= 80) return "#818cf8";
  if (score >= 65) return "#34d399";
  if (score >= 50) return "#fbbf24";
  if (score >= 35) return "#f97316";
  return "#f43f5e";
}

function tierLabel(score: number): string {
  if (score >= 80) return "ELITE";
  if (score >= 65) return "GREAT";
  if (score >= 50) return "GOOD";
  if (score >= 35) return "AVG";
  return "BELOW";
}

function getVal(p: PlayerData, key: string): number {
  const v = (p as any)[key];
  return typeof v === "number" ? v : 0;
}

export function StudioBuilder({ players, teams }: Props) {
  const [chartType, setChartType] = useState<ChartType>("quadrant");
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerData[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<TeamData[]>([]);
  const [xAxis, setXAxis] = useState("ppg");
  const [yAxis, setYAxis] = useState("bis");
  const [metric, setMetric] = useState("bis");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("My CourtVision Chart");
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "#0a0e1a",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `courtvision-${chartType}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, [chartType]);

  const addPlayer = (p: PlayerData) => {
    if (!selectedPlayers.find((sp) => sp.id === p.id)) {
      setSelectedPlayers([...selectedPlayers, p]);
    }
    setSearch("");
  };

  const removePlayer = (id: number) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== id));
  };

  const filteredPlayers = search.length >= 2
    ? players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : [];

  // Auto-populate for top10
  const top10Players = [...players]
    .filter((p) => getVal(p, metric) > 0)
    .sort((a, b) => getVal(b, metric) - getVal(a, metric))
    .slice(0, 10);

  // Tier list grouping
  const tierGroups = {
    elite: players.filter((p) => getVal(p, metric) >= 80),
    great: players.filter((p) => getVal(p, metric) >= 65 && getVal(p, metric) < 80),
    good: players.filter((p) => getVal(p, metric) >= 50 && getVal(p, metric) < 65),
    avg: players.filter((p) => getVal(p, metric) >= 35 && getVal(p, metric) < 50),
    below: players.filter((p) => getVal(p, metric) > 0 && getVal(p, metric) < 35),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* LEFT: Controls */}
      <div className="space-y-4">
        {/* Template Picker */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">Chart Template</h3>
          <div className="space-y-2">
            {CHART_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  chartType === t.id
                    ? "border-indigo-500/40 bg-indigo-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <t.icon className={`h-4 w-4 ${chartType === t.id ? "text-indigo-400" : "text-text-muted/50"}`} />
                  <span className="text-[12px] font-semibold">{t.label}</span>
                </div>
                <p className="text-[10px] text-text-muted/50 mt-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selectors */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">Configuration</h3>

          <div>
            <label className="text-[10px] text-text-muted/50 mb-1 block">Chart Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1a1f2e] border border-white/[0.08] rounded px-3 py-1.5 text-sm text-text-primary focus:border-indigo-500/40 outline-none placeholder:text-text-muted/40"
            />
          </div>

          {(chartType === "quadrant") && (
            <>
              <div>
                <label className="text-[10px] text-text-muted/50 mb-1 block">X Axis</label>
                <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className="w-full bg-[#1a1f2e] border border-white/[0.08] rounded px-3 py-1.5 text-sm text-text-primary outline-none [&>option]:bg-[#1a1f2e] [&>option]:text-white">
                  {["CourtVision", "Traditional", "Shooting"].map((group) => (
                    <optgroup key={group} label={group}>
                      {METRICS.filter((m) => m.group === group).map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-text-muted/50 mb-1 block">Y Axis</label>
                <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className="w-full bg-[#1a1f2e] border border-white/[0.08] rounded px-3 py-1.5 text-sm text-text-primary outline-none [&>option]:bg-[#1a1f2e] [&>option]:text-white">
                  {["CourtVision", "Traditional", "Shooting"].map((group) => (
                    <optgroup key={group} label={group}>
                      {METRICS.filter((m) => m.group === group).map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </>
          )}

          {(chartType === "top10" || chartType === "tier-list" || chartType === "bar-compare") && (
            <div>
              <label className="text-[10px] text-text-muted/50 mb-1 block">Metric</label>
              <select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-full bg-[#1a1f2e] border border-white/[0.08] rounded px-3 py-1.5 text-sm text-text-primary outline-none [&>option]:bg-[#1a1f2e] [&>option]:text-white">
                {["CourtVision", "Traditional", "Shooting"].map((group) => (
                    <optgroup key={group} label={group}>
                      {METRICS.filter((m) => m.group === group).map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Player Picker (for quadrant / bar-compare) */}
        {(chartType === "quadrant" || chartType === "bar-compare") && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">
              <Users className="h-3 w-3 inline mr-1" />
              Players ({selectedPlayers.length})
            </h3>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players..."
                className="w-full bg-[#1a1f2e] border border-white/[0.08] rounded px-3 py-1.5 text-sm text-text-primary focus:border-indigo-500/40 outline-none placeholder:text-text-muted/40"
              />
              {filteredPlayers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1f2e] border border-white/[0.1] rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto">
                  {filteredPlayers.map((p) => (
                    <button key={p.id} onClick={() => addPlayer(p)} className="w-full text-left px-3 py-2 hover:bg-white/[0.05] text-sm flex justify-between">
                      <span>{p.name}</span>
                      <span className="text-text-muted/40 text-[10px]">{p.team} · {p.position}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedPlayers.map((p) => (
                <span key={p.id} className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded px-2 py-0.5 flex items-center gap-1">
                  {p.name}
                  <button onClick={() => removePlayer(p.id)} className="hover:text-rose-400">×</button>
                </span>
              ))}
            </div>
            {chartType === "quadrant" && selectedPlayers.length === 0 && (
              <button
                onClick={() => setSelectedPlayers(players.filter((p) => (p.bis ?? 0) > 0).slice(0, 50))}
                className="text-[10px] text-indigo-400 hover:text-indigo-300"
              >
                Auto-fill top 50 by BIS
              </button>
            )}
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PNG
        </button>
      </div>

      {/* RIGHT: Chart Preview */}
      <div>
        <div ref={chartRef} className="bg-[#0a0e1a] rounded-xl p-6 border border-white/[0.06] min-h-[500px] relative">
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-[11px] text-text-muted/70 mt-1">
              {METRICS.find((m) => m.key === (chartType === "quadrant" ? xAxis : metric))?.label}
              {chartType === "quadrant" && ` vs ${METRICS.find((m) => m.key === yAxis)?.label}`}
              {" · "}2025-26 Season
            </p>
          </div>

          {/* QUADRANT CHART */}
          {chartType === "quadrant" && (
            <QuadrantChart
              players={selectedPlayers.length > 0 ? selectedPlayers : players.filter((p) => (p.bis ?? 0) > 0).slice(0, 40)}
              xKey={xAxis} yKey={yAxis}
            />
          )}

          {/* TOP 10 LIST */}
          {chartType === "top10" && (
            <Top10List players={top10Players} metric={metric} metricLabel={METRICS.find((m) => m.key === metric)?.label || metric} />
          )}

          {/* TIER LIST */}
          {chartType === "tier-list" && (
            <TierList groups={tierGroups} metric={metric} metricLabel={METRICS.find((m) => m.key === metric)?.label || metric} />
          )}

          {/* BAR COMPARE */}
          {chartType === "bar-compare" && (
            <BarCompare players={selectedPlayers} metric={metric} metricLabel={METRICS.find((m) => m.key === metric)?.label || metric} />
          )}

          {/* MATCHUP CARD */}
          {chartType === "matchup-card" && teams.length >= 2 && (
            <MatchupCard teams={teams} />
          )}

          {/* Watermark */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-indigo-500/30 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            </div>
            <span className="text-[9px] text-text-muted/50 font-semibold tracking-wider">courtvisionai.io</span>
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
  const xVals = players.map((p) => getVal(p, xKey)).filter((v) => v > 0);
  const yVals = players.map((p) => getVal(p, yKey)).filter((v) => v > 0);
  if (xVals.length === 0 || yVals.length === 0) return <p className="text-text-muted/70 text-sm">No data available</p>;

  const xMin = Math.min(...xVals) * 0.9;
  const xMax = Math.max(...xVals) * 1.05;
  const yMin = Math.min(...yVals) * 0.9;
  const yMax = Math.max(...yVals) * 1.05;
  const xMid = (xMin + xMax) / 2;
  const yMid = (yMin + yMax) / 2;

  const w = 700, h = 420;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };

  const toX = (v: number) => pad.left + ((v - xMin) / (xMax - xMin)) * (w - pad.left - pad.right);
  const toY = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * (h - pad.top - pad.bottom);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={w} height={h} className="mx-auto">
        {/* Quadrant lines */}
        <line x1={toX(xMid)} y1={pad.top} x2={toX(xMid)} y2={h - pad.bottom} stroke="rgba(255,255,255,0.12)" strokeDasharray="4,4" />
        <line x1={pad.left} y1={toY(yMid)} x2={w - pad.right} y2={toY(yMid)} stroke="rgba(255,255,255,0.12)" strokeDasharray="4,4" />

        {/* Quadrant labels */}
        <text x={toX(xMin) + 10} y={toY(yMax) + 15} fill="rgba(255,255,255,0.35)" fontSize="10" fontWeight="bold">UNDERRATED</text>
        <text x={toX(xMax) - 80} y={toY(yMax) + 15} fill="rgba(129,140,248,0.25)" fontSize="10" fontWeight="bold">ELITE</text>
        <text x={toX(xMin) + 10} y={toY(yMin) - 5} fill="rgba(244,63,94,0.2)" fontSize="10" fontWeight="bold">LOW IMPACT</text>
        <text x={toX(xMax) - 80} y={toY(yMin) - 5} fill="rgba(255,255,255,0.35)" fontSize="10" fontWeight="bold">OVERRATED</text>

        {/* Points */}
        {players.map((p) => {
          const x = getVal(p, xKey);
          const y = getVal(p, yKey);
          if (x <= 0 || y <= 0) return null;
          const cx = toX(x);
          const cy = toY(y);
          const bis = p.bis ?? 50;
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={4} fill={tierColor(bis)} opacity={0.85} />
              <text x={cx + 6} y={cy + 3} fill="rgba(255,255,255,0.85)" fontSize="8" fontFamily="monospace">
                {p.name.split(" ").pop()}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text x={w / 2} y={h - 5} fill="rgba(255,255,255,0.5)" fontSize="10" textAnchor="middle">
          {METRICS.find((m) => m.key === xKey)?.label} →
        </text>
        <text x={12} y={h / 2} fill="rgba(255,255,255,0.5)" fontSize="10" textAnchor="middle" transform={`rotate(-90, 12, ${h / 2})`}>
          {METRICS.find((m) => m.key === yKey)?.label} →
        </text>
      </svg>
    </div>
  );
}

function Top10List({ players, metric, metricLabel }: { players: PlayerData[]; metric: string; metricLabel: string }) {
  return (
    <div className="space-y-2">
      {players.map((p, i) => {
        const val = getVal(p, metric);
        const maxVal = getVal(players[0], metric) || 1;
        const pct = (val / maxVal) * 100;
        return (
          <div key={p.id} className="flex items-center gap-3">
            <span className={`w-7 text-right font-bold text-lg ${i === 0 ? "text-amber-400" : i === 1 ? "text-text-muted/80" : i === 2 ? "text-amber-600" : "text-text-muted/50"}`}>
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <div>
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                  <span className="text-[10px] text-text-muted/70 ml-2">{p.team}</span>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: tierColor(val) }}>
                  {metric.includes("pct") ? (val * 100).toFixed(1) + "%" : val.toFixed(1)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tierColor(val) }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TierList({ groups, metric, metricLabel }: {
  groups: Record<string, PlayerData[]>; metric: string; metricLabel: string;
}) {
  const tiers = [
    { key: "elite", label: "ELITE", color: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.2)" },
    { key: "great", label: "GREAT", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" },
    { key: "good", label: "GOOD", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
    { key: "avg", label: "AVERAGE", color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
    { key: "below", label: "BELOW", color: "#f43f5e", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.2)" },
  ];

  return (
    <div className="space-y-3">
      {tiers.map((t) => {
        const items = (groups as any)[t.key] || [];
        if (items.length === 0) return null;
        return (
          <div key={t.key} className="rounded-lg p-3" style={{ backgroundColor: t.bg, border: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.color }}>{t.label}</span>
              <span className="text-[9px] text-text-muted/70">({items.length} players)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.slice(0, 12).map((p: PlayerData) => (
                <span key={p.id} className="text-[10px] px-2 py-0.5 rounded bg-black/20 text-text-secondary font-mono">
                  {p.name.split(" ").slice(-1)[0]} <span style={{ color: t.color }}>{getVal(p, metric).toFixed(0)}</span>
                </span>
              ))}
              {items.length > 12 && <span className="text-[10px] text-text-muted/50">+{items.length - 12} more</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarCompare({ players, metric, metricLabel }: { players: PlayerData[]; metric: string; metricLabel: string }) {
  if (players.length === 0) return <p className="text-text-muted/70 text-sm text-center py-12">Add 2-5 players from the left panel to compare</p>;
  const maxVal = Math.max(...players.map((p) => getVal(p, metric)), 1);

  return (
    <div className="space-y-4">
      {players.map((p) => {
        const val = getVal(p, metric);
        const pct = (val / maxVal) * 100;
        return (
          <div key={p.id} className="flex items-center gap-4">
            <div className="w-32 text-right">
              <p className="text-sm font-semibold text-white truncate">{p.name}</p>
              <p className="text-[10px] text-text-muted/70">{p.team} · {p.position}</p>
            </div>
            <div className="flex-1">
              <div className="h-8 rounded bg-white/[0.04] overflow-hidden relative">
                <div className="h-full rounded transition-all flex items-center px-3" style={{ width: `${pct}%`, backgroundColor: tierColor(val) + "40" }}>
                  <span className="font-mono text-sm font-bold text-white">
                    {metric.includes("pct") ? (val * 100).toFixed(1) + "%" : val.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchupCard({ teams }: { teams: TeamData[] }) {
  // Show top 2 teams as a matchup
  const t1 = teams[0];
  const t2 = teams[1];
  if (!t1 || !t2) return null;

  return (
    <div className="flex items-center justify-center gap-8 py-8">
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{t1.abbr}</p>
        <p className="text-sm text-text-muted/80">{t1.wins}-{t1.losses}</p>
        {t1.tsc && <p className="text-[11px] font-mono mt-1" style={{ color: tierColor(t1.tsc) }}>TSC {t1.tsc.toFixed(0)}</p>}
        {t1.elo && <p className="text-[10px] text-text-muted/70 font-mono">Elo {t1.elo.toFixed(0)}</p>}
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-text-muted/50">VS</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{t2.abbr}</p>
        <p className="text-sm text-text-muted/80">{t2.wins}-{t2.losses}</p>
        {t2.tsc && <p className="text-[11px] font-mono mt-1" style={{ color: tierColor(t2.tsc) }}>TSC {t2.tsc.toFixed(0)}</p>}
        {t2.elo && <p className="text-[10px] text-text-muted/70 font-mono">Elo {t2.elo.toFixed(0)}</p>}
      </div>
    </div>
  );
}
