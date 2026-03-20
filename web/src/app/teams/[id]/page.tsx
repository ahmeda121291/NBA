import { MetricCard } from "@/components/metrics/metric-card";

const team = {
  id: 1, abbr: "BOS", name: "Boston Celtics", record: "42-20",
  conference: "Eastern", division: "Atlantic", standing: "1st East",
  arena: "TD Garden",
  nextGame: "vs LAL — Mar 19",
  injuryStatus: "Full strength",
  metrics: {
    tsc: { score: 78, confidence: 0.85, trend: 2.1 },
    ltfi: { score: 68, confidence: 0.80, trend: 5.3 },
    lss: { score: 72, confidence: 0.70, trend: 1.0 },
    pts: { score: 81, confidence: 0.75, trend: 0 },
    rp: { score: 88, confidence: 0.80, trend: 0 },
    drs_team: { score: 71, confidence: 0.75, trend: -1.2 },
  },
  seasonStats: {
    ortg: 116.5, drtg: 109.8, netRtg: 6.7, pace: 101.4,
    fgPct: ".478", fg3Pct: ".372", ftPct: ".812", tsPct: ".592",
  },
  recentForm: {
    last10: "7-3", ortg10: 118.2, drtg10: 108.1, net10: 10.1,
  },
  roster: [
    { name: "Jayson Tatum", pos: "SF", bis: 82, lfi: 68, drs: 65, mpg: 35.2, status: "Active" },
    { name: "Jaylen Brown", pos: "SG", bis: 72, lfi: 55, drs: 60, mpg: 33.8, status: "Active" },
    { name: "Kristaps Porzingis", pos: "C", bis: 68, lfi: 62, drs: 58, mpg: 29.5, status: "Active" },
    { name: "Derrick White", pos: "PG", bis: 65, lfi: 52, drs: 72, mpg: 31.2, status: "Active" },
    { name: "Jrue Holiday", pos: "PG", bis: 63, lfi: 50, drs: 74, mpg: 30.1, status: "Active" },
  ],
};

export default function TeamDetailPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#007A33] text-lg font-bold text-white">
            {team.abbr}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
            <p className="text-sm text-text-secondary">
              {team.record} — {team.standing} — {team.injuryStatus}
            </p>
          </div>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Next: {team.nextGame}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(team.metrics).map(([key, m]) => (
          <MetricCard
            key={key}
            metricKey={key}
            score={m.score}
            confidence={m.confidence}
            trend={m.trend}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Season Stats */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Season Stats
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-4">
            {Object.entries(team.seasonStats).map(([key, val]) => (
              <div key={key}>
                <p className="text-xs text-text-muted">{key.toUpperCase()}</p>
                <p className="font-stat text-lg font-bold">{val}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Form */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Recent Form (Last 10)
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-muted">Record</p>
              <p className="font-stat text-lg font-bold">{team.recentForm.last10}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">ORtg</p>
              <p className="font-stat text-lg font-bold">{team.recentForm.ortg10}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">DRtg</p>
              <p className="font-stat text-lg font-bold">{team.recentForm.drtg10}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Net</p>
              <p className="font-stat text-lg font-bold text-emerald-400">+{team.recentForm.net10}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Roster */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Roster
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="pb-2 pr-4">Player</th>
                <th className="pb-2 pr-4">Pos</th>
                <th className="pb-2 pr-4 text-right">BIS</th>
                <th className="pb-2 pr-4 text-right">LFI</th>
                <th className="pb-2 pr-4 text-right">DRS</th>
                <th className="pb-2 pr-4 text-right">MPG</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.roster.map((p) => (
                <tr key={p.name} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">
                    <a href="#" className="font-medium hover:text-accent">{p.name}</a>
                  </td>
                  <td className="pr-4 text-text-muted">{p.pos}</td>
                  <td className={`pr-4 text-right font-stat font-bold ${
                    p.bis >= 75 ? "text-emerald-400" : p.bis >= 60 ? "text-blue-400" : "text-amber-400"
                  }`}>{p.bis}</td>
                  <td className={`pr-4 text-right font-stat font-bold ${
                    p.lfi >= 60 ? "text-emerald-400" : p.lfi >= 45 ? "text-blue-400" : "text-amber-400"
                  }`}>{p.lfi}</td>
                  <td className={`pr-4 text-right font-stat font-bold ${
                    p.drs >= 65 ? "text-emerald-400" : p.drs >= 50 ? "text-blue-400" : "text-amber-400"
                  }`}>{p.drs}</td>
                  <td className="pr-4 text-right font-stat">{p.mpg}</td>
                  <td>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
