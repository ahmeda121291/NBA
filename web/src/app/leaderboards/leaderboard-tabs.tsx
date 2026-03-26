"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Activity, Shield, Target, Zap, Flame, BarChart3, Filter } from "lucide-react";
import { MetricTooltip } from "@/components/shared/metric-tooltip";
import { getTeamLogoByAbbr, getPlayerHeadshotUrl } from "@/lib/nba-data";
import { tierClass, num } from "@/lib/formatting";

const metricTabs = [
  { key: "bis", label: "BIS", fullName: "Baseline Impact Score", icon: Activity, description: "Overall player value — offense, defense, and impact combined" },
  { key: "lfi", label: "LFI", fullName: "Live Form Index", icon: Flame, description: "Current form — who's hot right now" },
  { key: "drs", label: "DRS", fullName: "Defensive Reality Score", icon: Shield, description: "True defensive impact beyond steals and blocks" },
  { key: "rda", label: "OIQ", fullName: "Offensive Impact Quotient", icon: Target, description: "Offensive burden and creation difficulty" },
  { key: "sps", label: "PEM", fullName: "Playmaking Efficiency Metric", icon: Zap, description: "How well value transfers across contexts" },
  { key: "goi", label: "GOI", fullName: "Gravity & Off-Ball Impact", icon: BarChart3, description: "Value created without the ball" },
];

const positions = ["All", "PG", "SG", "SF", "PF", "C"];
const minGamesOptions = [0, 10, 20, 30, 40];

interface Props {
  players: any[];
}

export function LeaderboardTabs({ players }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("metric");
    return t && metricTabs.some((m) => m.key === t) ? t : "bis";
  });
  const [posFilter, setPosFilter] = useState(() => searchParams.get("pos") || "All");
  const [minGames, setMinGames] = useState(() => {
    const g = searchParams.get("minGP");
    return g != null ? Number(g) : 20;
  });
  const [showCount, setShowCount] = useState(25);

  const scoreKey = `${activeTab}_score`;

  const filtered = useMemo(() => {
    let result = [...players].filter((p) => p[scoreKey] != null && Number(p[scoreKey]) !== 0);
    if (posFilter !== "All") {
      result = result.filter((p) => p.position === posFilter);
    }
    if (minGames > 0) {
      result = result.filter((p) => Number(p.games_played ?? 0) >= minGames);
    }
    return result.sort((a, b) => Number(b[scoreKey]) - Number(a[scoreKey]));
  }, [players, activeTab, posFilter, minGames, scoreKey]);

  const tabInfo = metricTabs.find((t) => t.key === activeTab)!;

  return (
    <div>
      {/* Tab selector */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {metricTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); updateUrl({ metric: tab.key }); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                isActive
                  ? "bg-[rgba(129,140,248,0.12)] text-indigo-400 border border-[rgba(129,140,248,0.25)]"
                  : "text-text-muted/60 border border-transparent hover:text-text-muted hover:border-white/[0.06]"
              }`}
            >
              <Icon className="h-3 w-3" />
              <MetricTooltip metricKey={tab.key}>{tab.label}</MetricTooltip>
            </button>
          );
        })}
      </div>

      {/* Active metric description */}
      <p className="text-[11px] text-text-muted/60 mb-3">
        <span className="text-indigo-400/70 font-semibold">{tabInfo.fullName}</span>
        {" — "}{tabInfo.description}
      </p>

      {/* Filters row */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {/* Position filter */}
        <div className="flex items-center gap-1">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => { setPosFilter(pos); updateUrl({ pos: pos === "All" ? null : pos }); }}
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

        <div className="w-px h-4 bg-white/[0.06]" />

        {/* Min games filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-text-muted/40" />
          <span className="text-[10px] text-text-muted/50 uppercase tracking-wider">Min GP:</span>
          {minGamesOptions.map((g) => (
            <button
              key={g}
              onClick={() => { setMinGames(g); updateUrl({ minGP: g === 20 ? null : String(g) }); }}
              className={`px-1.5 py-0.5 text-[10px] font-stat transition-all rounded-sm ${
                minGames === g
                  ? "text-indigo-400 bg-[rgba(129,140,248,0.08)]"
                  : "text-text-muted/40 hover:text-text-muted"
              }`}
            >
              {g === 0 ? "Any" : g}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-text-muted/30 font-stat ml-auto">{filtered.length} players</span>
      </div>

      {/* Leaderboard table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] text-left text-[9px] uppercase tracking-widest text-text-muted/40">
                <th className="p-3 w-10">#</th>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Pos</th>
                <th className="p-3 text-right">
                  <MetricTooltip metricKey={activeTab}>
                    <span className="text-indigo-400/70">{tabInfo.label}</span>
                  </MetricTooltip>
                </th>
                <th className="p-3 text-right"><MetricTooltip metricKey="ppg">PPG</MetricTooltip></th>
                <th className="p-3 text-right"><MetricTooltip metricKey="rpg">RPG</MetricTooltip></th>
                <th className="p-3 text-right"><MetricTooltip metricKey="apg">APG</MetricTooltip></th>
                <th className="p-3 text-right"><MetricTooltip metricKey="gp">GP</MetricTooltip></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, showCount).map((p: any, i: number) => {
                const score = Number(p[scoreKey]);
                return (
                  <tr key={p.id} className="border-b border-white/[0.03] table-row-hover group">
                    <td className="p-3 font-stat text-text-muted/30">{i + 1}</td>
                    <td className="p-3">
                      <a href={`/players/${p.id}`} className="flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                        <div className="relative h-7 w-7 shrink-0 rounded-sm overflow-hidden bg-white/[0.04]">
                          <Image src={getPlayerHeadshotUrl(Number(p.external_id))} alt={p.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
                        </div>
                        <div>
                          <span className="text-[12px] font-semibold">{p.full_name}</span>
                          <span className="text-[10px] text-text-muted ml-2">{p.team_abbr}</span>
                        </div>
                      </a>
                    </td>
                    <td className="p-3 text-center text-[10px] text-text-muted">{p.position || "—"}</td>
                    <td className={`p-3 text-right font-stat font-bold ${tierClass(score)}`}>
                      {score.toFixed(0)}
                    </td>
                    <td className="p-3 text-right font-stat text-[11px] text-text-secondary">{Number(p.ppg).toFixed(1)}</td>
                    <td className="p-3 text-right font-stat text-[11px] text-text-secondary">{Number(p.rpg).toFixed(1)}</td>
                    <td className="p-3 text-right font-stat text-[11px] text-text-secondary">{Number(p.apg).toFixed(1)}</td>
                    <td className="p-3 text-right font-stat text-[11px] text-text-muted">{p.games_played}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show more button */}
      {filtered.length > showCount && (
        <button
          onClick={() => setShowCount((c) => c + 25)}
          className="w-full mt-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted/50 hover:text-indigo-400 border border-white/[0.04] hover:border-[rgba(129,140,248,0.15)] transition-all rounded-sm"
        >
          Show more ({filtered.length - showCount} remaining)
        </button>
      )}
    </div>
  );
}
