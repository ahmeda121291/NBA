"use client";

import { useState } from "react";

const sampleComparison = {
  players: [
    {
      name: "Jayson Tatum", team: "BOS",
      metrics: { BIS: 82, RDA: 76, DRS: 65, LFI: 68, SPS: 74, GOI: 58 },
      stats: { PPG: 27.2, RPG: 8.1, APG: 4.8, "TS%": 60.2, "USG%": 29.8 },
    },
    {
      name: "Luka Doncic", team: "DAL",
      metrics: { BIS: 86, RDA: 84, DRS: 42, LFI: 48, SPS: 62, GOI: 45 },
      stats: { PPG: 29.8, RPG: 8.7, APG: 8.9, "TS%": 58.1, "USG%": 33.5 },
    },
  ],
};

export default function ComparePage() {
  const [compareType, setCompareType] = useState<"player" | "team">("player");
  const comparison = sampleComparison;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-sm text-text-secondary">
          Side-by-side player and team evaluation
        </p>
      </div>

      <div className="flex gap-2">
        {(["player", "team"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setCompareType(type)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
              compareType === type
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Search / Select */}
      <div className="grid grid-cols-2 gap-4">
        {comparison.players.map((p, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <input
              type="text"
              defaultValue={p.name}
              placeholder={`Search ${compareType}...`}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
            />
            <div className="mt-2 text-center">
              <p className="text-lg font-bold">{p.name}</p>
              <p className="text-xs text-text-muted">{p.team}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Radar Chart Placeholder */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Metric Overlay
        </h2>
        <div className="mt-4 flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
          Radar Chart: BIS / RDA / DRS / LFI / SPS / GOI overlay for both players
        </div>
      </div>

      {/* Comparison Table — Metrics */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Metric Comparison
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="pb-2 text-left">Metric</th>
                <th className="pb-2 text-right">{comparison.players[0].name}</th>
                <th className="pb-2 text-right">{comparison.players[1].name}</th>
                <th className="pb-2 text-right">Edge</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(comparison.players[0].metrics).map((key) => {
                const v1 = comparison.players[0].metrics[key as keyof typeof comparison.players[0]["metrics"]];
                const v2 = comparison.players[1].metrics[key as keyof typeof comparison.players[1]["metrics"]];
                const diff = v1 - v2;
                return (
                  <tr key={key} className="border-b border-border/50">
                    <td className="py-2.5 text-text-secondary">{key}</td>
                    <td className={`text-right font-stat font-bold ${diff > 0 ? "text-emerald-400" : ""}`}>{v1}</td>
                    <td className={`text-right font-stat font-bold ${diff < 0 ? "text-emerald-400" : ""}`}>{v2}</td>
                    <td className="text-right font-stat text-xs">
                      <span className={diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-text-muted"}>
                        {diff > 0
                          ? `${comparison.players[0].name.split(" ")[1]} +${diff}`
                          : diff < 0
                            ? `${comparison.players[1].name.split(" ")[1]} +${Math.abs(diff)}`
                            : "Even"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Comparison */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Season Stats
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="pb-2 text-left">Stat</th>
                <th className="pb-2 text-right">{comparison.players[0].name}</th>
                <th className="pb-2 text-right">{comparison.players[1].name}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(comparison.players[0].stats).map((key) => {
                const v1 = comparison.players[0].stats[key as keyof typeof comparison.players[0]["stats"]];
                const v2 = comparison.players[1].stats[key as keyof typeof comparison.players[1]["stats"]];
                return (
                  <tr key={key} className="border-b border-border/50">
                    <td className="py-2.5 text-text-secondary">{key}</td>
                    <td className="text-right font-stat">{v1}</td>
                    <td className="text-right font-stat">{v2}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
