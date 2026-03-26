"use client";

import Image from "next/image";
import { DataTable, Column, ViewPreset } from "@/components/shared/data-table";
import { getTeamLogoByAbbr } from "@/lib/nba-data";
import { tierClass, num, fmt, pct } from "@/lib/formatting";

interface Props {
  teams: any[];
}

export function TeamsTable({ teams }: Props) {
  const columns: Column<any>[] = [
    {
      key: "rank", label: "#", width: "40px",
      render: (_row, i) => <span className="font-stat text-text-muted/50 text-[13px]">{i + 1}</span>,
    },
    {
      key: "name", label: "Team", sortable: true, width: "minmax(180px, 2fr)",
      sortValue: (r) => r.nickname,
      render: (r) => (
        <a href={`/teams/${r.id}`} className="flex items-center gap-2.5 hover:text-indigo-400 transition-colors">
          <div className="relative h-7 w-7 shrink-0">
            <Image src={getTeamLogoByAbbr(r.abbreviation)} alt={r.nickname} fill className="object-contain" unoptimized />
          </div>
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-text-primary block truncate">{r.city} {r.nickname}</span>
            <span className="text-[10px] text-text-muted/50">{r.division}</span>
          </div>
        </a>
      ),
    },
    {
      key: "conf", label: "Conf", align: "center", sortable: true, width: "70px",
      sortValue: (r) => r.conference,
      render: (r) => (
        <span className={`rounded-sm border px-1 py-0.5 text-[9px] font-bold inline-block text-center ${
          r.conference === "East"
            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}>{r.conference === "East" ? "East" : "West"}</span>
      ),
    },
    {
      key: "w", label: "W", align: "right", sortable: true, width: "50px",
      sortValue: (r) => num(r.wins),
      render: (r) => <span className="font-stat font-bold text-emerald-400 tabular-nums">{r.wins ?? 0}</span>,
    },
    {
      key: "l", label: "L", align: "right", sortable: true, width: "50px",
      sortValue: (r) => num(r.losses),
      render: (r) => <span className="font-stat font-bold text-rose-400 tabular-nums">{r.losses ?? 0}</span>,
    },
    {
      key: "winpct", label: "Win%", align: "right", sortable: true, width: "75px",
      sortValue: (r) => {
        const w = num(r.wins) ?? 0, l = num(r.losses) ?? 0;
        return (w + l) > 0 ? w / (w + l) : 0;
      },
      render: (r) => {
        const w = num(r.wins) ?? 0, l = num(r.losses) ?? 0;
        const total = w + l;
        return <span className="font-stat text-[12px] text-text-secondary">{total > 0 ? ((w / total) * 100).toFixed(1) + "%" : "0.0%"}</span>;
      },
    },
    // CourtVision metrics
    {
      key: "tsc", label: "TSC", align: "right", sortable: true, isMetric: true, metricKey: "tsc", width: "60px",
      sortValue: (r) => num(r.tsc_score),
      render: (r) => <span className={`font-stat font-bold ${tierClass(num(r.tsc_score))}`}>{fmt(r.tsc_score, 0)}</span>,
    },
    {
      key: "ltfi", label: "LTFI", align: "right", sortable: true, isMetric: true, metricKey: "ltfi", width: "55px",
      sortValue: (r) => num(r.ltfi_score),
      render: (r) => <span className={`font-stat text-[12px] ${tierClass(num(r.ltfi_score))}`}>{fmt(r.ltfi_score, 0)}</span>,
    },
    {
      key: "lss", label: "LSS", align: "right", sortable: true, isMetric: true, metricKey: "lss", width: "55px", defaultVisible: false,
      sortValue: (r) => num(r.lss_score),
      render: (r) => <span className={`font-stat text-[12px] ${tierClass(num(r.lss_score))}`}>{fmt(r.lss_score, 0)}</span>,
    },
    {
      key: "drs", label: "DRS", align: "right", sortable: true, isMetric: true, metricKey: "drs_team", width: "55px", defaultVisible: false,
      sortValue: (r) => num(r.drs_team_score),
      render: (r) => <span className={`font-stat text-[12px] ${tierClass(num(r.drs_team_score))}`}>{fmt(r.drs_team_score, 0)}</span>,
    },
    {
      key: "pts", label: "PTS", align: "right", sortable: true, isMetric: true, metricKey: "pts", width: "55px", defaultVisible: false,
      sortValue: (r) => num(r.pts_score),
      render: (r) => <span className={`font-stat text-[12px] ${tierClass(num(r.pts_score))}`}>{fmt(r.pts_score, 0)}</span>,
    },
    {
      key: "rp", label: "RP", align: "right", sortable: true, isMetric: true, metricKey: "rp", width: "55px", defaultVisible: false,
      sortValue: (r) => num(r.rp_score),
      render: (r) => <span className={`font-stat text-[12px] ${tierClass(num(r.rp_score))}`}>{fmt(r.rp_score, 0)}</span>,
    },
    // Traditional stats
    {
      key: "fg", label: "FG%", align: "right", sortable: true, isMetric: true, metricKey: "fg_pct", width: "60px",
      sortValue: (r) => num(r.fg_pct),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{pct(r.fg_pct)}</span>,
    },
    {
      key: "fg3", label: "3P%", align: "right", sortable: true, isMetric: true, metricKey: "fg3_pct", width: "60px",
      sortValue: (r) => num(r.fg3_pct),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{pct(r.fg3_pct)}</span>,
    },
    {
      key: "ft", label: "FT%", align: "right", sortable: true, isMetric: true, metricKey: "ft_pct", width: "60px", defaultVisible: false,
      sortValue: (r) => num(r.ft_pct),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{pct(r.ft_pct)}</span>,
    },
    // Advanced stats
    {
      key: "ortg", label: "ORTG", align: "right", sortable: true, isMetric: true, metricKey: "ortg", width: "65px", defaultVisible: false,
      sortValue: (r) => num(r.ortg),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{fmt(r.ortg)}</span>,
    },
    {
      key: "drtg", label: "DRTG", align: "right", sortable: true, isMetric: true, metricKey: "drtg", width: "65px", defaultVisible: false,
      sortValue: (r) => num(r.drtg),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{fmt(r.drtg)}</span>,
    },
    {
      key: "netrtg", label: "Net RTG", align: "right", sortable: true, isMetric: true, metricKey: "net_rating", width: "70px", defaultVisible: false,
      sortValue: (r) => num(r.net_rating),
      render: (r) => {
        const v = num(r.net_rating);
        return <span className={`font-stat text-[12px] ${v != null && v > 0 ? "text-emerald-400" : v != null && v < 0 ? "text-rose-400" : "text-text-secondary"}`}>
          {v != null ? (v > 0 ? "+" : "") + v.toFixed(1) : "—"}
        </span>;
      },
    },
    {
      key: "pace", label: "Pace", align: "right", sortable: true, isMetric: true, metricKey: "pace", width: "60px", defaultVisible: false,
      sortValue: (r) => num(r.pace),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{fmt(r.pace)}</span>,
    },
    {
      key: "elo", label: "Elo", align: "right", sortable: true, isMetric: true, metricKey: "elo", width: "65px",
      sortValue: (r) => num(r.elo_rating),
      render: (r) => {
        const elo = num(r.elo_rating);
        return <span className={`font-stat text-[12px] font-bold ${elo != null && elo >= 1550 ? "text-emerald-400" : elo != null && elo < 1450 ? "text-rose-400" : "text-text-secondary"}`}>
          {elo != null ? Math.round(elo) : "—"}
        </span>;
      },
    },
    {
      key: "sos", label: "SOS", align: "right", sortable: true, isMetric: true, metricKey: "sos", width: "60px", defaultVisible: false,
      sortValue: (r) => num(r.sos),
      render: (r) => <span className="font-stat text-[12px] text-text-secondary">{fmt(r.sos, 3)}</span>,
    },
  ];

  const presets: ViewPreset[] = [
    {
      key: "overview",
      label: "Overview",
      columns: ["rank", "name", "conf", "w", "l", "winpct", "tsc", "ltfi", "fg", "fg3"],
    },
    {
      key: "courtvision",
      label: "CourtVision",
      columns: ["rank", "name", "conf", "w", "l", "tsc", "ltfi", "lss", "drs", "pts", "rp"],
    },
    {
      key: "traditional",
      label: "Traditional",
      columns: ["rank", "name", "conf", "w", "l", "winpct", "fg", "fg3", "ft"],
    },
    {
      key: "advanced",
      label: "Advanced",
      columns: ["rank", "name", "conf", "w", "l", "ortg", "drtg", "netrtg", "pace", "elo", "sos"],
    },
  ];

  const filters = [
    {
      key: "conference",
      label: "Conference",
      options: ["East", "West"],
      getValue: (r: any) => r.conference || "",
    },
  ];

  return (
    <DataTable
      data={teams}
      columns={columns}
      filters={filters}
      presets={presets}
      defaultSort={{ key: "tsc", direction: "desc" }}
      csvFilename="courtvision-teams"
    />
  );
}
