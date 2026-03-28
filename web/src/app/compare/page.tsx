"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { MetricTooltip } from "@/components/shared/metric-tooltip";
import { Search, X, Trophy, Zap, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { ShareImageButton } from "@/components/shared/share-image-button";
import { getPlayerHeadshotUrl, getTeamLogoByAbbr, NBA_TEAMS } from "@/lib/nba-data";
import { tierClass, num } from "@/lib/formatting";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlayerOption {
  id: number;
  full_name: string;
  position: string | null;
  external_id: number | null;
  team_abbr: string;
  bis_score: number | null;
  lfi_score: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"];

const CONFERENCES = ["All", "East", "West"] as const;

const CATEGORIES = [
  { key: "all",     label: "All Players", icon: "" },
  { key: "top10",   label: "Top 10",      icon: "⭐" },
  { key: "hot",     label: "Hot",          icon: "🔥" },
  { key: "allstar", label: "All-Stars",    icon: "🏆" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

const TEAM_ABBRS = Object.keys(NBA_TEAMS).sort((a, b) => {
  const ta = NBA_TEAMS[a]; const tb = NBA_TEAMS[b];
  if (ta.conference !== tb.conference) return ta.conference === "West" ? 1 : -1;
  return ta.city.localeCompare(tb.city);
});

const SUGGESTED_MATCHUPS = [
  { label: "Wemby vs Jokić",    s1: "Wembanyama",    s2: "Jokic"        },
  { label: "SGA vs Tatum",      s1: "Gilgeous",      s2: "Jayson Tatum" },
  { label: "LeBron vs KD",      s1: "LeBron",        s2: "Kevin Durant" },
  { label: "Luka vs Giannis",   s1: "Doncic",        s2: "Giannis"      },
  { label: "AD vs Bam",         s1: "Anthony Davis", s2: "Bam Adebayo"  },
];

const METRIC_DEFS = [
  { key: "bis", label: "BIS", icon: "⭐", desc: "overall impact score" },
  { key: "rda", label: "OIQ", icon: "🧠", desc: "offensive intelligence" },
  { key: "drs", label: "DRS", icon: "🛡️", desc: "defensive rating" },
  { key: "lfi", label: "LFI", icon: "🔥", desc: "recent form" },
  { key: "sps", label: "PEM", icon: "🎯", desc: "playmaking efficiency" },
  { key: "goi", label: "GOI", icon: "⚡", desc: "clutch impact" },
];

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 3) return null;
  const reversed = [...values].reverse(); // API returns desc, we want oldest→newest
  const max = Math.max(...reversed);
  const min = Math.min(...reversed);
  const range = max - min || 1;
  const W = 100; const H = 28; const PAD = 2;

  const pts = reversed
    .map((v, i) => {
      const x = PAD + (i / (reversed.length - 1)) * (W - PAD * 2);
      const y = PAD + ((max - v) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Last point (most recent game)
  const lastV = reversed[reversed.length - 1];
  const lastX = W - PAD;
  const lastY = PAD + ((max - lastV) / range) * (H - PAD * 2);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

// ─── Player Picker Grid ───────────────────────────────────────────────────────

function PlayerPickerGrid({
  allPlayers,
  onSelect,
  excludeId,
  accentColor,
  slotLabel,
}: {
  allPlayers: PlayerOption[];
  onSelect: (p: PlayerOption) => void;
  excludeId?: number | null;
  accentColor: string;
  slotLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState("All");
  const [conf, setConf] = useState<string>("All");
  const [team, setTeam] = useState<string>("All");
  const [category, setCategory] = useState<Category>("all");
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset team when conference changes
  useEffect(() => {
    if (conf !== "All") setTeam("All");
  }, [conf]);

  const filtered = useMemo(() => {
    let list = allPlayers.filter((p) => p.id !== excludeId);

    // Conference filter
    if (conf !== "All") {
      list = list.filter((p) => {
        const t = NBA_TEAMS[p.team_abbr];
        return t && t.conference === conf;
      });
    }

    // Team filter
    if (team !== "All") {
      list = list.filter((p) => p.team_abbr === team);
    }

    // Position filter
    if (pos !== "All") list = list.filter((p) => p.position?.includes(pos));

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.full_name.toLowerCase().includes(q));
    }

    // Category filter
    if (category === "top10") {
      list = [...list].sort((a, b) => (Number(b.bis_score) || 0) - (Number(a.bis_score) || 0)).slice(0, 10);
    } else if (category === "hot") {
      list = [...list]
        .filter((p) => p.lfi_score != null && Number(p.lfi_score) > 0)
        .sort((a, b) => (Number(b.lfi_score) || 0) - (Number(a.lfi_score) || 0))
        .slice(0, 15);
    } else if (category === "allstar") {
      list = [...list].sort((a, b) => (Number(b.bis_score) || 0) - (Number(a.bis_score) || 0)).slice(0, 24);
    }

    return list.slice(0, 36);
  }, [allPlayers, excludeId, pos, query, conf, team, category]);

  // Autocomplete dropdown (only when typing)
  const searchResults = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return allPlayers
      .filter((p) => p.id !== excludeId && p.full_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allPlayers, excludeId, query]);

  const showAutocomplete = query.length >= 2 && searchResults.length > 0;

  const teamsByConf = useMemo(() => {
    if (conf === "All") return TEAM_ABBRS;
    return TEAM_ABBRS.filter((a) => NBA_TEAMS[a]?.conference === conf);
  }, [conf]);

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
          {slotLabel}
        </p>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all ${
            showFilters || conf !== "All" || team !== "All" || category !== "all"
              ? "text-indigo-400 bg-[rgba(129,140,248,0.08)]"
              : "text-text-muted/40 hover:text-text-muted/60"
          }`}
        >
          <Filter className="h-2.5 w-2.5" />
          Filters{(conf !== "All" || team !== "All" || category !== "all") && " ·"}
        </button>
      </div>

      {/* Search input with autocomplete */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted/40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a player name…"
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-8 py-2 text-[12px] text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-[rgba(129,140,248,0.3)] focus:bg-white/[0.05] transition-all"
        />
        {query && (
          <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted/30 hover:text-text-muted">
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Autocomplete dropdown */}
        {showAutocomplete && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0f1320] border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setQuery(""); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[rgba(129,140,248,0.08)] transition-all text-left border-b border-white/[0.04] last:border-0"
              >
                <div className="relative h-8 w-8 rounded-md overflow-hidden bg-white/[0.04] shrink-0">
                  {p.external_id ? (
                    <Image
                      src={getPlayerHeadshotUrl(Number(p.external_id))}
                      alt={p.full_name}
                      fill
                      className="object-cover object-top scale-[1.3] translate-y-[1px]"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-text-muted/20 text-[8px]">?</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-text-primary truncate">{p.full_name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="relative h-3 w-3 shrink-0">
                      <Image src={getTeamLogoByAbbr(p.team_abbr)} alt={p.team_abbr} fill className="object-contain" unoptimized />
                    </div>
                    <span className="text-[9px] text-text-muted">{p.team_abbr} · {p.position}</span>
                  </div>
                </div>
                {p.bis_score != null && (
                  <span className={`text-[11px] font-bold font-stat shrink-0 ${tierClass(Number(p.bis_score))}`}>
                    {Number(p.bis_score).toFixed(0)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="space-y-2 animate-fade-in">
          {/* Category quick-picks */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  category === c.key
                    ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border border-[rgba(129,140,248,0.25)]"
                    : "text-text-muted/40 border border-transparent hover:text-text-muted/60 hover:bg-white/[0.02]"
                }`}
              >
                {c.icon && <span className="mr-0.5">{c.icon}</span>}{c.label}
              </button>
            ))}
          </div>

          {/* Conference filter */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-text-muted/30 uppercase tracking-widest w-10 shrink-0">Conf</span>
            <div className="flex gap-1">
              {CONFERENCES.map((c) => (
                <button
                  key={c}
                  onClick={() => setConf(c)}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
                    conf === c
                      ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border border-[rgba(129,140,248,0.25)]"
                      : "text-text-muted/40 border border-transparent hover:text-text-muted/60"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Team logo scroller */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-text-muted/30 uppercase tracking-widest w-10 shrink-0">Team</span>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setTeam("All")}
                className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shrink-0 transition-all ${
                  team === "All"
                    ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border border-[rgba(129,140,248,0.25)]"
                    : "text-text-muted/40 border border-transparent hover:text-text-muted/60"
                }`}
              >
                All
              </button>
              {teamsByConf.map((abbr) => (
                <button
                  key={abbr}
                  onClick={() => setTeam(abbr)}
                  className={`relative h-6 w-6 rounded shrink-0 transition-all border ${
                    team === abbr
                      ? "border-indigo-400 bg-[rgba(129,140,248,0.12)] scale-110"
                      : "border-transparent hover:border-white/[0.1] hover:bg-white/[0.03]"
                  }`}
                  title={`${NBA_TEAMS[abbr].city} ${NBA_TEAMS[abbr].name}`}
                >
                  <Image
                    src={getTeamLogoByAbbr(abbr)}
                    alt={abbr}
                    fill
                    className="object-contain p-0.5"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Position chips */}
      <div className="flex flex-wrap gap-1">
        {POSITIONS.map((p) => (
          <button
            key={p}
            onClick={() => setPos(p)}
            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
              pos === p
                ? "bg-[rgba(129,140,248,0.1)] text-indigo-400 border border-[rgba(129,140,248,0.2)]"
                : "text-text-muted/40 border border-transparent hover:text-text-muted/60"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-3 gap-1.5 overflow-y-auto flex-1 pr-0.5" style={{ maxHeight: showFilters ? 200 : 260 }}>
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-8 text-[11px] text-text-muted/30">
            No players found
          </div>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="flex flex-col items-center gap-1 p-1.5 rounded-lg border border-white/[0.04] hover:border-[rgba(129,140,248,0.25)] hover:bg-[rgba(129,140,248,0.05)] transition-all group text-center"
          >
            <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">
              {p.external_id ? (
                <Image
                  src={getPlayerHeadshotUrl(Number(p.external_id))}
                  alt={p.full_name}
                  fill
                  className="object-cover object-top scale-[1.3] translate-y-[1px]"
                  unoptimized
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-text-muted/20 text-[9px]">?</div>
              )}
              {/* Team logo overlay */}
              <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-[#0a0e1a]/80 rounded-tl-sm">
                <Image src={getTeamLogoByAbbr(p.team_abbr)} alt="" fill className="object-contain p-[1px]" unoptimized />
              </div>
            </div>
            <p className="text-[8px] font-semibold text-text-primary leading-tight line-clamp-1 w-full">
              {p.full_name.split(" ").slice(1).join(" ") || p.full_name}
            </p>
            <div className="flex items-center gap-1">
              {p.bis_score != null && (
                <span className={`text-[8px] font-bold font-stat ${tierClass(Number(p.bis_score))}`}>
                  {Number(p.bis_score).toFixed(0)}
                </span>
              )}
              {category === "hot" && p.lfi_score != null && (
                <span className="text-[8px] font-bold font-stat text-orange-400">
                  🔥{Number(p.lfi_score).toFixed(0)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Selected Player Card ─────────────────────────────────────────────────────

function SelectedPlayerCard({
  player,
  logs,
  color,
  isWinner,
  onClear,
}: {
  player: any;
  logs: number[];
  color: string;
  isWinner: boolean | null;
  onClear: () => void;
}) {
  const bis = num(player.bis_score) ?? 0;
  const ppg = num(player.ppg) ?? 0;
  const rpg = num(player.rpg) ?? 0;
  const apg = num(player.apg) ?? 0;

  return (
    <div
      className={`relative rounded-xl border-2 p-5 transition-all duration-500 flex flex-col items-center ${
        isWinner === true
          ? "shadow-[0_0_40px_rgba(240,165,0,0.18)]"
          : isWinner === false
          ? "opacity-70"
          : ""
      }`}
      style={{
        background: "rgba(10, 14, 26, 0.85)",
        borderColor: isWinner === true ? "#f0a500" : isWinner === false ? "rgba(255,255,255,0.05)" : `${color}35`,
      }}
    >
      {/* Winner badge */}
      {isWinner === true && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-amber-400 text-[#0a0e1a] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg">
          <Trophy className="h-2.5 w-2.5" /> Winner
        </div>
      )}

      {/* Clear button */}
      <button
        onClick={onClear}
        className="absolute top-2.5 right-2.5 text-text-muted/20 hover:text-rose-400 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Portrait */}
      <div
        className="relative h-24 w-24 rounded-xl overflow-hidden border-2 mb-3"
        style={{ borderColor: isWinner === true ? "#f0a500" : `${color}40` }}
      >
        <Image
          src={getPlayerHeadshotUrl(Number(player.external_id))}
          alt={player.full_name}
          fill
          className="object-cover object-top scale-[1.4] translate-y-[2px]"
          unoptimized
        />
      </div>

      {/* Name + team */}
      <p className="text-[15px] font-bold text-center leading-tight mb-1">{player.full_name}</p>
      <div className="flex items-center gap-1.5 mb-4">
        <div className="relative h-3.5 w-3.5">
          <Image src={getTeamLogoByAbbr(player.team_abbr)} alt={player.team_abbr} fill className="object-contain" unoptimized />
        </div>
        <span className="text-[10px] text-text-muted">{player.team_abbr} · {player.position}</span>
      </div>

      {/* BIS hero number */}
      <div className={`text-4xl font-black font-stat mb-0.5 ${tierClass(bis)}`}>{bis.toFixed(0)}</div>
      <div className="text-[8px] text-text-muted/40 uppercase tracking-[0.15em] mb-4">BIS Score</div>

      {/* Stat pills */}
      <div className="flex gap-2 mb-4">
        {[
          { label: "PPG", val: ppg.toFixed(1) },
          { label: "RPG", val: rpg.toFixed(1) },
          { label: "APG", val: apg.toFixed(1) },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center bg-white/[0.04] rounded-lg px-2.5 py-1.5">
            <span className="text-[13px] font-bold font-stat text-text-primary">{s.val}</span>
            <span className="text-[8px] text-text-muted/40 uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      {logs.length >= 3 && (
        <div className="w-full border-t border-white/[0.05] pt-3 flex flex-col items-center gap-1">
          <p className="text-[8px] text-text-muted/30 uppercase tracking-widest">Last {logs.length} games · PPG</p>
          <Sparkline values={logs} color={color} />
        </div>
      )}
    </div>
  );
}

// ─── Key Advantage ────────────────────────────────────────────────────────────

function KeyAdvantage({ p1, p2 }: { p1: any; p2: any }) {
  let biggestGap = -1;
  let best = METRIC_DEFS[0];
  let winsP1 = true;

  for (const m of METRIC_DEFS) {
    const v1 = num(p1[`${m.key}_score`]) ?? 0;
    const v2 = num(p2[`${m.key}_score`]) ?? 0;
    const gap = Math.abs(v1 - v2);
    if (gap > biggestGap) {
      biggestGap = gap;
      best = m;
      winsP1 = v1 >= v2;
    }
  }

  const winner = winsP1 ? p1 : p2;
  const loser  = winsP1 ? p2 : p1;
  const wVal   = num(winner[`${best.key}_score`]) ?? 0;
  const lVal   = num(loser[`${best.key}_score`]) ?? 0;
  const wLn    = winner.full_name.split(" ").slice(1).join(" ") || winner.full_name;
  const lLn    = loser.full_name.split(" ").slice(1).join(" ") || loser.full_name;

  let callout: string;
  if (biggestGap >= 25) {
    callout = `Not even close. ${wLn} leads ${lLn} by ${biggestGap.toFixed(0)} points in ${best.desc} — that's not a gap, it's a gulf.`;
  } else if (biggestGap >= 15) {
    callout = `${wLn} has a decisive edge in ${best.desc}: ${wVal.toFixed(0)} vs ${lVal.toFixed(0)}. This is the number that defines this matchup.`;
  } else if (biggestGap >= 8) {
    callout = `${wLn} wins ${best.label} ${wVal.toFixed(0)}–${lVal.toFixed(0)}. In a close comparison, that edge in ${best.desc} is the tiebreaker.`;
  } else {
    callout = `These two are essentially even everywhere. The biggest gap is ${best.label} at just ${biggestGap.toFixed(0)} points — within margin of error.`;
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Key Advantage</span>
        </div>
        <span className="text-xl">{best.icon}</span>
      </div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className={`text-4xl font-black font-stat ${tierClass(wVal)}`}>{best.label}</span>
        <span className="text-text-muted/60 text-sm font-stat">{wVal.toFixed(0)} vs {lVal.toFixed(0)}</span>
      </div>
      <p className="text-[13px] font-medium text-text-primary leading-relaxed">{callout}</p>
    </GlassCard>
  );
}

// ─── Metric Battle ────────────────────────────────────────────────────────────

function MetricBattle({ p1, p2 }: { p1: any; p2: any }) {
  const ln1 = p1.full_name.split(" ").pop() ?? p1.full_name;
  const ln2 = p2.full_name.split(" ").pop() ?? p2.full_name;

  return (
    <GlassCard>
      {/* Legend */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Metric Battle</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-[10px] text-text-muted">{ln1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-text-muted">{ln2}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {METRIC_DEFS.map((m) => {
          const v1 = num(p1[`${m.key}_score`]) ?? 0;
          const v2 = num(p2[`${m.key}_score`]) ?? 0;
          const p1Wins = v1 > v2;
          const p2Wins = v2 > v1;

          return (
            <div key={m.key} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              {/* P1 side — bar grows rightward from left, but visually toward center */}
              <div className="flex items-center justify-end gap-2">
                <span className={`font-stat text-sm font-bold shrink-0 ${p1Wins ? tierClass(v1) : "text-text-muted/40"}`}>
                  {v1.toFixed(0)}
                </span>
                {/* Bar: full width container, justified end so bar touches center */}
                <div className="w-28 h-2 bg-white/[0.04] rounded-full overflow-hidden flex justify-end">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${v1}%`,
                      background: "#818cf8",
                      opacity: p1Wins ? 1 : 0.2,
                    }}
                  />
                </div>
              </div>

              {/* Center label */}
              <MetricTooltip metricKey={m.key}>
                <div className="w-10 text-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    p1Wins ? "text-indigo-400" : p2Wins ? "text-amber-400" : "text-text-muted/40"
                  }`}>
                    {m.label}
                  </span>
                </div>
              </MetricTooltip>

              {/* P2 side — bar grows rightward from center */}
              <div className="flex items-center gap-2">
                <div className="w-28 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${v2}%`,
                      background: "#f0a500",
                      opacity: p2Wins ? 1 : 0.2,
                    }}
                  />
                </div>
                <span className={`font-stat text-sm font-bold shrink-0 ${p2Wins ? tierClass(v2) : "text-text-muted/40"}`}>
                  {v2.toFixed(0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── Verdict Builder ──────────────────────────────────────────────────────────

function buildVerdict(p1: any, p2: any) {
  const n = (key: string, p: any) => num(p[`${key}_score`]) ?? 0;

  const bis1 = n("bis", p1); const bis2 = n("bis", p2);
  const oiq1 = n("rda", p1); const oiq2 = n("rda", p2);
  const drs1 = n("drs", p1); const drs2 = n("drs", p2);
  const lfi1 = n("lfi", p1); const lfi2 = n("lfi", p2);
  const pem1 = n("sps", p1); const pem2 = n("sps", p2);
  const goi1 = n("goi", p1); const goi2 = n("goi", p2);

  const ppg1 = num(p1.ppg) ?? 0;   const ppg2 = num(p2.ppg) ?? 0;
  const apg1 = num(p1.apg) ?? 0;   const apg2 = num(p2.apg) ?? 0;
  const fg1  = (num(p1.fg_pct) ?? 0) * 100;
  const fg2  = (num(p2.fg_pct) ?? 0) * 100;
  const fg3_1 = (num(p1.fg3_pct) ?? 0) * 100;
  const fg3_2 = (num(p2.fg3_pct) ?? 0) * 100;

  const p1MetricWins = METRIC_DEFS.filter((m) => n(m.key, p1) > n(m.key, p2)).length;
  const p2MetricWins = METRIC_DEFS.filter((m) => n(m.key, p2) > n(m.key, p1)).length;

  const margin    = Math.abs(bis1 - bis2);
  const winner    = bis1 >= bis2 ? p1 : p2;
  const loser     = bis1 >= bis2 ? p2 : p1;
  const bisW      = Math.max(bis1, bis2);
  const bisL      = Math.min(bis1, bis2);
  const wLn       = winner.full_name.split(" ").slice(1).join(" ") || winner.full_name;
  const lLn       = loser.full_name.split(" ").slice(1).join(" ") || loser.full_name;
  const ln1       = p1.full_name.split(" ").slice(1).join(" ") || p1.full_name;
  const ln2       = p2.full_name.split(" ").slice(1).join(" ") || p2.full_name;

  let headline: string;
  if (margin < 3) headline = "Too close to call";
  else if (margin < 8) headline = `${wLn} has the edge`;
  else if (margin < 18) headline = `${wLn} wins this one`;
  else headline = `${wLn} is a clear tier above`;

  const paras: string[] = [];

  // ① Overall picture
  if (margin < 3) {
    paras.push(
      `${p1.full_name} and ${p2.full_name} are essentially identical on paper — BIS scores of ${bis1.toFixed(0)} vs ${bis2.toFixed(0)} sit within statistical noise. ` +
      `Both are winning ${p1MetricWins} metric categories each, meaning there's no clear edge anywhere across CourtVision's six analytical dimensions. ` +
      `In a matchup this tight, context beats numbers: roster fit, usage, and role are the actual deciding factors.`
    );
  } else {
    const winsStr = `${Math.max(p1MetricWins, p2MetricWins)}-${Math.min(p1MetricWins, p2MetricWins)} across six CourtVision metrics`;
    if (margin < 8) {
      paras.push(
        `${winner.full_name} takes this comparison, but it's far from a blowout. ${wLn} edges out ${lLn} ${winsStr}, carrying a BIS of ${bisW.toFixed(0)} vs ${bisL.toFixed(0)} — ` +
        `a gap that's real but not conclusive. Both are quality contributors; ${wLn} is just the more complete player right now.`
      );
    } else if (margin < 18) {
      paras.push(
        `${winner.full_name} wins this matchup: BIS ${bisW.toFixed(0)} vs ${lLn}'s ${bisL.toFixed(0)}, a ${margin.toFixed(0)}-point gap CourtVision considers meaningful. ` +
        `${wLn} wins ${winsStr} — this is breadth of dominance, not strength in just one area. ${lLn} is a quality player, but ${wLn} is operating at a higher level right now.`
      );
    } else {
      paras.push(
        `This isn't close. ${winner.full_name}'s BIS of ${bisW.toFixed(0)} puts ${wLn} in a completely different tier from ${lLn} (${bisL.toFixed(0)}). ` +
        `A ${margin.toFixed(0)}-point BIS gap reflects systematic dominance — ${wLn} wins ${winsStr}, and the gaps in individual categories are often decisive on their own. ` +
        `For context, a BIS difference of 15+ typically separates All-Star-caliber players from rotation contributors.`
      );
    }
  }

  // ② Offensive profile
  const offPpgWinner = ppg1 + apg1 * 1.5 >= ppg2 + apg2 * 1.5 ? p1 : p2;
  const offLn = offPpgWinner === p1 ? ln1 : ln2;
  const offOppLn = offPpgWinner === p1 ? ln2 : ln1;
  const offPpg  = offPpgWinner === p1 ? ppg1 : ppg2;
  const offApg  = offPpgWinner === p1 ? apg1 : apg2;
  const defPpg  = offPpgWinner === p1 ? ppg2 : ppg1;
  const defApg  = offPpgWinner === p1 ? apg2 : apg1;
  const offOiq  = offPpgWinner === p1 ? oiq1 : oiq2;
  const defOiq  = offPpgWinner === p1 ? oiq2 : oiq1;
  const offPem  = offPpgWinner === p1 ? pem1 : pem2;
  const defPem  = offPpgWinner === p1 ? pem2 : pem1;

  let offPara = `**Offensively**, ${offLn} is the more dangerous creator — ${offPpg.toFixed(1)} PPG and ${offApg.toFixed(1)} APG vs ${defPpg.toFixed(1)}/${defApg.toFixed(1)} for ${offOppLn}. `;
  if (Math.abs(oiq1 - oiq2) > 8) {
    offPara += `The OIQ gap (${offOiq.toFixed(0)} vs ${defOiq.toFixed(0)}) reinforces it: ${offLn} is reading defenses and making the right call at a higher rate. `;
  }
  if (Math.abs(pem1 - pem2) > 8) {
    offPara += `PEM — which captures playmaking efficiency beyond raw assists — also favors ${offLn} by ${Math.abs(offPem - defPem).toFixed(0)} points (${offPem.toFixed(0)} vs ${defPem.toFixed(0)}). `;
  }
  if (Math.abs(fg1 - fg2) > 3) {
    const efWinner = fg1 > fg2 ? ln1 : ln2;
    offPara += `${efWinner} is the more efficient scorer at ${Math.max(fg1, fg2).toFixed(1)}% from the field vs ${Math.min(fg1, fg2).toFixed(1)}%.`;
  }
  if (Math.abs(fg3_1 - fg3_2) > 4) {
    const thrWinner = fg3_1 > fg3_2 ? ln1 : ln2;
    offPara += ` From deep, ${thrWinner} is noticeably sharper (${Math.max(fg3_1, fg3_2).toFixed(1)}% vs ${Math.min(fg3_1, fg3_2).toFixed(1)}%), adding a spacing dimension that compounds over a full game.`;
  }
  paras.push(offPara);

  // ③ Defensive profile
  const drsGap     = Math.abs(drs1 - drs2);
  const defWinner  = drs1 > drs2 ? p1 : p2;
  const dLn        = defWinner === p1 ? ln1 : ln2;
  const dOppLn     = defWinner === p1 ? ln2 : ln1;
  const drsW       = Math.max(drs1, drs2);
  const drsL       = Math.min(drs1, drs2);

  let defPara = `**Defensively**, `;
  if (drsGap < 5) {
    defPara += `these two are evenly matched — DRS of ${drs1.toFixed(0)} and ${drs2.toFixed(0)} indicate similar defensive output. Neither player stands out as a switchable stopper or a liability on this end.`;
  } else if (drsGap < 15) {
    defPara += `${dLn} holds a moderate edge (DRS ${drsW.toFixed(0)} vs ${drsL.toFixed(0)}). It's not a canyon, but it's consistent — ${dLn} is generating more stops and forcing more turnovers over a full season.`;
  } else {
    defPara += `this is where the comparison really opens up. ${dLn}'s DRS of ${drsW.toFixed(0)} vs ${dOppLn}'s ${drsL.toFixed(0)} is a significant defensive disparity. `;
    defPara += drsW > 75
      ? `A DRS above 75 puts ${dLn} in elite-defender territory — generating real stops, not just avoiding mistakes.`
      : `${dLn} is protecting the paint, contesting shots, and limiting secondaries in a way ${dOppLn} simply isn't matching.`;
  }
  paras.push(defPara);

  // ④ Form & momentum
  const lfiGap     = Math.abs(lfi1 - lfi2);
  const formWinner = lfi1 > lfi2 ? p1 : p2;
  const fLn        = formWinner === p1 ? ln1 : ln2;
  const fOppLn     = formWinner === p1 ? ln2 : ln1;
  const lfiW       = Math.max(lfi1, lfi2);
  const lfiL       = Math.min(lfi1, lfi2);

  let formPara = `**Recent form (LFI)**: `;
  if (lfiGap < 5) {
    formPara += `Both players are trending at a similar trajectory — LFI of ${lfi1.toFixed(0)} and ${lfi2.toFixed(0)} show no meaningful momentum divergence. Neither is running especially hot or cold.`;
  } else if (lfiGap < 15) {
    formPara += `${fLn} is playing slightly better basketball right now (LFI ${lfiW.toFixed(0)} vs ${lfiL.toFixed(0)}). The gap isn't huge, but ${fLn} has more wind in the sails heading into any near-term matchup.`;
  } else {
    formPara += `${fLn} is the hotter player by a clear margin — LFI of ${lfiW.toFixed(0)} vs ${fOppLn}'s ${lfiL.toFixed(0)} is a real form gap. `;
    formPara += lfiW > 75
      ? `An LFI above 75 signals a genuine hot streak. ${fLn} is playing some of the best basketball of the season right now.`
      : `${fOppLn}'s lower LFI warrants monitoring — whether it's fatigue, injury management, or a rough stretch, the drop-off in recent games is measurable.`;
  }
  paras.push(formPara);

  // ⑤ Clutch impact
  const goiGap     = Math.abs(goi1 - goi2);
  const clutchWin  = goi1 > goi2 ? p1 : p2;
  const cLn        = clutchWin === p1 ? ln1 : ln2;
  const cOppLn     = clutchWin === p1 ? ln2 : ln1;
  const goiW       = Math.max(goi1, goi2);
  const goiL       = Math.min(goi1, goi2);

  let clutchPara = `**Game-changing impact (GOI)**: `;
  if (goiGap < 5) {
    clutchPara += `Nearly identical clutch profiles at ${goi1.toFixed(0)} and ${goi2.toFixed(0)}. Both bring similar high-leverage impact when games are on the line.`;
  } else {
    clutchPara += `${cLn} is the more game-changing presence: GOI ${goiW.toFixed(0)} vs ${cOppLn}'s ${goiL.toFixed(0)}. `;
    clutchPara += goiW > 70
      ? `A GOI above 70 marks a player who genuinely moves the needle in close games — the kind of player a coaching staff builds late-game sets around.`
      : `It's not franchise-altering, but in playoff-style situations where every possession matters, the difference shows.`;
  }
  paras.push(clutchPara);

  // ⑥ Bottom line
  let bottom = `**Bottom line**: `;
  if (margin < 3) {
    bottom += `Pick whichever fits your system. The metrics can't separate them — scheme and chemistry will.`;
  } else {
    const teamFit = ppg1 > 25 || ppg2 > 25 ? ` Both carry heavy usage, so roster construction matters — build around whoever you choose.` : "";
    if (margin >= 18) {
      bottom += `${winner.full_name} is the call, and it's not a close argument. At this level of BIS separation it's genuinely hard to make the case for ${lLn} unless there's a specific positional or contract reason.${teamFit}`;
    } else {
      bottom += `${winner.full_name} is the call. That said, ${lLn} is not a bad player — this is a comparison between two quality contributors, and the loser here would start on plenty of rosters.${teamFit}`;
    }
  }
  paras.push(bottom);

  return { headline, paras, p1MetricWins, p2MetricWins, winner: bis1 >= bis2 ? 1 as const : 2 as const };
}

function VerdictParagraph({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-[12px] text-text-secondary leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [player1, setPlayer1] = useState<any>(null);
  const [player2, setPlayer2] = useState<any>(null);
  const [logs1,   setLogs1]   = useState<number[]>([]);
  const [logs2,   setLogs2]   = useState<number[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading]  = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(true);

  const shareRef = useRef<HTMLDivElement>(null);
  const hasComparison = !!(player1 && player2);

  // Load full player roster on mount
  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((json) => setAllPlayers(json.players ?? []))
      .catch(() => {});
  }, []);

  // Fetch sparkline logs whenever a player is selected
  useEffect(() => {
    if (!player1?.id) { setLogs1([]); return; }
    fetch(`/api/players/${player1.id}/logs`)
      .then((r) => r.json())
      .then((json) =>
        setLogs1((json.logs ?? []).map((l: any) => Number(l.pts)).filter((v: number) => !isNaN(v) && v >= 0))
      )
      .catch(() => {});
  }, [player1?.id]);

  useEffect(() => {
    if (!player2?.id) { setLogs2([]); return; }
    fetch(`/api/players/${player2.id}/logs`)
      .then((r) => r.json())
      .then((json) =>
        setLogs2((json.logs ?? []).map((l: any) => Number(l.pts)).filter((v: number) => !isNaN(v) && v >= 0))
      )
      .catch(() => {});
  }, [player2?.id]);

  // Resolve suggested matchups from allPlayers
  const resolvedMatchups = useMemo(() => {
    if (!allPlayers.length) return [];
    return SUGGESTED_MATCHUPS.map((m) => {
      const p1 = allPlayers.find((p) => p.full_name.toLowerCase().includes(m.s1.toLowerCase()));
      const p2 = allPlayers.find((p) => p.full_name.toLowerCase().includes(m.s2.toLowerCase()));
      return p1 && p2 ? { label: m.label, p1, p2 } : null;
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [allPlayers]);

  // Select a player (fetches full data from compare API)
  const selectPlayer = useCallback(async (option: PlayerOption, slot: 1 | 2) => {
    const id = option.id;
    const otherId = slot === 1 ? player2?.id : player1?.id;
    setLoading(true);
    try {
      const p1Id = slot === 1 ? id : (otherId ?? id);
      const p2Id = slot === 2 ? id : (otherId ?? id);
      const res  = await fetch(`/api/compare?p1=${p1Id}&p2=${p2Id}`);
      const json = await res.json();
      if (json.player1) setPlayer1(json.player1);
      if (json.player2) setPlayer2(json.player2);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [player1?.id, player2?.id]);

  // Load a suggested matchup
  const loadMatchup = useCallback(async (p1: PlayerOption, p2: PlayerOption) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/compare?p1=${p1.id}&p2=${p2.id}`);
      const json = await res.json();
      if (json.player1) setPlayer1(json.player1);
      if (json.player2) setPlayer2(json.player2);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const clearPlayer = (slot: 1 | 2) => {
    if (slot === 1) { setPlayer1(null); setLogs1([]); }
    else            { setPlayer2(null); setLogs2([]); }
  };

  const verdict = useMemo(
    () => hasComparison ? buildVerdict(player1, player2) : null,
    [hasComparison, player1, player2]
  );

  const isWinner = (slot: 1 | 2): boolean | null => {
    if (!verdict) return null;
    return verdict.winner === slot;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Compare</h1>
        <p className="text-sm text-text-muted mt-1">Head-to-head player evaluation — click any player to get started</p>
      </div>

      {/* ── Suggested Matchups ──────────────────────────────────────────── */}
      {resolvedMatchups.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/40 mb-2">Popular matchups</p>
          <div className="flex flex-wrap gap-2">
            {resolvedMatchups.map((m) => (
              <button
                key={m.label}
                onClick={() => loadMatchup(m.p1, m.p2)}
                disabled={loading}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-full border border-white/[0.08] text-text-secondary hover:border-[rgba(129,140,248,0.3)] hover:text-indigo-400 hover:bg-[rgba(129,140,248,0.05)] transition-all disabled:opacity-40"
              >
                🔥 {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Battle Arena ─────────────────────────────────────────────────── */}
      <div ref={shareRef}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_56px_1fr] gap-4 items-stretch">

          {/* Slot 1 */}
          <div className="min-h-[360px]">
            {player1 ? (
              <SelectedPlayerCard
                player={player1}
                logs={logs1}
                color="#818cf8"
                isWinner={isWinner(1)}
                onClear={() => clearPlayer(1)}
              />
            ) : (
              <GlassCard className="h-full flex flex-col" style={{ minHeight: 360 }}>
                <PlayerPickerGrid
                  allPlayers={allPlayers}
                  onSelect={(p) => selectPlayer(p, 1)}
                  excludeId={player2?.id}
                  accentColor="#818cf8"
                  slotLabel="Player 1"
                />
              </GlassCard>
            )}
          </div>

          {/* VS / Winner divider */}
          <div className="hidden sm:flex flex-col items-center justify-center gap-2 py-4">
            <div className="flex-1 w-px bg-white/[0.05]" />
            {verdict ? (
              <div className="flex flex-col items-center gap-1.5 px-1">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider text-center leading-tight">
                  {verdict.winner === 1
                    ? (player1.full_name.split(" ").pop())
                    : (player2.full_name.split(" ").pop())}
                </span>
              </div>
            ) : (
              <div className="h-9 w-9 rounded-full border border-white/[0.08] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-text-muted/40">VS</span>
              </div>
            )}
            <div className="flex-1 w-px bg-white/[0.05]" />
          </div>

          {/* Mobile VS separator */}
          <div className="flex sm:hidden items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-bold text-text-muted/30">VS</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Slot 2 */}
          <div className="min-h-[360px]">
            {player2 ? (
              <SelectedPlayerCard
                player={player2}
                logs={logs2}
                color="#f0a500"
                isWinner={isWinner(2)}
                onClear={() => clearPlayer(2)}
              />
            ) : (
              <GlassCard className="h-full flex flex-col" style={{ minHeight: 360 }}>
                <PlayerPickerGrid
                  allPlayers={allPlayers}
                  onSelect={(p) => selectPlayer(p, 2)}
                  excludeId={player1?.id}
                  accentColor="#f0a500"
                  slotLabel="Player 2"
                />
              </GlassCard>
            )}
          </div>
        </div>

        {/* ── Comparison sections (only when both selected) ─────────────── */}
        {hasComparison && verdict && (
          <div className="space-y-4 mt-4">
            <KeyAdvantage p1={player1} p2={player2} />
            <MetricBattle p1={player1} p2={player2} />
          </div>
        )}
      </div>

      {/* ── Verdict (outside share ref — text doesn't render well in PNG) ── */}
      {hasComparison && verdict && (
        <GlassCard variant="accent">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">The Verdict</span>
            </div>
            <div className="flex items-center gap-2">
              <ShareImageButton targetRef={shareRef} filename="courtvision-compare" label="Save as Image" />
              <button
                onClick={() => setVerdictOpen(!verdictOpen)}
                className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary transition-colors border border-white/[0.08] rounded px-2.5 py-1"
              >
                {verdictOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {verdictOpen ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          <p className="text-xl font-bold text-text-primary mb-4">{verdict.headline}</p>

          {verdictOpen && (
            <div className="space-y-3">
              {verdict.paras.map((para, i) => (
                <VerdictParagraph key={i} text={para} />
              ))}
            </div>
          )}

          {/* Metric wins footer */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/[0.06]">
            <span className="text-[10px] text-indigo-400 font-stat font-bold">
              {player1.full_name.split(" ").pop()}: {verdict.p1MetricWins} metric wins
            </span>
            <span className="text-[10px] text-amber-400 font-stat font-bold">
              {player2.full_name.split(" ").pop()}: {verdict.p2MetricWins} metric wins
            </span>
            <span className="text-[10px] text-text-muted/30 font-stat">
              {6 - verdict.p1MetricWins - verdict.p2MetricWins} ties
            </span>
          </div>
        </GlassCard>
      )}

      {/* Loading overlay hint */}
      {loading && (
        <p className="text-center text-[11px] text-text-muted/40 animate-pulse">Loading player data…</p>
      )}
    </div>
  );
}
