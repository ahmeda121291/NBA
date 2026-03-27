"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { DataTable, Column, ViewPreset } from "@/components/shared/data-table";
import { getTeamLogoByAbbr, getPlayerHeadshotUrl } from "@/lib/nba-data";
import { tierClass, num, fmt, pct, consistencyInfo, consistencyScore } from "@/lib/formatting";

interface Props {
  players: any[];
}

export function PlayersTable({ players }: Props) {
  const [minGP, setMinGP] = useState(10);
  const [excludeInjured, setExcludeInjured] = useState(false);

  const filteredPlayers = useMemo(() => {
    return players.filter((p: any) => {
      if (Number(p.games_played) < minGP) return false;
      if (excludeInjured && (p.injury_status === "Out" || p.injury_status === "out")) return false;
      return true;
    });
  }, [players, minGP, excludeInjured]);
  const columns: Column<any>[] = [
    {
      key: "rank",
      label: "#",
      width: "40px",
      render: (_row, i) => <span className="font-stat text-text-muted/30">{i + 1}</span>,
    },
    {
      key: "name",
      label: "Player",
      sortable: true,
      width: "minmax(200px, 2fr)",
      sortValue: (r) => r.full_name,
      render: (r) => (
        <a href={`/players/${r.id}`} className="flex items-center gap-3 hover:text-indigo-400 transition-colors">
          <div className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-white/[0.04] border border-white/[0.06]">
            <Image src={getPlayerHeadshotUrl(Number(r.external_id))} alt={r.full_name} fill className="object-cover object-top scale-[1.4] translate-y-[2px]" unoptimized />
          </div>
          <div>
            <span className="text-[13px] font-semibold">{r.full_name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="relative h-3 w-3">
                <Image src={getTeamLogoByAbbr(r.team_abbr)} alt={r.team_abbr} fill className="object-contain" unoptimized />
              </div>
              <span className="text-[10px] text-text-muted">{r.team_abbr}</span>
            </div>
          </div>
        </a>
      ),
    },
    {
      key: "pos", label: "Pos", width: "50px",
      render: (r) => <span className="text-[11px] text-text-muted">{r.position || "—"}</span>,
    },
    {
      key: "gp", label: "GP", align: "right", sortable: true, width: "50px", isMetric: true, metricKey: "gp",
      sortValue: (r) => num(r.games_played),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{r.games_played}</span>,
    },
    // CourtVision metrics — consistent width and font treatment
    {
      key: "bis", label: "BIS", align: "right", sortable: true, isMetric: true, metricKey: "bis", width: "65px",
      sortValue: (r) => num(r.bis_score),
      render: (r) => <span className={`font-stat text-[13px] font-bold ${tierClass(num(r.bis_score))}`}>{fmt(r.bis_score, 0)}</span>,
    },
    {
      key: "lfi", label: "LFI", align: "right", sortable: true, isMetric: true, metricKey: "lfi", width: "65px",
      sortValue: (r) => num(r.lfi_score),
      render: (r) => <span className={`font-stat text-[13px] font-bold ${tierClass(num(r.lfi_score))}`}>{fmt(r.lfi_score, 0)}</span>,
    },
    {
      key: "drs", label: "DRS", align: "right", sortable: true, isMetric: true, metricKey: "drs", width: "60px",
      sortValue: (r) => num(r.drs_score),
      render: (r) => <span className={`font-stat text-[13px] ${tierClass(num(r.drs_score))}`}>{fmt(r.drs_score, 0)}</span>,
    },
    {
      key: "rda", label: "OIQ", align: "right", sortable: true, isMetric: true, metricKey: "rda", defaultVisible: false, width: "60px",
      sortValue: (r) => num(r.rda_score),
      render: (r) => <span className={`font-stat text-[13px] ${tierClass(num(r.rda_score))}`}>{fmt(r.rda_score, 0)}</span>,
    },
    {
      key: "sps", label: "PEM", align: "right", sortable: true, isMetric: true, metricKey: "sps", defaultVisible: false, width: "60px",
      sortValue: (r) => num(r.sps_score),
      render: (r) => <span className={`font-stat text-[13px] ${tierClass(num(r.sps_score))}`}>{fmt(r.sps_score, 0)}</span>,
    },
    {
      key: "goi", label: "GOI", align: "right", sortable: true, isMetric: true, metricKey: "goi", defaultVisible: false, width: "60px",
      sortValue: (r) => num(r.goi_score),
      render: (r) => <span className={`font-stat text-[13px] ${tierClass(num(r.goi_score))}`}>{fmt(r.goi_score, 0)}</span>,
    },
    {
      key: "con", label: "CON", align: "right", sortable: true, isMetric: true, metricKey: "con", defaultVisible: false, width: "80px",
      sortValue: (r) => consistencyScore(r.pts_stddev != null ? Number(r.pts_stddev) : null) ?? -1,
      render: (r) => {
        const info = consistencyInfo(r.pts_stddev != null ? Number(r.pts_stddev) : null, r.log_count != null ? Number(r.log_count) : null);
        if (info.shortLabel === "—") return <span className="text-text-muted/30 text-[11px]">—</span>;
        return (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${info.cls}`}>
            {info.shortLabel}
          </span>
        );
      },
    },
    // Traditional stats — consistent sizing
    {
      key: "ppg", label: "PPG", align: "right", sortable: true, isMetric: true, metricKey: "ppg", width: "60px",
      sortValue: (r) => num(r.ppg),
      render: (r) => <span className="font-stat text-[13px] font-semibold text-text-primary">{fmt(r.ppg)}</span>,
    },
    {
      key: "rpg", label: "RPG", align: "right", sortable: true, isMetric: true, metricKey: "rpg", width: "55px",
      sortValue: (r) => num(r.rpg),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.rpg)}</span>,
    },
    {
      key: "apg", label: "APG", align: "right", sortable: true, isMetric: true, metricKey: "apg", width: "55px",
      sortValue: (r) => num(r.apg),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.apg)}</span>,
    },
    {
      key: "spg", label: "SPG", align: "right", sortable: true, isMetric: true, metricKey: "spg", defaultVisible: false, width: "55px",
      sortValue: (r) => num(r.spg),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.spg)}</span>,
    },
    {
      key: "bpg", label: "BPG", align: "right", sortable: true, isMetric: true, metricKey: "bpg", defaultVisible: false, width: "55px",
      sortValue: (r) => num(r.bpg),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.bpg)}</span>,
    },
    {
      key: "fg", label: "FG%", align: "right", sortable: true, isMetric: true, metricKey: "fg_pct", width: "60px",
      sortValue: (r) => num(r.fg_pct),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{pct(r.fg_pct)}</span>,
    },
    {
      key: "fg3", label: "3P%", align: "right", sortable: true, isMetric: true, metricKey: "fg3_pct", width: "60px",
      sortValue: (r) => num(r.fg3_pct),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{pct(r.fg3_pct)}</span>,
    },
    {
      key: "ft", label: "FT%", align: "right", sortable: true, isMetric: true, metricKey: "ft_pct", defaultVisible: false, width: "60px",
      sortValue: (r) => num(r.ft_pct),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{pct(r.ft_pct)}</span>,
    },
    {
      key: "tov", label: "TOV", align: "right", sortable: true, isMetric: true, metricKey: "tov", defaultVisible: false, width: "55px",
      sortValue: (r) => num(r.topg),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.topg)}</span>,
    },
    {
      key: "mpg", label: "MPG", align: "right", sortable: true, isMetric: true, metricKey: "mpg", defaultVisible: false, width: "55px",
      sortValue: (r) => num(r.mpg),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.mpg)}</span>,
    },
    // Advanced stats
    {
      key: "per", label: "PER", align: "right", sortable: true, isMetric: true, metricKey: "per", defaultVisible: false, width: "55px",
      sortValue: (r) => num(r.per),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.per)}</span>,
    },
    {
      key: "usg", label: "USG%", align: "right", sortable: true, isMetric: true, metricKey: "usg_pct", defaultVisible: false, width: "60px",
      sortValue: (r) => num(r.usg_pct),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{r.usg_pct ? pct(r.usg_pct) : "—"}</span>,
    },
    {
      key: "bpm", label: "BPM", align: "right", sortable: true, isMetric: true, metricKey: "bpm", defaultVisible: false, width: "55px",
      sortValue: (r) => num(r.bpm),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.bpm)}</span>,
    },
    {
      key: "vorp", label: "VORP", align: "right", sortable: true, isMetric: true, metricKey: "vorp", defaultVisible: false, width: "60px",
      sortValue: (r) => num(r.vorp),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.vorp)}</span>,
    },
    {
      key: "ws", label: "WS", align: "right", sortable: true, isMetric: true, metricKey: "ws", defaultVisible: false, width: "55px",
      sortValue: (r) => num(r.ws),
      render: (r) => <span className="font-stat text-[13px] text-text-secondary">{fmt(r.ws)}</span>,
    },
  ];

  const presets: ViewPreset[] = [
    {
      key: "overview",
      label: "Overview",
      columns: ["rank", "name", "pos", "gp", "bis", "lfi", "ppg", "rpg", "apg", "drs", "fg", "fg3"],
    },
    {
      key: "courtvision",
      label: "CourtVision",
      columns: ["rank", "name", "pos", "gp", "bis", "lfi", "drs", "rda", "sps", "goi", "con"],
    },
    {
      key: "traditional",
      label: "Traditional",
      columns: ["rank", "name", "pos", "gp", "ppg", "rpg", "apg", "spg", "bpg", "fg", "fg3", "ft", "tov", "mpg"],
    },
    {
      key: "advanced",
      label: "Advanced",
      columns: ["rank", "name", "pos", "gp", "per", "usg", "bpm", "vorp", "ws", "ppg", "mpg"],
    },
  ];

  const positions = ["PG", "SG", "SF", "PF", "C"];
  const teamAbbrs = [...new Set(players.map((p: any) => p.team_abbr).filter(Boolean))].sort() as string[];
  const filters = [
    {
      key: "position",
      label: "Position",
      options: positions,
      getValue: (r: any) => r.position || "",
    },
    {
      key: "team",
      label: "Team",
      options: teamAbbrs,
      getValue: (r: any) => r.team_abbr || "",
    },
  ];

  const injuredCount = players.filter((p: any) => p.injury_status === "Out" || p.injury_status === "out").length;

  return (
    <div>
      {/* Advanced Filters Bar */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-muted/60 font-semibold uppercase tracking-wider">Min GP</label>
          <select
            value={minGP}
            onChange={(e) => setMinGP(Number(e.target.value))}
            className="bg-[#141925] border border-white/[0.1] rounded px-2 py-1 text-[11px] text-text-primary outline-none [&>option]:bg-[#141925] [&>option]:text-white"
          >
            <option value={0}>All</option>
            <option value={10}>10+ GP</option>
            <option value={20}>20+ GP</option>
            <option value={30}>30+ GP</option>
            <option value={40}>40+ GP</option>
            <option value={50}>50+ GP</option>
          </select>
        </div>

        <button
          onClick={() => setExcludeInjured(!excludeInjured)}
          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold rounded border transition-all ${
            excludeInjured
              ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
              : "border-white/[0.08] text-text-muted/60 hover:border-white/[0.15]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${excludeInjured ? "bg-rose-400" : "bg-text-muted/30"}`} />
          Exclude Injured ({injuredCount})
        </button>

        <span className="text-[10px] text-text-muted/40 ml-auto">
          Showing {filteredPlayers.length} of {players.length} players
        </span>
      </div>

      <DataTable
        data={filteredPlayers}
        columns={columns}
        filters={filters}
        presets={presets}
        defaultSort={{ key: "bis", direction: "desc" }}
        csvFilename="courtvision-players"
      />
    </div>
  );
}
