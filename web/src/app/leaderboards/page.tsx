const leaderboardData = {
  bis: [
    { rank: 1, name: "Nikola Jokic", team: "DEN", score: 91, conf: 0.92, trend: 0.5, pctl: 99 },
    { rank: 2, name: "Shai Gilgeous-Alexander", team: "OKC", score: 88, conf: 0.90, trend: 2.1, pctl: 98 },
    { rank: 3, name: "Luka Doncic", team: "DAL", score: 86, conf: 0.78, trend: -1.2, pctl: 97 },
    { rank: 4, name: "Giannis Antetokounmpo", team: "MIL", score: 85, conf: 0.88, trend: 0, pctl: 96 },
    { rank: 5, name: "Joel Embiid", team: "PHI", score: 84, conf: 0.65, trend: -3.0, pctl: 95 },
    { rank: 6, name: "Jayson Tatum", team: "BOS", score: 82, conf: 0.88, trend: 1.5, pctl: 94 },
    { rank: 7, name: "Kevin Durant", team: "PHX", score: 80, conf: 0.82, trend: -0.5, pctl: 93 },
    { rank: 8, name: "Anthony Edwards", team: "MIN", score: 78, conf: 0.85, trend: 3.2, pctl: 92 },
    { rank: 9, name: "LeBron James", team: "LAL", score: 76, conf: 0.80, trend: -1.0, pctl: 91 },
    { rank: 10, name: "Tyrese Haliburton", team: "IND", score: 74, conf: 0.82, trend: 0.8, pctl: 90 },
  ],
};

const metrics = [
  { key: "bis", label: "Baseline Impact (BIS)" },
  { key: "lfi", label: "Live Form (LFI)" },
  { key: "drs", label: "Defensive Reality (DRS)" },
  { key: "rda", label: "Role Difficulty (RDA)" },
  { key: "sps", label: "Scalability (SPS)" },
];

export default function LeaderboardsPage() {
  const activeMetric = "bis";
  const data = leaderboardData.bis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboards</h1>
        <p className="text-sm text-text-secondary">
          Top players and teams ranked by CourtVision metrics
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {metrics.map((m) => (
          <button
            key={m.key}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              m.key === activeMetric
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="p-4 w-12">Rank</th>
              <th className="p-4">Player</th>
              <th className="p-4">Team</th>
              <th className="p-4 text-right">Score</th>
              <th className="p-4 text-right">Confidence</th>
              <th className="p-4 text-right">Trend</th>
              <th className="p-4 text-right">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr
                key={entry.rank}
                className="border-b border-border/50 transition-colors hover:bg-surface-hover"
              >
                <td className="p-4 font-stat text-text-muted">{entry.rank}</td>
                <td className="p-4">
                  <a href={`/players/${entry.rank}`} className="font-medium hover:text-accent">
                    {entry.name}
                  </a>
                </td>
                <td className="p-4 text-text-muted">{entry.team}</td>
                <td className="p-4 text-right">
                  <span className={`font-stat text-lg font-bold ${
                    entry.score >= 80 ? "text-emerald-400" : entry.score >= 65 ? "text-blue-400" : "text-amber-400"
                  }`}>
                    {entry.score}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className={`text-xs ${
                    entry.conf >= 0.8 ? "text-emerald-400" : entry.conf >= 0.6 ? "text-blue-400" : "text-amber-400"
                  }`}>
                    {entry.conf >= 0.8 ? "High" : entry.conf >= 0.6 ? "Mod" : "Low"}
                  </span>
                </td>
                <td className="p-4 text-right font-stat">
                  <span className={
                    entry.trend > 0 ? "text-emerald-400" : entry.trend < 0 ? "text-rose-400" : "text-text-muted"
                  }>
                    {entry.trend > 0 ? `+${entry.trend}` : entry.trend === 0 ? "—" : entry.trend}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-stat text-text-secondary">{entry.pctl}th</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Views */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { title: "Underrated by Box Score", desc: "High BIS, low PPG — impact beyond scoring" },
          { title: "Real vs Fake Hot Streaks", desc: "LFI leaders filtered by streak sustainability" },
          { title: "Most Scalable Stars", desc: "High BIS + high SPS — plug-and-play impact" },
        ].map((view) => (
          <button
            key={view.title}
            className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40"
          >
            <h3 className="text-sm font-semibold text-text-primary">{view.title}</h3>
            <p className="mt-1 text-xs text-text-muted">{view.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
